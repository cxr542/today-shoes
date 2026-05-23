import { forwardRef, useImperativeHandle } from 'react';
import { Platform } from 'react-native';

export type WebHiddenFileInputHandle = {
  /** 사용자 클릭 직후 동기 호출 — Chrome 파일 선택 창 */
  pick: () => void;
};

type Props = {
  onFile: (uri: string, fileName: string) => void;
};

/**
 * 웹 전용: 클릭 제스처 안에서 document.createElement('input').click() 실행.
 * Expo ImagePicker·비동기 권한은 Chrome에서 창이 안 뜨는 경우가 많음.
 */
export const WebHiddenFileInput = forwardRef<WebHiddenFileInputHandle, Props>(
  function WebHiddenFileInput({ onFile }, ref) {
    useImperativeHandle(ref, () => ({
      pick: () => {
        if (Platform.OS !== 'web' || typeof document === 'undefined') return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept =
          'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
        input.style.display = 'none';

        const cleanup = () => {
          input.remove();
        };

        input.addEventListener('change', () => {
          const file = input.files?.[0];
          cleanup();
          if (!file) return;
          onFile(URL.createObjectURL(file), file.name);
        });

        input.addEventListener('cancel', cleanup);
        document.body.appendChild(input);
        input.click();
      },
    }));

    return null;
  },
);
