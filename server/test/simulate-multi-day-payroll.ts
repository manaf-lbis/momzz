import mongoose from 'mongoose';
import assert from 'assert';
import User from '../src/models/User.model';
import WageAdjustment from '../src/models/WageAdjustment.model';
import GarageHoliday from '../src/models/GarageHoliday.model';
import WageTransaction from '../src/models/WageTransaction.model';
import { PayrollService, OT_HOURLY_RATE, formatDateStr } from '../src/features/payroll/payroll.service';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/momzz';

async function runMultiDaySimulation() {
  console.log('=== Starting Full Multi-Day Localhost Payroll Simulation ===\n');

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB:', MONGO_URI);

  // 1. Setup clean test workers
  const testWorkerMobile = '9999900001';
  const testWorker2Mobile = '9999900002';
  const testAdminMobile = '9999900000';

  await User.deleteMany({ mobile: { $in: [testWorkerMobile, testWorker2Mobile, testAdminMobile] } });

  const admin = await User.create({
    name: 'Admin Tester',
    mobile: testAdminMobile,
    password: 'password123',
    role: 'ADMIN',
    isApproved: true,
    status: 'ACTIVE',
  });

  const worker = await User.create({
    name: 'Ramesh Mechanic',
    mobile: testWorkerMobile,
    password: 'password123',
    role: 'WORKER',
    dailyWage: 870, // Base wage ₹870
    isApproved: true,
    status: 'ACTIVE',
    createdAt: new Date('2026-10-19T00:00:00Z'),
  });

  const worker2 = await User.create({
    name: 'Suresh Helper',
    mobile: testWorker2Mobile,
    password: 'password123',
    role: 'WORKER',
    dailyWage: 650, // Base wage ₹650
    isApproved: true,
    status: 'ACTIVE',
    createdAt: new Date('2026-10-19T00:00:00Z'),
  });

  const workerId = worker._id.toString();
  const worker2Id = worker2._id.toString();
  const adminId = admin._id.toString();

  // Clean existing payroll records for these workers
  await WageAdjustment.deleteMany({ workerId: { $in: [worker._id, worker2._id] } });
  await WageTransaction.deleteMany({ workerId: { $in: [worker._id, worker2._id] } });
  await GarageHoliday.deleteMany({ date: { $in: ['2026-10-22', '2026-10-25'] } });

  console.log('✓ Test workers created. Worker 1: Ramesh (₹870/d), Worker 2: Suresh (₹650/d)\n');

  // --- DAY 1-7 SIMULATION: First 7-Day Cycle ---
  // Cycle dates: 2026-10-19 (Mon) to 2026-10-25 (Sun)
  // Day 1: 2026-10-19 (Mon) -> Normal Working Day (Present, +₹870)
  // Day 2: 2026-10-20 (Tue) -> Full Day Leave (Floor-100 penalty -> ₹800 deduction, net ₹70)
  // Day 3: 2026-10-21 (Wed) -> Half Day Leave (Half to next 10: 870/2 = 435 -> 440 earned, 430 deduction)
  // Day 4: 2026-10-22 (Thu) -> Garage Holiday (Diwali, 100% Paid, +₹870)
  // Day 5: 2026-10-23 (Fri) -> Normal Working Day (+₹870) + 2hr Overtime claimed and APPROVED (+₹300)
  // Day 6: 2026-10-24 (Sat) -> Normal Working Day (+₹870) + Mid-cycle Cash Advance taken (-₹1000)
  // Day 7: 2026-10-25 (Sun) -> Sunday Off (+₹0 base wage)

  console.log('--- [STAGE 1] Marking Full Leave on 2026-10-20 (Floor-100 Rule) ---');
  const leaveRes1 = await PayrollService.markBatchLeave({
    workerIds: [workerId],
    dates: '2026-10-20',
    type: 'FULL_LEAVE',
    note: 'Family function',
  });
  assert.strictEqual(leaveRes1.recordsCount, 1);
  assert.strictEqual(leaveRes1.results[0].deductionAmount, 800, '₹870 wage full leave deduction must be ₹800');
  assert.strictEqual(leaveRes1.results[0].netDayWage, 70, '₹870 - ₹800 = ₹70 net day wage');
  console.log('✓ PASS: Full leave floor-100 penalty deduction correctly applied (₹800 deduction, ₹70 earned).');

  console.log('\n--- [STAGE 2] Marking Half-Day Leave on 2026-10-21 (Round to Next 10 Rule) ---');
  const leaveRes2 = await PayrollService.markBatchLeave({
    workerIds: [workerId],
    dates: '2026-10-21',
    type: 'HALF_LEAVE',
    note: 'Doctor visit half day',
  });
  assert.strictEqual(leaveRes2.results[0].deductionAmount, 430, 'Half day deduction must be ₹430 (₹440 earned)');
  assert.strictEqual(leaveRes2.results[0].netDayWage, 440, 'Half day earned must be ₹440');
  console.log('✓ PASS: Half day leave rounded up to next 10 correctly (₹440 earned, ₹430 deduction).');

  console.log('\n--- [STAGE 3] Declaring Paid Garage Holiday on 2026-10-22 ---');
  const holiday = await GarageHoliday.findOneAndUpdate(
    { date: '2026-10-22' },
    { date: '2026-10-22', title: 'Diwali Festival', isPaid: true, createdBy: admin._id },
    { upsert: true, new: true }
  );
  assert.strictEqual(holiday.title, 'Diwali Festival');
  console.log('✓ PASS: Garage holiday declared successfully (100% paid).');

  console.log('\n--- [STAGE 4] Worker Claims Overtime & Admin Review (₹150/hr) ---');
  // Worker submits 2.5 hours claim -> integer truncated to 2 hours
  const otClaimRes = await PayrollService.claimOvertime({
    workerId,
    date: '2026-10-23',
    otHours: 2.7, // Should floor to 2
    note: 'Emergency engine job',
  });
  assert.strictEqual(otClaimRes.claim.otHours, 2, 'OT must be truncated to whole integer hours');
  assert.strictEqual(otClaimRes.claim.status, 'PENDING', 'New OT claim must start as PENDING');
  console.log('✓ PASS: Worker claimed 2 hours OT. Truncated minutes correctly, status is PENDING.');

  // Verify that PENDING OT is EXCLUDED from net dues
  let sheetPreApproval = await PayrollService.getWorkerSingleSheet({
    workerId,
    startDate: '2026-10-19',
    endDate: '2026-10-25',
    includeSettledHistory: true,
  });
  assert.strictEqual(sheetPreApproval.kpis.totalApprovedOtAmount, 0, 'Pending OT must NOT be included in earnings');
  console.log('✓ PASS: Unapproved OT is properly excluded from net dues.');

  // Admin Approves the claim
  await PayrollService.reviewOtClaim({
    claimId: otClaimRes.claim._id.toString(),
    status: 'APPROVED',
    reviewedBy: adminId,
    note: 'Verified work logs',
  });
  console.log('✓ PASS: Admin approved OT claim.');

  console.log('\n--- [STAGE 5] Recording Cash Advance Taken ---');
  const advanceRes = await PayrollService.recordCashAdvance({
    workerId,
    amount: 1000,
    date: '2026-10-24',
    notes: 'Festival advance',
    recordedByName: 'Admin Tester',
  });
  assert.strictEqual(advanceRes.advance.amount, 1000);
  console.log('✓ PASS: ₹1000 cash advance recorded for worker.');

  console.log('\n--- [STAGE 6] Verifying 7-Day Accrual Calculation ---');
  const sheetCycle1 = await PayrollService.getWorkerSingleSheet({
    workerId,
    startDate: '2026-10-19',
    endDate: '2026-10-25',
    includeSettledHistory: true,
  });

  // Expected math for Cycle 1 (2026-10-19 to 2026-10-25):
  // Day 1 (Mon, Oct 19): Working Day -> ₹870
  // Day 2 (Tue, Oct 20): Full Leave -> ₹870 - ₹800 deduction = ₹70
  // Day 3 (Wed, Oct 21): Half Leave -> ₹870 - ₹430 deduction = ₹440
  // Day 4 (Thu, Oct 22): Holiday -> ₹870
  // Day 5 (Fri, Oct 23): Working Day -> ₹870 + 2h OT (₹300) = ₹1170
  // Day 6 (Sat, Oct 24): Working Day -> ₹870 (-₹1000 advance taken)
  // Day 7 (Sun, Oct 25): Sunday Off -> ₹0
  // Gross Wages: 870 * 4 + 870 + 870 = ₹5220
  // Leave Deductions: 800 + 430 = ₹1230
  // Net Base Wages: 5220 - 1230 = ₹3990 (Check: 870 + 70 + 440 + 870 + 870 + 870 + 0 = 3990)
  // Approved OT Amount: 2 * 150 = ₹300
  // Total Earnings: 3990 + 300 = ₹4290
  // Advances Taken: ₹1000
  // Net Payable Dues: 4290 - 1000 = ₹3290!

  console.log('Calculated Cycle 1 KPIs:');
  console.log('  Working Days:', sheetCycle1.kpis.totalWorkingDays);
  console.log('  Sundays:', sheetCycle1.kpis.totalSundays);
  console.log('  Holidays:', sheetCycle1.kpis.totalHolidayDays);
  console.log('  Gross Wages: ₹' + sheetCycle1.kpis.grossWages);
  console.log('  Leave Deductions: -₹' + sheetCycle1.kpis.totalLeaveDeductions);
  console.log('  Net Base Wages: ₹' + sheetCycle1.kpis.netBaseWages);
  console.log('  Approved OT: +₹' + sheetCycle1.kpis.totalApprovedOtAmount);
  console.log('  Cash Advances: -₹' + sheetCycle1.kpis.totalUnsettledAdvances);
  console.log('  Net Payable: ₹' + sheetCycle1.kpis.netPayable);

  assert.strictEqual(sheetCycle1.kpis.totalWorkingDays, 3, 'Should have 3 normal working days (Oct 19, 23, 24)');
  assert.strictEqual(sheetCycle1.kpis.totalSundays, 1, 'Should have 1 Sunday');
  assert.strictEqual(sheetCycle1.kpis.totalHolidayDays, 1, 'Should have 1 Paid Holiday');
  assert.strictEqual(sheetCycle1.kpis.totalFullLeaveDays, 1, 'Should have 1 Full Leave');
  assert.strictEqual(sheetCycle1.kpis.totalHalfDays, 1, 'Should have 1 Half Day');
  assert.strictEqual(sheetCycle1.kpis.netBaseWages, 3990, 'Net base wages must be ₹3990');
  assert.strictEqual(sheetCycle1.kpis.totalApprovedOtAmount, 300, 'Approved OT must be ₹300');
  assert.strictEqual(sheetCycle1.kpis.totalUnsettledAdvances, 1000, 'Advance must be ₹1000');
  assert.strictEqual(sheetCycle1.kpis.netPayable, 3290, 'Net Payable must be exactly ₹3290');
  console.log('✓ PASS: All 7-day financial calculations match down to the exact rupee!');

  console.log('\n--- [STAGE 7] Multi-Worker Batch Leave Marking ---');
  const batchRes = await PayrollService.markBatchLeave({
    workerIds: [workerId, worker2Id],
    dates: '2026-10-26',
    type: 'FULL_LEAVE',
    note: 'Workshop cleaning holiday leave',
  });
  assert.strictEqual(batchRes.recordsCount, 2, 'Batch leave should create 2 records');
  // Worker 1 (₹870) -> ₹800 deduction
  // Worker 2 (₹650) -> ₹600 deduction
  const w1Record = batchRes.results.find((r: any) => r.workerId.toString() === workerId)!;
  const w2Record = batchRes.results.find((r: any) => r.workerId.toString() === worker2Id)!;
  assert.strictEqual(w1Record.deductionAmount, 800, 'Worker 1 (₹870) deduction must be ₹800');
  assert.strictEqual(w2Record.deductionAmount, 600, 'Worker 2 (₹650) deduction must be ₹600');
  console.log('✓ PASS: Batch leave for multiple workers applied respective floor penalties correctly.');

  console.log('\n--- [STAGE 8] Partial Settlement & Carried Forward Balance ---');
  // Settle Cycle 1 through 2026-10-25: Net dues are ₹3290.
  // Admin pays partial settlement: ₹2000.
  // Carried forward balance should be ₹1290!
  const settleRes = await PayrollService.settlePayroll({
    workerId,
    endDate: '2026-10-25',
    amountPaid: 2000,
    paymentMethod: 'UPI',
    referenceNote: 'UPI/MOMZZ/1029384',
    settledByName: 'Admin Tester',
  });
  assert.strictEqual(settleRes.netPayable, 3290);
  assert.strictEqual(settleRes.amountPaid, 2000);
  assert.strictEqual(settleRes.carriedForwardBalance, 1290, 'Carried forward remainder must be ₹1290');
  console.log('✓ PASS: Partial settlement logged. Paid ₹2000, Carried Forward ₹1290.');

  console.log('\n--- [STAGE 9] Dynamic Unsettled Ledger After Settlement ---');
  // Refresh worker and check new unsettled window starting on 2026-10-26:
  // If we query unsettled dues through 2026-10-25 (the settled date):
  const settledDuesCheck = await PayrollService.getWorkerSingleSheet({
    workerId,
    endDate: '2026-10-25',
    includeSettledHistory: false,
  });
  // Since all days up to 2026-10-25 are settled, days in cycle are 0, and netPayable is carriedForwardBalance (₹1290)
  assert.strictEqual(settledDuesCheck.kpis.netBaseWages, 0, 'No unsettled base wages for settled period');
  assert.strictEqual(settledDuesCheck.kpis.previousBalanceCarriedForward, 1290, 'Previous carried forward must be ₹1290');
  assert.strictEqual(settledDuesCheck.kpis.netPayable, 1290, 'Net payable should be the carried forward balance ₹1290');
  console.log('✓ PASS: Unsettled dues immediately after settlement correctly show carried forward balance.');

  console.log('\n--- [STAGE 10] New Accrual Cycle (2026-10-26 to 2026-10-28) ---');
  // Day 8: 2026-10-26 (Mon) -> Marked Full Leave in Stage 7 (₹800 deduction, ₹70 earned)
  // Day 9: 2026-10-27 (Tue) -> Normal Working Day (+₹870)
  // Day 10: 2026-10-28 (Wed) -> Normal Working Day (+₹870)
  // Net base wages: 70 + 870 + 870 = ₹1810
  // Previous carried forward balance: ₹1290
  // Total Net Payable: 1810 + 1290 = ₹3100!
  const sheetCycle2 = await PayrollService.getWorkerSingleSheet({
    workerId,
    startDate: '2026-10-26',
    endDate: '2026-10-28',
    includeSettledHistory: false,
  });
  assert.strictEqual(sheetCycle2.kpis.netBaseWages, 1810, 'Net base wages for Day 8-10 should be ₹1810');
  assert.strictEqual(sheetCycle2.kpis.previousBalanceCarriedForward, 1290, 'Should include ₹1290 carried forward');
  assert.strictEqual(sheetCycle2.kpis.netPayable, 3100, 'Total net payable must be ₹3100');
  console.log('✓ PASS: New cycle seamlessly picked up carried forward balance and new daily accruals!');

  console.log('\n--- [STAGE 11] Historical Wage Versioning ---');
  // Admin updates wage to ₹1000 with effective date 2026-10-29 using repository
  const { PayrollRepository } = await import('../src/features/payroll/payroll.repository');
  await PayrollRepository.updateWorkerWage(workerId, 1000, new Date('2026-10-29T00:00:00Z'));

  // Check wage before Oct 29 (should be 870) and on/after Oct 29 (should be 1000)
  const sheetOct28 = await PayrollService.getWorkerSingleSheet({
    workerId,
    startDate: '2026-10-28',
    endDate: '2026-10-28',
  });
  assert.strictEqual(sheetOct28.days[0].baseWage, 870, 'Wage on Oct 28 must remain ₹870');

  const sheetOct29 = await PayrollService.getWorkerSingleSheet({
    workerId,
    startDate: '2026-10-29',
    endDate: '2026-10-29',
  });
  assert.strictEqual(sheetOct29.days[0].baseWage, 1000, 'Wage on Oct 29 must be new wage ₹1000');
  console.log('✓ PASS: Historical wage versioning applies new wage strictly from effective date forward.');

  // Cleanup test accounts
  await User.deleteMany({ mobile: { $in: [testWorkerMobile, testWorker2Mobile, testAdminMobile] } });
  await WageAdjustment.deleteMany({ workerId: { $in: [worker._id, worker2._id] } });
  await WageTransaction.deleteMany({ workerId: { $in: [worker._id, worker2._id] } });
  await GarageHoliday.deleteMany({ date: { $in: ['2026-10-22', '2026-10-25'] } });

  console.log('\n=== ALL MULTI-DAY LOCALHOST SIMULATION TESTS PASSED WITH 100% ACCURACY! ===\n');
  await mongoose.disconnect();
}

runMultiDaySimulation().catch((err) => {
  console.error('\n❌ SIMULATION TEST FAILED:', err);
  process.exit(1);
});
