# 웹에서 미리보기 (모바일 전)

Google Drive(`G:\...`)에서는 `npm install`이 자주 실패합니다. **로컬 폴더**에서 실행하는 것을 권장합니다.

## 1. 로컬로 복사 (한 번만)

PowerShell:

```powershell
$src = "G:\내 드라이브\VibeCoding\today-shoes\app"
$dst = "C:\Users\USER\Projects\today-shoes\app"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
robocopy $src $dst /E /XD node_modules .git
Set-Location $dst
npm install
```

## 2. 웹 실행

```powershell
cd C:\Users\USER\Projects\today-shoes\app
npm run web
```

브라우저에서 **http://localhost:8081** (또는 터미널에 표시된 주소)를 엽니다.

## 3. AI 사진 분석 (이름·특징·용도)

프로젝트 루트에 `.env` 파일을 만들고 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급한 키를 넣습니다 (`.env.example` 참고).

```env
EXPO_PUBLIC_GOOGLE_AI_API_KEY=AIza...
```

키가 없으면 등록·상세에서 **기본 안내 문구**만 저장됩니다. 키 설정 후 `npm run web`을 **다시 시작**해야 반영됩니다.

## 4. 웹에서 할 수 있는 것

| 기능 | 웹 |
|------|-----|
| 하단 탭 (홈·신발장·가이드·링크) | ✅ |
| 이미지 선택 → **AI 분석** → 등록 확인 → 저장 | ✅ |
| 신발장 카드에 특징·브랜드 표시 | ✅ |
| 신발장·상세·삭제·재분석 | ✅ |
| 페가수스 40 시드 자동 등록 | ✅ (첫 실행 시, AI 분석 포함) |
| 카메라 촬영 | ❌ (파일 선택 사용) |

데이터는 **현재 브라우저** localStorage에만 저장됩니다. 모바일 Expo Go와는 공유되지 않습니다.

## 5. GitHub Pages 배포

`main`에 push하면 Actions가 `expo export -p web` 후 Pages에 배포합니다.

1. 저장소 Secrets에 `EXPO_PUBLIC_GOOGLE_AI_API_KEY` 등록
2. GitHub **Settings → Pages → Source: GitHub Actions**
3. 배포 URL: `https://<사용자>.github.io/<저장소이름>/`

로컬에서 production과 비슷하게 보려면:

```powershell
$env:EXPO_PUBLIC_BASE_PATH="/today-shoes/"
npm run build:web
npx serve dist
```

## 6. 정적 HTML만 빠르게 볼 때

레이아웃만 확인: `ui-preview.html`을 브라우저로 엽니다. (실제 등록·저장은 Expo 웹이 필요합니다.)
