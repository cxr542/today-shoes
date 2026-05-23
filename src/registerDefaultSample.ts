import { Asset } from 'expo-asset';
import { markSeedFileImported } from './seedRegistry';
import { addShoe, loadShoes } from './shoeStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PEGASUS_IMAGE = require('../assets/seed/nike-pegasus-40.jpg');

const SAMPLE_NICKNAME = '나이키 페가수스 40';

const SAMPLE_RECOMMENDATION = [
  '【샘플 · 나이키 페가수스 40】',
  'React 폼 + Zoom Air 데일리 트레이너 예시입니다.',
  '이지런·LSD·회복런·템포런에 무난합니다.',
  '',
  '【특징】',
  '데일리 로드런용 범용 쿠션·반발 밸런스. 페가수스 라인 특유의 무난한 지지와 반응성.',
  '',
  '【추천 용도】',
  '이지런·회복런·가벼운 템포런',
  '',
  '【참고】',
  '앱 첫 실행 시 보여 주는 샘플 신발입니다. + 버튼으로 본인 신발을 등록해 보세요.',
].join('\n');

const SAMPLE_META = {
  brand: 'Nike',
  model: 'Pegasus 40',
  traits: 'React 쿠션·Zoom Air. 데일리 로드런용 올라운드 트레이너로 무난한 지지와 반발.',
  geminiAnalyzed: false,
  seedFile: 'nike-pegasus-40.jpg',
};

/**
 * 신발장이 비어 있을 때 샘플 1켤레만 등록합니다.
 * @returns 샘플을 새로 넣었으면 true
 */
export async function registerDefaultSampleIfEmpty(): Promise<boolean> {
  const existing = await loadShoes();
  if (existing.length > 0) return false;

  const asset = Asset.fromModule(PEGASUS_IMAGE);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    console.warn('샘플 이미지를 불러오지 못했습니다.');
    return false;
  }

  const photos = { front: uri, left: uri, right: uri };
  await addShoe(photos, SAMPLE_NICKNAME, SAMPLE_RECOMMENDATION, 'album', SAMPLE_META);
  await markSeedFileImported('nike-pegasus-40.jpg');
  return true;
}
