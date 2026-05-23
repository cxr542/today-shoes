# 신발장 등록용 이미지 폴더

여기 또는 `assets/seed`에 러닝화 사진(`.jpg`, `.png`, `.webp`, **`.heic`**)을 넣은 뒤:

```bash
node scripts/import-uploads.mjs
```

HEIC는 자동으로 `.jpg`로 변환됩니다. 앱을 새로고침하면 신발장에 자동 등록됩니다.

```bash
npm run import-uploads
```

- 파일명이 `nike-pegasus-40.jpg`이면 이름은 **나이키 페가수스 40**으로 매핑됩니다.
- 그 외 파일은 파일명을 공백으로 바꾼 이름이 사용됩니다.
