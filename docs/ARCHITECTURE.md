# Architecture

Pace is a static, single-page application with no backend, no build step, and
no dependencies. This document explains why it is shaped that way and where
each rule actually lives.

## Layout

```
pace/
├── index.html              The page. Markup and copy only.
├── src/
│   ├── css/pace.css        Presentation.
│   └── js/
│       ├── pace-logic.js   Recovery rules. The only file that decides anything.
│       └── pace-app.js     Event wiring and rendering. Decides nothing.
└── test/
    ├── pace-logic.test.js  27 assertions against the rules.
    └── pace-ui.test.js     24 assertions against the rules *through the DOM*.
```

## The one structural rule

**`pace-logic.js` is the only file permitted to decide whether a stage may be
advanced.**

`pace-app.js` never re-implements a rule, never compares a symptom score to a
threshold, and never computes a day count. It asks `PaceLogic.advanceStatus()`
and renders the answer. `index.html` contains no logic at all.

This matters more here than in a typical app. The safety property Pace claims —
that it will not let you skip the symptom-free window — is only as good as the
number of places that property is implemented. One place can be tested
exhaustively. Two places drift.

The interface enforces the gate twice over, on purpose:

1. The advance button is `disabled` whenever the gate is shut, so the blocked
   state is visible *before* a click rather than only after one.
2. The click handler calls `tryAdvance()`, which refuses independently.

`test/pace-ui.test.js` re-enables the disabled button by hand — the way someone
with devtools open would — and asserts the stage still does not move. The
interface is a convenience; the logic is the guarantee.

## State

A single object, persisted to `localStorage` under the key `pace_state`:

| Field | Purpose |
|---|---|
| `version` | Schema version, so stored state can be migrated rather than discarded. |
| `currentStage` | Index into the six-stage framework, 0–5. |
| `lastAdvanceDate` | Calendar date of the last stage advance. |
| `lastSymptomFreeDate` | Calendar date of the last counted symptom-free check-in. |
| `symptomFreeDays` | Days counted toward the next advance. |
| `requiredSymptomFreeDays` | The window, 1 by default, raised by a clinician. |
| `log` | Every check-in, in chronological order. |

`migrate()` treats stored state as untrusted input. It clamps an out-of-range
stage, refuses a required window below the framework minimum, and falls back to
a clean initial state on anything it cannot parse. The threat here is not an
attacker — there is no server to attack — it is a half-written record from an
interrupted write, or a schema from an older version of the app.

### Why two date fields

Because one was not enough, and the tests found out.

The first prototype tracked a single date. Advancing a stage cleared it, which
meant the *same calendar day* could then be logged symptom-free again and spend
a second advance — two stages in one afternoon, with no symptom-free time
actually elapsed between them. Precisely the failure the 24-hour rule exists to
prevent, inside the one feature built to enforce it.

`lastAdvanceDate` is now tracked separately, and a symptom-free day only counts
if it falls strictly after it. The same comparison closes backdated entries as a
second route in. See `countsTowardGate()`, and tests 9, 9b and 9c.

## Deliberate constraints

**No build step.** `index.html` opens from a downloaded folder over `file://`
and works. That is a real distribution channel for this audience — someone
emailed a folder, a clinician opening it on a locked-down machine, a judge
reviewing an entry offline.

**Classic scripts, not ES modules.** Modules are fetched under CORS rules, which
browsers refuse over `file://`. Using `<script src>` inside an IIFE keeps the
file-open path working. `pace-ui.test.js` asserts no script uses
`type="module"`, so this cannot be undone by accident.

**No dependencies, enforced in CI.** The CI workflow fails the build if
`dependencies` or `devDependencies` is ever non-empty. `jsdom` is installed with
`--no-save` as a test harness and never enters the manifest.

**No network requests of any kind.** No fonts, no analytics, no CDN. A test
asserts the page contains no absolute `http` URLs. The privacy claim — that
health data never leaves the device — is then a structural fact rather than a
promise, because there is no code path that could send it.

## What this trades away

A zero-backend design cannot sync between devices, cannot survive a cleared
browser, and cannot be shared with a clinician except by printing. Those are
real costs, accepted knowingly, and listed in the README's limitations section
rather than hidden. The print view exists specifically because the storage model
is fragile.

The architecture also scores lower on raw technical complexity than a
server-backed alternative would. That trade is deliberate: a prototype that
cannot break during a demo is worth more than one with a more impressive
dependency graph.
