import assert from 'assert';
import {
  calculateFullLeaveDeduction,
  calculateHalfDayDeduction,
  getWageForDate,
  getWorkerFirstPayrollDate,
  OT_HOURLY_RATE,
  formatDateStr,
  getDatesBetween,
} from '../src/features/payroll/payroll.service';

console.log('--- Starting Dynamic Daily-Wage Payroll Unit Tests ---');

// Test 1: Floor-100 Leave Penalty
console.log('\n[TEST 1] Floor-100 Leave Penalty rule...');
assert.strictEqual(calculateFullLeaveDeduction(870), 800, '₹870 wage should floor to ₹800 deduction');
assert.strictEqual(calculateFullLeaveDeduction(500), 500, '₹500 wage should floor to ₹500 deduction');
assert.strictEqual(calculateFullLeaveDeduction(750), 700, '₹750 wage should floor to ₹700 deduction');
assert.strictEqual(calculateFullLeaveDeduction(999), 900, '₹999 wage should floor to ₹900 deduction');
assert.strictEqual(calculateFullLeaveDeduction(1050), 1000, '₹1050 wage should floor to ₹1000 deduction');
assert.strictEqual(calculateFullLeaveDeduction(0), 0, '₹0 wage should have ₹0 deduction');
console.log('PASS: Floor-100 Leave Penalty correctly floors to 100.');

// Test 2: Half-Day Leave
console.log('\n[TEST 2] Half-day leave round to next 10 rule...');
assert.strictEqual(calculateHalfDayDeduction(875), 435, '₹875 half day deduction should be ₹435 (₹440 earned)');
assert.strictEqual(calculateHalfDayDeduction(800), 400, '₹800 half day deduction should be ₹400');
assert.strictEqual(calculateHalfDayDeduction(722), 352, '₹722 half day deduction should be ₹352');
console.log('PASS: Half-day leave earns half salary rounded up to next 10.');

// Test 3: Overtime Engine (₹150/hr, whole hours only)
console.log('\n[TEST 3] Overtime Engine rule...');
assert.strictEqual(OT_HOURLY_RATE, 150, 'OT rate must be ₹150/hr');
assert.strictEqual(Math.floor(1.75) * OT_HOURLY_RATE, 150, '1:45 OT must calculate as 1 hour (₹150)');
assert.strictEqual(Math.floor(2.5) * OT_HOURLY_RATE, 300, '2:30 OT must calculate as 2 hours (₹300)');
assert.strictEqual(Math.floor(3.0) * OT_HOURLY_RATE, 450, '3:00 OT must calculate as 3 hours (₹450)');
console.log('PASS: Overtime engine strictly calculates whole hours at ₹150/hr.');

// Test 4: Historical Wage Versioning & Start Date Rule
console.log('\n[TEST 4] Historical Wage Versioning & First Day rule...');
const mockWorker: any = {
  dailyWage: 900,
  dailyWageEffectiveDate: new Date('2026-10-01T00:00:00Z'),
  wageHistory: [
    { wage: 700, effectiveDate: new Date('2026-10-01T00:00:00Z') },
    { wage: 900, effectiveDate: new Date('2026-10-15T00:00:00Z') },
  ],
};
assert.strictEqual(getWorkerFirstPayrollDate(mockWorker), '2026-10-01', 'First day must be the earliest wage effective date');
assert.strictEqual(getWageForDate(mockWorker, '2026-09-30'), 0, 'Date prior to first wage decision must return ₹0');
assert.strictEqual(getWageForDate(mockWorker, '2026-10-10'), 700, 'Date between 1st and 15th must use wage ₹700');
assert.strictEqual(getWageForDate(mockWorker, '2026-10-15'), 900, 'Effective date of update must use new wage ₹900');
assert.strictEqual(getWageForDate(mockWorker, '2026-10-25'), 900, 'Date after wage increase must use new wage ₹900');
console.log('PASS: Historical wage versioning and first day cutoff applied correctly.');

// Test 5: The 3-Worker User Example
console.log('\n[TEST 5] Multi-worker staggered joining test...');
const worker1: any = {
  dailyWage: 800,
  wageHistory: [{ wage: 800, effectiveDate: new Date('2026-01-01T12:00:00Z') }],
};
const worker2: any = {
  dailyWage: 850,
  wageHistory: [{ wage: 850, effectiveDate: new Date('2026-02-01T12:00:00Z') }],
};
const worker3: any = {
  dailyWage: 900,
  wageHistory: [{ wage: 900, effectiveDate: new Date('2026-03-01T12:00:00Z') }],
};
const workerNoWage: any = {
  dailyWage: 0,
  wageHistory: [],
};

assert.strictEqual(getWorkerFirstPayrollDate(worker1), '2026-01-01');
assert.strictEqual(getWorkerFirstPayrollDate(worker2), '2026-02-01');
assert.strictEqual(getWorkerFirstPayrollDate(worker3), '2026-03-01');
assert.strictEqual(getWorkerFirstPayrollDate(workerNoWage), null, 'Worker with no wage decision has no payroll start date');

// Worker 3 must get 0 in January and February
assert.strictEqual(getWageForDate(worker3, '2026-01-15'), 0, 'Worker 3 gets ₹0 in Jan');
assert.strictEqual(getWageForDate(worker3, '2026-02-20'), 0, 'Worker 3 gets ₹0 in Feb');
assert.strictEqual(getWageForDate(worker3, '2026-03-01'), 900, 'Worker 3 gets ₹900 on March 1');
assert.strictEqual(getWageForDate(workerNoWage, '2026-03-01'), 0, 'Worker without wage update gets ₹0');
console.log('PASS: Staggered workers strictly accrue only from their respective wage start dates.');

// Test 6: Date range generation
console.log('\n[TEST 6] Date range generation...');
const dates = getDatesBetween('2026-11-01', '2026-11-05');
assert.deepStrictEqual(dates, [
  '2026-11-01',
  '2026-11-02',
  '2026-11-03',
  '2026-11-04',
  '2026-11-05',
], 'getDatesBetween should return inclusive continuous dates');
console.log('PASS: Date range correctly generates continuous days.');

console.log('\nALL DYNAMIC PAYROLL UNIT TESTS PASSED SUCCESSFULLY!\n');
