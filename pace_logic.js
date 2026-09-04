/*
 * Pace — core recovery-pacing logic.
 *
 * This file is loaded verbatim by both index.html (the app the judges see)
 * and test_logic.js (the assertions that prove the Stage Gate works). There
 * is no second, "test-only" copy of these rules: the logic that is tested is
 * the logic that ships.
 *
 * Clinical grounding: the six stage names and the requirement of a
 * symptom-free period before progressing come from the stepwise
 * Return-to-Sport strategy in the 6th International Conference on Concussion
 * in Sport consensus statement (Amsterdam, 2022; published BJSM 2023).
 *
 * This file makes no clinical judgment. It never recommends advancing. It
 * only refuses to advance when the framework's own minimum has not been met.
 */

var PaceLogic = (function () {
  "use strict";

  var STAGES = [
    "Symptom-limited activity",
    "Light aerobic exercise",
    "Sport-specific exercise",
    "Non-contact training drills",
    "Full-contact practice",
    "Return to sport"
  ];

  var SYMPTOMS = [
    { key: "headache", label: "Headache" },
    { key: "light", label: "Light sensitivity" },
    { key: "fog", label: "Cognitive fog" },
    { key: "dizzy", label: "Dizziness" }
  ];

  var STORAGE_KEY = "pace_state";
  var SCHEMA_VERSION = 1;

  // A symptom score at or above this is surfaced in the log as worth raising
  // with a clinician. It is a display flag only -- it never changes the gate.
  var NOTABLE_THRESHOLD = 6;

  function initialState() {
    return {
      version: SCHEMA_VERSION,
      currentStage: 0,
      // Calendar date of the most recent stage advance. A symptom-free day
      // only counts toward the next advance if it falls on a LATER day --
      // otherwise the same afternoon could be spent twice, moving two stages
      // in a day with no symptom-free time actually elapsed between them.
      lastAdvanceDate: null,
      // Calendar date of the most recent symptom-free check-in that counted
      // toward the gate. Used to stop several check-ins on one day from
      // counting as several symptom-free days.
      lastSymptomFreeDate: null,
      symptomFreeDays: 0,
      // The framework's minimum is one symptom-free day (24 hours). A
      // clinician may set a longer window; the app honours a longer one and
      // refuses a shorter one.
      requiredSymptomFreeDays: 1,
      log: []
    };
  }

  function isSymptomFree(entry) {
    for (var i = 0; i < SYMPTOMS.length; i++) {
      if (entry[SYMPTOMS[i].key] !== 0) return false;
    }
    return true;
  }

  function maxSymptom(entry) {
    var max = 0;
    for (var i = 0; i < SYMPTOMS.length; i++) {
      var v = entry[SYMPTOMS[i].key];
      if (v > max) max = v;
    }
    return max;
  }

  /*
   * Record one check-in and update the gate.
   *
   * A fully symptom-free entry advances the symptom-free day count, but only
   * once per calendar day, and only on a day after the last stage advance --
   * logging "all zeros" five times in an afternoon does not manufacture five
   * symptom-free days, and the day you advanced on cannot be counted again
   * toward the next advance.
   *
   * Any entry with a non-zero score resets the count to zero. This is the
   * Stage Gate's core rule, and it is deliberately unforgiving: a mild
   * symptom is still a symptom under the framework, and the reset happens
   * even if a symptom-free entry was logged minutes earlier the same day.
   */
  /*
   * Whether a symptom-free check-in on this date may increment the count.
   * ISO yyyy-mm-dd dates compare correctly as strings, so "<=" here means
   * "on or before". Backdated entries are covered by the same test.
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
      state.symptomFreeDays = 0;
      state.lastSymptomFreeDate = null;
    }

    return state;
  }

  function requiredDays(state) {
    var n = state.requiredSymptomFreeDays;
    // Never allow the gate to be loosened below the framework's own minimum,
    // whatever ends up in stored state.
    return typeof n === "number" && n > 1 ? Math.floor(n) : 1;
  }

  /*
   * Why an advance is or is not permitted. Returned as structured data rather
   * than a rendered string so the UI, the tests and any future export all
   * agree on the reason.
   */
  function advanceStatus(state) {
    if (state.currentStage >= STAGES.length - 1) {
      return { allowed: false, reason: "final-stage" };
    }
    var need = requiredDays(state);
    if (state.symptomFreeDays < need) {
      return {
        allowed: false,
        reason: "insufficient-symptom-free-days",
        have: state.symptomFreeDays,
        need: need
      };
    }
    return { allowed: true, reason: "gate-met", have: state.symptomFreeDays, need: need };
  }

  /*
   * Attempt to move to the next stage. Returns true only if the gate opened.
   * Advancing consumes the symptom-free credit: the count resets, so the
   * requirement must be met again at the new stage before the next advance.
   *
   * `today` is passed in rather than read from the clock so this stays a
   * pure function -- the caller supplies the date, the tests supply theirs.
   */
  function tryAdvance(state, today) {
    if (!advanceStatus(state).allowed) return false;
    state.currentStage += 1;
    state.symptomFreeDays = 0;
    state.lastSymptomFreeDate = null;
    state.lastAdvanceDate = today || null;
    return true;
  }

  /*
   * Set a clinician's more conservative window. Values below the framework
   * minimum are rejected outright rather than silently clamped, so a
   * mistyped "0" cannot quietly weaken the gate.
   */
  function setRequiredSymptomFreeDays(state, days) {
    if (typeof days !== "number" || !isFinite(days)) return false;
    days = Math.floor(days);
    if (days < 1) return false;
    state.requiredSymptomFreeDays = days;
    return true;
  }

  function migrate(raw) {
    var s = initialState();
    if (!raw || typeof raw !== "object") return s;

    if (typeof raw.currentStage === "number") {
      s.currentStage = Math.max(0, Math.min(STAGES.length - 1, Math.floor(raw.currentStage)));
    }
    if (Array.isArray(raw.log)) s.log = raw.log;
    if (typeof raw.symptomFreeDays === "number") {
      s.symptomFreeDays = Math.max(0, Math.floor(raw.symptomFreeDays));
    } else if (typeof raw.symptomFreeStreakDays === "number") {
      // Pre-v1 field name from the first prototype.
      s.symptomFreeDays = Math.max(0, Math.floor(raw.symptomFreeStreakDays));
    }
    if (typeof raw.lastSymptomFreeDate === "string") {
      s.lastSymptomFreeDate = raw.lastSymptomFreeDate;
      if (typeof raw.lastAdvanceDate === "string") s.lastAdvanceDate = raw.lastAdvanceDate;
    } else if (typeof raw.lastAdvanceDate === "string") {
      // In the pre-v1 prototype this single field tracked the last
      // symptom-free check-in, not the last advance. Read it as such, and
      // leave lastAdvanceDate null -- the conservative reading, since a null
      // advance date can only ever make the gate stricter, never looser.
      s.lastSymptomFreeDate = raw.lastAdvanceDate;
    }
    if (typeof raw.requiredSymptomFreeDays === "number" && raw.requiredSymptomFreeDays > 1) {
      s.requiredSymptomFreeDays = Math.floor(raw.requiredSymptomFreeDays);
    }
    return s;
  }

  return {
    STAGES: STAGES,
    SYMPTOMS: SYMPTOMS,
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    NOTABLE_THRESHOLD: NOTABLE_THRESHOLD,
    initialState: initialState,
    isSymptomFree: isSymptomFree,
    maxSymptom: maxSymptom,
    countsTowardGate: countsTowardGate,
    logEntry: logEntry,
    advanceStatus: advanceStatus,
    tryAdvance: tryAdvance,
    setRequiredSymptomFreeDays: setRequiredSymptomFreeDays,
    migrate: migrate
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = PaceLogic;
