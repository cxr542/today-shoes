export class WorkoutValidationError extends Error {
  readonly code: string;
  readonly path: string;
  constructor(code: string, path: string) {
    super(`${path}: ${code}`);
    this.name = 'WorkoutValidationError';
    this.code = code;
    this.path = path;
  }
}

export function fail(code: string, path: string): never {
  throw new WorkoutValidationError(code, path);
}

export function byteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const point = char.codePointAt(0);
    if (point === undefined) continue;
    if (point >= 0xd800 && point <= 0xdfff) fail('invalid_unicode', '$');
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function object(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail('expected_object', path);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail('expected_plain_object', path);
  return value;
}

export function keys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail('unknown_field', `${path}.${key}`);
  }
}

export function text(value: unknown, path: string, max: number): string {
  if (typeof value !== 'string' || Array.from(value).length < 1 || Array.from(value).length > max) fail('invalid_string_length', path);
  for (const char of value) {
    const point = char.codePointAt(0) ?? 0;
    if (point <= 31 || (point >= 127 && point <= 159)) fail('control_character', path);
  }
  byteLength(value);
  return value;
}

export function uuid(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) fail('invalid_uuid', path);
  return value.toLowerCase();
}

export function choice<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  const result = allowed.find(item => item === value);
  if (result === undefined) fail('invalid_choice', path);
  return result;
}

export function metric(value: unknown, path: string, limit: number, precision = 3): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= limit) fail('invalid_number', path);
  const normalized = Number(value.toFixed(precision));
  if (Math.abs(value - normalized) > 1e-8) fail('excess_precision', path);
  return normalized;
}

export function date(value: unknown, path: string): string {
  if (typeof value !== 'string') fail('invalid_datetime', path);
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!m) fail('timezone_required', path);
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > (days[month - 1] ?? 0) || Number(m[4]) > 23 || Number(m[5]) > 59 || Number(m[6]) > 59) fail('invalid_datetime', path);
  const zone = m[8];
  if (zone === '-00:00') fail('unknown_timezone', path);
  if (zone && zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59)) fail('invalid_timezone', path);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) fail('invalid_datetime', path);
  return new Date(timestamp).toISOString();
}

export function jsonSize(value: unknown, path: string, limit: number): void {
  let encoded: string | undefined;
  try { encoded = JSON.stringify(value); }
  catch (error) {
    if (error instanceof TypeError) fail('not_json_serializable', path);
    throw error;
  }
  if (encoded === undefined) fail('not_json_serializable', path);
  if (byteLength(encoded) > limit) fail('oversized_json', path);
}

export function parseJson(raw: string): unknown {
  if (byteLength(raw) > 1024 * 1024) fail('oversized_json', '$');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch (error) {
    if (error instanceof SyntaxError) fail('invalid_json', '$');
    throw error;
  }
  const tokens = raw.match(/"(?:\\.|[^"\\])*"|[{}[\]:,]|[^\s{}[\]:,]+/g) ?? [];
  const scopes: Set<string>[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token === '{') scopes.push(new Set());
    else if (token === '}') scopes.pop();
    else if (token?.startsWith('"') && tokens[index + 1] === ':') {
      const key: unknown = JSON.parse(token);
      const scope = scopes.at(-1);
      if (typeof key === 'string' && scope) {
        if (scope.has(key)) fail('duplicate_json_field', '$');
        scope.add(key);
      }
    }
  }
  return parsed;
}
