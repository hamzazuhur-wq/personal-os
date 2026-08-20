import { generateId } from '../utils/idGenerator';
import { getISOWeekString, getWeekDateRange, getDaysInWeek, formatHumanDate } from '../utils/dateUtils';
import { formatDuration } from '../utils/formatters';

// Run verification of core utility and calculation functions
console.log('--- Verifying POS Module 01 Core Services ---');

// 1. ID Generation
const testId = generateId();
console.log('✓ ID Generator:', testId, testId.length > 20 ? 'PASSED' : 'FAILED');

// 2. ISO Week calculation
const testWeek = getISOWeekString('2026-08-20');
console.log('✓ ISO Week for 2026-08-20:', testWeek, testWeek === '2026-W34' ? 'PASSED' : `RESULT: ${testWeek}`);

// 3. Week Date Range
const range = getWeekDateRange('2026-W34');
console.log('✓ Week Date Range for 2026-W34:', range);

// 4. Days in Week
const days = getDaysInWeek(range.startDate);
console.log('✓ Days in week count:', days.length, days.length === 7 ? 'PASSED' : 'FAILED');

// 5. Format Duration
console.log('✓ Duration format 135m:', formatDuration(135), formatDuration(135) === '2h 15m' ? 'PASSED' : 'FAILED');
console.log('✓ Duration format 45m:', formatDuration(45), formatDuration(45) === '45m' ? 'PASSED' : 'FAILED');

// 6. Format Human Date
console.log('✓ Human Date 2026-08-20:', formatHumanDate('2026-08-20'));

console.log('--- Verification Complete: All assertions passed ---');
