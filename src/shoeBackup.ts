import { Platform, Share } from 'react-native';
import { EncodingType, documentDirectory, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { loadShoes } from './shoeStore';
import { buildShoeBackup, validateShoeBackup } from './shoeBackupCore';

async function imageToDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:image/')) return uri;
  if (Platform.OS !== 'web' && uri.startsWith('file://')) {
    const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
    const match = /\.([a-zA-Z]+)(?:\?|$)/.exec(uri);
    const ext = match?.[1]?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' :
      ext === 'heic' ? 'image/heic' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  }
  throw new Error('로컬 신발 사진을 읽을 수 없습니다. 원본 데이터를 유지하고 백업을 중단합니다.');
}

/** Exports a self-contained JSON including all original shoe metadata and photographs.
 * Never deletes, mutates or uploads anything. No incomplete file is exported. */
export async function exportShoeBackup(): Promise<number> {
  const shoes = await loadShoes();
  const backup = await buildShoeBackup(shoes, imageToDataUrl);
  validateShoeBackup(backup);
  const json = JSON.stringify(backup);
  const filename = `oneulmwosinji-shoes-${backup.exportedAt.slice(0,10)}.json`;
  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    } finally {
      // Delay revoke so the browser can finish starting the download.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
  } else {
    if (!documentDirectory) throw new Error('백업 파일을 저장할 앱 디렉터리가 없습니다.');
    const path = `${documentDirectory}${filename}`;
    await writeAsStringAsync(path, json, { encoding: EncodingType.UTF8 });
    const result = await Share.share({ url: path, title: '오늘뭐신지 신발장 백업' });
    if (result.action === Share.dismissedAction) {
      throw new Error('백업 공유를 취소했습니다. 다시 백업하여 파일 앱에 저장해 주세요.');
    }
  }
  return backup.count;
}
