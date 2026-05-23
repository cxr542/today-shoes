import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SHOE_ANGLE_IDS,
  type ShoeAngleId,
  type ShoeImages,
  primaryImageUri,
} from './shoeAngles';
import { removePersistedImage, uriToPersistedImage } from './shoeImagePersist';

const STORAGE_KEY = '@oneulmwosinji/shoes/v1';

export type ShoeSource = 'camera' | 'album';

export type Shoe = {
  id: string;
  /** 대표 썸네일(정면) URI */
  imageUri: string;
  /** 정면·왼쪽·오른쪽 사진 */
  imageUris?: ShoeImages;
  nickname: string;
  brand?: string;
  model?: string;
  traits?: string;
  recommendation: string;
  createdAt: number;
  source?: ShoeSource;
  geminiAnalyzed?: boolean;
  /** assets/seed manifest 파일명 (폴더 자동 등록) */
  seedFile?: string;
};

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeShoe(s: Partial<Shoe>): Shoe | null {
  const id = String(s.id ?? '');
  const imageUri = String(s.imageUri ?? '');
  if (!id || !imageUri) return null;

  let imageUris: ShoeImages | undefined;
  if (s.imageUris && typeof s.imageUris === 'object') {
    imageUris = {};
    for (const angle of SHOE_ANGLE_IDS) {
      const u = s.imageUris[angle];
      if (u) imageUris[angle] = String(u);
    }
    if (Object.keys(imageUris).length === 0) imageUris = undefined;
  } else if (imageUri) {
    imageUris = { front: imageUri };
  }

  return {
    id,
    imageUri: imageUris?.front ?? imageUri,
    imageUris,
    nickname: String(s.nickname ?? ''),
    brand: s.brand ? String(s.brand) : undefined,
    model: s.model ? String(s.model) : undefined,
    traits: s.traits ? String(s.traits) : undefined,
    recommendation: String(s.recommendation ?? ''),
    createdAt: Number(s.createdAt ?? 0),
    source: s.source === 'camera' || s.source === 'album' ? s.source : undefined,
    geminiAnalyzed:
      s.geminiAnalyzed === true ? true : s.geminiAnalyzed === false ? false : undefined,
    seedFile: s.seedFile ? String(s.seedFile) : undefined,
  };
}

export async function loadShoes(): Promise<Shoe[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Shoe>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => normalizeShoe(s))
      .filter((s): s is Shoe => s !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

async function persistShoes(shoes: Shoe[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shoes));
}

async function persistShoeImages(
  id: string,
  tempImages: ShoeImages,
): Promise<ShoeImages> {
  const out: ShoeImages = {};
  for (const angle of SHOE_ANGLE_IDS) {
    const temp = tempImages[angle]?.trim();
    if (!temp) continue;
    out[angle] = await uriToPersistedImage(temp, `${id}-${angle}`);
  }
  return out;
}

export async function addShoe(
  tempImages: ShoeImages,
  nickname: string,
  recommendation: string,
  source?: ShoeSource,
  meta?: {
    brand?: string;
    model?: string;
    traits?: string;
    geminiAnalyzed?: boolean;
    seedFile?: string;
  },
): Promise<Shoe> {
  const id = randomId();
  const imageUris = await persistShoeImages(id, tempImages);
  const imageUri = imageUris.front ?? imageUris.left ?? imageUris.right ?? '';
  if (!imageUri) {
    throw new Error('저장할 사진이 없습니다.');
  }

  const shoe: Shoe = {
    id,
    imageUri,
    imageUris,
    nickname: nickname.trim(),
    brand: meta?.brand?.trim() || undefined,
    model: meta?.model?.trim() || undefined,
    traits: meta?.traits?.trim() || undefined,
    recommendation,
    createdAt: Date.now(),
    source,
    geminiAnalyzed:
      meta?.geminiAnalyzed === true ? true : meta?.geminiAnalyzed === false ? false : undefined,
    seedFile: meta?.seedFile?.trim() || undefined,
  };
  const shoes = await loadShoes();
  await persistShoes([shoe, ...shoes]);
  return shoe;
}

/** 신발장 전체 비우기 (브라우저 저장 데이터 초기화용) */
export async function clearAllShoes(): Promise<void> {
  const shoes = await loadShoes();
  for (const s of shoes) {
    const uris = new Set<string>([s.imageUri]);
    if (s.imageUris) {
      for (const u of Object.values(s.imageUris)) {
        if (u) uris.add(u);
      }
    }
    for (const uri of uris) {
      await removePersistedImage(uri);
    }
  }
  await persistShoes([]);
}

export async function updateNickname(id: string, nickname: string): Promise<void> {
  const shoes = await loadShoes();
  const next = shoes.map((s) =>
    s.id === id ? { ...s, nickname: nickname.trim() } : s,
  );
  await persistShoes(next);
}

export async function updateRecommendation(id: string, recommendation: string): Promise<void> {
  const shoes = await loadShoes();
  const next = shoes.map((s) => (s.id === id ? { ...s, recommendation } : s));
  await persistShoes(next);
}

export async function updateShoeFromAnalysis(
  id: string,
  data: {
    nickname: string;
    recommendation: string;
    brand?: string;
    model?: string;
    traits?: string;
    geminiAnalyzed?: boolean;
  },
): Promise<void> {
  const shoes = await loadShoes();
  const next = shoes.map((s) =>
    s.id === id
      ? {
          ...s,
          nickname: data.nickname.trim(),
          recommendation: data.recommendation,
          brand: data.brand?.trim() || undefined,
          model: data.model?.trim() || undefined,
          traits: data.traits?.trim() || undefined,
          geminiAnalyzed:
            data.geminiAnalyzed === true
              ? true
              : data.geminiAnalyzed === false
                ? false
                : undefined,
        }
      : s,
  );
  await persistShoes(next);
}

export async function removeShoe(id: string): Promise<void> {
  const shoes = await loadShoes();
  const target = shoes.find((s) => s.id === id);
  if (target) {
    const uris = new Set<string>([target.imageUri]);
    if (target.imageUris) {
      for (const u of Object.values(target.imageUris)) {
        if (u) uris.add(u);
      }
    }
    for (const uri of uris) {
      await removePersistedImage(uri);
    }
  }
  await persistShoes(shoes.filter((s) => s.id !== id));
}

/** 상세·카드용 대표 이미지 */
export { primaryImageUri };
