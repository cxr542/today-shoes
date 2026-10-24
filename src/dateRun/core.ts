export const DATE_RUN_TIME_ZONE = 'Asia/Seoul';

export type CalendarDate = Readonly<{ year: number; month: number; day: number }>;
export type DateRunInfo = Readonly<{
  date: string;
  timeZone: typeof DATE_RUN_TIME_ZONE;
  targetDistanceM: number;
  dateLabel: string;
}>;
export type DateRunSelection = Readonly<{
  date: string;
  timeZone: typeof DATE_RUN_TIME_ZONE;
  targetDistanceM: number;
  selectedAt: string;
}>;

export class DateRunInputError extends Error {
  constructor() {
    super('Invalid Date Run input');
    this.name = 'DateRunInputError';
  }
}

const seoulFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: DATE_RUN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

function validateDate(date: CalendarDate): void {
  const { year, month, day } = date;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maximum = days[month - 1];
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month)
    || !Number.isInteger(day) || maximum === undefined || day < 1 || day > maximum) {
    throw new DateRunInputError();
  }
}

export function getSeoulCalendarDate(instant: Date = new Date()): CalendarDate {
  if (!Number.isFinite(instant.getTime())) throw new DateRunInputError();
  const parts = seoulFormatter.formatToParts(instant);
  const date = {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  };
  validateDate(date);
  return date;
}

export function getDateRunTargetMeters(date: CalendarDate): number {
  validateDate(date);
  return date.month * 1000 + date.day * 10;
}

export function formatDateRunDistance(meters: number): string {
  if (!Number.isSafeInteger(meters) || meters < 0 || meters % 10 !== 0) {
    throw new DateRunInputError();
  }
  return `${Math.floor(meters / 1000)}.${String((meters % 1000) / 10).padStart(2, '0')} km`;
}

export function getDateRunInfo(instant: Date = new Date()): DateRunInfo {
  const date = getSeoulCalendarDate(instant);
  return {
    date: `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
    timeZone: DATE_RUN_TIME_ZONE,
    targetDistanceM: getDateRunTargetMeters(date),
    dateLabel: `${date.year}년 ${date.month}월 ${date.day}일`,
  };
}

export function createDateRunSelection(instant: Date = new Date()): DateRunSelection {
  const { date, timeZone, targetDistanceM } = getDateRunInfo(instant);
  return { date, timeZone, targetDistanceM, selectedAt: instant.toISOString() };
}

export function isTodaySelection(selection: DateRunSelection | null, today: DateRunInfo): boolean {
  return selection !== null && selection.date === today.date
    && selection.timeZone === today.timeZone && selection.targetDistanceM === today.targetDistanceM;
}

export function millisecondsUntilSeoulMidnight(instant: Date): number {
  const localMs = instant.getTime() + 9 * 60 * 60 * 1000;
  if (!Number.isFinite(localMs)) throw new DateRunInputError();
  return 86400000 - ((localMs % 86400000 + 86400000) % 86400000);
}

export function evaluateDateRun(targetDistanceM: number, actualDistanceM: number,
  toleranceM = 50): Readonly<{ isCompleted: boolean; isPerfect: boolean }> {
  if (!Number.isSafeInteger(targetDistanceM) || targetDistanceM <= 0
    || !Number.isFinite(actualDistanceM) || actualDistanceM < 0
    || actualDistanceM > Number.MAX_SAFE_INTEGER / 1000
    || !Number.isSafeInteger(toleranceM) || toleranceM < 0) throw new DateRunInputError();
  const isCompleted = actualDistanceM >= targetDistanceM;
  return { isCompleted, isPerfect: isCompleted && actualDistanceM <= targetDistanceM + toleranceM };
}
