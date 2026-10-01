# Momzz API-Based MCP Server

Enterprise Model Context Protocol (MCP) server built with Node.js, TypeScript, and `@modelcontextprotocol/sdk`. It provides secure, token-exchanged tool access to Momzz Vehicle & Task Command API for AI assistants (such as Claude Desktop, Cursor, Antigravity, and other MCP clients).

---

## 1. Authentication & Verification Architecture

```
[ AI Client / Claude ] 
      │
      │ 1. Connects with Client ID (mobile) & Client Secret (MCP token)
      ▼
[ Momzz MCP Server ]
      │
      │ 2. POST /api/auth/mcp-token { clientId, clientSecret }
      ▼
[ Momzz Backend API & MongoDB ]
      │
      │ 3. Verifies token in DB, active status & role permissions
      │ 4. Issues signed session Bearer Token (JWT)
      ▼
[ Momzz MCP Server ]
      │
      │ 5. Executes tools attaching 'Authorization: Bearer <JWT>' to backend requests
      ▼
[ Momzz Upstream Services (/api/jobs, /api/inventory) ]
```

### Key Workflow Highlights
1. **Token Generation from Profile:**
   - Users open **Profile & Preferences** (`/profile`) in Momzz.
   - Click **Generate MCP Token & Client Secret**.
   - The UI displays:
     - **MCP Server URL**: `http://localhost:4000/mcp` (with 1-click **Copy**)
     - **Client ID**: User's login mobile number (with 1-click **Copy**)
     - **Client Secret**: Generated token (with 1-click **Copy** & show/hide toggle)
2. **Instant Token Revocation:**
   - Users can revoke access directly with the **Revoke Token** button in their Profile.
   - Revocation updates `mcpTokenRevoked: true` in MongoDB and immediately invalidates all active sessions.
3. **Session Bearer Token Issuance:**
   - The MCP server requests the Momzz API (`/api/auth/mcp-token`) to authenticate credentials.
   - The Momzz API issues the official session **Bearer Token**.
   - The MCP server injects `Authorization: Bearer <accessToken>` into the request headers for upstream API operations.
4. **OAuth 2.0 Support:**
   - Supports direct `POST /oauth/token` and `POST /token` for clients that use standard OAuth 2.0 Client Credentials grant (`grant_type=client_credentials`).

---

## 2. Connecting AI Clients (Claude Desktop, Cursor, Custom Clients)

### Connect Modal Configuration
When prompted by your MCP client (as in the connection dialog):

- **MCP server URL**: `http://localhost:4000/mcp`
- **Client ID**: Your registered mobile number (e.g. `9876543210`)
- **Client secret**: Your generated MCP Client Secret (e.g. `momzz_pat_...`)

### Claude Desktop Configuration (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "momzz-garage": {
      "url": "http://localhost:4000/mcp",
      "headers": {
        "Authorization": "Bearer momzz_pat_your_client_secret_here",
        "X-Client-Id": "9876543210"
      }
    }
  }
}
```

---

## 3. Running the Server

### Development Mode
```bash
cd mcp-server
npm run dev
```

### Production Build
```bash
cd mcp-server
npm run build
npm start
```

### Automated Security & RBAC Test Suite
```bash
cd mcp-server
npx tsx test/mcp-server.test.ts
```
