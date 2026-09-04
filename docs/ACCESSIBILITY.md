# Accessibility

Pace is used by people who are, by definition, symptomatic — headache, light
sensitivity, and cognitive fog are the presenting complaints. Accessibility here
is not a compliance checkbox bolted on at the end; the user's impairments are
the design brief.

## Decisions driven by the condition itself

**No modal dialogs for the gate result.** The first build announced a blocked
advance with `window.alert()`. That steals focus and demands a modal dismissal
from someone whose presenting symptom may be cognitive fog. It is now an inline
`role="status"` region, which assistive technology announces politely without
hijacking the page.

**Blocked state visible before the click, not after.** The advance button is
`disabled` whenever the gate is shut, and its label names the stage it would
move to. Discovering a refusal by being refused is a worse experience than never
being offered the action.

**Low-glare surfaces.** The page ground is an off-white rather than pure
`#FFFFFF`, and no element uses a large saturated fill. Light sensitivity is one
of the four symptoms the app tracks; rendering the tracker itself uncomfortable
to look at would be self-defeating.

**Plain language, short sentences.** Every status message states the situation
and the one next action. No jargon, no stacked clauses.

## Standard conformance

Targeting **WCAG 2.1 level AA**.

| Area | What was done |
|---|---|
| Labels | Every slider has a real `<label for="…">`. The symptom group is a `<fieldset>` with a `<legend>`. |
| Value announcement | Sliders carry `aria-valuetext` in words — "6, marked" — rather than a bare number, which alone tells a screen reader user nothing about severity. |
| Colour independence | Stage state is carried in visually hidden text ("completed", "current stage", "not yet reached") as well as colour and a tick. Flagged log entries state "Notable" in words. |
| Contrast | Text and UI boundary colours chosen against AA thresholds (4.5:1 body, 3:1 large text and boundaries). |
| Focus | Visible `:focus-visible` outlines on every interactive control, never suppressed. |
| Touch targets | 44px slider row height with a 28px thumb. The browser default was too small to drag accurately one-handed — a real problem for a user steadying themselves. |
| Landmarks | `<main>`, `<section>` with `aria-labelledby`, `<footer>`, one `<h1>` and a flat `<h2>` structure. |
| Zoom / reflow | Relative units and a single-column layout; no horizontal scrolling at 320px or at 200% zoom. |
| Language | `<html lang="en">`. |
| Motion | No animation, no transitions, no auto-advancing content. |

## What is asserted automatically

`test/pace-ui.test.js` fails the build if any of these regress:

- every slider resolves to a `<label for>`
- every slider carries a word-form `aria-valuetext`
- the safety banner exists and has no dismiss control
- the gate result region is `role="status"`, not an alert
- stage state appears in text, not by colour alone

Structure can be tested. Whether the result is *comfortable* cannot be, which is
why the list below is open.

## Not yet done — honest gaps

- **No screen reader has actually been used on this.** The ARIA is correct by
  construction and asserted in tests, but VoiceOver, NVDA and JAWS have not run
  against it. Automated checks catch wrong markup, not a confusing experience.
- **No real assistive-technology user has tested it.** For a tool aimed at
  cognitively impaired users, this is the largest outstanding gap.
- **No contrast measurement tool has been run.** The palette was chosen against
  AA thresholds by construction; it has not been verified with an auditing tool.
- **No dark or reduced-brightness theme.** Genuinely relevant for photophobia,
  and the most valuable single accessibility addition remaining.
- **No keyboard-only pass on a real browser.** Focus order follows source order
  and should be correct, but "should be" is not "was checked".
- **No text alternative for the print view.** Printing is styled but has not
  been examined for screen reader users reading a saved PDF.
