import { Asset } from 'expo-asset';
import { analyzeShoePhotos } from './recommendation';
import {
  getImportedSeedFiles,
  markSeedFileImported,
} from './seedRegistry';
import { addShoe, loadShoes } from './shoeStore';
import type { ShoeSource } from './shoeStore';

import manifest from '../assets/seed/manifest.json';
import { SEED_ASSETS } from './seedAssets.generated';

type ManifestItem = {
  file: string;
  nickname: string;
  source?: ShoeSource;
  recommendation?: string;
};

const DEFAULT_REC: Record<string, string> = {
  '나이키 페가수스 40': [
    '【나이키 페가수스 40 · DV3853】',
    'React 폼 + 앞·뒤 Zoom Air로 데일리 로드런에 무난한 쿠션·반발형입니다.',
    '이지런·LSD·회복런·템포런에 잘 맞습니다.',
  ].join('\n'),
};

function isDuplicateSeed(
  existing: Awaited<ReturnType<typeof loadShoes>>,
  item: ManifestItem,
): boolean {
  const nick = item.nickname.trim();
  const file = item.file.trim();
  return existing.some(
    (s) =>
      s.seedFile === file ||
      s.nickname.trim() === nick ||
      (nick.length > 4 && s.nickname.includes(nick)),
  );
}

/**
 * assets/seed 폴더 이미지를 신발장에 등록합니다.
 * 같은 manifest 파일은 한 번만 등록됩니다(파일명 기준 레지스트리).
 */
export async function registerFolderSeedsIfNeeded(): Promise<number> {
  const existing = await loadShoes();
  const importedFiles = await getImportedSeedFiles();
  const items = (manifest as { items: ManifestItem[] }).items ?? [];
  let added = 0;

  for (const item of items) {
    const file = item.file.trim();
    const nick = item.nickname.trim();
    if (!file || !nick) continue;

    if (importedFiles.includes(file) || isDuplicateSeed(existing, item)) {
      continue;
    }

    const mod = SEED_ASSETS[item.file as keyof typeof SEED_ASSETS];
    if (!mod) {
      console.warn(`시드 이미지 모듈 없음: ${item.file} (import-uploads 실행)`);
      continue;
    }

    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) continue;

    let displayNick = nick;
    let rec =
      item.recommendation?.trim() ||
      DEFAULT_REC[nick] ||
      '【폴더 등록】 업로드한 사진으로 신발장에 추가했습니다.';
    let meta:
      | {
          brand?: string;
          model?: string;
          traits?: string;
          geminiAnalyzed?: boolean;
          seedFile?: string;
        }
      | undefined;

    try {
      const a = await analyzeShoePhotos([uri, uri, uri], nick);
      displayNick = a.displayName || nick;
      rec = a.recommendation;
      meta = {
        brand: a.brand,
        model: a.model,
        traits: a.traits,
        geminiAnalyzed: a.fromVision,
        seedFile: file,
      };
    } catch (e) {
      console.warn(`시드 AI 분석 실패 (${nick})`, e);
      meta = { seedFile: file };
    }

    const seedPhotos = { front: uri, left: uri, right: uri };
    const shoe = await addShoe(seedPhotos, displayNick, rec, item.source ?? 'album', meta);
    existing.push(shoe);
    await markSeedFileImported(file);
    added += 1;
  }

  return added;
}
