/*
 * Pace — assertions for the Stage Gate.
 *
 * Run:  node test_logic.js
 *
 * These exercise pace_logic.js, the same file index.html loads. Tests 1-5
 * are the sequence demonstrated live in the demo video; the rest cover the
 * ways a user could plausibly try to get around the gate by accident.
 */

var Pace = require("./pace_logic.js");

var passed = 0;
var failed = 0;

function check(name, condition) {
  if (condition) {
    passed++;
    console.log("  PASS  " + name);
  } else {
    failed++;
    console.log("  FAIL  " + name);
  }
}

function entry(date, activity, headache, light, fog, dizzy) {
  return {
    date: date,
    activity: activity,
    headache: headache,
    light: light,
    fog: fog,
    dizzy: dizzy
  };
}

function clean(date, activity) {
  return entry(date, activity || "Light walk", 0, 0, 0, 0);
}

console.log("\nPACE — STAGE GATE TEST SUITE\n");

// ---------------------------------------------------------------------------
console.log("Core gate sequence (the demo-video sequence)");
// ---------------------------------------------------------------------------

var s = Pace.initialState();

check("1  Initial state is stage 0 with no symptom-free days",
  s.currentStage === 0 && s.symptomFreeDays === 0);

check("1b Advance is blocked from a fresh state",
  Pace.tryAdvance(s) === false && s.currentStage === 0);

Pace.logEntry(s, clean("2026-09-01"));
check("2  Symptom-free entry raises symptom-free days to 1",
  s.symptomFreeDays === 1);

check("3  Advance succeeds once the requirement is met",
  Pace.tryAdvance(s, "2026-09-01") === true && s.currentStage === 1);

check("3b Advancing consumes the credit (count resets to 0)",
  s.symptomFreeDays === 0);

Pace.logEntry(s, entry("2026-09-02", "Light aerobic exercise", 6, 0, 0, 0));
check("4  Symptomatic entry (headache=6) resets the count to 0",
  s.symptomFreeDays === 0);

check("5  Advance is BLOCKED after a symptomatic entry",
  Pace.tryAdvance(s) === false && s.currentStage === 1);

check("5b Repeated advance attempts stay blocked (no click-through)",
  Pace.tryAdvance(s) === false &&
  Pace.tryAdvance(s) === false &&
  Pace.tryAdvance(s) === false &&
  s.currentStage === 1);

check("5c The block reports a machine-readable reason, not just false",
  Pace.advanceStatus(s).reason === "insufficient-symptom-free-days");

// ---------------------------------------------------------------------------
console.log("\nWays a user could accidentally weaken the gate");
// ---------------------------------------------------------------------------

var t = Pace.initialState();
Pace.logEntry(t, clean("2026-09-01"));
Pace.logEntry(t, clean("2026-09-01"));
Pace.logEntry(t, clean("2026-09-01"));
check("6  Three symptom-free check-ins on one day count as one day",
  t.symptomFreeDays === 1);

var u = Pace.initialState();
Pace.logEntry(u, clean("2026-09-01"));
Pace.logEntry(u, entry("2026-09-01", "Reading / screen time", 1, 0, 0, 0));
check("7  A score of 1 later the same day still resets the count",
  u.symptomFreeDays === 0);

check("7b ...and the advance that would have been allowed is now blocked",
  Pace.tryAdvance(u) === false && u.currentStage === 0);

var v = Pace.initialState();
Pace.logEntry(v, entry("2026-09-01", "Light walk", 0, 0, 3, 0));
check("8  A non-headache symptom (fog=3) also resets the count",
  v.symptomFreeDays === 0);

var w = Pace.initialState();
Pace.logEntry(w, clean("2026-09-01"));
Pace.tryAdvance(w, "2026-09-01");
Pace.logEntry(w, clean("2026-09-01"));
check("9  A second advance on the same day is blocked",
  w.symptomFreeDays === 0 && Pace.tryAdvance(w, "2026-09-01") === false && w.currentStage === 1);

