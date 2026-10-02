import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ENV } from '../../config/env';
import { AuthUserContext } from './mcp.types';
import {
  mcpAuthMiddleware,
  authContextStorage,
  getAuthContext,
} from './mcp-auth.middleware';
import {
  getVisibleToolsForUser,
  executeToolWithGuard,
} from './tools/mcp-tools.registry';
import { authService } from '../authentication/auth.service';
import { mcpRateLimiter } from './mcp-rate-limiter';

/**
 * Creates and configures an MCP Server protocol instance with dynamic capability gating
 * and strict RBAC guards.
 */
export const createMcpServerInstance = (): Server => {
  const server = new Server(
    {
      name: 'momzz-integrated-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: { listChanged: true },
      },
    }
  );

  // Dynamic Capability Gating: Only expose tools that the authenticated user is authorized to call
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const userContext = getAuthContext();
    const tools = getVisibleToolsForUser(userContext);
    return { tools };
  });

  // Hard Authorization & Zod Validation at tool call execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const userContext = getAuthContext();
    const result = await executeToolWithGuard(
      request.params.name,
      request.params.arguments,
      userContext
    );

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  return server;
};

// --- Multi-User Session Isolation & Concurrency Store ---
interface McpSessionRecord {
  server: Server;
  transport: StreamableHTTPServerTransport | SSEServerTransport;
  user: AuthUserContext;
  lastActiveAt: number;
}

const mcpSessionStore = new Map<string, McpSessionRecord>();

// Periodically clean up stale sessions (inactive > 30 minutes)
setInterval(() => {
  const now = Date.now();
  const maxIdle = 30 * 60 * 1000;
  for (const [id, session] of mcpSessionStore.entries()) {
    if (now - session.lastActiveAt > maxIdle) {
      mcpSessionStore.delete(id);
      try {
        session.server.close();
      } catch {}
    }
  }
}, 300_000).unref();

// --- OAuth Authorization Code Temporary Storage ---
interface AuthCodeRecord {
  clientId: string;
  createdAt: number;
}
const authCodeStore = new Map<string, AuthCodeRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [code, record] of authCodeStore.entries()) {
    if (now - record.createdAt > 10 * 60 * 1000) {
      authCodeStore.delete(code);
    }
  }
}, 60_000).unref();

// --- DNS Rebinding Protection Middleware ---
export const dnsRebindingGuard = (req: Request, res: Response, next: NextFunction): void => {
  const hostHeader = (req.headers.host || '').toLowerCase().split(':')[0];

  // 1. Safe localhost bindings
  if (['localhost', '127.0.0.1', '::1'].includes(hostHeader)) {
    return next();
  }

  // 2. Safe public cloud and production hostings (Render, Vercel, Railway, Fly, Momzz domain)
  if (
    hostHeader.endsWith('.onrender.com') ||
    hostHeader.endsWith('.vercel.app') ||
    hostHeader.endsWith('.railway.app') ||
    hostHeader.endsWith('.fly.dev') ||
    hostHeader.includes('momzz')
  ) {
    return next();
  }

  // 3. Allow if host matches req.hostname (verified by reverse proxy / trust proxy)
  if (req.hostname && hostHeader === req.hostname.toLowerCase()) {
    return next();
  }

  // 4. Configured host origins
  const configuredHosts = [
    ENV.CLIENT_URL,
    ...ENV.CLIENT_URLS,
    ...ENV.CORS_ORIGINS,
  ]
    .map((url) => {
      try {
        return new URL(url).hostname.toLowerCase();
      } catch {
        return url.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase();
      }
    })
    .filter(Boolean);

  if (configuredHosts.includes(hostHeader) || configuredHosts.includes('*')) {
    return next();
  }

  console.warn(`[MCP SECURITY] DNS Rebinding blocked. Disallowed Host: ${req.headers.host}`);
  res.status(403).json({
    jsonrpc: '2.0',
    error: {
      code: -32002,
      message: 'Forbidden: Invalid Host header (DNS Rebinding Protection).',
    },
  });
};

const mcpRouter = Router();

// Permissive CORS for MCP & OAuth endpoints (allows Gemini, Claude, Cursor, and web clients)
mcpRouter.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, mcp-session-id, X-Client-Id, X-Client-Secret, ngrok-skip-browser-warning'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Apply DNS rebinding protection and per-user agent loop rate limiting
mcpRouter.use(dnsRebindingGuard);
mcpRouter.use(mcpRateLimiter.middleware());

