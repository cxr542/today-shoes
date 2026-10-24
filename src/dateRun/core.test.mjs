import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDateRunSelection, DateRunInputError, evaluateDateRun, formatDateRunDistance,
  getDateRunInfo, getDateRunTargetMeters, isTodaySelection, millisecondsUntilSeoulMidnight } from './core.ts';

for (const [month, day, expected] of [[1,1,1010],[1,9,1090],[2,28,2280],[10,1,10010],
  [10,7,10070],[10,11,10110],[11,11,11110],[12,31,12310]]) {
  test(`calculates target for ${month}/${day}`, () => {
    const date = { year: 2026, month, day };
    const actual = getDateRunTargetMeters(date);
    assert.equal(actual, expected);
  });
}
for (const [meters, expected] of [[1010,'1.01 km'],[10070,'10.07 km'],[10110,'10.11 km'],[12310,'12.31 km']]) {
  test(`formats ${meters} meters`, () => {
    const actual = formatDateRunDistance(meters);
    assert.equal(actual, expected);
  });
}
for (const [instant, date, meters] of [
  ['2026-10-10T14:59:59.999Z','2026-10-10',10100],
  ['2026-10-10T15:00:00.000Z','2026-10-11',10110],
  ['2026-12-31T14:59:59.999Z','2026-12-31',12310],
  ['2026-12-31T15:00:00.000Z','2027-01-01',1010],
  ['2024-02-28T15:00:00.000Z','2024-02-29',2290],
]) {
  test(`uses Seoul calendar at ${instant}`, () => {
    const actual = getDateRunInfo(new Date(instant));
    assert.equal(actual.date, date);
    assert.equal(actual.targetDistanceM, meters);
    assert.equal(actual.timeZone, 'Asia/Seoul');
  });
}
for (const [actual, completed, perfect] of [[10050,false,false],[10060,false,false],[10100,false,false],
  [10110,true,true],[10120,true,true],[10160,true,true],[10161,true,false],[10170,true,false],
  [10109.999,false,false],[10160.001,true,false]]) {
  test(`evaluates unrounded distance ${actual}`, () => {
    const result = evaluateDateRun(10110, actual);
    assert.deepEqual(result, { isCompleted: completed, isPerfect: perfect });
  });
}
test('does not carry a selection into the next Seoul day', () => {
  const selected = createDateRunSelection(new Date('2026-10-10T14:59:59Z'));
  const active = isTodaySelection(selected, getDateRunInfo(new Date('2026-10-10T15:00:00Z')));
  assert.equal(active, false);
});
test('keeps same-day selection across reload time', () => {
  const selected = createDateRunSelection(new Date('2026-10-10T15:00:00Z'));
  const active = isTodaySelection(selected, getDateRunInfo(new Date('2026-10-11T14:00:00Z')));
  assert.equal(active, true);
});
test('schedules the Seoul midnight boundary', () => {
  const delay = millisecondsUntilSeoulMidnight(new Date('2026-10-10T14:59:59.999Z'));
  assert.equal(delay, 1);
});
for (const date of [{year:2026,month:2,day:29},{year:2026,month:13,day:1},{year:2026,month:1,day:0}]) {
  test(`rejects invalid calendar ${JSON.stringify(date)}`, () => {
    assert.throws(() => getDateRunTargetMeters(date), DateRunInputError);
  });
}
test('rejects an invalid instant', () => {
  assert.throws(() => getDateRunInfo(new Date('invalid')), DateRunInputError);
});
for (const actual of [NaN, Infinity, -1]) {
  test(`rejects invalid actual distance ${actual}`, () => {
    assert.throws(() => evaluateDateRun(10110, actual), DateRunInputError);
  });
}
