import express, { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from './config.js';
import { connectDB } from './db/connection.js';
import {
  authMiddleware,
  authContextStorage,
  getAuthContext,
  AuthUserContext,
} from './auth/middleware.js';
import {
  getVisibleToolsForUser,
  executeToolWithGuard,
} from './tools/registry.js';

/**
 * Creates and configures an MCP Server protocol instance with dynamic capability gating
 * and strict RBAC guards.
 */
export const createMcpServerInstance = (): Server => {
  const server = new Server(
    {
      name: 'momzz-enterprise-mcp-server',
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

export const createApp = () => {
  const app = express();

  // 1. HTTP Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 2. DNS Rebinding Protection
  app.use((req: Request, res: Response, next: NextFunction) => {
    const hostHeader = (req.headers.host || '').toLowerCase().split(':')[0];
    const allowed = config.ALLOWED_HOSTS.map((h) => h.split(':')[0]);

    if (allowed.length > 0 && !allowed.includes(hostHeader)) {
      console.warn(`[SECURITY] DNS Rebinding blocked. Disallowed Host: ${req.headers.host}`);
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
  });

  // 3. Strict CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, '');
        const isAllowed =
          config.ALLOWED_ORIGINS.includes('*') ||
          config.ALLOWED_ORIGINS.includes(cleanOrigin);

        if (isAllowed) {
          callback(null, true);
        } else {
          console.warn(`[SECURITY] CORS rejected origin: ${origin}`);
          callback(new Error('Cross-Origin Request Blocked by Strict Policy.'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'mcp-session-id',
      ],
    })
  );

  // 4. Request Body Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // OAuth 2.0 Client Credentials Token Endpoint
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
      const exchangeUrl = `${config.UPSTREAM_API_URL.replace(/\/+$/, '')}/api/auth/mcp-token`;
      const response = await fetch(exchangeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      const data = (await response.json().catch(() => null)) as any;
      if (!response.ok || !data?.data?.accessToken) {
        return res.status(401).json({
          error: 'invalid_client',
          error_description: data?.message || 'Authentication failed',
        });
      }
      return res.status(200).json({
        access_token: data.data.accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'server_error', error_description: err.message });
    }
  };

  app.post('/oauth/token', handleOAuthToken);
  app.post('/token', handleOAuthToken);

  // 5. System Health & Diagnostic Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'Momzz Enterprise MCP Server',
      version: '1.0.0',
      transports: {
        streamableHttp: '/mcp',
        sse: '/sse',
        messages: '/messages',
      },
      security: {
        dnsRebindingProtection: true,
        strictCORS: true,
        tls: config.USE_HTTPS ? 'TLSv1.2+' : 'HTTP (Dev)',
        antiConfusedDeputy: true,
        dynamicCapabilityGating: true,
      },
    });
  });

  // 6. STREAMABLE HTTP TRANSPORT (/mcp) - Recommended MCP Remote Transport
  const streamableTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode as per standard HTTP transport spec
  });

  const streamableServer = createMcpServerInstance();
  streamableServer.connect(streamableTransport).catch((err) => {
    console.error('[MCP ERROR] Failed to connect StreamableHTTPServerTransport:', err);
  });

  app.all('/mcp', authMiddleware, async (req: Request, res: Response) => {
    try {
      await streamableTransport.handleRequest(req, res, req.body);
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

  // 7. HTTP + SSE TRANSPORT (/sse & /messages) - Backwards Compatibility
  const sseSessions = new Map<
    string,
    { transport: SSEServerTransport; user: AuthUserContext }
  >();

  app.get('/sse', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthContext();
      const sseTransport = new SSEServerTransport('/messages', res);
      const sessionServer = createMcpServerInstance();

      const sessionId = sseTransport.sessionId;
      sseSessions.set(sessionId, { transport: sseTransport, user });

      sseTransport.onclose = () => {
        sseSessions.delete(sessionId);
        console.log(`[SSE] Session closed: ${sessionId}`);
      };

      await sessionServer.connect(sseTransport);
      await sseTransport.start();
      console.log(`[SSE] Connection established for user ${user.userId} (${user.role}), session: ${sessionId}`);
    } catch (err: any) {
      console.error('[SSE ERROR] Failed to initialize SSE connection:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to establish SSE stream' });
      }
    }
  });

  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = (req.query.sessionId as string) || (req.headers['mcp-session-id'] as string);

    if (!sessionId) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Missing sessionId parameter or header' },
      });
      return;
    }

    const session = sseSessions.get(sessionId);
    if (!session) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32602, message: 'SSE session not found or has expired.' },
      });
      return;
    }

    // Run within user's established authentication context
    authContextStorage.run(session.user, async () => {
      try {
        await session.transport.handlePostMessage(req, res, req.body);
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

  return app;
};

export const startServer = async () => {
  await connectDB();
  const app = createApp();

  let httpServer: http.Server | https.Server;

  // TLS 1.2+ Enforcement
  if (config.USE_HTTPS && config.SSL_KEY_PATH && config.SSL_CERT_PATH) {
    if (!fs.existsSync(config.SSL_KEY_PATH) || !fs.existsSync(config.SSL_CERT_PATH)) {
      throw new Error(`SSL certificates not found at ${config.SSL_KEY_PATH} or ${config.SSL_CERT_PATH}`);
    }

    const sslOptions: https.ServerOptions = {
      key: fs.readFileSync(config.SSL_KEY_PATH),
      cert: fs.readFileSync(config.SSL_CERT_PATH),
      minVersion: 'TLSv1.2',
    };

    httpServer = https.createServer(sslOptions, app);
    console.log('[SECURITY] Running with HTTPS (TLS 1.2+ mandatory)');
  } else {
    httpServer = http.createServer(app);
    if (config.NODE_ENV === 'production') {
      console.warn('[SECURITY WARNING] Running HTTP in production. HTTPS with TLS 1.2+ is recommended.');
    }
  }

  httpServer.listen(config.PORT, () => {
    const protocol = config.USE_HTTPS ? 'https' : 'http';
    console.log(`[MCP SERVER] Momzz Enterprise MCP Server listening on ${protocol}://localhost:${config.PORT}`);
    console.log(`[MCP SERVER] Streamable HTTP endpoint: ${protocol}://localhost:${config.PORT}/mcp`);
    console.log(`[MCP SERVER] Backwards-compatible SSE endpoint: ${protocol}://localhost:${config.PORT}/sse`);
    console.log(`[MCP SERVER] Upstream API target: ${config.UPSTREAM_API_URL}`);
  });

  return httpServer;
};

// Bootstrap when run directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('[FATAL] Failed to start MCP Server:', err);
    process.exit(1);
  });
}
