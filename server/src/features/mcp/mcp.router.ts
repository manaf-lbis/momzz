import { Router, Request, Response, NextFunction } from 'express';
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

// --- DNS Rebinding Protection Middleware ---
export const dnsRebindingGuard = (req: Request, res: Response, next: NextFunction): void => {
  const hostHeader = (req.headers.host || '').toLowerCase().split(':')[0];
  const localHosts = ['localhost', '127.0.0.1', '::1'];

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

  const allowedHosts = Array.from(new Set([...localHosts, ...configuredHosts]));

  if (allowedHosts.length > 0 && !allowedHosts.includes(hostHeader) && !allowedHosts.includes('*')) {
    console.warn(`[MCP SECURITY] DNS Rebinding blocked. Disallowed Host: ${req.headers.host}`);
    res.status(403).json({
      jsonrpc: '2.0',
      error: {
        code: -32002,
        message: 'Forbidden: Invalid Host header (DNS Rebinding Protection).',
      },
    });
    return;
  }
  next();
};

const mcpRouter = Router();

// Apply DNS rebinding protection and per-user agent loop rate limiting
mcpRouter.use(dnsRebindingGuard);
mcpRouter.use(mcpRateLimiter.middleware());

// 1. STREAMABLE HTTP TRANSPORT (/mcp) - Recommended Remote MCP Transport
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

// 2. HTTP + SSE TRANSPORT (/sse & /messages) - Backwards Compatibility
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

// 3. OAuth 2.0 Client Credentials Token Endpoint (/oauth/token & /token)
const handleOAuthToken = async (req: Request, res: Response) => {
  let clientId = req.body.client_id || req.body.clientId;
  let clientSecret = req.body.client_secret || req.body.clientSecret;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf-8');
    const [u, ...p] = decoded.split(':');
    clientId = u;
    clientSecret = p.join(':');
  }

  try {
    const result = await authService.exchangeMcpToken(clientId, clientSecret);
    return res.status(200).json({
      access_token: result.accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });
  } catch (err: any) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: err.message || 'Authentication failed',
    });
  }
};

mcpRouter.post('/oauth/token', handleOAuthToken);
mcpRouter.post('/token', handleOAuthToken);

// 4. MCP System Health & Diagnostics
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
