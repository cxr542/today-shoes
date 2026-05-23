import AsyncStorage from '@react-native-async-storage/async-storage';

const REGISTRY_KEY = '@oneulmwosinji/imported-seed-files/v1';

export async function getImportedSeedFiles(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function markSeedFileImported(file: string): Promise<void> {
  const key = file.trim();
  if (!key) return;
  const list = await getImportedSeedFiles();
  if (list.includes(key)) return;
  await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify([...list, key]));
}

export function isAutoSeedEnabled(): boolean {
  const v = (process.env.EXPO_PUBLIC_AUTO_IMPORT_SEEDS ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
