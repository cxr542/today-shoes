import { DateRunInputError, evaluateDateRun, getDateRunInfo } from '../dateRun/core.ts';
import { parseWorkoutImportV1 } from '../import/workoutContractV1.ts';
import type { Envelope, Workout } from '../import/workoutContractV1.ts';
import { byteLength } from '../import/workoutContractPrimitives.ts';

export type RunRecord = Readonly<{ workout: Workout; dateRunLinked: boolean }>;
export type ImportSummary = Readonly<{ added: number; duplicates: number }>;
const STORAGE_BATCH_ID = '00000000-0000-4000-8000-000000000001';
export const MAX_LIBRARY_BYTES = 1024 * 1024;
type RunningErrorCode = 'corrupt_storage' | 'conflicting_workout' | 'library_full' | 'missing_workout' | 'missing_distance' | 'not_loaded' | 'unsupported_date';

export class RunningLibraryError extends Error {
  readonly code: RunningErrorCode;
  constructor(code: RunningErrorCode) {
    super(code);
    this.name = 'RunningLibraryError';
    this.code = code;
  }
}

export function workoutKey(workout: Workout): string {
  return `${workout.source}:${workout.external_id}`;
}

function validateCalendar(workout: Workout): void {
  try { getDateRunInfo(new Date(workout.started_at)); }
  catch (error) {
    if (error instanceof DateRunInputError) throw new RunningLibraryError('unsupported_date');
    throw error;
  }
}

export function mergeWorkouts(records: readonly RunRecord[], envelope: Envelope): Readonly<{
  records: readonly RunRecord[]; summary: ImportSummary;
}> {
  const byKey = new Map(records.map(record => [workoutKey(record.workout), record]));
  let added = 0;
  let duplicates = 0;
  for (const workout of envelope.workouts) {
    validateCalendar(workout);
    const key = workoutKey(workout);
    const existing = byKey.get(key);
    if (existing) {
      if (JSON.stringify(existing.workout) !== JSON.stringify(workout)) throw new RunningLibraryError('conflicting_workout');
      duplicates += 1;
    } else {
      byKey.set(key, { workout, dateRunLinked: false });
      added += 1;
    }
  }
  const merged = [...byKey.values()].sort((a, b) => b.workout.started_at.localeCompare(a.workout.started_at)
    || workoutKey(a.workout).localeCompare(workoutKey(b.workout)));
  serializeLibrary(merged);
  return { records: merged, summary: { added, duplicates } };
}

export function serializeLibrary(records: readonly RunRecord[]): string {
  const raw = JSON.stringify({ version: 1, records });
  if (records.length > 1000 || byteLength(raw) > MAX_LIBRARY_BYTES) throw new RunningLibraryError('library_full');
  return raw;
}

export function parseLibrary(raw: string | null): readonly RunRecord[] {
  if (raw === null) return [];
  if (byteLength(raw) > MAX_LIBRARY_BYTES) throw new RunningLibraryError('corrupt_storage');
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch (error) {
    if (error instanceof SyntaxError) throw new RunningLibraryError('corrupt_storage');
    throw error;
  }
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1
    || !('records' in value) || !Array.isArray(value.records) || value.records.length > 1000) {
    throw new RunningLibraryError('corrupt_storage');
  }
  const identities = new Set<string>();
  return value.records.map((row: unknown) => {
    if (typeof row !== 'object' || row === null || !('workout' in row)
      || !('dateRunLinked' in row) || typeof row.dateRunLinked !== 'boolean') throw new RunningLibraryError('corrupt_storage');
    const workout = parseWorkoutImportV1({ schema_version: 1, batch_id: STORAGE_BATCH_ID, workouts: [row.workout] }).workouts[0];
    if (!workout || identities.has(workoutKey(workout)) || (row.dateRunLinked && workout.distance_meters === null)) {
      throw new RunningLibraryError('corrupt_storage');
    }
    identities.add(workoutKey(workout));
    validateCalendar(workout);
    return { workout, dateRunLinked: row.dateRunLinked };
  });
}

export function linkDateRun(records: readonly RunRecord[], key: string, linked: boolean): readonly RunRecord[] {
  const record = records.find(row => workoutKey(row.workout) === key);
  if (!record) throw new RunningLibraryError('missing_workout');
  if (linked && record.workout.distance_meters === null) throw new RunningLibraryError('missing_distance');
  return records.map(row => workoutKey(row.workout) === key ? { ...row, dateRunLinked: linked } : row);
}

export function getRunResult(record: RunRecord) {
  if (!record.dateRunLinked || record.workout.distance_meters === null) return null;
  const target = getDateRunInfo(new Date(record.workout.started_at));
  return { target, ...evaluateDateRun(target.targetDistanceM, record.workout.distance_meters) };
}
