import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShoeBackup, validateShoeBackup } from './shoeBackupCore.ts';
const img = 'data:image/jpeg;base64,/9j/2Q==';
const shoe = { id: 'legacy-1', imageUri: 'file:///one.jpg', nickname: '860',
  brand: 'New Balance', model: '860 v14', recommendation: 'easy run',
  createdAt: 100, imageUris: { front: 'file:///one.jpg', left: 'file:///two.jpg' } };
test('preserves original IDs, fields and embeds each image', async () => {
  const result = await buildShoeBackup([shoe], async () => img, new Date('2026-10-25T00:00:00Z'));
  assert.equal(result.count, 1);
  assert.equal(result.shoes[0].id, shoe.id);
  assert.equal(result.shoes[0].model, '860 v14');
  assert.deepEqual(Object.keys(result.shoes[0].images), ['front', 'left']);
  assert.ok(!('imageUri' in result.shoes[0]));
  validateShoeBackup(result);
});
test('backs up an empty closet without writing anything', async () => {
  const result = await buildShoeBackup([], async () => { throw Error('not called'); });
  assert.equal(result.count, 0); validateShoeBackup(result);
});
test('rejects unreadable or invalid images, never makes partial backup', async () => {
  await assert.rejects(buildShoeBackup([shoe], async u => { if(u.includes('two')) throw Error('missing'); return img; }), /missing/);
  await assert.rejects(buildShoeBackup([shoe], async () => 'file:///not-portable.jpg'), /사진 형식/);
});
test('rejects duplicate legacy IDs', async () => {
  await assert.rejects(buildShoeBackup([shoe, shoe], async () => img), /중복/);
});
test('fails validation if image data is missing', async () => {
  const result = await buildShoeBackup([shoe], async () => img);
  result.shoes[0].images.front = 'file:///old.jpg';
  assert.throws(() => validateShoeBackup(result), /사진/);
});