check("9b ...but the next day's symptom-free check-in does open the gate",
  Pace.logEntry(w, clean("2026-09-02")).symptomFreeDays === 1 &&
  Pace.tryAdvance(w, "2026-09-02") === true && w.currentStage === 2);

var bd = Pace.initialState();
Pace.logEntry(bd, clean("2026-09-05"));
Pace.tryAdvance(bd, "2026-09-05");
Pace.logEntry(bd, clean("2026-09-03"));
check("9c A backdated symptom-free entry cannot re-open the gate",
  bd.symptomFreeDays === 0 && Pace.tryAdvance(bd, "2026-09-05") === false);

// ---------------------------------------------------------------------------
console.log("\nA clinician's more conservative window");
// ---------------------------------------------------------------------------

var x = Pace.initialState();
check("10 A longer window (3 days) is accepted",
  Pace.setRequiredSymptomFreeDays(x, 3) === true && x.requiredSymptomFreeDays === 3);

Pace.logEntry(x, clean("2026-09-01"));
Pace.logEntry(x, clean("2026-09-02"));
check("11 Advance blocked at 2 of 3 required symptom-free days",
  Pace.tryAdvance(x) === false && x.currentStage === 0);

Pace.logEntry(x, clean("2026-09-03"));
check("12 Advance allowed on the third symptom-free day",
  Pace.tryAdvance(x, "2026-09-03") === true && x.currentStage === 1);

var y = Pace.initialState();
check("13 A window shorter than the framework minimum is refused",
  Pace.setRequiredSymptomFreeDays(y, 0) === false &&
  Pace.setRequiredSymptomFreeDays(y, -5) === false &&
  y.requiredSymptomFreeDays === 1);

// ---------------------------------------------------------------------------
console.log("\nTampered or stale stored state");
// ---------------------------------------------------------------------------

var tampered = Pace.migrate({ currentStage: 2, symptomFreeDays: 5, requiredSymptomFreeDays: 0 });
check("14 Stored state cannot set the requirement below one day",
  tampered.requiredSymptomFreeDays === 1);

var oldFormat = Pace.migrate({ currentStage: 1, symptomFreeStreakDays: 1, lastAdvanceDate: "2026-09-01", log: [] });
check("15 Pre-v1 saved state migrates without losing progress",
  oldFormat.currentStage === 1 &&
  oldFormat.symptomFreeDays === 1 &&
  oldFormat.lastSymptomFreeDate === "2026-09-01");

var corrupt = Pace.migrate(null);
check("16 Corrupt or missing storage falls back to a safe initial state",
  corrupt.currentStage === 0 && corrupt.symptomFreeDays === 0);

var outOfRange = Pace.migrate({ currentStage: 99 });
check("17 An out-of-range stored stage is clamped to a real stage",
  outOfRange.currentStage === Pace.STAGES.length - 1);

// ---------------------------------------------------------------------------
console.log("\nFinal stage and display flags");
// ---------------------------------------------------------------------------

var z = Pace.initialState();
z.currentStage = Pace.STAGES.length - 1;
z.symptomFreeDays = 10;
check("18 The final stage cannot be advanced past",
  Pace.tryAdvance(z, "2026-09-01") === false &&
  z.currentStage === Pace.STAGES.length - 1 &&
  Pace.advanceStatus(z).reason === "final-stage");

check("19 Stage list matches the six-stage published framework",
  Pace.STAGES.length === 6 &&
  Pace.STAGES[0] === "Symptom-limited activity" &&
  Pace.STAGES[5] === "Return to sport");

check("20 A score of 6+ is flagged as notable for a clinician",
  Pace.maxSymptom(entry("2026-09-01", "x", 0, 6, 0, 0)) >= Pace.NOTABLE_THRESHOLD &&
  Pace.maxSymptom(entry("2026-09-01", "x", 0, 5, 0, 0)) < Pace.NOTABLE_THRESHOLD);

// ---------------------------------------------------------------------------
console.log("\n" + passed + " passed, " + failed + " failed\n");
process.exit(failed === 0 ? 0 : 1);
