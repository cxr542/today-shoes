import { createDateRunSelection, DateRunInputError, getDateRunInfo } from './core.ts';
import type { DateRunSelection } from './core.ts';

export const DATE_RUN_STORAGE_KEY = '@oneulmwosinji/date-run/selection/v1';

export type SelectionStorage = Readonly<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}>;

export type DateRunSnapshot = Readonly<{
  selection: DateRunSelection | null;
  ready: boolean;
  pending: number;
}>;

export function parseDateRunSelection(raw: string | null): DateRunSelection | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || !('date' in value)
      || !('timeZone' in value) || !('targetDistanceM' in value) || !('selectedAt' in value)
      || typeof value.date !== 'string' || typeof value.selectedAt !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.selectedAt)) return null;
    const instant = new Date(value.selectedAt);
    const info = getDateRunInfo(instant);
    if (instant.toISOString() !== value.selectedAt || value.date !== info.date
      || value.timeZone !== info.timeZone || value.targetDistanceM !== info.targetDistanceM) return null;
    return { date: info.date, timeZone: info.timeZone,
      targetDistanceM: info.targetDistanceM, selectedAt: value.selectedAt };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof DateRunInputError) return null;
    throw error;
  }
}

export function createDateRunStore(storage: SelectionStorage) {
  let tail: Promise<void> = Promise.resolve();
  let pendingLoad: Readonly<{
    result: Promise<DateRunSelection | null>;
    position: Promise<void>;
  }> | null = null;
  let snapshot: DateRunSnapshot = { selection: null, ready: false, pending: 0 };
  const listeners = new Set<() => void>();

  function publish(next: DateRunSnapshot): void {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    const settled = () => publish({ ...snapshot, pending: snapshot.pending - 1 });
    // Recover only the scheduling tail; callers still receive the original rejection.
    tail = result.then(settled, settled);
    publish({ ...snapshot, pending: snapshot.pending + 1 });
    return result;
  }

  return {
    getSnapshot: (): DateRunSnapshot => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    load(): Promise<DateRunSelection | null> {
      if (pendingLoad !== null && pendingLoad.position === tail) return pendingLoad.result;
      const result = enqueue(async () => {
        const selection = parseDateRunSelection(await storage.getItem(DATE_RUN_STORAGE_KEY));
        publish({ ...snapshot, selection, ready: true });
        return selection;
      });
      pendingLoad = { result, position: tail };
      const clearLoad = () => { if (pendingLoad?.result === result) pendingLoad = null; };
      void result.then(clearLoad, clearLoad);
      return result;
    },
    select(instant: Date = new Date()): Promise<DateRunSelection> {
      const selection = createDateRunSelection(instant);
      return enqueue(async () => {
        await storage.setItem(DATE_RUN_STORAGE_KEY, JSON.stringify(selection));
        publish({ ...snapshot, selection, ready: true });
        return selection;
      });
    },
    cancel(): Promise<void> {
      return enqueue(async () => {
        await storage.removeItem(DATE_RUN_STORAGE_KEY);
        publish({ ...snapshot, selection: null, ready: true });
      });
    },
  };
}

const sharedStores = new WeakMap<SelectionStorage, ReturnType<typeof createDateRunStore>>();

export function getDateRunStore(storage: SelectionStorage): ReturnType<typeof createDateRunStore> {
  const existing = sharedStores.get(storage);
  if (existing !== undefined) return existing;
  const store = createDateRunStore(storage);
  sharedStores.set(storage, store);
  return store;
}
