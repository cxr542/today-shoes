import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseWorkoutImportV1, WorkoutValidationError } from './workoutContractV1.ts';

const raw = readFileSync(new URL('./fixtures/workout-contract-v1.json', import.meta.url), 'utf8');
const fixture = () => JSON.parse(raw);
const invalid = (input, code) => assert.throws(() => parseWorkoutImportV1(input), error => error instanceof WorkoutValidationError && error.code === code);

test('normalizes valid HealthKit and UTC timezone input', () => {
  const input = fixture();
  input.workouts[0].external_id = input.workouts[0].external_id.toUpperCase();
  input.workouts[0].started_at = '2026-10-02T09:00:00+09:00';
  const output = parseWorkoutImportV1(input);
  assert.equal(output.workouts[0].started_at, '2026-10-02T00:00:00.000Z');
  assert.equal(output.workouts[0].external_id, output.workouts[0].healthkit_uuid);
  assert.equal(input.workouts[0].started_at, '2026-10-02T09:00:00+09:00');
});

test('accepts manual UUID and normalizes empty device', () => {
  const input = fixture();
  input.workouts[0].source = 'manual';
  input.workouts[0].healthkit_uuid = null;
  input.workouts[0].device = {};
  const output = parseWorkoutImportV1(input);
  assert.equal(output.workouts[0].healthkit_uuid, null);
  assert.equal(output.workouts[0].device, null);
});

