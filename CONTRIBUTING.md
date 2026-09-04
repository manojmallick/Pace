# Contributing to Pace

Thanks for looking at this. Pace is a small project with one unusual
constraint, so please read the invariants before opening a pull request.

## Getting set up

```bash
git clone <your-fork-url>
cd pace
npm test              # 27 logic assertions. No install needed.
```

There is nothing to install and nothing to build. Open `index.html` in a
browser and it runs.

To run the interface tests as well:

```bash
npm install --no-save jsdom
npm run test:ui       # 24 DOM assertions
```

`--no-save` matters — see invariant 2.

## The four invariants

These are not style preferences. CI enforces the first two, and a reviewer will
enforce all four.

**1. `pace-logic.js` is the only file that decides anything.**
No recovery rule may be implemented in `pace-app.js` or `index.html`. If the
interface needs to know whether something is allowed, add a function to
`pace-logic.js` and ask it. The safety claim is only as strong as the number of
places the rule exists.

**2. Zero dependencies, no build step.**
CI fails if `dependencies` or `devDependencies` is non-empty. `index.html` must
keep working when opened directly from disk over `file://`, which also means no
`type="module"` scripts. If you believe a dependency is genuinely necessary,
open an issue first — it is a design change, not an implementation detail.

**3. Nothing leaves the device.**
No network requests. No CDN fonts, no analytics, no error reporting, no remote
anything. A test asserts the page contains no absolute `http` URLs. The privacy
guarantee holds because there is no code path that could break it.

**4. The gate may only ever become stricter, never looser.**
Any change that would let a user advance a stage in a situation where they
currently cannot needs an explicit rationale in the pull request and a test
covering it. Changes that make the gate stricter need a test too, but not an
argument.

## Changing the recovery rules

Rule changes need a source. Cite the guideline you are implementing, and update
`docs/CLINICAL_BASIS.md` in the same pull request — including the deviations
section if the change alters how Pace differs from the published framework.

Do not add features that interpret, predict, or recommend. Pace can refuse to
advance a stage; it must never suggest advancing one, and it must never tell a
user what their symptoms mean. That boundary is the project, not a limitation of
it.

## Tests

Every behavioural change needs a test. The interesting ones are not the happy
paths — they are the "could a user weaken this by accident?" cases. Tests 6, 7,
9 and 9c in `test/pace-logic.test.js` are the model to follow, and test 9 exists
because writing that class of test found a real bypass.

Both suites must pass before a pull request is reviewed.

## Style

`.editorconfig` covers the mechanics: two spaces, LF, UTF-8, final newline.

Beyond that: comments should explain *why*, not restate the code. The existing
comments are the reference. If a comment could be deleted without losing
information, delete it.

## Reporting a problem

Bugs and accessibility problems go in GitHub Issues. For anything with a
security or privacy dimension, read `SECURITY.md` first.

**If you are a clinician** and something here contradicts current guidance,
please open an issue and say so plainly. That feedback is worth more to this
project than a code contribution.
