/** 신발 등록 시 촬영·업로드 각도 */
export const SHOE_ANGLE_IDS = ['front', 'left', 'right'] as const;

export type ShoeAngleId = (typeof SHOE_ANGLE_IDS)[number];

export type ShoeImages = Partial<Record<ShoeAngleId, string>>;

export const SHOE_ANGLE_META: Record<
  ShoeAngleId,
  { label: string; short: string; hint: string }
> = {
  front: {
    label: '정면',
    short: '정면',
    hint: '신발 앞쪽이 보이게',
  },
  left: {
    label: '왼쪽',
    short: '왼쪽',
    hint: '왼쪽 옆면·밑창 일부',
  },
  right: {
    label: '오른쪽',
    short: '오른쪽',
    hint: '오른쪽 옆면·밑창 일부',
  },
};

export function filledPhotoUris(photos: ShoeImages): string[] {
  return SHOE_ANGLE_IDS.map((id) => photos[id]?.trim()).filter(Boolean) as string[];
}

export function hasAllShoePhotos(photos: ShoeImages): boolean {
  return SHOE_ANGLE_IDS.every((id) => Boolean(photos[id]?.trim()));
}

export function primaryImageUri(shoe: { imageUri: string; imageUris?: ShoeImages }): string {
  return shoe.imageUris?.front ?? shoe.imageUri;
}

export function photoCount(shoe: { imageUri: string; imageUris?: ShoeImages }): number {
  if (shoe.imageUris) {
    return SHOE_ANGLE_IDS.filter((id) => shoe.imageUris?.[id]).length;
  }
  return shoe.imageUri ? 1 : 0;
}
