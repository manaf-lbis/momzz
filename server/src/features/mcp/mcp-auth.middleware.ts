import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env';
import { AuthUserContext } from './mcp.types';
import { hashToken } from './mcp.utils';
import { authService } from '../authentication/auth.service';
import UserModel from '../../models/User.model';

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

// In-memory token cache: maps tokenHash -> { context, expiresAt }
interface CachedTokenSession {
  context: AuthUserContext;
  expiresAt: number;
}
const tokenSessionCache = new Map<string, CachedTokenSession>();

/**
 * Instantly evicts cached PAT sessions for a given userId or mobile number,
 * or clears all cached tokens if no identifier is provided.
 */
export const invalidateMcpTokenCache = (userId?: string, mobile?: string): void => {
  if (!userId && !mobile) {
    tokenSessionCache.clear();
    return;
  }
  for (const [key, session] of tokenSessionCache.entries()) {
    if (
      (userId && session.context.userId === userId) ||
      (mobile && session.context.mobile === mobile)
    ) {
      tokenSessionCache.delete(key);
    }
  }
};

/**
 * Authenticates an incoming MCP request via PAT (Personal Access Token),
 * client credentials, or signed JWT session token.
 */
export const authenticateMcpRequest = async (req: Request): Promise<AuthUserContext> => {
  let clientId =
    (req.headers['x-client-id'] as string) ||
    (req.query.clientId as string) ||
    req.body?.clientId;
  let clientSecret =
    (req.headers['x-client-secret'] as string) ||
    (req.query.clientSecret as string) ||
    req.body?.clientSecret;

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

      // Check if it's a signed JWT session token first
      try {
        const decodedJwt = jwt.verify(rawToken, ENV.JWT_ACCESS_SECRET) as any;
        if (decodedJwt && (decodedJwt.id || decodedJwt.userId)) {
          const userId = decodedJwt.id || decodedJwt.userId;
          const role = decodedJwt.role || 'WORKER';
          return {
            userId,
            name: decodedJwt.name || 'User',
            mobile: decodedJwt.mobile || '',
            role,
            scopes: role === 'ADMIN' ? ['*'] : ['profile:read', 'profile:write', 'jobs:read', 'inventory:read'],
            accessToken: rawToken,
          };
        }
      } catch {
        // Not a valid JWT, continue to treat as PAT secret or clientId:clientSecret
      }

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
    throw new Error('Missing MCP authentication. Expected Authorization: Bearer <token> or Basic <clientId:secret>.');
  }

  // If Client ID is not explicitly provided, look up the user by matching secret token hash
  if (!clientId) {
    const tokenHash = hashToken(clientSecret);
    const dbUser = await UserModel.findOne({
      $or: [{ mcpToken: clientSecret }, { mcpTokenHash: tokenHash }],
      mcpTokenRevoked: { $ne: true },
    }).lean();

    if (!dbUser) {
      throw new Error('Invalid or revoked MCP Client Secret.');
    }
    clientId = dbUser.mobile;
  }

  // Check cache for this clientId + clientSecret
  const cacheKey = hashToken(`${clientId}:${clientSecret}`);
  const cached = tokenSessionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.context;
  }

  // Exchange credentials via authService
  const exchangeResult = await authService.exchangeMcpToken(clientId, clientSecret);
  const user = exchangeResult.user;

  const userContext: AuthUserContext = {
    userId: user.id || (user as any)._id,
    name: user.name,
    mobile: user.mobile,
    role: user.role as any,
    scopes: user.role === 'ADMIN' ? ['*'] : ['profile:read', 'profile:write', 'jobs:read', 'inventory:read'],
    accessToken: exchangeResult.accessToken,
  };

  // Cache session for 10 minutes
  tokenSessionCache.set(cacheKey, {
    context: userContext,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return userContext;
};

/**
 * Transport-level Express authentication middleware for MCP endpoints.
 */
export const mcpAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userContext = await authenticateMcpRequest(req);
    (req as any).user = userContext;

    authContextStorage.run(userContext, () => {
      next();
    });
  } catch (error: any) {
    res.setHeader(
      'WWW-Authenticate',
      'Bearer realm="Momzz MCP", error="unauthorized", resource_metadata="/.well-known/oauth-authorization-server"'
    );
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: `Unauthorized: ${error.message || 'Authentication failed'}. Connect via OAuth 2.0 or provide Authorization header.`,
      },
    });
  }
};
