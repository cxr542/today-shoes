import { parseWorkoutImportV1 } from '../import/workoutContractV1.ts';
import type { SelectionStorage } from '../dateRun/store.ts';
import { linkDateRun, mergeWorkouts, parseLibrary, RunningLibraryError, serializeLibrary, workoutKey } from './core.ts';
import type { RunRecord } from './core.ts';

export const RUNNING_STORAGE_KEY = '@oneulmwosinji/running/library/v1';
export type RunningSnapshot = Readonly<{ records: readonly RunRecord[]; ready: boolean; pending: number }>;

export function createRunningStore(storage: SelectionStorage) {
  let snapshot: RunningSnapshot = { records: [], ready: false, pending: 0 };
  let tail: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (next: RunningSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    const settled = () => publish({ ...snapshot, pending: snapshot.pending - 1 });
    tail = result.then(settled, settled);
    publish({ ...snapshot, pending: snapshot.pending + 1 });
    return result;
  }
  async function persist(records: readonly RunRecord[]): Promise<void> {
    await storage.setItem(RUNNING_STORAGE_KEY, serializeLibrary(records));
    publish({ ...snapshot, records });
  }
  const requireReady = () => { if (!snapshot.ready) throw new RunningLibraryError('not_loaded'); };
  return {
    getSnapshot: (): RunningSnapshot => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    load() {
      return enqueue(async () => {
        const records = parseLibrary(await storage.getItem(RUNNING_STORAGE_KEY));
        publish({ ...snapshot, records, ready: true });
      });
    },
    importJson(raw: string) {
      const envelope = parseWorkoutImportV1(raw);
      return enqueue(async () => {
        requireReady();
        const merged = mergeWorkouts(snapshot.records, envelope);
        await persist(merged.records);
        return merged.summary;
      });
    },
    link(key: string, linked: boolean) {
      return enqueue(async () => {
        requireReady();
        await persist(linkDateRun(snapshot.records, key, linked));
      });
    },
    remove(key: string) {
      return enqueue(async () => {
        requireReady();
        if (!snapshot.records.some(row => workoutKey(row.workout) === key)) throw new RunningLibraryError('missing_workout');
        await persist(snapshot.records.filter(row => workoutKey(row.workout) !== key));
      });
    },
  };
}

const stores = new WeakMap<SelectionStorage, ReturnType<typeof createRunningStore>>();
export function getRunningStore(storage: SelectionStorage) {
  const existing = stores.get(storage);
  if (existing) return existing;
  const store = createRunningStore(storage);
  stores.set(storage, store);
  return store;
}
