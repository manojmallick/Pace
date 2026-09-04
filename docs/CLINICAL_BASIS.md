# Clinical basis

What Pace takes from published guidance, what it changes, and what a reader
should verify before trusting any of it.

> Pace is a hackathon prototype. It is not a medical device, has not been
> clinically validated, and does not diagnose, treat, or replace professional
> care. Everything below describes *what the software implements*, not medical
> advice.

## Primary source

The stage structure and the symptom-free progression requirement come from the
**graduated Return-to-Sport strategy** in the consensus statement of the 6th
International Conference on Concussion in Sport (Amsterdam, October 2022),
published in the *British Journal of Sports Medicine* in 2023.

> ⚠️ **Verify the full citation before submitting or publishing.** The
> conference, year, and journal above are stated with high confidence. The exact
> author list, volume, page range, and DOI are **not** reproduced here, because
> a citation that is confidently wrong is worse than one the reader is told to
> check. Retrieve the record from the BJSM or PubMed and paste it in below.

```
Full citation: [ TO BE FILLED IN FROM THE SOURCE RECORD ]
DOI:           [ TO BE FILLED IN FROM THE SOURCE RECORD ]
```

## The six stages, as implemented

Implemented verbatim in `src/js/pace-logic.js` as the `STAGES` array:

| # | Stage |
|---|---|
| 1 | Symptom-limited activity |
| 2 | Light aerobic exercise |
| 3 | Sport-specific exercise |
| 4 | Non-contact training drills |
| 5 | Full-contact practice |
| 6 | Return to sport |

These are the published stage names, not paraphrases, and not invented.

## ⚠️ Where Pace deviates from the framework

**This is the most important section in this document, and it should be
disclosed in the submission write-up rather than left for a domain judge to
discover.**

Pace requires a check-in to be **completely symptom-free — every domain at
zero** — before the next stage unlocks. Any non-zero score resets the count.

The published framework is understood to be **less strict than this** during the
early steps: progression is generally permitted with *mild symptom exacerbation*
(commonly described as an increase of no more than about 2 points on a 0–10
scale) rather than requiring total symptom resolution at every step. Modern
guidance also favours an early return to light activity over extended complete
rest.

**Confidence: moderate-to-high, and it should be checked against the source
before the write-up leans on it either way.**

Two things follow.

1. **Pace's gate errs conservative.** It refuses advancement in cases the
   framework might permit. It never permits one the framework would refuse. For
   a prototype that cannot assess an individual patient, being stricter than the
   guideline is the safe direction to be wrong in — but it *is* a deviation, and
   calling it a faithful implementation without qualification would overclaim.

2. **A stricter tool can still cause harm.** Guidance moved away from prolonged
   rest because excessive rest is itself associated with worse outcomes. A tool
   that holds someone at stage 1 longer than their clinician would is not
   automatically safe. This is a large part of why the clinician's window is
   configurable, why the app never tells anyone to *wait*, and why every screen
   defers to the treating clinician.

The honest framing for the write-up: *Pace enforces a deliberately conservative
floor, and defers everything above that floor to the clinician.*

## Symptom domains

Four domains, scored 0–10: headache, light sensitivity, cognitive fog,
dizziness.

These are standard, commonly tracked post-concussion symptom categories. They
are **not** a validated instrument. Pace does not implement SCAT6, the
Post-Concussion Symptom Scale, or any other scored questionnaire, and does not
compute a total score, because a number that looks like a clinical score invites
being read as one.

## What Pace deliberately does not do

- **Does not diagnose.** No screening, no assessment, no red-flag triage beyond
  telling a worsening user to seek care.
- **Does not choose a starting stage.** The user sets where their clinician put
  them.
- **Does not recommend advancing.** The gate can only refuse. It never says
  "you're ready" — that sentence belongs to a clinician.
- **Does not interpret trends.** No prediction, no "you seem to be improving."
  An earlier design considered symptom-trend suggestions and it was rejected:
  it would have crossed from supporting a clinician's plan into making a
  clinical judgment.
- **Does not transmit anything.** No account, no server, no analytics.

## Secondary sources, acknowledged and not implemented

The **Living Concussion Guidelines** (adult) and the **PedsConcussion Living
Guideline** (paediatric) are directly relevant and are **not** implemented here.
They are named because a reader deserves to know they exist, not to imply they
informed the code.

A paediatric variant would need real work rather than relabelling: return-to-
learn typically precedes return-to-sport in children, timelines are longer, and
the reporting party may be a parent rather than the patient. That is a separate
project, not a setting.

## Verification checklist before submission

- [ ] Full citation and DOI retrieved and pasted above
- [ ] The symptom-exacerbation allowance confirmed against the source, and the
      deviation section corrected if it is wrong
- [ ] The deviation disclosed in the submission write-up, not only here
- [ ] Stage names checked word-for-word against the published strategy
- [ ] Every claim in the README cross-checked against this file
