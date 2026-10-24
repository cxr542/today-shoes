import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDateRunSelection, getDateRunInfo, isTodaySelection } from './core.ts';
import { createDateRunStore, DATE_RUN_STORAGE_KEY, getDateRunStore, parseDateRunSelection } from './store.ts';

function storageFixture() {
  const data = new Map([['@oneulmwosinji/shoes/v1','existing-shoes']]);
  return { data, storage: {
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) { data.set(key, value); },
    async removeItem(key) { data.delete(key); },
  }};
}
test('persists a selection across a new store instance', async () => {
  const { storage, data } = storageFixture();
  await createDateRunStore(storage).select(new Date('2026-10-11T00:00:00Z'));
  const restored = await createDateRunStore(storage).load();
  assert.deepEqual(restored, {date:'2026-10-11',timeZone:'Asia/Seoul',targetDistanceM:10110,selectedAt:'2026-10-11T00:00:00.000Z'});
  assert.equal(data.get('@oneulmwosinji/shoes/v1'), 'existing-shoes');
});
test('cancel removes only the Date Run selection', async () => {
  const { storage, data } = storageFixture();
  const store = createDateRunStore(storage);
  await store.select(new Date('2026-10-11T00:00:00Z'));
  await store.cancel();
  assert.equal(await store.load(), null);
  assert.equal(data.get('@oneulmwosinji/shoes/v1'), 'existing-shoes');
});
test('stale selection stays stored but is not active today', async () => {
  const { storage, data } = storageFixture();
  const store = createDateRunStore(storage);
  await store.select(new Date('2026-12-31T14:59:59Z'));
  const restored = await store.load();
  assert.equal(isTodaySelection(restored, getDateRunInfo(new Date('2026-12-31T15:00:00Z'))), false);
  assert.ok(data.has(DATE_RUN_STORAGE_KEY));
});
for (const raw of ['bad JSON','null','[]',JSON.stringify({date:'2026-10-11',timeZone:'UTC',targetDistanceM:10110,selectedAt:'2026-10-11T00:00:00.000Z'}),
  JSON.stringify({...createDateRunSelection(new Date('2026-10-11T00:00:00Z')),targetDistanceM:10.11}),
  JSON.stringify({...createDateRunSelection(new Date('2026-10-11T00:00:00Z')),date:'2026-10-10'})]) {
  test(`ignores corrupt selection ${raw}`, () => {
    assert.equal(parseDateRunSelection(raw), null);
  });
}
test('propagates persistence failure without inventing a saved selection', async () => {
  const { storage, data } = storageFixture();
  const failure = new Error('storage unavailable');
  const store = createDateRunStore({...storage, async setItem() { throw failure; }});
  await assert.rejects(store.select(new Date('2026-10-11T00:00:00Z')), failure);
  assert.equal(data.has(DATE_RUN_STORAGE_KEY), false);
});
test('failed cancellation preserves the persisted selection', async () => {
  const { storage, data } = storageFixture();
  await createDateRunStore(storage).select(new Date('2026-10-11T00:00:00Z'));
  const before = data.get(DATE_RUN_STORAGE_KEY);
  const failure = new Error('remove unavailable');
  const store = createDateRunStore({...storage, async removeItem() { throw failure; }});
  await assert.rejects(store.cancel(), failure);
  assert.equal(data.get(DATE_RUN_STORAGE_KEY), before);
});
test('propagates read failure rather than treating storage as empty', async () => {
  const { storage } = storageFixture();
  const failure = new Error('read unavailable');
  const store = createDateRunStore({...storage, async getItem() { throw failure; }});
  await assert.rejects(store.load(), failure);
});
test('rejects normalized impossible selectedAt calendar dates', () => {
  const raw = JSON.stringify({date:'2026-03-02',timeZone:'Asia/Seoul',targetDistanceM:3020,
    selectedAt:'2026-02-30T00:00:00.000Z'});
  assert.equal(parseDateRunSelection(raw), null);
});

test('remount hydration waits for an in-flight selection to persist', async () => {
  const { storage } = storageFixture();
  const started = Promise.withResolvers();
  const gate = Promise.withResolvers();
  const store = createDateRunStore({...storage, async setItem(key, value) {
    started.resolve(); await gate.promise; await storage.setItem(key, value);
  }});
  const selecting = store.select(new Date('2026-10-11T00:00:00Z'));
  await started.promise;
  const remountHydration = store.load();
  gate.resolve();
  const [selected, hydrated] = await Promise.all([selecting, remountHydration]);
  assert.deepEqual(hydrated, selected);
});