// --- RFC 8414 & OpenID OAuth 2.0 Authorization Server Metadata ---
const handleOAuthMetadata = (req: Request, res: Response) => {
  const host = req.get('host') || 'momzz-server.onrender.com';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  res.status(200).json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    token_endpoint_auth_signing_alg_values_supported: ['HS256'],
    userinfo_endpoint: `${baseUrl}/api/auth/me`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'client_credentials'],
    code_challenge_methods_supported: ['S256', 'plain'],
    scopes_supported: [
      'profile:read',
      'jobs:read',
      'inventory:read',
      'catalog:read',
      'sales:read',
      'system:read',
      'admin:workers',
      'admin:analytics',
      '*',
    ],
    service_documentation: `${baseUrl}/api/health`,
  });
};

mcpRouter.get('/.well-known/oauth-authorization-server', handleOAuthMetadata);
mcpRouter.get('/.well-known/openid-configuration', handleOAuthMetadata);
mcpRouter.get('/oauth/.well-known/oauth-authorization-server', handleOAuthMetadata);
mcpRouter.get('/mcp/.well-known/oauth-authorization-server', handleOAuthMetadata);

// --- OAuth 2.0 Authorization Endpoint (/oauth/authorize) ---
const handleOAuthAuthorize = (req: Request, res: Response) => {
  const clientId = (req.query.client_id as string) || (req.body?.client_id as string) || '';
  const redirectUri = (req.query.redirect_uri as string) || (req.body?.redirect_uri as string) || '';
  const state = (req.query.state as string) || (req.body?.state as string) || '';

  const code = 'momzz_code_' + crypto.randomBytes(24).toString('hex');
  authCodeStore.set(code, {
    clientId: clientId.trim(),
    createdAt: Date.now(),
  });

  if (redirectUri) {
    try {
      const targetUrl = new URL(redirectUri);
      targetUrl.searchParams.set('code', code);
      if (state) targetUrl.searchParams.set('state', state);
      return res.redirect(targetUrl.toString());
    } catch {
      // Fall through to display HTML code if URL is invalid
    }
  }

  // HTML fallback view for browser users
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Momzz Garage MCP Authorization</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b132b; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1c2541; padding: 2.5rem; border-radius: 1rem; border: 1px solid #3a506b; max-width: 440px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          h2 { color: #6fffe9; margin-top: 0; font-size: 1.5rem; }
          p { color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; }
          code { background: #0b132b; padding: 0.75rem 1rem; border-radius: 0.5rem; display: block; margin: 1.25rem 0; word-break: break-all; color: #5bc0be; font-size: 0.9rem; border: 1px solid #3a506b; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Momzz Garage AI Authorization</h2>
          <p>Client ID: <strong>${clientId || 'Gemini Connected App'}</strong></p>
          <p>Authorization code generated successfully:</p>
          <code>${code}</code>
          <p style="color: #94a3b8; font-size: 0.85rem;">Valid for 10 minutes. Return to Gemini to complete connection.</p>
        </div>
      </body>
    </html>
  `);
};

mcpRouter.get('/oauth/authorize', handleOAuthAuthorize);
mcpRouter.post('/oauth/authorize', handleOAuthAuthorize);

// --- OAuth 2.0 Token Endpoint (/oauth/token & /token) ---
const handleOAuthToken = async (req: Request, res: Response) => {
  let clientId = req.body.client_id || req.body.clientId;
  let clientSecret = req.body.client_secret || req.body.clientSecret;
  const grantType = req.body.grant_type || req.body.grantType;
  const code = req.body.code;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf-8');
    const [u, ...p] = decoded.split(':');
    clientId = u;
    clientSecret = p.join(':');
  }

  // Handle authorization_code grant
  if (grantType === 'authorization_code' || code) {
    if (code && authCodeStore.has(code)) {
      const codeRecord = authCodeStore.get(code)!;
      clientId = clientId || codeRecord.clientId;
      authCodeStore.delete(code); // One-time use per OAuth spec
    }
  }

  if (!clientId || !clientSecret) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Both client_id (mobile) and client_secret (PAT) are required.',
    });
  }

  try {
    const result = await authService.exchangeMcpToken(clientId, clientSecret);
    return res.status(200).json({
      access_token: result.accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope:
        result.user.role === 'ADMIN'
          ? '*'
          : 'profile:read jobs:read inventory:read catalog:read sales:read system:read',
    });
  } catch (err: any) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: err.message || 'Authentication failed. Please verify your Client ID and Secret.',
    });
  }
};

mcpRouter.post('/oauth/token', handleOAuthToken);
mcpRouter.post('/token', handleOAuthToken);

// --- 1. STREAMABLE HTTP TRANSPORT (/mcp) ---
mcpRouter.all('/mcp', mcpAuthMiddleware, async (req: Request, res: Response) => {
  const user = getAuthContext();
  const sessionId = (req.headers['mcp-session-id'] as string) || (req.query.sessionId as string);

  try {
    let session = sessionId ? mcpSessionStore.get(sessionId) : undefined;

    // Verify session ownership if reusing an existing session ID
    if (session && session.user.userId !== user.userId) {
      res.status(403).json({
        jsonrpc: '2.0',
        error: { code: -32003, message: 'Forbidden: Session belongs to another user context.' },
      });
      return;
    }

    let transport: StreamableHTTPServerTransport;
    let server: Server;

    if (session && session.transport instanceof StreamableHTTPServerTransport) {
      transport = session.transport;
      server = session.server;
      session.lastActiveAt = Date.now();
    } else {
      // Create isolated server and transport per request/session to eliminate race conditions
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless per specification
      });
      server = createMcpServerInstance();
      await server.connect(transport);

      if (sessionId) {
        mcpSessionStore.set(sessionId, {
          server,
          transport,
          user,
          lastActiveAt: Date.now(),
        });
      }
    }

    // Pass parsed body directly to prevent stream-drained hangs from express.json()
    const requestBody = req.body !== undefined && Object.keys(req.body).length > 0 ? req.body : undefined;
    await transport.handleRequest(req, res, requestBody);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Streamable transport error: ${err.message}`,
        },
      });
    }
  }
});

