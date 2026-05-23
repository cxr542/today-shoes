import { Platform } from 'react-native';
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

function shoesDir(): string {
  const base = documentDirectory;
  if (!base) {
    throw new Error('documentDirectory is not available on this platform');
  }
  return `${base}shoes/`;
}

export async function ensureNativeShoesDir(): Promise<void> {
  const dir = shoesDir();
  const info = await getInfoAsync(dir);
  if (!info.exists) {
    await makeDirectoryAsync(dir, { intermediates: true });
  }
}

/** 웹: blob/file URI → data URL (브라우저 localStorage에 안전하게 보관) */
export async function uriToPersistedImage(tempUri: string, fileKey: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(tempUri);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('이미지 인코딩 실패'));
      };
      reader.onerror = () => reject(reader.error ?? new Error('FileReader 오류'));
      reader.readAsDataURL(blob);
    });
    return dataUrl;
  }

  await ensureNativeShoesDir();
  const safeKey = fileKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dest = `${shoesDir()}${safeKey}.jpg`;
  await copyAsync({ from: tempUri, to: dest });
  return dest;
}

export async function removePersistedImage(imageUri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!imageUri.startsWith('file')) return;
  try {
    await deleteAsync(imageUri, { idempotent: true });
  } catch {
    // ignore
  }
}

export function isWebPlatform(): boolean {
  return Platform.OS === 'web';
}
