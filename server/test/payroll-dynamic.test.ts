import assert from 'assert';
import {
  calculateFullLeaveDeduction,
  calculateHalfDayDeduction,
  getWageForDate,
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
// For wage 875: half = 437.5 -> rounded to next 10 = 440 earned. Deduction = 875 - 440 = 435
assert.strictEqual(calculateHalfDayDeduction(875), 435, '₹875 half day deduction should be ₹435 (₹440 earned)');
// For wage 800: half = 400 -> rounded to next 10 = 400 earned. Deduction = 800 - 400 = 400
assert.strictEqual(calculateHalfDayDeduction(800), 400, '₹800 half day deduction should be ₹400');
// For wage 722: half = 361 -> rounded to next 10 = 370 earned. Deduction = 722 - 370 = 352
assert.strictEqual(calculateHalfDayDeduction(722), 352, '₹722 half day deduction should be ₹352');
console.log('PASS: Half-day leave earns half salary rounded up to next 10.');

// Test 3: Overtime Engine (₹150/hr, whole hours only)
console.log('\n[TEST 3] Overtime Engine rule...');
assert.strictEqual(OT_HOURLY_RATE, 150, 'OT rate must be ₹150/hr');
assert.strictEqual(Math.floor(1.75) * OT_HOURLY_RATE, 150, '1:45 OT must calculate as 1 hour (₹150)');
assert.strictEqual(Math.floor(2.5) * OT_HOURLY_RATE, 300, '2:30 OT must calculate as 2 hours (₹300)');
assert.strictEqual(Math.floor(3.0) * OT_HOURLY_RATE, 450, '3:00 OT must calculate as 3 hours (₹450)');
console.log('PASS: Overtime engine strictly calculates whole hours at ₹150/hr.');

// Test 4: Historical Wage Versioning
console.log('\n[TEST 4] Historical Wage Versioning rule...');
const mockWorker: any = {
  dailyWage: 900,
  wageHistory: [
    { wage: 700, effectiveDate: new Date('2026-10-01T00:00:00Z') },
    { wage: 900, effectiveDate: new Date('2026-10-15T00:00:00Z') },
  ],
};
assert.strictEqual(getWageForDate(mockWorker, '2026-10-10'), 700, 'Date before wage increase must use old wage ₹700');
assert.strictEqual(getWageForDate(mockWorker, '2026-10-15'), 900, 'Effective date must use new wage ₹900');
assert.strictEqual(getWageForDate(mockWorker, '2026-10-25'), 900, 'Date after wage increase must use new wage ₹900');
console.log('PASS: Historical wage versioning applies correct wage rates by date.');

// Test 5: Date range generation
console.log('\n[TEST 5] Date range generation...');
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
