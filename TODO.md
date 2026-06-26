# Roadmap / TODO

Loose backlog. Grab anything, open an issue, or send a PR. Nothing here is committed timeline.

## Recently shipped

- [x] Android home-screen widget (cards due today)
- [x] Configurable new-cards-per-hour
- [x] Cloze deletion cards
- [x] Images on cards (creation + study view)
- [x] Anki TSV / CSV import and CSV export
- [x] Search across topics and cards
- [x] Folder tree + per-folder stats + study a whole folder
- [x] Mixed "Study all due"; Again/Hard/Good + Skip; undo; edit-mid-study; leech auto-flag
- [x] Recall sessions + offline activity log
- [x] Reminders: heads-up pop, daily digest, 2.5h escalation
- [x] Topic "key points to study" field
- [x] Accessibility pass

## Shipping

- [ ] Publish to Google Play (production track)
- [ ] iOS build + TestFlight
- [ ] App website / landing page

## Study features

- [ ] Configurable interval schedule (let users tune `INTERVALS`)
- [ ] Configurable new-cards-per-hour limit (currently fixed at 10)
- [ ] SM-2 / FSRS-style adaptive scheduling instead of fixed ladder
- [ ] Cloze deletion cards
- [ ] Image-on-card support in study view
- [ ] Audio cards (play prompt audio)
- [ ] Deck-level stats and per-deck study buttons

## Import / export

- [ ] Import Anki `.apkg` / CSV
- [ ] Export deck to CSV / Markdown
- [ ] Optional auto-backup to user-chosen folder

## Notifications

- [ ] Per-topic reminder time override
- [ ] Daily "you have N due" summary notification
- [ ] Quiet hours

## UX / polish

- [ ] Dark mode
- [ ] Onboarding / first-run sample deck
- [ ] Haptics + sound settings toggle
- [ ] Search across topics and cards
- [ ] Reorder / tag / fold topics
- [ ] Accessibility pass (screen reader labels, font scaling)

## Engineering

- [ ] Unit tests for scheduling (`schedule.ts`, `availableCards`)
- [ ] CI: typecheck + lint + bundle on PR
- [ ] Backup format versioning + migration path
- [ ] i18n scaffolding

## Known issues

- [ ] Backup/restore and notifications are no-ops in Expo Go (dev-build only) — document clearly in-app
