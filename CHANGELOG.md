# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-09-05

First complete version: the working app, its test suites, and the project
documentation.

### Added

- Six-stage graduated return-to-activity tracker following the published
  Return-to-Sport strategy.
- Symptom logging across four domains (headache, light sensitivity, cognitive
  fog, dizziness) on a 0–10 scale.
- **The stage gate** — advancement is refused until the required symptom-free
  period has actually been logged. Enforced in `pace-logic.js`, not only in the
  interface; re-enabling the disabled button by hand does not bypass it.
- Clinician-configurable symptom-free window of 1–7 days. Values below the
  framework minimum are refused outright rather than silently clamped.
- Chronological log view flagging any check-in scoring 6 or above as worth
  raising with a clinician.
- Print view for taking the log to an appointment, and an erase-all-data control.
- `test/pace-logic.test.js` — 27 assertions covering the gate, accidental
  bypasses, clinician windows, and tampered or stale stored state.
- `test/pace-ui.test.js` — 24 assertions driving the real DOM, including the
  forced-click bypass attempt. Skips cleanly when `jsdom` is absent.
- CI across Node 18, 20 and 22, including a check that the project has acquired
  no dependencies.
- GitHub Pages deployment workflow.
- `docs/ARCHITECTURE.md`, `docs/CLINICAL_BASIS.md`, `docs/ACCESSIBILITY.md`.

### Fixed

- **Same-day double advance.** Advancing a stage cleared the last symptom-free
  date, so the same calendar day could be logged symptom-free again and
  immediately spend a second advance — two stages in one afternoon with no
  symptom-free time elapsed. Symptom-free days are now counted only on a day
  strictly after the last advance, which also closes backdated entries as a
  second route in. Found by writing the tests, not by observation.
- **Storage-failure warning could never appear.** A hoisting error reset the
  `storageWorks` flag to `true` after `loadState()` had cleared it, so a browser
  refusing to store (private mode, blocked cookies) gave the user no warning
  that their log would not survive the tab.

### Changed

- Blocked-advance feedback moved from `window.alert()` to an inline
  `role="status"` region. A modal that steals focus is the wrong interaction for
  a user whose presenting symptom may be cognitive fog.
- The advance button is now disabled while the gate is shut, so the blocked
  state is visible before a click rather than only after one.
- Recovery logic extracted from the page into `src/js/pace-logic.js`, so the
  code under test is the code that ships.
- Restructured to a conventional layout (`src/`, `test/`, `docs/`) with
  kebab-case filenames.

### Removed

- `pace_app.html`, the original single-file prototype, superseded by
  `index.html` plus `src/`. It contained the pre-fix gate logic and was removed
  rather than left as a second, wrong copy. It remains in git history.
