import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { workoutKey } from './core.ts';
import { createRunningStore, RUNNING_STORAGE_KEY } from './store.ts';

const fixture = JSON.parse(readFileSync(new URL('../import/fixtures/workout-contract-v1.json', import.meta.url), 'utf8'));
const raw = JSON.stringify(fixture);
function setup() {
  const data = new Map([['shoes', 'existing'], ['@oneulmwosinji/date-run/selection/v1', 'selection']]);
  const storage = { async getItem(k) { return data.get(k) ?? null; }, async setItem(k,v) { data.set(k,v); }, async removeItem(k) { data.delete(k); } };
  return { data, storage };
}
test('import persists across store instances without touching shoes or selection', async () => {
  const { data, storage } = setup();
  const first = createRunningStore(storage); await first.load();
  await first.importJson(raw);
  const restored = createRunningStore(storage); await restored.load();
  assert.equal(restored.getSnapshot().records.length, 1);
  assert.equal(data.get('shoes'), 'existing');
  assert.equal(data.get('@oneulmwosinji/date-run/selection/v1'), 'selection');
});
test('link persists and unlink is restored after another load', async () => {
  const { storage } = setup(); const store = createRunningStore(storage); await store.load(); await store.importJson(raw);
  const key = workoutKey(store.getSnapshot().records[0].workout);
  await store.link(key, true);
  const restored = createRunningStore(storage); await restored.load();
  assert.equal(restored.getSnapshot().records[0].dateRunLinked, true);
  await restored.link(key, false);
  const final = createRunningStore(storage); await final.load();
  assert.equal(final.getSnapshot().records[0].dateRunLinked, false);
});
test('failed writes leave the visible snapshot and persisted data unchanged', async () => {
  const { data, storage } = setup(); let fail = true;
  const store = createRunningStore({ ...storage, async setItem(k,v) { if (fail) throw new Error('full'); return storage.setItem(k,v); } });
  await store.load();
  await assert.rejects(store.importJson(raw), /full/);
  assert.equal(store.getSnapshot().records.length, 0);
  assert.equal(data.has(RUNNING_STORAGE_KEY), false);
  fail = false;
  await store.importJson(raw);
  assert.equal(store.getSnapshot().records.length, 1);
});
test('concurrent import calls serialize and avoid duplicate workouts', async () => {
  const { storage } = setup(); const store = createRunningStore(storage); await store.load();
  const results = await Promise.all([store.importJson(raw), store.importJson(raw)]);
  assert.deepEqual(results, [{ added: 1, duplicates: 0 }, { added: 0, duplicates: 1 }]);
  assert.equal(store.getSnapshot().pending, 0);
});
test('remount load waits for an unfinished import', async () => {
  const { storage } = setup(); const gate = Promise.withResolvers(); const started = Promise.withResolvers();
  const store = createRunningStore({ ...storage, async setItem(k,v) { started.resolve(); await gate.promise; await storage.setItem(k,v); } });
  await store.load(); const importing = store.importJson(raw); await started.promise;
  const reloading = store.load(); gate.resolve(); await Promise.all([importing, reloading]);
  assert.equal(store.getSnapshot().records.length, 1);
});
test('corrupt storage blocks mutation and preserves raw recovery data', async () => {
  const { data, storage } = setup(); data.set(RUNNING_STORAGE_KEY, 'broken'); const store = createRunningStore(storage);
  await assert.rejects(store.load()); await assert.rejects(store.importJson(raw), error => error.code === 'not_loaded');
  assert.equal(data.get(RUNNING_STORAGE_KEY), 'broken');
});
test('delete removes a record and its link across reload', async () => {
  const { storage } = setup(); const store = createRunningStore(storage); await store.load(); await store.importJson(raw);
  const key = workoutKey(store.getSnapshot().records[0].workout); await store.link(key, true);
  await store.remove(key); const after = createRunningStore(storage); await after.load();
  assert.deepEqual(after.getSnapshot().records, []);
});
test('one invalid record rejects the entire import batch before writing', async () => {
  const { data, storage } = setup(); const store = createRunningStore(storage); await store.load();
  assert.throws(() => store.importJson(JSON.stringify({ ...fixture, workouts: [...fixture.workouts, {}] })));
  assert.equal(data.has(RUNNING_STORAGE_KEY), false);
});