test('remount hydration waits for an in-flight cancellation to persist', async () => {
  const { storage } = storageFixture();
  const started = Promise.withResolvers();
  const gate = Promise.withResolvers();
  const store = createDateRunStore({...storage, async removeItem(key) {
    started.resolve(); await gate.promise; await storage.removeItem(key);
  }});
  await store.select(new Date('2026-10-11T00:00:00Z'));
  const cancelling = store.cancel();
  await started.promise;
  const remountHydration = store.load();
  gate.resolve();
  await cancelling;
  assert.equal(await remountHydration, null);
});

test('immediate cancel after delayed select leaves storage empty', async () => {
  const { storage } = storageFixture();
  const started = Promise.withResolvers();
  const gate = Promise.withResolvers();
  const store = createDateRunStore({...storage, async setItem(key, value) {
    started.resolve(); await gate.promise; await storage.setItem(key, value);
  }});
  const selecting = store.select(new Date('2026-10-11T00:00:00Z'));
  const cancelling = store.cancel();
  await started.promise;
  gate.resolve();
  await Promise.all([selecting, cancelling]);
  assert.equal(await store.load(), null);
});

test('immediate select after delayed cancel leaves the latest selection', async () => {
  const { storage } = storageFixture();
  const started = Promise.withResolvers();
  const gate = Promise.withResolvers();
  const store = createDateRunStore({...storage, async removeItem(key) {
    started.resolve(); await gate.promise; await storage.removeItem(key);
  }});
  await store.select(new Date('2026-10-10T00:00:00Z'));
  const cancelling = store.cancel();
  const selecting = store.select(new Date('2026-10-11T00:00:00Z'));
  await started.promise;
  gate.resolve();
  await Promise.all([cancelling, selecting]);
  assert.equal((await store.load())?.date, '2026-10-11');
});

test('a rejected mutation does not block the next mutation or hydration', async () => {
  const { storage } = storageFixture();
  let attempts = 0;
  const failure = new Error('first write failed');
  const store = createDateRunStore({...storage, async setItem(key, value) {
    attempts += 1;
    if (attempts === 1) throw failure;
    await storage.setItem(key, value);
  }});
  const failed = store.select(new Date('2026-10-10T00:00:00Z'));
  const retry = store.select(new Date('2026-10-11T00:00:00Z'));
  await assert.rejects(failed, failure);
  await retry;
  assert.equal((await store.load())?.date, '2026-10-11');
});

test('foreground hydration during a pending mutation obtains committed state', async () => {
  const { storage } = storageFixture();
  const started = Promise.withResolvers();
  const gate = Promise.withResolvers();
  const store = createDateRunStore({...storage, async setItem(key, value) {
    started.resolve(); await gate.promise; await storage.setItem(key, value);
  }});
  await store.load();
  const selecting = store.select(new Date('2026-12-31T14:59:59Z'));
  await started.promise;
  const foregroundHydration = store.load();
  gate.resolve();
  await selecting;
  assert.equal((await foregroundHydration)?.date, '2026-12-31');
});

test('foreground read does not join an older hydration ahead of a new mutation', async () => {
  const { storage } = storageFixture();
  const started = Promise.withResolvers();
  const gate = Promise.withResolvers();
  let reads = 0;
  const store = createDateRunStore({...storage, async getItem(key) {
    reads += 1;
    if (reads === 1) { started.resolve(); await gate.promise; }
    return storage.getItem(key);
  }});
  const initialHydration = store.load();
  await started.promise;
  const selecting = store.select(new Date('2026-10-11T00:00:00Z'));
  const foregroundHydration = store.load();
  gate.resolve();
  await Promise.all([initialHydration, selecting]);
  assert.equal((await foregroundHydration)?.date, '2026-10-11');
});

test('duplicate hydration without an intervening mutation performs one read', async () => {
  const { storage } = storageFixture();
  let reads = 0;
  const store = createDateRunStore({...storage, async getItem(key) {
    reads += 1;
    return storage.getItem(key);
  }});
  await Promise.all([store.load(), store.load()]);
  assert.equal(reads, 1);
});

test('hook reload shares coordination while isolated store factories stay separate', async () => {
  const { storage } = storageFixture();
  const first = getDateRunStore(storage);
  await first.select(new Date('2026-10-11T00:00:00Z'));
  const hookReload = getDateRunStore(storage);
  const isolated = createDateRunStore(storage);
  assert.equal(hookReload, first);
  assert.equal(hookReload.getSnapshot().selection?.date, '2026-10-11');
  assert.equal(isolated.getSnapshot().ready, false);
});
