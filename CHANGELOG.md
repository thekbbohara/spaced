# Changelog

All notable changes to Spaced are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- Android home-screen widget showing cards due today (taps to open).
- Recall sessions: "Recalled it" launches a 5-min skippable active-recall
  capture (write/voice), logged and viewable.
- Offline activity log: app opens, topic creation, every review outcome,
  skips, and recall sessions (Settings → Activity log).
- Folder tree: nest class/subject/unit/chapter to any depth, all optional;
  collapsible Topics tab, folder detail with per-folder stats and
  "study a whole folder".
- Mixed "Study all due" across every deck.
- Deck study: Again / Hard / Good grading, Skip, undo, edit-mid-study,
  leech auto-flag.
- Images on cards and cloze deletion cards ({{c1::...}}).
- Topic "key points to study" field.
- Search across topics and cards.
- Deck import (CSV / Anki TSV) and CSV export.
- Configurable new-cards-per-hour.
- Accessibility pass (screen-reader roles/labels, font scaling).

### Changed

- Reminders pop on screen (HIGH channel), with a daily digest and 2.5h
  same-day escalation that stops once reviews are cleared.

### Fixed

- Answer no longer flashes briefly when advancing to the next card.

## [1.0.0-beta] — 2026-06-21

First public beta.

### Added

- Per-card spaced repetition (intervals 1, 3, 7, 14, 30, 60, 120 days)
- Flashcard decks with paste-to-split and one-at-a-time card entry
- Study modes: flip, type-the-answer, reverse, shuffle, starred-only
- New-card pacing (up to 10 new cards per hour)
- Today screen with streak, recall rate, and mastery
- Study hubs — notes, links, files, and images attached to topics
- Focus sessions with optional end-of-session active-recall prompt
- Local reminders for due topics and focus-session end
- Backup export / restore to a single JSON file

[Unreleased]: https://github.com/thekbbohara/spaced/compare/spaced-beta...HEAD
[1.0.0-beta]: https://github.com/thekbbohara/spaced/releases/tag/spaced-beta
