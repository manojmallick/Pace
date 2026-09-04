# Pace

**A graduated return-to-activity companion for concussion recovery.**

Built for Hack for Humanity Summer 2026 — Concussion Recovery track.

Pace helps someone follow the stepwise return-to-activity plan their clinician
already gave them: logging symptoms after each activity attempt, and refusing to
let them skip the symptom-free window before the next stage.

It never decides they are ready. It can only decline to let them move on.

---

## Quick start

No install. No build step. No dependencies. No server.

```bash
git clone <repository-url>
cd pace
open index.html          # or just double-click it
```

```bash
npm test                 # 27 logic assertions
```

## What it does

- Tracks progress through the **six-stage** graduated return-to-sport framework.
- Logs four symptom domains — headache, light sensitivity, cognitive fog,
  dizziness — on a 0–10 scale after each activity attempt.
- **Blocks stage advancement** until the required symptom-free period has been
  logged. This lives in the logic, not the interface: the button is disabled,
  *and* the underlying function refuses independently. The test suite re-enables
  the button by hand and asserts the stage still does not move.
- Honours a clinician's **more conservative** window (up to 7 symptom-free days)
  and refuses anything shorter than the framework minimum.
- Flags any check-in scoring 6 or above as worth raising at the next
  appointment, and prints the whole log to take along.

## What it does not do

Pace does not diagnose concussions. It does not choose a starting stage. It
never says "you're ready to progress" — that sentence belongs to a clinician. It
does not interpret symptom trends or predict anything.

It refuses to advance early, and it records what happened. That is the whole
product, and the boundary is deliberate: see
[docs/CLINICAL_BASIS.md](docs/CLINICAL_BASIS.md).

> **Not a medical device.** A hackathon prototype, not clinically validated. It
> does not diagnose, treat, or replace professional care. Always follow your
> clinician's guidance. If symptoms are worsening, seek medical attention.

## Privacy

Everything stays in your browser's local storage on your own device. There is no
account, no server, no database, and no analytics. Pace makes **no network
requests of any kind** — a test asserts the page contains no absolute `http`
URLs, so the claim is structural rather than a promise.

The trade-off, stated plainly: nothing is encrypted at rest either. Anyone who
can unlock the device can read the log. See [SECURITY.md](SECURITY.md).

## Project structure

```
pace/
├── index.html                  The page. Markup and copy only.
├── src/
│   ├── css/pace.css            Presentation.
│   └── js/
│       ├── pace-logic.js       Recovery rules. The only file that decides anything.
│       └── pace-app.js         Rendering and event wiring. Decides nothing.
├── test/
│   ├── pace-logic.test.js      27 assertions against the rules.
│   └── pace-ui.test.js         24 assertions against the rules through the DOM.
├── docs/
│   ├── ARCHITECTURE.md         How it is built, and why it is built that way.
│   ├── CLINICAL_BASIS.md       Sources, and where Pace deviates from them.
│   ├── ACCESSIBILITY.md        Conformance, and the honest gaps.
│   └── PROJECT_PLAN.md         The design and submission plan.
└── .github/workflows/          CI and GitHub Pages deployment.
```

The structural rule: **`pace-logic.js` is the only file permitted to decide
whether a stage may be advanced.** A safety property is only as strong as the
number of places it is implemented. One place can be tested exhaustively; two
places drift.

## Tests

```bash
npm test                                  # logic — 27 assertions, no install
npm install --no-save jsdom               # test harness only, never a dependency
npm run test:ui                           # interface — 24 assertions
npm run test:all                          # both
```

The interface suite skips cleanly when `jsdom` is absent, so `npm test` stays
green on a fresh clone with nothing installed.

The assertions that matter most:

```
PASS  5   Advance is BLOCKED after a symptomatic entry
PASS  5b  Repeated advance attempts stay blocked (no click-through)
PASS  9   A second advance on the same day is blocked
PASS  9c  A backdated symptom-free entry cannot re-open the gate
PASS      Forcing the disabled button shows BLOCKED and does not move the stage
```

**Tests 9 and 9c exist because writing them found a real bypass.** Advancing a
stage cleared the last symptom-free date, so the *same calendar day* could be
logged symptom-free again and immediately spend a second advance — two stages in
one afternoon, with no symptom-free time actually elapsed. Exactly the failure
the 24-hour rule exists to prevent, inside the one feature built to enforce it.
Symptom-free days are now counted only on a day strictly after the last advance.

The gate is trustworthy because it was attacked, not because it was written
carefully.

## Research foundation

Stage names and the symptom-free progression requirement come from the graduated
Return-to-Sport strategy in the consensus statement of the **6th International
Conference on Concussion in Sport** (Amsterdam, October 2022; published in the
*British Journal of Sports Medicine*, 2023).

> ⚠️ **Pace's gate is stricter than the published framework.** It requires a
> completely symptom-free check-in, where the framework is understood to permit
> mild symptom exacerbation during early steps. The deviation is conservative —
> Pace refuses advances the framework might allow, never the reverse — but it is
> a deviation, and it is documented rather than glossed over. Read
> [docs/CLINICAL_BASIS.md](docs/CLINICAL_BASIS.md) before citing this project's
> clinical grounding anywhere.

## Accessibility

The users are, by definition, symptomatic — headache, light sensitivity and
cognitive fog are the presenting complaints. That is the design brief, not a
checkbox.

Labelled sliders with `aria-valuetext` in words ("6, marked"). Stage state in
text as well as colour. 44px touch targets. Low-glare surfaces. Gate results
announced through a live region rather than a `window.alert()` that would steal
focus from someone with cognitive fog.

Targeting WCAG 2.1 AA. Structure is asserted in the test suite; comfort is not
testable, and the remaining gaps — no screen reader has actually been run
against it, no real assistive-technology user has tested it — are listed in
[docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).

## Known limitations

- **Local storage only.** The log does not survive clearing the browser and does
  not follow you to another device. Account-based sync is deliberately out of
  scope; the print view exists because the storage model is fragile.
- **Calendar days, not rolling 24-hour windows.** A check-in late on Monday and
  another early on Tuesday count as two days despite being hours apart. A
  production version should measure the real elapsed interval.
- **Self-reported symptoms.** Pace cannot detect under-reporting by someone
  eager to get back to their sport. It supports a clinical plan; it does not
  substitute for clinical assessment.
- **Not clinically validated**, and stricter than the source framework — see
  above.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Four invariants govern this project:
logic lives in one file, zero dependencies, nothing leaves the device, and the
gate may only ever become stricter.

If you are a clinician and something here contradicts current guidance, please
open an issue and say so plainly.

## License

[MIT](LICENSE)