for (const [name, field, value, code] of [
  ['source case', 'source', 'HealthKit', 'invalid_choice'],
  ['future unregistered source', 'source', 'garmin', 'invalid_choice'],
  ['invalid UUID', 'healthkit_uuid', 'invalid', 'invalid_uuid'],
  ['UUID mismatch', 'healthkit_uuid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'uuid_mismatch'],
  ['timezone missing', 'started_at', '2026-10-02T00:00:00', 'timezone_required'],
  ['invalid calendar day', 'started_at', '2026-02-30T00:00:00Z', 'invalid_datetime'],
  ['unknown offset', 'started_at', '2026-10-02T00:00:00-00:00', 'unknown_timezone'],
  ['end before start', 'ended_at', '2026-10-01T00:00:00Z', 'invalid_time_range'],
  ['equal dates', 'ended_at', '2026-10-02T00:00:00Z', 'invalid_time_range'],
  ['zero duration', 'duration_seconds', 0, 'invalid_duration'],
  ['negative duration', 'duration_seconds', -1, 'invalid_number'],
  ['excess duration', 'duration_seconds', 2101.001, 'invalid_duration'],
  ['duration coercion', 'duration_seconds', '1800', 'invalid_number'],
  ['duration precision', 'duration_seconds', 1800.0001, 'excess_precision'],
  ['negative distance', 'distance_meters', -1, 'invalid_number'],
  ['NaN', 'distance_meters', NaN, 'invalid_number'],
  ['Infinity', 'distance_meters', Infinity, 'invalid_number'],
  ['negative calories', 'active_calories', -1, 'invalid_number'],
  ['zero HR', 'avg_heart_rate', 0, 'invalid_heart_rate'],
  ['max below avg', 'max_heart_rate', 100, 'invalid_heart_rate'],
  ['invalid duration basis', 'duration_basis', 'moving', 'invalid_choice'],
  ['invalid sport', 'sport_type', 'cycling', 'invalid_choice'],
  ['indoor coercion', 'is_indoor', 1, 'expected_boolean'],
  ['unknown workout field', 'pace', 360, 'unknown_field'],
  ['external control', 'external_id', 'abc\n', 'control_character'],
  ['external too long', 'external_id', 'a'.repeat(513), 'invalid_string_length'],
  ['unknown device field', 'device', { serial: 'x' }, 'unknown_field'],
  ['oversized device string', 'device', { model: 'x'.repeat(129) }, 'invalid_string_length'],
  ['oversized device JSON', 'device', { model: '😀'.repeat(128), manufacturer: '😀'.repeat(128), hardware_version: '😀'.repeat(128), software_version: '😀'.repeat(128) }, 'oversized_json'],
  ['unknown metadata field', 'source_metadata', { raw: 'x' }, 'unknown_field'],
  ['nested metadata object', 'source_metadata', { source_version: {} }, 'metadata_scalar_required'],
  ['nested metadata array', 'source_metadata', { source_version: [] }, 'metadata_scalar_required'],
  ['metadata infinity', 'source_metadata', { source_version: Infinity }, 'invalid_number'],
  ['invalid HR method', 'source_metadata', { hr_method: 'weighted' }, 'invalid_choice'],
  ['oversized metadata', 'source_metadata', { source_version: 'x'.repeat(8192) }, 'oversized_json'],
]) {
  test(`rejects ${name}`, () => {
    const input = fixture();
    input.workouts[0][field] = value;
    invalid(input, code);
  });
}

for (const distance of [null, 0]) test(`preserves distance ${distance}`, () => {
  const input = fixture();
  input.workouts[0].distance_meters = distance;
  assert.equal(parseWorkoutImportV1(input).workouts[0].distance_meters, distance);
});

test('rejects duplicate JSON fields including escaped equivalents', () => {
  const input = raw.replace('"schema_version": 1', '"schema_version": 1, "schema_\\u0076ersion": 1');
  invalid(input, 'duplicate_json_field');
});
test('rejects duplicate workout identities', () => {
  const input = fixture();
  input.workouts.push(structuredClone(input.workouts[0]));
  invalid(input, 'duplicate_workout');
});
test('rejects unknown envelope field', () => {
  const input = fixture(); input.user_id = 'attacker';
  invalid(input, 'unknown_field');
});
test('rejects unsupported schema', () => {
  const input = fixture(); input.schema_version = 2;
  invalid(input, 'unsupported_schema_version');
});
test('rejects invalid batch UUID', () => {
  const input = fixture(); input.batch_id = 'invalid';
  invalid(input, 'invalid_uuid');
});
test('rejects 101 workouts', () => {
  const input = fixture(); input.workouts = Array.from({ length: 101 }, () => input.workouts[0]);
  invalid(input, 'invalid_batch_size');
});
test('rejects raw payload over 1 MiB including whitespace', () => {
  invalid(' '.repeat(1024 * 1024) + raw, 'oversized_json');
});
test('rejects object payload over 1 MiB', () => {
  const input = fixture(); input.extra = 'x'.repeat(1024 * 1024);
  invalid(input, 'oversized_json');
});
test('rejects missing required distance', () => {
  const input = fixture(); delete input.workouts[0].distance_meters;
  invalid(input, 'required_field');
});
test('allows exactly one second duration tolerance', () => {
  const input = fixture(); input.workouts[0].duration_seconds = 2101;
  assert.equal(parseWorkoutImportV1(input).workouts[0].duration_seconds, 2101);
});
test('rejects manual workout with HealthKit identity', () => {
  const input = fixture(); input.workouts[0].source = 'manual';
  invalid(input, 'unexpected_healthkit_uuid');
});
test('normalizes absent optional fields without pretending refresh intent', () => {
  const input = fixture(); delete input.workouts[0].active_calories;
  assert.equal(parseWorkoutImportV1(input).workouts[0].active_calories, null);
});
test('accepts exactly 100 distinct workouts and repeated keys in separate objects', () => {
  const input = fixture();
  input.workouts = Array.from({ length: 100 }, (_, index) => {
    const row = structuredClone(input.workouts[0]);
    row.external_id = `a2404e82-cdda-490a-8ba1-${index.toString(16).padStart(12, '0')}`;
    row.healthkit_uuid = row.external_id;
    return row;
  });
  assert.equal(parseWorkoutImportV1(JSON.stringify(input)).workouts.length,100);
});
test('rejects an empty batch', () => {
  const input = fixture(); input.workouts = [];
  invalid(input,'invalid_batch_size');
});
test('rejects mixed-source batches', () => {
  const input = fixture();
  const second = structuredClone(input.workouts[0]);
  second.source='manual'; second.healthkit_uuid=null;
  input.workouts.push(second);
  invalid(input,'mixed_source_batch');
});
test('optional NaN cannot turn into missing data', () => {
  const input=fixture(); input.workouts[0].active_calories=NaN;
  invalid(input,'invalid_number');
});
test('rejects cyclic non-JSON objects with a typed error', () => {
  const input=fixture(); input.cycle=input;
  invalid(input,'not_json_serializable');
});
