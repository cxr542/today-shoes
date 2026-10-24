# Validation: 2026-10-24

## Automated and Web checks

- `npm run typecheck`: PASS, no diagnostics.
- `npm test`: PASS, 145 tests (existing Date Run and Workout contract tests included).
- Web export: PASS.
- `git diff --check`: PASS.
- No lint script or lint configuration exists in this repository; no lint pass is claimed.
- Config plugin: prebuild twice without duplicate scene build entries; CocoaPods installation passed.
- Xcode 27.1 / SDK 54 Release build: PASS, signed using the existing development Team and certificate.
- Development profile renewed with explicit permission; expiry: 2026-10-31 09:03:25 UTC.
- Temporary build directory aliases required explicit `ENTRY_FILE` using `/private/tmp`.
  This is a temporary checkout path issue, not a source change.

Actual Chrome UI testing used a disposable profile and a localhost-only export
server. File selection, preview, explicit save, manual Date Run link, +50 m
Perfect, reload persistence, duplicate skipping, invalid JSON rejection without
data loss, unlink and confirmed deletion passed. Captures covered 390 CSS px
(DPR 3, mobile/touch) and 1440 CSS px (DPR 1), light/dark system preferences,
including scrolled content. The app retains its existing light palette in both
system modes; no separate dark theme was introduced. Existing Card/theme/button
components are reused. No horizontal document overflow was observed.

Ephemeral evidence: `/private/tmp/oneul-phase3-evidence/`, with matrix results and
screenshots. Build/test logs also live under `/private/tmp` and are not durable.

## iPhone

- Final Release installed as an update using `com.cxr542.oneulmwosinji`.
- User explicitly trusted the existing Apple Development identity on the device.
- Actual launch and native React UI passed without Metro.
- Device console did not reproduce `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`.
- Existing shoe and photo remained visible after installation.
- User confirmed home Date Run `10.24 KM` and the running records card.
- Native system file picker opened and canceled successfully (user confirmed).
- Native JSON paste, preview, save and Date Run link: PASS. A synthetic manual
  workout of 10,290 m produced Perfect against the 10,240 m target (+50 m).
- Force-quit/relaunch restoration and background/foreground state: PASS,
  confirmed by the user. The saved workout and manual link both survived.
- Native unlink and confirmed deletion: PASS, confirmed by the user.
- A second force-quit/relaunch retained deletion; the synthetic record did not return.

Console emitted existing Expo delegate warnings about unconfigured background
fetch/remote notification modes. Those capabilities are outside this feature;
no background mode was added to suppress warnings. Camera capture, live Gemini
requests and cold-start deep links have not been revalidated in this pass.

## Scope

No DB, Supabase, HealthKit import, HealthRunExporter source, production deployment,
SDK upgrade or account/certificate changes. `expo-document-picker` is the one
new runtime dependency, selected for Expo SDK 54. Generated native project/build
outputs stayed in the temporary checkout. At the time of this validation, no
staging, commit, push, PR or merge had been performed.
The pre-existing untracked `disposable-checkout-consistency.md` was preserved.
The localhost QA server was stopped after Web testing. No Metro or tunnel is
required by the installed Release build.

## Files changed

Modified tracked files:

- `README.md`: feature/build guide link.
- `app.json`: approved bundle ID, existing Team and scene plugin.
- `package.json`, `package-lock.json`: SDK 54 document picker and local check/build scripts.
- `src/components/BottomTabs.tsx`, `src/components/WebAppFrame.tsx`: remove obsolete error suppressions.
- `src/import/workoutContractV1.ts`: preserve literal union inference.
- `src/seedPegasus40.ts`: pass the current photo object contract.
- `src/ui.tsx`: correct Card style typing and shared button accessibility semantics.
- `src/screens/HomeTab.tsx`: add the running library card.

New files:

- `src/components/RunningLibraryCard.tsx`.
- `src/running/core.ts`, `core.test.mjs`, `store.ts`, `store.test.mjs`,
  `useRunningLibrary.ts`, `pickWorkoutJson.ts`.
- `plugins/withOneulScene.js`, `plugins/withOneulScene.test.mjs`.
- `native/ios/SceneDelegate.swift`.
- `docs/date-run-and-ios.md`, this validation report.

At the time of validation, `git diff` showed tracked changes only, and the new
files remained untracked pending separate permission to commit and publish.
No generated native directory or build output was added to the original repository.