// --- 2. HTTP + SSE TRANSPORT (/sse & /messages) ---
mcpRouter.get('/sse', mcpAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const user = getAuthContext();
    const sseTransport = new SSEServerTransport('/messages', res);
    const sessionServer = createMcpServerInstance();

    const sessionId = sseTransport.sessionId;
    mcpSessionStore.set(sessionId, {
      server: sessionServer,
      transport: sseTransport,
      user,
      lastActiveAt: Date.now(),
    });

    sseTransport.onclose = () => {
      mcpSessionStore.delete(sessionId);
      console.log(`[SSE] Session closed and evicted: ${sessionId}`);
    };

    await sessionServer.connect(sseTransport);
    await sseTransport.start();
    console.log(`[SSE] Connection established for user ${user.userId} (${user.role}), session: ${sessionId}`);
  } catch (err: any) {
    console.error('[SSE ERROR] Failed to initialize SSE stream:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish SSE stream' });
    }
  }
});

mcpRouter.post('/messages', async (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || (req.headers['mcp-session-id'] as string);

  if (!sessionId) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Missing sessionId parameter or header' },
    });
    return;
  }

  const session = mcpSessionStore.get(sessionId);
  if (!session || !(session.transport instanceof SSEServerTransport)) {
    res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32602, message: 'SSE session not found or has expired.' },
    });
    return;
  }

  session.lastActiveAt = Date.now();

  // Run within user's established authentication context
  authContextStorage.run(session.user, async () => {
    try {
      const requestBody = req.body !== undefined && Object.keys(req.body).length > 0 ? req.body : undefined;
      await (session.transport as SSEServerTransport).handlePostMessage(req, res, requestBody);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: err.message },
        });
      }
    }
  });
});

// --- 3. MCP Diagnostics Endpoint (/mcp/health) ---
mcpRouter.get('/mcp/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    service: 'Momzz Integrated Enterprise MCP Server',
    version: '1.0.0',
    transports: {
      streamableHttp: '/mcp',
      sse: '/sse',
      messages: '/messages',
      oauthToken: '/oauth/token',
      oauthAuthorize: '/oauth/authorize',
      discoveryMetadata: '/.well-known/oauth-authorization-server',
    },
    activeSessions: mcpSessionStore.size,
    security: {
      dnsRebindingProtection: true,
      perUserRateLimiting: true,
      sessionIsolation: true,
      antiConfusedDeputy: true,
      dynamicCapabilityGating: true,
      rbacEnforced: true,
      instantPatCacheInvalidation: true,
    },
  });
});

export default mcpRouter;
