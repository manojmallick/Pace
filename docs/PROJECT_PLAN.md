# PACE — CONCUSSION RECOVERY PACING COMPANION
# Hack for Humanity | Summer 2026 — Concussion Recovery Track
# Submissions close: Sep 4, 2026 @ 11:45pm EDT
# Gap-closing upgrades applied natively (per hackathon-winning-bar skill)
#
# The core app and its safety-critical logic were built AND tested before
# this plan was written -- see Section 3 for the real test output. This
# plan wraps that verified foundation in the proper depth this season's
# other plans have used, rather than a rushed single-file handoff.

---

## SECTION 0 — SITUATION ANALYSIS

### The real judging rubric, not a guess

Pulled directly from the official Concussion Recovery Judging Guide PDF
(judged jointly by Concussion Alliance and Synapse chapters, plus the
event's technical judges) -- six scored dimensions, not two:

```
1. Clinical & Domain Effectiveness  -- judged by Concussion Alliance
2. Safety & Responsible Design      -- judged by Concussion Alliance
3. Neuroscience Understanding       -- judged by Synapse chapters
4. Research Foundation              -- judged by Synapse chapters
5. Technical Complexity             -- judged by technical judges
6. UX & Accessibility               -- judged by technical judges
```

This is a genuinely more rigorous bar than the general Mental/Physical
Health tracks (2 dimensions). That rigor is exactly what favors a
submission built around real, named clinical literature rather than a
plausible-sounding idea -- which is the whole premise of this plan.

### The disclaimer stated on the judging guide itself

"Submissions are prototypes created for the hackathon and are not
intended to substitute professional medical advice, diagnosis, or
treatment." Every design decision below is made inside that boundary
deliberately, not as an afterthought.

### Why Concussion Recovery over the general Mental/Physical Health tracks

Fewer entrants will have both the patience to read primary clinical
literature AND the technical follow-through to encode its actual rules
(not just reference it) into working, testable logic. That combination
-- real citation + real enforced logic -- is the differentiator this
plan is built around.

---

## SECTION 1 — THE IDEA

**One sentence:** Pace helps someone follow the graduated
return-to-activity plan their own clinician already gave them after a
concussion -- logging symptom severity after each activity attempt and
structurally enforcing the "24 hours symptom-free before progressing"
rule, without ever inventing its own medical guidance.

### The real clinical grounding

The graduated stage structure (symptom-limited activity → light
aerobic exercise → sport-specific exercise → non-contact training
drills → full-contact practice → return to sport) and the 24-hour
symptom-free progression rule come directly from the stepwise
Return-to-Sport framework in the 6th International Conference on
Concussion in Sport consensus statement -- the exact document named in
the judging guide's own evidence-based reference list, alongside the
Living Concussion Guidelines and PedsConcussion Living Guideline.

### What Pace deliberately does NOT do

- Does not diagnose a concussion
- Does not decide which stage someone starts at, or when they're
  "cleared" -- that comes from their real clinician
- Does not override a clinician's more conservative timeline if they
  want a longer symptom-free window than 24 hours
- Does not store or transmit any identifying health data anywhere --
  everything lives in the browser's own local storage, on the user's
  own device

---

## SECTION 2 — ARCHITECTURE

```
STAGE TRACKER
  6 stages, matching the real consensus-statement framework verbatim
  Current stage persisted in browser localStorage -- zero backend,
  zero database, zero account system, nothing to secure or leak

        v

SYMPTOM LOG (per activity attempt)
  4 symptom dimensions scored 0-10: headache, light sensitivity,
  cognitive fog, dizziness -- the four most commonly tracked domains
  in standard post-concussion symptom scales

        v

STAGE GATE (named governance feature -- see Section 3)
  Deterministic check: has a symptom-free day been logged since the
  last stage advance? If not, advancement is structurally blocked --
  not just discouraged with a warning the user can click past

        v

CLINICIAN-FACING LOG VIEW
  Every entry visible with a date and full symptom breakdown -- framed
  explicitly as "bring this to your next appointment," never as a
  clinical decision the app itself is making
```

---

## SECTION 3 — NAMED GOVERNANCE FEATURE: THE STAGE GATE

This is the single most important design decision in the whole
project, and it maps directly onto "Safety & Responsible Design" --
one of the two dimensions Concussion Alliance itself scores.

**The rule, enforced in code, not just stated in the UI:** a user
cannot advance to the next stage unless at least one fully
symptom-free check-in has been logged since their last advance. A
single symptomatic entry resets that requirement to zero, even if the
user immediately tries to advance afterward.

**Verified, not asserted.** `npm test` -- 27 assertions against
`src/js/pace-logic.js`, the same file the app loads. Abridged:

```
1   Initial state is stage 0 with no symptom-free days           PASS
2   Symptom-free entry raises symptom-free days to 1             PASS
3   Advance succeeds once the requirement is met                 PASS
4   Symptomatic entry (headache=6) resets the count to 0         PASS
5   Advance is BLOCKED after a symptomatic entry                 PASS
5b  Repeated advance attempts stay blocked (no click-through)    PASS
6   Three symptom-free check-ins on one day count as one day     PASS
7   A score of 1 later the same day still resets the count       PASS
9   A second advance on the same day is blocked                  PASS
9c  A backdated symptom-free entry cannot re-open the gate       PASS
13  A window shorter than the framework minimum is refused       PASS
14  Stored state cannot set the requirement below one day        PASS
18  The final stage cannot be advanced past                      PASS

27 passed, 0 failed
```

A further 18 headless UI assertions confirm the same behaviour through
the actual DOM -- including that re-enabling the disabled advance
button by hand still produces the blocked message and does not move
the stage.

Test 5 is the one that matters most for judging: it proves the gate
cannot be bypassed by simply clicking "advance" again after a bad day.
Show this exact sequence live in the demo video (Section 7) -- it is
the most concrete, non-hand-wavy evidence of "Safety & Responsible
Design" a judge will see in the whole submission.

Tests 9 and 9c matter for a different reason: they exist because
writing them found a real bypass (see Challenge 3).

---

## SECTION 4 — VERIFIED CODE (already built and tested, not a plan to build it)

The working application is dependency-free static HTML, CSS and
JavaScript -- no build step, no package install, no server. The
safety-critical logic lives in `src/js/pace-logic.js`, which
`index.html` loads directly and the test suite exercises, so the code
under test is the code that ships. Core logic, extracted and verified:

```javascript
var STAGES = [
  "Symptom-limited activity", "Light aerobic exercise", "Sport-specific exercise",
  "Non-contact training drills", "Full-contact practice", "Return to sport"
];

/*
 * Whether a symptom-free check-in on this date may increment the count.
 * ISO yyyy-mm-dd dates compare correctly as strings, so "<=" means "on or
 * before". Backdated entries are covered by the same test.
 */
function countsTowardGate(state, date) {
  if (state.lastAdvanceDate && date <= state.lastAdvanceDate) return false;
  return state.lastSymptomFreeDate !== date;
}

function logEntry(state, entry) {
  state.log.push(entry);
  if (isSymptomFree(entry)) {
    if (countsTowardGate(state, entry.date)) {
      state.symptomFreeDays += 1;
      state.lastSymptomFreeDate = entry.date;
    }
  } else {
    state.symptomFreeDays = 0;          // the Stage Gate's core rule
    state.lastSymptomFreeDate = null;
  }
  return state;
}

function advanceStatus(state) {
  if (state.currentStage >= STAGES.length - 1) {
    return { allowed: false, reason: "final-stage" };
  }
  var need = requiredDays(state);       // never less than the framework minimum
  if (state.symptomFreeDays < need) {
    return { allowed: false, reason: "insufficient-symptom-free-days",
             have: state.symptomFreeDays, need: need };
  }
  return { allowed: true, reason: "gate-met", have: state.symptomFreeDays, need: need };
}

function tryAdvance(state, today) {
  if (!advanceStatus(state).allowed) return false;   // structurally blocked
  state.currentStage += 1;
  state.symptomFreeDays = 0;
  state.lastSymptomFreeDate = null;
  state.lastAdvanceDate = today || null;
  return true;
}
```

Note the two separate date fields. An earlier draft of this section
tracked only one, and that version is the bug described in Challenge 3:
advancing cleared the date, so the same calendar day could be logged
symptom-free again and immediately spend a second advance. A
symptom-free day now counts only if it falls strictly after the last
advance.

The full file also includes: the non-dismissible safety banner (top of
page, not a footer), the 4-symptom logging UI with live sliders, a
visual stage tracker, and a chronological log view that flags any
entry with a symptom score of 6+ as "notable, consider flagging to
your clinician."

---

## SECTION 5 — REAL CHALLENGES DIARY

```
CHALLENGE 1: initial design considered letting the app suggest WHEN a
  user is "ready" for the next stage based on symptom trends. This was
  deliberately rejected -- it would have crossed from "supporting a
  clinician's plan" into "making a clinical judgment," which is exactly
  what the Safety & Responsible Design criterion penalizes most
  heavily ("claims to fully replace professional care" is the lowest
  scoring band). The Stage Gate only enforces the MINIMUM rule
  (24-hour symptom-free), never recommends advancing.

CHALLENGE 2: localStorage-only persistence means the log doesn't
  survive a cleared browser or a new device. For a hackathon prototype
  this is an acceptable, disclosed limitation -- explicitly note it in
  the submission write-up rather than let a judge discover it
  unexplained. A real product would need account-based sync, which is
  intentionally out of scope for this submission.

CHALLENGE 3: writing the "can a user weaken this by accident?" tests
  found a real bypass in the first prototype. Because advancing a stage
  cleared the last-symptom-free date, the SAME calendar day could then
  be logged symptom-free again and immediately spend a second advance
  -- two stages in one afternoon, with zero symptom-free time actually
  elapsed between them. Exactly the failure the 24-hour rule exists to
  prevent, occurring inside the one feature built to enforce it. Fixed
  by tracking the advance date separately and only counting
  symptom-free days that fall strictly after it; the same change closed
  backdated entries as a second route in. Worth saying out loud in the
  write-up: the gate is trustworthy because it was attacked, not
  because it was written carefully.

CHALLENGE 4: the original build announced a blocked advance with
  window.alert(). That is the wrong tool for this audience -- it steals
  focus and forces a modal dismissal on someone whose presenting
  symptom may be cognitive fog. Replaced with an inline role="status"
  region, which screen readers announce without hijacking the page, and
  the advance button is now disabled while the gate is shut, so the
  blocked state is visible before it is clicked rather than only after.
```

---

## SECTION 6 — RESEARCH AND TOOL COVERAGE CHECKLIST

```
[ ] Primary source cited explicitly in the write-up: 6th International
    Conference on Concussion in Sport consensus statement -- the
    graduated Return-to-Sport stage names and the 24-hour rule are
    taken directly from it, not paraphrased loosely
[ ] Secondary sources acknowledged as available but not yet integrated:
    Living Concussion Guidelines, PedsConcussion Living Guideline --
    honest to note these exist and could inform a pediatric-specific
    variant, without claiming to have implemented them
[ ] Symptom domains tracked: headache, light sensitivity, cognitive
    fog, dizziness -- standard, commonly used post-concussion symptom
    categories, not invented ones
[ ] Zero external APIs, zero data leaves the device -- explicitly
    stated as a privacy-by-design choice in the write-up
[ ] Deployed on: [GitHub Pages / Render, if pursuing that bonus category]
```

---

## SECTION 7 — DEMO VIDEO SCRIPT (4 min max, per submission requirements)

```
[0:00-0:30] THE ISSUE
"After a concussion, doctors give a real stepwise plan for returning
to normal activity -- but living with that plan day to day, tracking
symptoms honestly, and not accidentally rushing it, is hard without a
tool built around the actual rule."

[0:30-1:15] THE APP, LIVE
Open Pace. Read the safety banner aloud -- this is not decorative, it's
scored. Show the 6-stage tracker. Log a fully symptom-free check-in.

[1:15-2:00] THE STAGE GATE, PROVEN LIVE
Advance to the next stage -- show it succeed. Now log a symptomatic
entry (headache = 6). Try to advance immediately. Show it get BLOCKED,
with the message explaining why. This 20 seconds is the single most
important moment in the whole video.

[2:00-2:45] THE RESEARCH GROUNDING
Show the stage names on screen next to a citation of the 6th
International Conference on Concussion in Sport consensus statement.
"These aren't invented stages -- they're the real published framework,
and the 24-hour rule is enforced in code, not just mentioned."

[2:45-3:30] HOW IT WAS BUILT
Briefly show the test output (Section 3) -- "the safety logic was
tested before this was ever submitted, not just written and hoped to
work."

[3:30-4:00] CLOSE
"Pace. It doesn't replace your clinician's plan -- it helps you
actually follow it." GitHub link on screen.
```

---

## SECTION 8 — README.md

```markdown
# Pace

A graduated return-to-activity companion for concussion recovery, built
for Hack for Humanity Summer 2026.

## What it does

Tracks progress through the real 6-stage graduated Return-to-Sport
framework from the 6th International Conference on Concussion in Sport
consensus statement. Enforces the framework's own 24-hour
symptom-free-before-progressing rule structurally -- it cannot be
bypassed by simply clicking through.

## What it does not do

Does not diagnose concussions. Does not decide when someone is ready to
progress stages -- that judgment stays with the user's real clinician.
Pace only helps them follow the plan already given, and log symptoms
worth discussing at the next appointment.

## Run it

No install required. Open `index.html` in any browser. All data stays
in your browser's local storage -- nothing is transmitted anywhere.

## Verified logic

The core stage-progression and symptom-gating logic was tested with
real assertions before submission -- see `test/pace-logic.test.js`.
Notably: the
app correctly blocks stage advancement after a symptomatic entry, even
if the user immediately tries again.

## Research foundation

Stage structure and the 24-hour rule: 6th International Conference on
Concussion in Sport consensus statement. Symptom domains tracked
(headache, light sensitivity, cognitive fog, dizziness) reflect
standard post-concussion symptom categories.

## License

MIT
```

---

## SECTION 9 — BUILD TIMELINE

The core app and its safety-critical logic already exist and are
tested (Sections 3-4) -- this timeline is about polish and submission
quality, not building from zero.

```
DAY 1 (a few hours):
  [ ] Test on a real phone browser, not just desktop -- confirm the
      sliders and layout work on mobile (UX & Accessibility is scored)
  [ ] Write the actual Challenge 3 entry in Section 5 from whatever
      real friction shows up in this testing pass
  [ ] Push to a public GitHub repo with the README from Section 8

DAY 2 (a few hours):
  [ ] Deploy to GitHub Pages (or Render, for that bonus category) for
      a live link
  [ ] Record the demo video per Section 7's script -- do at least one
      practice take before the real recording, the Stage Gate moment
      needs to land clearly

DAY 3 (final polish, submit with buffer):
  [ ] Re-watch the video as a stranger would -- confirm the blocked-
      advance moment is unambiguous
  [ ] Write the project page text using the language from Sections 1
      and 6 (the real citation, the explicit non-diagnostic framing)
  [ ] Submit well ahead of 11:45pm EDT on Sep 4 -- not at the wire
```

If genuinely down to hours rather than days, do Day 1's GitHub push and
Day 2's video in immediate sequence and skip the separate practice-take
step -- but do not skip watching the recording back once before
submitting.

---

## SECTION 10 — WINNING INDEX (scored against the real 6-dimension rubric)

| Dimension | Score /5 | Why |
|---|---|---|
| Clinical & Domain Effectiveness | 4 | Addresses a real, specific recovery-adherence problem, closely follows the cited framework's actual stage structure |
| Safety & Responsible Design | 5 | The Stage Gate is a structural, tested guardrail, not a disclaimer -- directly matches the rubric's top band ("significant, effective safety guardrails... thoroughly acknowledges limitations") |
| Neuroscience Understanding | 3 | Correctly uses the graduated activity/symptom-provocation model; does not go deeper into underlying neurophysiology, which would need additional research to push toward a 4-5 |
| Research Foundation | 4 | Primary source explicitly cited and directly implemented; secondary sources (Living Concussion Guidelines, PedsConcussion) acknowledged but not yet integrated, honestly disclosed rather than overclaimed |
| Technical Complexity | 3 | Clean, correct, tested logic -- deliberately simple architecture (zero backend) trades some complexity score for zero risk of a broken demo |
| UX & Accessibility | 4 | Clear, simple interface; final mobile-accessibility pass in Day 1 of the timeline is what pushes this from a 3 toward a 4 |

**Total: 23/30.** The honest ceiling here without meaningfully more
build time is around 24-26/30 -- reachable by integrating one of the
secondary sources (e.g., a pediatric-specific variant citing
PedsConcussion) or adding a simple clinician-shareable export (a PDF or
printable summary of the log), either of which would lift Research
Foundation and Technical Complexity by one band each without touching
the Stage Gate's core safety logic.
