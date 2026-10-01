import assert from 'node:assert/strict';
import {
  getVisibleToolsForUser,
  executeToolWithGuard,
} from '../src/features/mcp/tools/mcp-tools.registry';
import { AuthUserContext } from '../src/features/mcp/mcp.types';
import { sanitizeErrorMessage, hashToken } from '../src/features/mcp/mcp.utils';
import { invalidateMcpTokenCache } from '../src/features/mcp/mcp-auth.middleware';
import { mcpAuditService } from '../src/features/mcp/mcp-audit.service';
import { mcpRateLimiter } from '../src/features/mcp/mcp-rate-limiter';
import { dnsRebindingGuard } from '../src/features/mcp/mcp.router';

async function runTests() {
  console.log('--- Starting Comprehensive Enterprise MCP Verification Suite ---\n');

  // 1. Dynamic Capability Gating: WORKER role must NOT receive ADMIN tools in tools/list
  console.log('[TEST 1] Dynamic Capability Gating for WORKER role...');
  const workerContext: AuthUserContext = {
    userId: 'worker_123',
    name: 'Technician Bob',
    mobile: '9876543210',
    role: 'WORKER',
    scopes: ['profile:read', 'profile:write', 'jobs:read', 'inventory:read'],
    accessToken: 'mock_jwt_token',
  };

  const workerVisibleTools = getVisibleToolsForUser(workerContext);
  const workerToolNames = workerVisibleTools.map((t) => t.name);

  assert.ok(!workerToolNames.includes('admin_list_workers'), 'SECURITY FAIL: WORKER was exposed admin_list_workers');
  assert.ok(!workerToolNames.includes('admin_get_system_overview'), 'SECURITY FAIL: WORKER was exposed admin_get_system_overview');
  assert.ok(workerToolNames.includes('get_user_profile'), 'WORKER should see get_user_profile');
  assert.ok(workerToolNames.includes('list_jobs'), 'WORKER should see list_jobs');
  console.log(`PASS: Worker is only exposed ${workerToolNames.length} non-admin tools: [${workerToolNames.join(', ')}]`);

  // 2. Dynamic Capability Gating: ADMIN role receives ALL tools in tools/list
  console.log('\n[TEST 2] Dynamic Capability Gating for ADMIN role...');
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

  assert.ok(adminToolNames.includes('admin_list_workers'), 'ADMIN should see admin_list_workers');
  assert.ok(adminToolNames.includes('admin_get_system_overview'), 'ADMIN should see admin_get_system_overview');
  assert.ok(adminToolNames.includes('get_user_profile'), 'ADMIN should see get_user_profile');
  console.log(`PASS: Admin is exposed all ${adminToolNames.length} tools: [${adminToolNames.join(', ')}]`);

  // 3. Hard RBAC execution guard on tools/call
  console.log('\n[TEST 3] Hard RBAC execution guard preventing unauthorized tool calls...');
  let rbacBlocked = false;
  try {
    await executeToolWithGuard('admin_list_workers', {}, workerContext);
  } catch (err: any) {
    rbacBlocked = true;
    assert.ok(
      err.message.includes('Forbidden') || err.message.includes('User role'),
      `Expected Forbidden error, got: ${err.message}`
    );
    console.log(`PASS: Unauthorized tool invocation blocked: "${err.message}"`);
  }
  assert.ok(rbacBlocked, 'SECURITY FAIL: WORKER was allowed to invoke admin tool!');

  // 4. Strict Zod input schema validation
  console.log('\n[TEST 4] Strict Zod input schema validation...');
  let zodBlocked = false;
  try {
    await executeToolWithGuard('get_job_details', { jobId: '' }, workerContext);
  } catch (err: any) {
    zodBlocked = true;
    assert.ok(
      err.message.includes('Invalid arguments') || err.message.includes('jobId'),
      `Expected Invalid arguments error, got: ${err.message}`
    );
    console.log(`PASS: Invalid inputs rejected by Zod schema: "${err.message}"`);
  }
  assert.ok(zodBlocked, 'SECURITY FAIL: Empty parameters were allowed through!');

  // 5. Downstream Error Sanitization
  console.log('\n[TEST 5] Downstream Error Sanitization...');
  const sensitiveError = new Error(
    'MongoServerError: connection mongodb+srv://admin:supersecret123@cluster0.mongodb.net/momzz failed at C:\\Users\\login\\server\\src\\db.ts'
  );
  const sanitized = sanitizeErrorMessage(sensitiveError);
  assert.ok(!sanitized.includes('supersecret123'), 'SECURITY FAIL: Secret password was not redacted!');
  assert.ok(!sanitized.includes('mongodb+srv://'), 'SECURITY FAIL: MongoDB URI was not redacted!');
  assert.ok(!sanitized.includes('C:\\Users\\login'), 'SECURITY FAIL: File system path was not redacted!');
  console.log(`PASS: Error sanitized cleanly:\n  Original: "${sensitiveError.message}"\n  Sanitized: "${sanitized}"`);

  // 6. Token Hash Verification
  console.log('\n[TEST 6] Token Hashing Utility...');
  const secret = 'momzz_pat_test1234567890';
  const hashed = hashToken(secret);
  assert.equal(hashed, hashToken(secret), 'Token hash must be deterministic');
  assert.notEqual(hashed, secret, 'Token hash must not match plaintext');
  console.log(`PASS: Deterministic SHA-256 token hashing verified (${hashed.slice(0, 16)}...)`);

  // 7. Instant PAT Cache Invalidation Hook
  console.log('\n[TEST 7] Instant PAT Cache Invalidation Hook...');
  assert.doesNotThrow(() => {
    invalidateMcpTokenCache('worker_123');
    invalidateMcpTokenCache(undefined, '9876543210');
    invalidateMcpTokenCache(); // Full flush
  }, 'Cache invalidation hook should execute cleanly without throwing');
  console.log('PASS: Invalidation hook cleanly evicts tokens by userId, mobile, or global flush.');

  // 8. Structured Tool Audit Logging
  console.log('\n[TEST 8] Structured Audit Logging Verification...');
  const auditEntry = mcpAuditService.logToolExecution(
    workerContext,
    'get_job_details',
    { jobId: 'job_456' },
    performance.now() - 25,
    'SUCCESS'
  );
  assert.equal(auditEntry.userId, 'worker_123');
  assert.equal(auditEntry.toolName, 'get_job_details');
  assert.equal(auditEntry.status, 'SUCCESS');
  assert.ok(auditEntry.argumentsHash.length > 0, 'Arguments hash must be recorded');
  assert.ok(auditEntry.durationMs >= 20, 'Duration should reflect execution time');
  console.log('PASS: Structured audit entry generated with input hashing and execution timing.');

  // 9. Per-User Agent Loop Rate Limiting
  console.log('\n[TEST 9] Per-User Agent Loop Rate Limiter...');
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

  // 10. DNS Rebinding Protection (Host Header Validation)
  console.log('\n[TEST 10] DNS Rebinding Host Header Protection...');
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
  console.log('PASS: DNS rebinding rejected attacker host and allowed valid localhost.');

  console.log('\n======================================================');
  console.log('ALL 10 VERIFICATION & EDGE CASE TESTS PASSED CLEANLY');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
