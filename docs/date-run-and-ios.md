# Date Run and local running records

Date Run uses the calendar date in `Asia/Seoul`, with an integer meter target:
`month * 1000 + day * 10`. A saved selection belongs only to its Seoul date.

The home screen accepts HealthRunExporter Workout contract v1 JSON through the
system file picker or JSON paste. Preview the batch and choose save explicitly.
The importer accepts at most 100 workouts and 1 MiB per batch. The local library
holds at most 1,000 records and 1 MiB. Identical source/external-ID records are
skipped; conflicting records reject the entire import without overwriting data.

Link each imported record to Date Run explicitly. Its Seoul **start date** sets
the target, independently of today's selected plan. Distances are never summed.
Completion uses the original meter value: completed at or above target; Perfect
from target through target + 50 m inclusive. This is a product rule, not a GPS
accuracy guarantee. Missing-distance records can be stored but cannot be linked.
Unlinking retains the workout; deleting asks for confirmation.

The library uses `@oneulmwosinji/running/library/v1`, separately from shoe data
and `@oneulmwosinji/date-run/selection/v1`. Web uses localStorage through the
existing adapter; native uses AsyncStorage. No server, HealthKit permissions,
exporter changes, or cloud synchronization are involved. Corrupt storage is
preserved and reported, rather than silently cleared. Removing the app/browser
storage removes this local data; retain the original export.

## Reproducible SDK 54 iOS build

The app remains on Expo 54 / React Native 0.81.5. `app.json` records bundle ID
`com.cxr542.oneulmwosinji` and the existing Apple Development Team `LL44B244GV`.
Development signing still requires an authorized account, valid certificate,
matching provisioning profile, and registered device on the build Mac. Recording
a Team ID does not create credentials or authorize production distribution.

`plugins/withOneulScene.js` applies during prebuild. It copies the versioned
`native/ios/SceneDelegate.swift`, adds the scene manifest and build source, moves
window startup out of the generated AppDelegate, and preserves the AppDelegate
window reference for Expo 54 modules. SceneDelegate forwards URL/user activities.
The plugin also raises lower Pod deployment targets to iOS 15.1 for Xcode 27,
retaining any higher requirements. No generated `ios/` directory is versioned.

```sh
npm ci
npm run ios:prebuild
npm run ios:device
# Standalone device build with embedded JavaScript, without Metro:
npm run ios:release
```

Xcode may need explicit authorization to create or renew a development profile.
Personal Team profiles expire quickly; reinstalling a freshly signed build may
be necessary. A Debug build uses Metro; keep it on the authorized LAN and stop it
after testing. A Release build loads the embedded bundle and needs no Metro.
These commands are development/device workflows, not App Store deployment.

The plugin deliberately fails on an unsupported native template. Review it
before any SDK upgrade. Multi-window support is disabled. Cold-start deep links
and third-party scene-dependent modules require separate device testing before
those capabilities are shipped.

## Checks

```sh
npm run typecheck
npm test
npm run build:web
```

Tests cover Seoul date boundaries, raw-meter results, selection races, Workout
contract validation, library persistence/concurrency, and plugin behavior.
Actual native signing, launch, file picking, force-quit persistence and lifecycle
behavior must additionally be checked on an iPhone. A Web pass does not establish
a native pass.
