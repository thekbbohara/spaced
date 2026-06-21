# Contributing to Spaced

Thanks for helping out. Spaced is a small, offline-first Expo app — contributions of any size welcome.

## Ground rules

- Be respectful. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
- Keep the app **offline and private** — no analytics, ads, trackers, accounts, or network calls for user data. PRs that add any of these will be declined.
- Match the existing style. Don't refactor unrelated code in a feature PR.

## Setup

```bash
git clone https://github.com/thekbbohara/spaced.git
cd spaced
npm install
npx expo start
```

This project targets **Expo SDK 56**. APIs change between SDKs — read the exact versioned docs at <https://docs.expo.dev/versions/v56.0.0/> before using an Expo module.

Run on a dev build (not Expo Go) to test notifications, the file picker, and backup/restore — those are no-ops in Expo Go.

## Before you open a PR

```bash
npx tsc --noEmit                 # typecheck — must pass
npm run lint                     # expo lint
npx expo export --platform android   # sanity bundle
```

## Architecture notes

- **State** lives in plain stores backed by `useSyncExternalStore` (`src/lib/topics.ts`, `sessions.ts`). Snapshots must be **referentially stable** — returning a fresh object/array each call causes an infinite render loop. Cache the snapshot and only swap the ref when data actually changes.
- **Scheduling** is per-card (`schedule.ts` / `topics.ts`). `INTERVALS = [1,3,7,14,30,60,120]` days; new cards are paced via `NEW_PER_HOUR` and `availableCards()`.
- **Notifications** (`notifications.ts`) are lazy-loaded and no-op in Expo Go (`Constants.executionEnvironment !== 'storeClient'`). Use local triggers only.
- **Persistence** goes through `storage.ts` (expo-sqlite localStorage polyfill). Backup format is `{ format: 'active-recall-backup', version, exportedAt, data }` — bump `version` and handle migration if you change the shape.
- **Design** follows a Cal.com-style system (black `#111111`, white, gray `#f5f5f5`) — see `src/components/cal.tsx`.

## Commit & PR conventions

- One logical change per PR; keep diffs focused.
- Clear commit subject in the imperative ("Add shuffle option to study").
- Describe what changed and how you tested it (emulator/device, OS).
- Link any related issue or `TODO.md` item.

## Release flow (maintainers)

Android signing reads from `android/keystore.properties` (gitignored — **never commit keystores or passwords**).

```bash
npx expo prebuild -p android
cd android
# AAB for Play
./gradlew bundleRelease --max-workers=2 -Porg.gradle.parallel=false
# APK for a target ABI (sideload / GitHub release)
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Build a single ABI per APK — installing the wrong native ABI crashes at launch (`ReactNativeFeatureFlagsCxxInterop`). Serialize the bundle build (`--max-workers=2`, parallel off) to avoid OOM kills.

Bump `versionCode` in `app.json` for every Play upload.
