import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  toolRegistry,
  getVisibleToolsForUser,
  executeToolWithGuard,
  checkScopeMatch,
  isUserAuthorizedForTool,
} from '../src/tools/registry.js';
import { AuthUserContext, hashToken } from '../src/auth/middleware.js';
import { sanitizeErrorMessage } from '../src/services/apiClient.js';

console.log('--- RUNNING ENTERPRISE MCP SECURITY & RBAC VERIFICATION SUITE ---');

// 1. Dynamic Capability Gating (tools/list) Verification
const workerUser: AuthUserContext = {
  userId: 'user_worker_123',
  name: 'Test Technician',
  mobile: '9876543210',
  role: 'WORKER',
  scopes: ['profile:read', 'profile:write', 'jobs:read', 'inventory:read'],
  accessToken: 'mock_jwt_session_worker_token',
};

const adminUser: AuthUserContext = {
  userId: 'user_admin_999',
  name: 'Master Admin',
  mobile: '9999999999',
  role: 'ADMIN',
  scopes: ['*'],
  accessToken: 'mock_jwt_session_admin_token',
};

async function runTests() {
  // Test 1: Worker must NOT see Admin tools in tools/list
  const workerTools = getVisibleToolsForUser(workerUser);
  const workerToolNames = workerTools.map((t) => t.name);

  assert(
    !workerToolNames.includes('admin_list_workers'),
    'FAIL: Worker user must NOT see admin_list_workers in tools/list'
  );
  assert(
    !workerToolNames.includes('admin_get_system_overview'),
    'FAIL: Worker user must NOT see admin_get_system_overview in tools/list'
  );
  assert(
    workerToolNames.includes('get_user_profile'),
    'FAIL: Worker user must see get_user_profile'
  );
  assert(
    workerToolNames.includes('list_jobs'),
    'FAIL: Worker user must see list_jobs'
  );
  console.log('✓ TEST 1 PASSED: Dynamic Capability Gating successfully hid admin tools from WORKER in tools/list.');

  // Test 2: Admin MUST see Admin tools in tools/list
  const adminTools = getVisibleToolsForUser(adminUser);
  const adminToolNames = adminTools.map((t) => t.name);

  assert(
    adminToolNames.includes('admin_list_workers'),
    'FAIL: Admin user must see admin_list_workers in tools/list'
  );
  assert(
    adminToolNames.includes('admin_get_system_overview'),
    'FAIL: Admin user must see admin_get_system_overview in tools/list'
  );
  console.log('✓ TEST 2 PASSED: Admin capability exposure verified in tools/list.');

  // Test 3: Hard Authorization Guard (tools/call)
  let caughtAuthError = false;
  try {
    // Worker attempts to bypass tools/list and directly call admin_list_workers
    await executeToolWithGuard('admin_list_workers', {}, workerUser);
  } catch (err: any) {
    caughtAuthError = true;
    assert(
      err.message.includes('Forbidden') || err.message.includes('role'),
      `Unexpected error message: ${err.message}`
    );
  }
  assert(caughtAuthError, 'FAIL: Hard execution guard did not block unauthorized worker call to admin tool');
  console.log('✓ TEST 3 PASSED: Hard execution guard strictly blocked unauthorized tools/call attempt with structured MCP error.');

  // Test 4: Zod Input Validation on tools/call
  let caughtZodError = false;
  try {
    // Call get_job_details without required jobId
    await executeToolWithGuard('get_job_details', { invalidParam: 123 }, workerUser);
  } catch (err: any) {
    caughtZodError = true;
    assert(
      err.message.includes('Invalid arguments') || err.message.includes('jobId'),
      `Unexpected error message: ${err.message}`
    );
  }
  assert(caughtZodError, 'FAIL: Zod schema validation did not reject missing required parameter');
  console.log('✓ TEST 4 PASSED: Strict Zod schema validation rejected invalid arguments.');

  // Test 5: Sensitive operations strictly excluded
  const dangerousNames = ['reset_password', 'change_password', 'elevate_role', 'delete_database', 'rotate_keys'];
  dangerousNames.forEach((dangerous) => {
    const found = toolRegistry.some((t) => t.name.toLowerCase().includes(dangerous));
    assert(!found, `FAIL: Dangerous operation '${dangerous}' was exposed in the tool registry!`);
  });
  console.log('✓ TEST 5 PASSED: Sensitive operations (password resets, credential rotations, privilege escalation) are strictly excluded from tool registry.');

  // Test 6: SHA-256 Token Hashing determinism
  const rawPat = 'momzz_pat_7b29e012fae841289cf18624ab';
  const hash1 = hashToken(rawPat);
  const hash2 = crypto.createHash('sha256').update(rawPat).digest('hex');
  assert.strictEqual(hash1, hash2, 'FAIL: SHA-256 token hashing mismatch');
  console.log('✓ TEST 6 PASSED: SHA-256 one-way cryptographic token hashing verified.');

  // Test 7: Error sanitization prevents database credentials/paths from leaking
  const sensitiveRawError = new Error(
    'MongoServerError: connect ECONNREFUSED mongodb+srv://momzz_admin:SuperSecretPass123@cluster0.mongodb.net/momzz at c:\\Users\\login\\momzz\\server\\src\\db.ts:42'
  );
  const sanitized = sanitizeErrorMessage(sensitiveRawError);
  assert(
    !sanitized.includes('SuperSecretPass123'),
    'FAIL: Sensitive database credentials leaked in sanitized error message!'
  );
  assert(
    !sanitized.includes('mongodb+srv://'),
    'FAIL: Database URI leaked in sanitized error message!'
  );
  assert(
    !sanitized.includes('c:\\Users\\login'),
    'FAIL: Local system file paths leaked in sanitized error message!'
  );
  console.log('✓ TEST 7 PASSED: Downstream error sanitizer securely stripped internal credentials and system file paths.');

  console.log('\n===============================================================');
  console.log('ALL ENTERPRISE SECURITY & ARCHITECTURAL CHECKS PASSED (7/7)!');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
