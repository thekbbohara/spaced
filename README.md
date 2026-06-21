# Spaced

**Remember more, study less.** A free, open-source, fully-offline study app built on the two most evidence-backed learning techniques: **active recall** and **spaced repetition**.

Instead of re-reading notes, you pull each answer from memory and grade yourself. Spaced schedules every item to come back right before you'd forget it — so weak cards return often and mastered ones fade away.

Everything stays on your device. No account, no sign-up, no ads, no tracking, works fully offline.

## Download

- **Beta APK (Android):** [latest release](https://github.com/thekbbohara/spaced/releases/latest)
- **Play Store:** _coming soon_

> The beta APK ships under a separate package id, so it installs alongside any Play build. Move data between them with **Settings → Export / Restore backup**.

## Features

- **Per-card spaced repetition** — every card tracked on its own Anki-style timeline (intervals: 1, 3, 7, 14, 30, 60, 120 days).
- **Flashcard decks** — paste a list and each line splits into front/back, or add cards one at a time.
- **Study your way** — flip cards, type-the-answer auto-checking, reverse decks (answer → prompt), shuffle, or drill only starred "hard" cards.
- **New-card pacing** — new cards introduced gradually (up to 10/hour) so a big deck never overwhelms you.
- **Today screen** — what's due, your streak, recall rate, and mastery at a glance.
- **Study hubs** — attach notes, links, files, and images to any topic.
- **Focus sessions** — built-in timer with optional active-recall prompt at the end.
- **Local reminders** — notified the day a topic is due and when a focus session ends; scheduled on-device.
- **Backup & restore** — export everything to one JSON file and bring it to a new phone.

## Tech stack

- [Expo](https://expo.dev) SDK 56 / React Native 0.85 / React 19.2 (React Compiler)
- [Expo Router](https://docs.expo.dev/router/introduction) — file-based, typed routes
- `expo-sqlite` localStorage polyfill for persistence
- `expo-notifications` for local reminders
- `useSyncExternalStore` reactive store (no external state lib)

## Get started

```bash
npm install
npx expo start
```

Then open in an [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/), [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/), or a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

> Notifications and backup file-pickers are no-ops in Expo Go — use a dev build to exercise them.

### Build a release AAB/APK (Android)

```bash
npx expo prebuild -p android
cd android && ./gradlew bundleRelease --max-workers=2 -Porg.gradle.parallel=false
```

Signing config is read from `android/keystore.properties` (gitignored). See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full release flow.

## Project layout

```
src/
  app/            Expo Router routes (file-based)
    (today)/      home — due cards, streak, add topic
    (topics)/     topic list, cards, study, material, edit
    (focus)/      focus timer + run screen
    (settings)/   reminders, backup/restore
  components/     UI: topic cards, forms, material, cal design helpers
  lib/
    topics.ts         core store + spaced-repetition scheduling
    schedule.ts       interval math
    backup.ts         export/import
    notifications.ts  local reminder scheduling
    sessions.ts /     focus session records
    stats.ts          analytics (streak, recall rate, mastery)
    storage.ts        persistence
```

## Contributing

PRs welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and the [`TODO.md`](TODO.md) roadmap.

## Privacy

No data collected, ever. See [`PRIVACY.md`](PRIVACY.md).

## License

[MIT](LICENSE) © 2026 Kb Bohara
