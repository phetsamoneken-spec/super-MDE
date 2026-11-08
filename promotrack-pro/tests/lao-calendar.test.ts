import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarDate, formatLaoDate, laoMonths, monthDays, shiftDate } from '../src/utils/laoCalendar';
test('Lao calendar keeps Gregorian ISO values and handles leap days and month boundaries',()=>{
  assert.equal(laoMonths.length,12);assert.equal(formatLaoDate('2026-11','month'),'ພະຈິກ 2026');
  assert.equal(formatLaoDate('2026-11-09'),'9 ພະຈິກ 2026');
  assert.equal(monthDays(2024,1),29);assert.equal(monthDays(2100,1),28);
  assert.equal(shiftDate('2024-02-28',1),'2024-02-29');assert.equal(shiftDate('2026-12-31',1),'2027-01-01');
  assert.equal(calendarDate(2026,0,9),'2026-01-09');assert.equal(formatLaoDate('2026-02-30'),'');assert.equal(formatLaoDate('2026-13','month'),'');assert.equal(formatLaoDate(''),'');
});
