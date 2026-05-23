# 오늘뭐신지 (Today Shoes)

러닝화 사진을 신발장에 등록하고, Gemini로 이름·특징·용도를 분석하는 **Expo** 앱입니다.

## 로컬 실행 (웹)

```powershell
cd C:\Users\USER\Projects\today-shoes\app
npm install
copy .env.example .env
# .env에 EXPO_PUBLIC_GOOGLE_AI_API_KEY 설정
npm run web
```

브라우저: http://localhost:8081

자세한 내용은 [WEB.md](./WEB.md)를 참고하세요.

## GitHub에 올리기

```powershell
cd C:\Users\USER\Projects\today-shoes\app
git remote add origin https://github.com/cxr542/today-shoes.git
git push -u origin main
```

저장소 이름이 다르면 `origin` URL과 아래 Pages 설정의 경로(`/저장소이름/`)를 맞추세요.

## 배포 (GitHub Pages)

`main` 브랜치에 push하면 [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml)이 **정적 웹**을 빌드해 Pages에 올립니다.

### 한 번만 설정

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. `EXPO_PUBLIC_GOOGLE_AI_API_KEY` 추가 (Google AI Studio API 키)
3. **Settings** → **Pages** → **Build and deployment** → Source: **GitHub Actions**
4. `main`에 push 후 **Actions** 탭에서 워크플로 완료 확인

배포 URL 예시: `https://cxr542.github.io/today-shoes/`

> API 키는 빌드 시 클라이언트 번들에 포함됩니다. 공개 저장소라면 키 노출·악용에 유의하고, 필요 시 API 키에 HTTP 리퍼러/도메인 제한을 걸어 두세요.

### 수동 빌드

```powershell
$env:EXPO_PUBLIC_BASE_PATH="/today-shoes/"
npx expo export -p web
# 결과: dist/
```

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run web` | 개발 서버 (웹) |
| `npm run build:web` | 정적 export (`dist/`) |
| `npm run import-uploads` | `uploads/` → 시드 등록 |
=======
# today-shoes
>>>>>>> 8d279e80df11eadfd720f4be61a216a6b3b6fe8d
