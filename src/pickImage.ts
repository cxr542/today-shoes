import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { isWebPlatform } from './shoeImagePersist';

export function defaultPickImageOptions(): ImagePicker.ImagePickerOptions {
  return {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.85,
  };
}

/** 웹: 권한 API 없이 파일 선택 (실패 시 input fallback) */
function pickViaHtmlFileInput(): Promise<ImagePicker.ImagePickerResult> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve({ canceled: true, assets: null });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => {
      input.remove();
    };

    input.onchange = () => {
      const file = input.files?.[0];
      cleanup();
      if (!file) {
        resolve({ canceled: true, assets: null });
        return;
      }
      const uri = URL.createObjectURL(file);
      resolve({
        canceled: false,
        assets: [
          {
            uri,
            width: 0,
            height: 0,
            assetId: null,
            fileName: file.name,
            fileSize: file.size,
            type: 'image',
            mimeType: file.type || 'image/jpeg',
          },
        ],
      });
    };

    input.oncancel = () => {
      cleanup();
      resolve({ canceled: true, assets: null });
    };

    input.click();
  });
}

export async function launchPhotoLibrary(
  options: ImagePicker.ImagePickerOptions = defaultPickImageOptions(),
): Promise<ImagePicker.ImagePickerResult> {
  if (isWebPlatform()) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets?.[0]) {
        return result;
      }
      if (result.canceled) {
        return result;
      }
    } catch (e) {
      console.warn('launchImageLibraryAsync (web) 실패, file input 사용', e);
    }
    return pickViaHtmlFileInput();
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('PHOTO_PERMISSION_DENIED');
  }
  return ImagePicker.launchImageLibraryAsync(options);
}

export async function launchCamera(
  options: ImagePicker.ImagePickerOptions = defaultPickImageOptions(),
): Promise<ImagePicker.ImagePickerResult> {
  if (Platform.OS === 'web') {
    return launchPhotoLibrary(options);
  }
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error('CAMERA_PERMISSION_DENIED');
  }
  return ImagePicker.launchCameraAsync(options);
}
