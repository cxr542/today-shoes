/** Portable, read-only shoe backup v1. No app storage writes. */
export type BackupShoe = {
  id: string; imageUri: string; imageUris?: Record<string, string | undefined>;
  nickname: string; brand?: string; model?: string; traits?: string;
  recommendation: string; createdAt: number; source?: 'camera' | 'album';
  geminiAnalyzed?: boolean; seedFile?: string;
};
export type BackupRecord = Omit<BackupShoe, 'imageUri' | 'imageUris'> & {
  images: Record<string, string>;
};
export type ShoeBackupV1 = {
  format: 'oneulmwosinji-shoes-backup'; version: 1; exportedAt: string;
  count: number; shoes: BackupRecord[];
};
const angles = ['front', 'left', 'right'] as const;
const dataImage = /^data:image\/(jpeg|png|webp|gif|heic|heif);base64,[a-z0-9+/=]+$/i;
export async function buildShoeBackup(
  shoes: readonly BackupShoe[], resolveImage: (uri: string) => Promise<string>,
  now = new Date(),
): Promise<ShoeBackupV1> {
  const ids = new Set<string>();
  const records: BackupRecord[] = [];
  for (const shoe of shoes) {
    if (!shoe.id || ids.has(shoe.id)) throw new Error('중복되거나 빈 신발 ID가 있어 백업을 중단했습니다.');
    ids.add(shoe.id);
    const refs = { ...(shoe.imageUris ?? {}) };
    if (!refs.front && !refs.left && !refs.right) refs.front = shoe.imageUri;
    const images: Record<string, string> = {};
    for (const angle of angles) {
      const uri = refs[angle];
      if (!uri) continue;
      const image = await resolveImage(uri);
      if (!dataImage.test(image)) throw new Error(`사진 형식을 확인할 수 없습니다: ${shoe.nickname} / ${angle}`);
      images[angle] = image;
    }
    if (!Object.keys(images).length) throw new Error(`사진을 백업할 수 없습니다: ${shoe.nickname}`);
    const { imageUri: _imageUri, imageUris: _imageUris, ...metadata } = shoe;
    records.push({ ...metadata, images });
  }
  return { format: 'oneulmwosinji-shoes-backup', version: 1,
    exportedAt: now.toISOString(), count: records.length, shoes: records };
}
export function validateShoeBackup(value: ShoeBackupV1): void {
  if (value.format !== 'oneulmwosinji-shoes-backup' || value.version !== 1 ||
      value.count !== value.shoes.length) throw new Error('백업 형식이나 신발 개수가 잘못되었습니다.');
  const ids = new Set<string>();
  for (const shoe of value.shoes) {
    if (!shoe.id || ids.has(shoe.id)) throw new Error('백업에 중복된 신발 ID가 있습니다.');
    ids.add(shoe.id);
    if (!Object.values(shoe.images).length ||
        Object.values(shoe.images).some(image => !dataImage.test(image)))
      throw new Error('사진 누락 또는 손상 때문에 백업을 중단했습니다.');
  }
}
