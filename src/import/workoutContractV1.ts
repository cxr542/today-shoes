import { byteLength, choice, date, fail, jsonSize, keys, metric, object, parseJson, text, uuid } from './workoutContractPrimitives.ts';
export { WorkoutValidationError } from './workoutContractPrimitives.ts';

export type Source = 'healthkit' | 'manual';
export type DurationBasis = 'active' | 'elapsed' | 'unknown';
export type Device = Readonly<{
  manufacturer?: string;
  model?: string;
  hardware_version?: string;
  software_version?: string;
}>;
export type SourceMetadata = Readonly<{
  source_version?: string | number | boolean | null;
  source_product_type?: string | number | boolean | null;
  provider_activity_type?: string | number | boolean | null;
  hr_method?: 'healthkit_statistics' | 'provider_summary' | 'manual';
}>;
export type Workout = Readonly<{
  source: Source;
  external_id: string;
  healthkit_uuid: string | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  duration_basis: DurationBasis;
  distance_meters: number | null;
  active_calories: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  sport_type: 'running';
  is_indoor: boolean | null;
  source_app: string | null;
  device: Device | null;
  source_metadata: SourceMetadata | null;
}>;
export type Envelope = Readonly<{
  schema_version: 1;
  batch_id: string;
  workouts: readonly Workout[];
}>;

const DEVICE_KEYS = ['manufacturer', 'model', 'hardware_version', 'software_version'] as const;
const METADATA_KEYS = ['source_version', 'source_product_type', 'provider_activity_type', 'hr_method'] as const;
const WORKOUT_KEYS = ['source', 'external_id', 'healthkit_uuid', 'started_at', 'ended_at', 'duration_seconds', 'duration_basis', 'distance_meters', 'active_calories', 'avg_heart_rate', 'max_heart_rate', 'sport_type', 'is_indoor', 'source_app', 'device', 'source_metadata'] as const;

function device(value: unknown, path: string): Device | null {
  if (value == null) return null;
  const record = object(value, path);
  keys(record, DEVICE_KEYS, path);
  jsonSize(record, path, 2048);
  const result: { manufacturer?: string; model?: string; hardware_version?: string; software_version?: string } = {};
  for (const key of DEVICE_KEYS) {
    if (record[key] !== undefined) result[key] = text(record[key], `${path}.${key}`, 128);
  }
  return Object.keys(result).length ? result : null;
}

function metadata(value: unknown, path: string): SourceMetadata | null {
  if (value == null) return null;
  const record = object(value, path);
  keys(record, METADATA_KEYS, path);
  jsonSize(record, path, 8192);
  const result: {
    source_version?: string | number | boolean | null;
    source_product_type?: string | number | boolean | null;
    provider_activity_type?: string | number | boolean | null;
    hr_method?: 'healthkit_statistics' | 'provider_summary' | 'manual';
  } = {};
  for (const key of ['source_version', 'source_product_type', 'provider_activity_type'] as const) {
    const item = record[key];
    if (item === undefined) continue;
    if (item !== null && typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean') fail('metadata_scalar_required', `${path}.${key}`);
    if (typeof item === 'number' && !Number.isFinite(item)) fail('invalid_number', `${path}.${key}`);
    if (typeof item === 'string') byteLength(item);
    result[key] = item;
  }
  if (record.hr_method !== undefined) result.hr_method = choice(record.hr_method, ['healthkit_statistics', 'provider_summary', 'manual'], `${path}.hr_method`);
  return Object.keys(result).length ? result : null;
}

function optionalMetric(value: unknown, path: string, limit: number, precision = 3): number | null {
  return value == null ? null : metric(value, path, limit, precision);
}

function workout(value: unknown, path: string): Workout {
  const record = object(value, path);
  keys(record, WORKOUT_KEYS, path);
  const source = choice(record.source, ['healthkit', 'manual'], `${path}.source`);
  let externalId = text(record.external_id, `${path}.external_id`, 512);
  if (!externalId.trim()) fail('empty_external_id', `${path}.external_id`);
  let healthkitUuid: string | null = null;
  switch (source) {
    case 'healthkit':
      healthkitUuid = uuid(record.healthkit_uuid, `${path}.healthkit_uuid`);
      externalId = uuid(externalId, `${path}.external_id`);
      if (healthkitUuid !== externalId) fail('uuid_mismatch', path);
      break;
    case 'manual':
      if (record.healthkit_uuid != null) fail('unexpected_healthkit_uuid', path);
      externalId = uuid(externalId, `${path}.external_id`);
      break;
    default: {
      const exhaustive: never = source;
      return exhaustive;
    }
  }
  const startedAt = date(record.started_at, `${path}.started_at`);
  const endedAt = date(record.ended_at, `${path}.ended_at`);
  const elapsed = (Date.parse(endedAt) - Date.parse(startedAt)) / 1000;
  if (elapsed <= 0) fail('invalid_time_range', path);
  const duration = metric(record.duration_seconds, `${path}.duration_seconds`, 1e9);
  if (duration <= 0 || duration > elapsed + 1) fail('invalid_duration', path);
  if (!Object.hasOwn(record, 'distance_meters')) fail('required_field', `${path}.distance_meters`);
  const distance = record.distance_meters === null ? null : metric(record.distance_meters, `${path}.distance_meters`, 1e9);
  const average = optionalMetric(record.avg_heart_rate, `${path}.avg_heart_rate`, 1e4, 2);
  const maximum = optionalMetric(record.max_heart_rate, `${path}.max_heart_rate`, 1e4, 2);
  if (average === 0 || maximum === 0 || (average !== null && maximum !== null && maximum < average)) fail('invalid_heart_rate', path);
  const indoor = record.is_indoor;
  if (indoor != null && typeof indoor !== 'boolean') fail('expected_boolean', `${path}.is_indoor`);
  return {
    source, external_id: externalId, healthkit_uuid: healthkitUuid,
    started_at: startedAt, ended_at: endedAt, duration_seconds: duration,
    duration_basis: choice(record.duration_basis, ['active', 'elapsed', 'unknown'], `${path}.duration_basis`),
    distance_meters: distance,
    active_calories: optionalMetric(record.active_calories, `${path}.active_calories`, 1e7),
    avg_heart_rate: average, max_heart_rate: maximum,
    sport_type: choice(record.sport_type, ['running'], `${path}.sport_type`),
    is_indoor: indoor ?? null,
    source_app: record.source_app == null ? null : text(record.source_app, `${path}.source_app`, 255),
    device: device(record.device, `${path}.device`),
    source_metadata: metadata(record.source_metadata, `${path}.source_metadata`),
  };
}

export function parseWorkoutImportV1(input: unknown): Envelope {
  const value = typeof input === 'string' ? parseJson(input) : input;
  jsonSize(value, '$', 1024 * 1024);
  const record = object(value, '$');
  keys(record, ['schema_version', 'batch_id', 'workouts'], '$');
  if (record.schema_version !== 1) fail('unsupported_schema_version', '$.schema_version');
  const batchId = uuid(record.batch_id, '$.batch_id');
  const rows = record.workouts;
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100) fail('invalid_batch_size', '$.workouts');
  const parsed = rows.map((row: unknown, index: number) => workout(row, `$.workouts[${index}]`));
  const identities = new Set<string>();
  for (const row of parsed) {
    if (row.source !== parsed[0]?.source) fail('mixed_source_batch', '$.workouts');
    const identity = `${row.source}:${row.external_id}`;
    if (identities.has(identity)) fail('duplicate_workout', '$.workouts');
    identities.add(identity);
  }
  return { schema_version: 1, batch_id: batchId, workouts: parsed };
}
