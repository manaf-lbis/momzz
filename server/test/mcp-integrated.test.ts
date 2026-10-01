import assert from 'node:assert/strict';
import {
  getVisibleToolsForUser,
  executeToolWithGuard,
} from '../src/features/mcp/tools/mcp-tools.registry';
import { AuthUserContext } from '../src/features/mcp/mcp.types';
import { sanitizeErrorMessage, hashToken } from '../src/features/mcp/mcp.utils';

async function runTests() {
  console.log('--- Starting Integrated MCP Server Security & Functionality Tests ---\n');

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
    // get_job_details requires non-empty jobId string
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

  console.log('\n======================================================');
  console.log('ALL INTEGRATED MCP SECURITY & ARCHITECTURE TESTS PASSED');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
