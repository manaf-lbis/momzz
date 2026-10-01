import { Router, Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

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

const mcpRouter = Router();

// 1. STREAMABLE HTTP TRANSPORT (/mcp) - Recommended Remote MCP Transport
const streamableTransport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // Stateless per spec
});

const streamableServer = createMcpServerInstance();
streamableServer.connect(streamableTransport).catch((err) => {
  console.error('[MCP ERROR] Failed to connect StreamableHTTPServerTransport:', err);
});

mcpRouter.all('/mcp', mcpAuthMiddleware, async (req: Request, res: Response) => {
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

// 2. HTTP + SSE TRANSPORT (/sse & /messages) - Backwards Compatibility
const sseSessions = new Map<
  string,
  { transport: SSEServerTransport; user: AuthUserContext }
>();

mcpRouter.get('/sse', mcpAuthMiddleware, async (req: Request, res: Response) => {
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
    security: {
      strictCORS: true,
      antiConfusedDeputy: true,
      dynamicCapabilityGating: true,
      rbacEnforced: true,
    },
  });
});

export default mcpRouter;
