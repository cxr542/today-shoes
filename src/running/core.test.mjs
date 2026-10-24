import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseWorkoutImportV1 } from '../import/workoutContractV1.ts';
import { getRunResult, linkDateRun, mergeWorkouts, parseLibrary, RunningLibraryError, serializeLibrary, workoutKey } from './core.ts';

const fixture = JSON.parse(readFileSync(new URL('../import/fixtures/workout-contract-v1.json', import.meta.url), 'utf8'));
const envelope = (distance = 10110, started = '2026-10-11T00:00:00Z') => parseWorkoutImportV1({ ...fixture, workouts: [{ ...fixture.workouts[0], started_at: started,
  ended_at: new Date(Date.parse(started) + 2100000).toISOString(), distance_meters: distance }] });

test('imports without automatically claiming a Date Run result', () => {
  const imported = envelope();
  const actual = mergeWorkouts([], imported);
  assert.deepEqual(actual.summary, { added: 1, duplicates: 0 });
  assert.equal(getRunResult(actual.records[0]), null);
});
test('repeated imports preserve an existing manual link', () => {
  const imported = envelope();
  const before = [{ workout: imported.workouts[0], dateRunLinked: true }];
  const actual = mergeWorkouts(before, imported);
  assert.deepEqual(actual.records, before);
  assert.deepEqual(actual.summary, { added: 0, duplicates: 1 });
});
test('conflicting values for the same source ID reject rather than overwrite', () => {
  const before = mergeWorkouts([], envelope()).records;
  assert.throws(() => mergeWorkouts(before, envelope(10200)), error => error instanceof RunningLibraryError && error.code === 'conflicting_workout');
  assert.equal(before[0].workout.distance_meters, 10110);
});
for (const [distance, completed, perfect] of [[10100,false,false],[10110,true,true],[10160,true,true],[10160.001,true,false],[10161,true,false]]) {
  test(`linked workout ${distance} uses raw meter boundaries`, () => {
    const records = mergeWorkouts([], envelope(distance)).records;
    const linked = linkDateRun(records, workoutKey(records[0].workout), true);
    const actual = getRunResult(linked[0]);
    assert.equal(actual.isCompleted, completed);
    assert.equal(actual.isPerfect, perfect);
    assert.equal(actual.target.targetDistanceM, 10110);
  });
}
test('the workout start determines the Seoul date even when UTC differs', () => {
  const records = mergeWorkouts([], envelope(10110, '2026-10-10T15:00:00Z')).records;
  const actual = getRunResult(linkDateRun(records, workoutKey(records[0].workout), true)[0]);
  assert.equal(actual.target.date, '2026-10-11');
});
test('a run crossing Seoul midnight belongs to its start date', () => {
  const records = mergeWorkouts([], envelope(10100, '2026-10-10T14:59:00Z')).records;
  const actual = getRunResult(linkDateRun(records, workoutKey(records[0].workout), true)[0]);
  assert.equal(actual.target.targetDistanceM, 10100);
});
test('unknown distance cannot be connected as an incomplete or completed result', () => {
  const records = mergeWorkouts([], envelope(null)).records;
  assert.throws(() => linkDateRun(records, workoutKey(records[0].workout), true), error => error.code === 'missing_distance');
});
test('unlink retains the workout and removes its result', () => {
  const before = [{ workout: envelope().workouts[0], dateRunLinked: true }];
  const after = linkDateRun(before, workoutKey(before[0].workout), false);
  assert.equal(after[0].workout, before[0].workout);
  assert.equal(getRunResult(after[0]), null);
});
test('local storage round trip retains linked and unlinked records', () => {
  const before = [{ workout: envelope().workouts[0], dateRunLinked: true }];
  const actual = parseLibrary(serializeLibrary(before));
  assert.deepEqual(actual, before);
});
for (const raw of ['broken', '{}', '{"version":2,"records":[]}', '{"version":1,"records":[{}]}']) {
  test(`corrupt local data is rejected: ${raw}`, () => {
    assert.throws(() => parseLibrary(raw), RunningLibraryError);
  });
}
test('a source identity repeated in stored data is rejected', () => {
  const record = { workout: envelope().workouts[0], dateRunLinked: false };
  assert.throws(() => parseLibrary(JSON.stringify({ version: 1, records: [record, record] })), RunningLibraryError);
});
test('UTC dates that overflow the supported Seoul calendar cannot reach rendering', () => {
  const imported = envelope(10110, '9999-12-31T15:00:00Z');
  assert.throws(() => mergeWorkouts([], imported), error => error.code === 'unsupported_date');
  assert.throws(() => parseLibrary(JSON.stringify({ version: 1, records: [{ workout: imported.workouts[0], dateRunLinked: false }] })), error => error.code === 'unsupported_date');
});
