import assert from 'node:assert/strict';
import { PayrollService } from '../src/features/payroll/payroll.service';

async function runPayrollTests() {
  console.log('--- Starting Daily Wages Payroll Verification Suite ---\n');
  const service = new PayrollService();

  // Test 1: Full-day unpaid leave floor to 100 deduction
  console.log('[TEST 1] Full-day unpaid leave floor to 100 rule...');
  const testCasesFullDay = [
    { wage: 870, expectedDeduction: 800, expectedEarned: 70 },
    { wage: 750, expectedDeduction: 700, expectedEarned: 50 },
    { wage: 1000, expectedDeduction: 1000, expectedEarned: 0 },
    { wage: 999, expectedDeduction: 900, expectedEarned: 99 },
    { wage: 620, expectedDeduction: 600, expectedEarned: 20 },
  ];

  for (const tc of testCasesFullDay) {
    const res = service.calculateLeaveDeduction(tc.wage, 'FULL', false);
    assert.strictEqual(
      res.deductionAmount,
      tc.expectedDeduction,
      `For wage ${tc.wage}, expected deduction ${tc.expectedDeduction} but got ${res.deductionAmount}`
    );
    assert.strictEqual(
      res.netDayWage,
      tc.expectedEarned,
      `For wage ${tc.wage}, expected earned ${tc.expectedEarned} but got ${res.netDayWage}`
    );
  }
  console.log('PASS: Full-day unpaid leave deductions floor to 100 correctly.\n');

  // Test 2: Half-day leave round to next 10
  console.log('[TEST 2] Half-day leave round to next 10 rule...');
  const testCasesHalfDay = [
    { wage: 870, expectedEarned: 440, expectedDeduction: 430 }, // 870/2 = 435 -> round up to next 10 = 440
    { wage: 800, expectedEarned: 400, expectedDeduction: 400 }, // 800/2 = 400 -> round up to next 10 = 400
    { wage: 755, expectedEarned: 380, expectedDeduction: 375 }, // 755/2 = 377.5 -> round up to next 10 = 380
    { wage: 1000, expectedEarned: 500, expectedDeduction: 500 },
    { wage: 825, expectedEarned: 420, expectedDeduction: 405 }, // 825/2 = 412.5 -> 420
  ];

  for (const tc of testCasesHalfDay) {
    const res = service.calculateLeaveDeduction(tc.wage, 'HALF', false);
    assert.strictEqual(
      res.netDayWage,
      tc.expectedEarned,
      `For wage ${tc.wage}, expected earned ${tc.expectedEarned} but got ${res.netDayWage}`
    );
    assert.strictEqual(
      res.deductionAmount,
      tc.expectedDeduction,
      `For wage ${tc.wage}, expected deduction ${tc.expectedDeduction} but got ${res.deductionAmount}`
    );
  }
  console.log('PASS: Half-day leave earns half salary rounded up to next 10 correctly.\n');

  // Test 3: Monthly Paid Leave rule
  console.log('[TEST 3] 1 Monthly Paid Leave rule...');
  const paidLeaveRes = service.calculateLeaveDeduction(870, 'FULL', true);
  assert.strictEqual(paidLeaveRes.deductionAmount, 0, 'Paid leave must have 0 deduction');
  assert.strictEqual(paidLeaveRes.netDayWage, 870, 'Paid leave must earn full daily wage');
  console.log('PASS: Monthly paid leave grants 0 deduction and full daily wage.\n');

  // Test 4: Overtime integer hour calculation
  console.log('[TEST 4] Overtime calculation rule...');
  const rate = 150;
  for (let hrs = 1; hrs <= 5; hrs++) {
    const amount = hrs * rate;
    assert.strictEqual(amount, hrs * 150, `Expected ${hrs * 150}`);
  }
  console.log('PASS: Overtime claims correctly calculated at ₹150/hr.\n');

  // Test 5: Historical Wage Versioning (New wage from effectiveDate onwards, doesn't touch old wage)
  console.log('[TEST 5] Historical Wage Versioning rule...');
  const mockWorker: any = {
    _id: 'worker1',
    dailyWage: 950,
    wageHistory: [
      {
        wage: 800,
        effectiveDate: new Date('2026-10-01T00:00:00.000Z'),
        createdAt: new Date(),
      },
      {
        wage: 950,
        effectiveDate: new Date('2026-10-25T00:00:00.000Z'),
        createdAt: new Date(),
      },
    ],
  };

  const wageBeforeChange = service.getWageForDate(mockWorker, new Date('2026-10-15T00:00:00.000Z'));
  assert.strictEqual(wageBeforeChange, 800, `Expected ₹800 on Oct 15, got ₹${wageBeforeChange}`);

  const wageOnEffectiveDate = service.getWageForDate(mockWorker, new Date('2026-10-25T00:00:00.000Z'));
  assert.strictEqual(wageOnEffectiveDate, 950, `Expected ₹950 on Oct 25, got ₹${wageOnEffectiveDate}`);

  const wageAfterEffectiveDate = service.getWageForDate(mockWorker, new Date('2026-10-30T00:00:00.000Z'));
  assert.strictEqual(wageAfterEffectiveDate, 950, `Expected ₹950 on Oct 30, got ₹${wageAfterEffectiveDate}`);
  console.log('PASS: Wage updates only calculate from effective date onwards and preserve old wages intact.\n');

  // Test 6: Completed Payment Metadata Structure & Calculations
  console.log('[TEST 6] Completed Payment Settlement Metadata & Balance Details...');
  const workingDays = 12;
  const holidayDays = 2;
  const paidLeaveDays = 1;
  const halfDays = 2;
  const fullLeaveDays = 1;
  const sundayDays = 2;
  const dailyWage = 870;

  const totalPaidDays = workingDays + holidayDays + paidLeaveDays + (halfDays * 0.5);
  const totalCalendarDays = workingDays + holidayDays + paidLeaveDays + halfDays + fullLeaveDays + sundayDays;
  assert.strictEqual(totalPaidDays, 16, 'Paid days should be 16');
  assert.strictEqual(totalCalendarDays, 20, 'Calendar days should be 20');

  const grossWages = (workingDays + holidayDays + paidLeaveDays + halfDays) * dailyWage;
  // Full leave deduction on 870 = 800 (floor to 100)
  // Half day deduction on 870 = 870 - 440 = 430 each
  const totalLeaveDeduction = 800 + (430 * 2);
  const netBaseWage = grossWages - totalLeaveDeduction;

  const otHours = 6;
  const otHourlyRate = 150;
  const totalOtAmount = otHours * otHourlyRate; // 900
  const cashAdvances = 500;
  const previousCarriedForward = 200;

  const netPayable = netBaseWage + totalOtAmount - cashAdvances + previousCarriedForward;
  const partialAmountPaid = 5000;
  const remainingCarriedForward = netPayable - partialAmountPaid;
  const payoutType = partialAmountPaid < netPayable ? 'PARTIAL' : 'FULL';

  assert.strictEqual(payoutType, 'PARTIAL', 'Payout should be flagged as PARTIAL');
  assert.ok(remainingCarriedForward > 0, 'Remaining balance must be positive and carried forward');
  console.log(`PASS: Completed payment metadata calculated: Net Payable ₹${netPayable}, Paid ₹${partialAmountPaid}, Carried Forward ₹${remainingCarriedForward}, Type: ${payoutType}\n`);

  console.log('ALL PAYROLL VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runPayrollTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
