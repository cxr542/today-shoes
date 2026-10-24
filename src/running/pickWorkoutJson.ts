import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { MAX_LIBRARY_BYTES, RunningLibraryError } from './core';

export async function pickWorkoutJson(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain'], copyToCacheDirectory: true, multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if (asset.size !== undefined && asset.size > MAX_LIBRARY_BYTES) throw new RunningLibraryError('library_full');
  if (Platform.OS === 'web' && asset.file) return asset.file.text();
  const file = new File(asset.uri);
  try { return await file.text(); }
  finally { if (file.exists) file.delete(); }
}
