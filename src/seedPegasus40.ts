import { Asset } from 'expo-asset';
import { addShoe, loadShoes } from './shoeStore';

const SEED_NICKNAME = '나이키 페가수스 40';

const PEGASUS40_RECOMMENDATION = [
  '【나이키 페가수스 40 · DV3853】',
  'React 폼 + 앞·뒤 Zoom Air로 데일리 로드런에 무난한 쿠션·반발형입니다.',
  '이지런·LSD·회복런·템포런에 잘 맞고, 레이스는 하프~10K 페이스에서 검토해 보세요.',
  '중립 지지·10mm 드롭·약 289g(US10) 전후로 페가수스 라인의 범용 데일리 트레이너에 가깝습니다.',
].join('\n');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PEGASUS_IMAGE = require('../assets/seed/nike-pegasus-40.jpg');

/**
 * 앱에 페가수스 40 샘플이 없으면 번들 사진으로 신발장에 1켤레 등록합니다.
 * @returns 새로 등록했으면 true
 */
export async function seedPegasus40IfNeeded(): Promise<boolean> {
  const existing = await loadShoes();
  const already = existing.some(
    (s) =>
      s.nickname.trim() === SEED_NICKNAME ||
      s.nickname.includes('페가수스 40'),
  );
  if (already) return false;

  const asset = Asset.fromModule(PEGASUS_IMAGE);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error('페가수스 40 시드 이미지를 불러오지 못했습니다.');
  }

  await addShoe(uri, SEED_NICKNAME, PEGASUS40_RECOMMENDATION, 'album');
  return true;
}
