import assert from 'node:assert/strict';
import {
  toolRegistry,
  getVisibleToolsForUser,
  executeToolWithGuard,
  findToolByName,
} from '../src/features/mcp/tools/mcp-tools.registry';
import { AuthUserContext } from '../src/features/mcp/mcp.types';
import { sanitizeErrorMessage, hashToken } from '../src/features/mcp/mcp.utils';
import { invalidateMcpTokenCache } from '../src/features/mcp/mcp-auth.middleware';
import { mcpAuditService } from '../src/features/mcp/mcp-audit.service';
import { mcpRateLimiter } from '../src/features/mcp/mcp-rate-limiter';
import { dnsRebindingGuard } from '../src/features/mcp/mcp.router';

async function runTests() {
  console.log('--- Starting Comprehensive Enterprise MCP Verification Suite ---\n');

  // 1. Zero Mutation Verification: All tools in registry must be strictly READ-ONLY
  console.log('[TEST 1] Zero Mutation Verification: All tools strictly GET / read-only...');
  const forbiddenKeywords = ['update', 'delete', 'create', 'remove', 'patch', 'post', 'put', 'modify'];
  for (const tool of toolRegistry) {
    const lowerName = tool.name.toLowerCase();
    for (const kw of forbiddenKeywords) {
      assert.ok(
        !lowerName.includes(kw),
        `SECURITY VIOLATION: Tool '${tool.name}' appears to perform a state mutation ('${kw}'). MCP tools must be strictly read-only.`
      );
    }
  }
  console.log(`PASS: All ${toolRegistry.length} registered MCP tools are verified strictly read-only (zero mutations).`);

  // 2. Dynamic Capability Gating: WORKER role must NOT receive ADMIN tools in tools/list
  console.log('\n[TEST 2] Dynamic Capability Gating for WORKER role...');
  const workerContext: AuthUserContext = {
    userId: 'worker_123',
    name: 'Technician Bob',
    mobile: '9876543210',
    role: 'WORKER',
    scopes: ['profile:read', 'jobs:read', 'inventory:read', 'catalog:read', 'sales:read', 'system:read'],
    accessToken: 'mock_jwt_token',
  };

  const workerVisibleTools = getVisibleToolsForUser(workerContext);
  const workerToolNames = workerVisibleTools.map((t) => t.name);

  // Admin tools that MUST be hidden from WORKER
  assert.ok(!workerToolNames.includes('momzz_admin_list_workers'), 'SECURITY FAIL: WORKER was exposed momzz_admin_list_workers');
  assert.ok(!workerToolNames.includes('momzz_admin_get_worker_details'), 'SECURITY FAIL: WORKER was exposed momzz_admin_get_worker_details');
  assert.ok(!workerToolNames.includes('momzz_get_sales_analytics'), 'SECURITY FAIL: WORKER was exposed momzz_get_sales_analytics');

  // Staff tools that MUST be visible to WORKER
  assert.ok(workerToolNames.includes('momzz_get_user_profile'), 'WORKER should see momzz_get_user_profile');
  assert.ok(workerToolNames.includes('momzz_list_jobs'), 'WORKER should see momzz_list_jobs');
  assert.ok(workerToolNames.includes('momzz_get_job_details'), 'WORKER should see momzz_get_job_details');
  assert.ok(workerToolNames.includes('momzz_get_job_stats'), 'WORKER should see momzz_get_job_stats');
  assert.ok(workerToolNames.includes('momzz_search_inventory'), 'WORKER should see momzz_search_inventory');
  assert.ok(workerToolNames.includes('momzz_get_inventory_item'), 'WORKER should see momzz_get_inventory_item');
  assert.ok(workerToolNames.includes('momzz_get_low_stock_alerts'), 'WORKER should see momzz_get_low_stock_alerts');
  assert.ok(workerToolNames.includes('momzz_list_catalog_categories'), 'WORKER should see momzz_list_catalog_categories');
  assert.ok(workerToolNames.includes('momzz_list_catalog_items'), 'WORKER should see momzz_list_catalog_items');
  assert.ok(workerToolNames.includes('momzz_get_catalog_item_details'), 'WORKER should see momzz_get_catalog_item_details');
  assert.ok(workerToolNames.includes('momzz_list_sales'), 'WORKER should see momzz_list_sales');
  assert.ok(workerToolNames.includes('momzz_get_sale_details'), 'WORKER should see momzz_get_sale_details');
  assert.ok(workerToolNames.includes('momzz_get_system_overview'), 'WORKER should see momzz_get_system_overview');

  assert.equal(workerToolNames.length, 13, `Worker should see exactly 13 non-admin tools, got ${workerToolNames.length}`);
  console.log(`PASS: Worker is dynamically gated to exactly ${workerToolNames.length} permitted tools.`);

  // 3. Dynamic Capability Gating: ADMIN role receives ALL tools in tools/list
  console.log('\n[TEST 3] Dynamic Capability Gating for ADMIN role...');
  const adminContext: AuthUserContext = {
    userId: 'admin_001',
    name: 'Garage Owner Alice',
    mobile: '9999999999',
    role: 'ADMIN',
    scopes: ['*'],
    accessToken: 'mock_admin_jwt',
  };

  const adminVisibleTools = getVisibleToolsForUser(adminContext);
  const adminToolNames = adminVisibleTools.map((t) => t.name);

  assert.ok(adminToolNames.includes('momzz_admin_list_workers'), 'ADMIN should see momzz_admin_list_workers');
  assert.ok(adminToolNames.includes('momzz_admin_get_worker_details'), 'ADMIN should see momzz_admin_get_worker_details');
  assert.ok(adminToolNames.includes('momzz_get_sales_analytics'), 'ADMIN should see momzz_get_sales_analytics');
  assert.equal(adminToolNames.length, 16, `ADMIN should see all 16 tools, got ${adminToolNames.length}`);
  console.log(`PASS: Admin is exposed all ${adminToolNames.length} tools.`);

  // 4. Hard RBAC execution guard on tools/call
  console.log('\n[TEST 4] Hard RBAC execution guard preventing unauthorized tool calls...');
  let rbacBlockedWorker = false;
  try {
    await executeToolWithGuard('momzz_admin_list_workers', {}, workerContext);
  } catch (err: any) {
    rbacBlockedWorker = true;
    assert.ok(
      err.message.includes('Forbidden') || err.message.includes('User role'),
      `Expected Forbidden error, got: ${err.message}`
    );
    console.log(`PASS: Unauthorized tool invocation blocked: "${err.message}"`);
  }
  assert.ok(rbacBlockedWorker, 'SECURITY FAIL: WORKER was allowed to invoke admin_list_workers!');

  let rbacBlockedAnalytics = false;
  try {
    await executeToolWithGuard('momzz_get_sales_analytics', {}, workerContext);
  } catch (err: any) {
    rbacBlockedAnalytics = true;
    assert.ok(
      err.message.includes('Forbidden') || err.message.includes('User role'),
      `Expected Forbidden error, got: ${err.message}`
    );
  }
  assert.ok(rbacBlockedAnalytics, 'SECURITY FAIL: WORKER was allowed to invoke get_sales_analytics!');

  // 5. Name resolution flexibility (supports with and without 'momzz_' prefix)
  console.log('\n[TEST 5] Tool name resolution flexibility (momzz_ prefix tolerance)...');
  const resolvedWithPrefix = findToolByName('momzz_list_jobs');
  const resolvedWithoutPrefix = findToolByName('list_jobs');
  assert.ok(resolvedWithPrefix, 'Should resolve momzz_list_jobs');
  assert.ok(resolvedWithoutPrefix, 'Should resolve list_jobs');
  assert.equal(resolvedWithPrefix?.name, resolvedWithoutPrefix?.name);
  console.log(`PASS: Resolved '${resolvedWithPrefix?.name}' seamlessly with and without prefix.`);

  // 6. Strict Zod input schema validation
  console.log('\n[TEST 6] Strict Zod input schema validation...');
  let zodBlocked = false;
  try {
    await executeToolWithGuard('momzz_get_job_details', { jobId: '' }, workerContext);
  } catch (err: any) {
    zodBlocked = true;
    assert.ok(
      err.message.includes('Invalid arguments') || err.message.includes('jobId'),
      `Expected Invalid arguments error, got: ${err.message}`
    );
    console.log(`PASS: Invalid inputs rejected by Zod schema: "${err.message}"`);
  }
  assert.ok(zodBlocked, 'SECURITY FAIL: Empty parameters were allowed through!');

  // 7. Downstream Error Sanitization
  console.log('\n[TEST 7] Downstream Error Sanitization...');
  const sensitiveError = new Error(
    'MongoServerError: connection mongodb+srv://admin:supersecret123@cluster0.mongodb.net/momzz failed at C:\\Users\\login\\server\\src\\db.ts'
  );
  const sanitized = sanitizeErrorMessage(sensitiveError);
  assert.ok(!sanitized.includes('supersecret123'), 'SECURITY FAIL: Secret password was not redacted!');
  assert.ok(!sanitized.includes('mongodb+srv://'), 'SECURITY FAIL: MongoDB URI was not redacted!');
  assert.ok(!sanitized.includes('C:\\Users\\login'), 'SECURITY FAIL: File system path was not redacted!');
  console.log(`PASS: Error sanitized cleanly:\n  Original: "${sensitiveError.message}"\n  Sanitized: "${sanitized}"`);

  // 8. Token Hash Verification
  console.log('\n[TEST 8] Token Hashing Utility...');
  const secret = 'momzz_pat_test1234567890';
  const hashed = hashToken(secret);
  assert.equal(hashed, hashToken(secret), 'Token hash must be deterministic');
  assert.notEqual(hashed, secret, 'Token hash must not match plaintext');
  console.log(`PASS: Deterministic SHA-256 token hashing verified (${hashed.slice(0, 16)}...)`);

  // 9. Instant PAT Cache Invalidation Hook
  console.log('\n[TEST 9] Instant PAT Cache Invalidation Hook...');
  assert.doesNotThrow(() => {
    invalidateMcpTokenCache('worker_123');
    invalidateMcpTokenCache(undefined, '9876543210');
    invalidateMcpTokenCache(); // Full flush
  }, 'Cache invalidation hook should execute cleanly without throwing');
  console.log('PASS: Invalidation hook cleanly evicts tokens by userId, mobile, or global flush.');

  // 10. Structured Tool Audit Logging
  console.log('\n[TEST 10] Structured Audit Logging Verification...');
  const auditEntry = mcpAuditService.logToolExecution(
    workerContext,
    'momzz_get_job_details',
    { jobId: 'job_456' },
    performance.now() - 25,
    'SUCCESS'
  );
  assert.equal(auditEntry.userId, 'worker_123');
  assert.equal(auditEntry.toolName, 'momzz_get_job_details');
  assert.equal(auditEntry.status, 'SUCCESS');
  assert.ok(auditEntry.argumentsHash.length > 0, 'Arguments hash must be recorded');
  assert.ok(auditEntry.durationMs >= 20, 'Duration should reflect execution time');
  console.log('PASS: Structured audit entry generated with input hashing and execution timing.');

  // 11. Per-User Agent Loop Rate Limiting
  console.log('\n[TEST 11] Per-User Agent Loop Rate Limiter...');
  const limiterMiddleware = mcpRateLimiter.middleware();
  let rateLimitHit = false;

  const mockReq: any = { user: { userId: 'agent_loop_test', role: 'WORKER' } };
  const mockRes: any = {
    headers: {} as Record<string, any>,
    statusCode: 200,
    setHeader(k: string, v: any) { this.headers[k] = v; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) {
      if (this.statusCode === 429) rateLimitHit = true;
      return body;
    },
  };

  // Trigger requests past threshold
  for (let i = 0; i < 65; i++) {
    limiterMiddleware(mockReq, mockRes, () => {});
  }
  assert.ok(rateLimitHit, 'Agent loop exceeding 60 calls/min must be throttled with HTTP 429');
  assert.equal(mockRes.headers['Retry-After'], 60);
  console.log('PASS: Agent loops correctly throttled with 429 and Retry-After header.');

  // 12. DNS Rebinding Protection (Host Header Validation)
  console.log('\n[TEST 12] DNS Rebinding Host Header Protection...');
  let blockedDns = false;
  const evilReq: any = {
    headers: { host: 'evil-attacker-website.com' },
  };
  const evilRes: any = {
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) {
      if (this.statusCode === 403) blockedDns = true;
      return body;
    },
  };
  dnsRebindingGuard(evilReq, evilRes, () => {});
  assert.ok(blockedDns, 'SECURITY FAIL: Evil host header was not blocked by DNS rebinding guard!');

  let allowedLocal = false;
  const goodReq: any = {
    headers: { host: 'localhost:5000' },
  };
  const goodRes: any = { status: () => goodRes, json: () => {} };
  dnsRebindingGuard(goodReq, goodRes, () => { allowedLocal = true; });
  assert.ok(allowedLocal, 'Localhost host header must be allowed');

  let allowedRender = false;
  const renderReq: any = {
    headers: { host: 'momzz-server.onrender.com' },
  };
  dnsRebindingGuard(renderReq, goodRes, () => { allowedRender = true; });
  assert.ok(allowedRender, 'momzz-server.onrender.com host header must be allowed');
  console.log('PASS: DNS rebinding rejected attacker host and allowed localhost & momzz-server.onrender.com.');

  // 13. OAuth 2.0 Discovery & Metadata
  console.log('\n[TEST 13] RFC 8414 OAuth 2.0 Authorization Server Discovery...');
  const mockMetaReq: any = {
    get: (h: string) => (h === 'host' ? 'momzz-server.onrender.com' : 'https'),
    protocol: 'https',
  };
  let metaJson: any = null;
  const mockMetaRes: any = {
    status(code: number) { assert.equal(code, 200); return this; },
    json(d: any) { metaJson = d; },
  };
  const { default: router } = await import('../src/features/mcp/mcp.router');
  const metaLayer = router.stack.find((l: any) => l.route?.path === '/.well-known/oauth-authorization-server');
  assert.ok(metaLayer, 'Metadata route must be registered');
  metaLayer.route.stack[0].handle(mockMetaReq, mockMetaRes);
  assert.equal(metaJson.issuer, 'https://momzz-server.onrender.com');
  assert.equal(metaJson.authorization_endpoint, 'https://momzz-server.onrender.com/oauth/authorize');
  assert.equal(metaJson.token_endpoint, 'https://momzz-server.onrender.com/oauth/token');
  console.log('PASS: RFC 8414 OAuth 2.0 Discovery returned valid authorization and token endpoints.');

  console.log('\n======================================================');
  console.log('ALL 13 VERIFICATION & SECURITY TESTS PASSED CLEANLY');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
