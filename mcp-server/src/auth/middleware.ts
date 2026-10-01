import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { config } from '../config.js';
import { User } from '../db/connection.js';

export interface AuthUserContext {
  userId: string;
  name: string;
  mobile: string;
  role: 'ADMIN' | 'WORKER';
  scopes: string[];
  accessToken: string; // Bearer token issued by upstream Momzz API
}

export const authContextStorage = new AsyncLocalStorage<AuthUserContext>();

/**
 * Returns the authenticated user context for the current async execution context.
 */
export const getAuthContext = (): AuthUserContext => {
  const context = authContextStorage.getStore();
  if (!context) {
    throw new Error('Unauthenticated: No active auth context found in the execution store.');
  }
  return context;
};

/**
 * Computes a deterministic SHA-256 hash of a plaintext token.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
};

// In-memory token cache: maps tokenHash -> { context, expiresAt }
interface CachedTokenSession {
  context: AuthUserContext;
  expiresAt: number;
}
const tokenSessionCache = new Map<string, CachedTokenSession>();

/**
 * Exchanges client credentials (Client ID + Client Secret) with the upstream Momzz API.
 * The Momzz API validates the token and issues a signed session Bearer token.
 */
export const exchangeCredentialsWithUpstream = async (
  clientId: string,
  clientSecret: string
): Promise<AuthUserContext> => {
  const cacheKey = hashToken(`${clientId}:${clientSecret}`);
  const cached = tokenSessionCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.context;
  }

  const exchangeUrl = `${config.UPSTREAM_API_URL.replace(/\/+$/, '')}/api/auth/mcp-token`;

  const response = await fetch(exchangeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    }),
  });

  const data = (await response.json().catch(() => null)) as any;

  if (!response.ok || !data?.data?.accessToken) {
    const errorMsg = data?.message || `MCP upstream token exchange failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  const user = data.data.user;
  const userContext: AuthUserContext = {
    userId: user.id || user._id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    scopes: user.role === 'ADMIN' ? ['*'] : ['profile:read', 'profile:write', 'jobs:read', 'inventory:read'],
    accessToken: data.data.accessToken,
  };

  // Cache for 10 minutes (token valid for 1 hour)
  tokenSessionCache.set(cacheKey, {
    context: userContext,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return userContext;
};

/**
 * Extracts and verifies incoming MCP client credentials:
 * Supports:
 *  1. Basic Auth: Authorization: Basic <base64(clientId:clientSecret)>
 *  2. Bearer Token: Authorization: Bearer <clientSecret> (or <clientId>:<clientSecret>)
 *  3. Headers: X-Client-Id and X-Client-Secret
 *  4. Query params / Body: clientId & clientSecret
 */
export const authenticateMcpRequest = async (req: Request): Promise<AuthUserContext> => {
  let clientId = (req.headers['x-client-id'] as string) || (req.query.clientId as string) || req.body?.clientId;
  let clientSecret = (req.headers['x-client-secret'] as string) || (req.query.clientSecret as string) || req.body?.clientSecret;

  const authHeader = req.headers.authorization;

  if (authHeader) {
    if (authHeader.startsWith('Basic ')) {
      // Decode Base64 username:password
      const base64Creds = authHeader.slice(6).trim();
      const decoded = Buffer.from(base64Creds, 'base64').toString('utf-8');
      const [u, ...p] = decoded.split(':');
      clientId = u;
      clientSecret = p.join(':');
    } else if (authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.slice(7).trim();
      if (rawToken.includes(':')) {
        const [u, ...p] = rawToken.split(':');
        clientId = u;
        clientSecret = p.join(':');
      } else {
        clientSecret = rawToken;
      }
    }
  }

  if (!clientSecret) {
    throw new Error('Missing client token or secret. Expected Authorization: Bearer <secret> or Basic <clientId:secret>.');
  }

  // If Client ID is not explicitly provided, look up the user in MongoDB matching this secret token
  if (!clientId) {
    const tokenHash = hashToken(clientSecret);
    const dbUser = await User.findOne({
      $or: [{ mcpToken: clientSecret }, { mcpTokenHash: tokenHash }],
      mcpTokenRevoked: { $ne: true },
    }).lean();

    if (!dbUser) {
      throw new Error('Invalid or revoked MCP Client Secret.');
    }
    clientId = dbUser.mobile;
  }

  // Request the upstream API to verify credentials and issue the official Bearer token
  return await exchangeCredentialsWithUpstream(clientId, clientSecret);
};

/**
 * Transport-level Express authentication middleware.
 * Verifies credentials with upstream API, obtains Bearer token,
 * and binds context into AsyncLocalStorage for MCP tool execution.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userContext = await authenticateMcpRequest(req);

    // Bind authenticated user to Express request
    (req as any).user = userContext;

    // Run next handler inside AsyncLocalStorage context
    authContextStorage.run(userContext, () => {
      next();
    });
  } catch (error: any) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: `Unauthorized: ${error.message || 'Authentication failed'}`,
      },
    });
  }
};
