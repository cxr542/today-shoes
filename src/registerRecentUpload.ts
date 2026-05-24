import { Asset } from 'expo-asset';
import { analyzeShoePhotos } from './recommendation';
import { getImportedSeedFiles, markSeedFileImported } from './seedRegistry';
import { addShoe, loadShoes } from './shoeStore';

/** 최근 업로드(IMG_6599·6600) 1켤레 — manifest와 별도로 3각 등록 */
export const RECENT_UPLOAD_SEED_KEY = 'recent:IMG_6599-IMG_6600';

let registerRecentInFlight: Promise<boolean> | null = null;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const IMG_6599 = require('../assets/seed/IMG_6599.jpg');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const IMG_6600 = require('../assets/seed/IMG_6600.jpg');

async function assetUri(mod: number): Promise<string | null> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri ?? null;
}

/**
 * assets/seed의 IMG_6599·6600으로 신발 1켤레를 등록합니다(한 번만).
 */
export async function registerRecentUploadIfNeeded(): Promise<boolean> {
  if (registerRecentInFlight) return registerRecentInFlight;

  registerRecentInFlight = (async () => {
  const imported = await getImportedSeedFiles();
  if (imported.includes(RECENT_UPLOAD_SEED_KEY)) return false;

  const existing = await loadShoes();
  if (existing.some((s) => s.seedFile === RECENT_UPLOAD_SEED_KEY)) {
    await markSeedFileImported(RECENT_UPLOAD_SEED_KEY);
    await markSeedFileImported('IMG_6599.jpg');
    await markSeedFileImported('IMG_6600.jpg');
    return false;
  }

  const front = await assetUri(IMG_6599);
  const side = await assetUri(IMG_6600);
  if (!front || !side) {
    console.warn('최근 업로드 이미지(IMG_6599/6600)를 불러오지 못했습니다.');
    return false;
  }

  const photos = { front, left: side, right: side };
  const hint = '러닝화 (최근 업로드)';

  let displayNick = hint;
  let rec =
    '【최근 업로드】 정면·측면 사진으로 신발장에 추가했습니다. 상세에서 AI 재분석할 수 있습니다.';
  let meta: {
    brand?: string;
    model?: string;
    traits?: string;
    geminiAnalyzed?: boolean;
    seedFile?: string;
  } = { seedFile: RECENT_UPLOAD_SEED_KEY };

  try {
    const a = await analyzeShoePhotos([front, side, side], hint);
    displayNick = a.displayName || hint;
    rec = a.recommendation;
    meta = {
      brand: a.brand,
      model: a.model,
      traits: a.traits,
      geminiAnalyzed: a.fromVision,
      seedFile: RECENT_UPLOAD_SEED_KEY,
    };
  } catch (e) {
    console.warn('최근 업로드 AI 분석 실패', e);
  }

  await addShoe(photos, displayNick, rec, 'album', meta);
  await markSeedFileImported(RECENT_UPLOAD_SEED_KEY);
  await markSeedFileImported('IMG_6599.jpg');
  await markSeedFileImported('IMG_6600.jpg');
  return true;
  })().finally(() => {
    registerRecentInFlight = null;
  });

  return registerRecentInFlight;
}
