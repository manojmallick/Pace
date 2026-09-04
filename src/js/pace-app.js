/*
 * Pace - user interface.
 *
 * Everything in this file is presentation and event wiring. It holds no
 * recovery rules of its own: every decision about whether a stage may be
 * advanced is delegated to pace-logic.js, so the interface cannot drift away
 * from the logic the test suite covers.
 *
 * Written as a classic script inside an IIFE rather than an ES module, on
 * purpose. Modules are fetched under CORS rules, which browsers refuse over
 * file:// - and a clinician or judge opening index.html straight from a
 * downloaded folder is a first-class use case for this project.
 */

(function () {

  "use strict";

  var P = PaceLogic;

  // Declared before the first loadState() call -- loadState() clears this flag
  // when storage throws, so a later initialiser here would wipe that signal.
  var storageWorks = true;

  var state = loadState();

  // -------------------------------------------------------------------------
  // Persistence. Storage can throw outright (Safari private browsing, blocked
  // cookies), so every access is guarded -- a browser that refuses to store
  // should still leave a usable app rather than a blank page.
  // -------------------------------------------------------------------------

  function loadState() {
    try {
      var raw = localStorage.getItem(P.STORAGE_KEY);
      return P.migrate(raw ? JSON.parse(raw) : null);
    } catch (e) {
      storageWorks = false;
      return P.initialState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(P.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      storageWorks = false;
    }
  }

  function todayStr() {
    var d = new Date();
    // Local calendar date, not UTC -- toISOString() would roll the date over
    // early evening for anyone west of Greenwich.
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function formatDate(iso) {
    var parts = iso.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      weekday: "short", year: "numeric", month: "short", day: "numeric"
    });
  }

  // -------------------------------------------------------------------------
  // Symptom sliders, built from the same SYMPTOMS list the logic uses so the
  // two can never drift apart.
  // -------------------------------------------------------------------------

  var SEVERITY_WORDS = ["none", "very mild", "mild", "mild", "moderate",
    "moderate", "marked", "marked", "severe", "severe", "worst imaginable"];

  function buildSymptomInputs() {
    var container = document.getElementById("symptomInputs");
    P.SYMPTOMS.forEach(function (sym) {
      var wrap = document.createElement("div");
      wrap.className = "symptom";

      var head = document.createElement("div");
      head.className = "symptom-head";

      var label = document.createElement("label");
      label.setAttribute("for", "sym-" + sym.key);
      label.textContent = sym.label;

      var value = document.createElement("span");
      value.className = "symptom-value";
      value.id = "symval-" + sym.key;
      value.setAttribute("aria-hidden", "true");
      value.textContent = "0";

      head.appendChild(label);
      head.appendChild(value);

      var input = document.createElement("input");
      input.type = "range";
      input.min = "0";
      input.max = "10";
      input.step = "1";
      input.value = "0";
      input.id = "sym-" + sym.key;
      input.setAttribute("aria-valuetext", "0, none");

      input.addEventListener("input", function () {
        value.textContent = input.value;
        input.setAttribute("aria-valuetext", input.value + ", " + SEVERITY_WORDS[Number(input.value)]);
      });

      var hint = document.createElement("div");
      hint.className = "scale-hint";
      hint.setAttribute("aria-hidden", "true");
      hint.innerHTML = "<span>0 &mdash; none</span><span>10 &mdash; severe</span>";

      wrap.appendChild(head);
      wrap.appendChild(input);
      wrap.appendChild(hint);
      container.appendChild(wrap);
    });
  }

  function readSymptomInputs() {
    var entry = { date: todayStr(), activity: document.getElementById("activityInput").value };
    P.SYMPTOMS.forEach(function (sym) {
      entry[sym.key] = parseInt(document.getElementById("sym-" + sym.key).value, 10);
    });
    return entry;
  }

  function clearSymptomInputs() {
    P.SYMPTOMS.forEach(function (sym) {
      var input = document.getElementById("sym-" + sym.key);
      input.value = "0";
      input.setAttribute("aria-valuetext", "0, none");
      document.getElementById("symval-" + sym.key).textContent = "0";
    });
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  function renderStages() {
    var el = document.getElementById("stageList");
    el.innerHTML = "";

    P.STAGES.forEach(function (label, i) {
      var done = i < state.currentStage;
      var current = i === state.currentStage;

      var row = document.createElement("div");
      row.className = "stage-row";

      var badge = document.createElement("div");
      badge.className = "stage-badge " +
        (done ? "stage-done" : current ? "stage-current" : "stage-upcoming");
      badge.textContent = done ? "✓" : String(i + 1);
      badge.setAttribute("aria-hidden", "true");

      var text = document.createElement("div");
      text.className = "stage-label " +
        (current ? "stage-current-label" : done ? "" : "stage-upcoming-label");
      text.textContent = label;

      // The visual state is carried by colour and a tick mark, so the same
      // information is repeated in text for screen readers and for anyone
      // who cannot distinguish the colours.
      var sr = document.createElement("span");
      sr.className = "visually-hidden";
      sr.textContent = done ? " (completed)" : current ? " (current stage)" : " (not yet reached)";
      text.appendChild(sr);

      if (current) {
        var tag = document.createElement("span");
        tag.className = "stage-tag";
        tag.setAttribute("aria-hidden", "true");
        tag.textContent = "you are here";
        text.appendChild(document.createTextNode(" "));
        text.appendChild(tag);
      }

      row.appendChild(badge);
      row.appendChild(text);
      el.appendChild(row);
    });
  }

  function renderGate(justBlocked) {
    var statusEl = document.getElementById("gateStatus");
    var btn = document.getElementById("advanceBtn");
    var note = document.getElementById("advanceNote");
    var st = P.advanceStatus(state);

    if (st.reason === "final-stage") {
      statusEl.className = "status status-ok";
      statusEl.innerHTML = "<strong>You have reached the final stage.</strong>" +
        "Confirm with your clinician before a full return.";
      btn.disabled = true;
      btn.textContent = "Final stage reached";
      note.textContent = "";
      return;
    }

    var need = st.need;
    var have = st.have;
    var nextStage = P.STAGES[state.currentStage + 1];

    if (st.allowed) {
      statusEl.className = "status status-ok";
      statusEl.innerHTML = "<strong>" + have + " symptom-free " + (have === 1 ? "day" : "days") +
        " logged at this stage.</strong>" +
        "That meets the " + need + "-day window. Confirm with your clinician before moving on.";
      btn.disabled = false;
      btn.textContent = "Move to: " + nextStage;
      note.textContent = "";
    } else if (justBlocked) {
      statusEl.className = "status status-blocked";
      statusEl.innerHTML = "<strong>Not yet — advancing is blocked.</strong>" +
        "You need " + need + " symptom-free " + (need === 1 ? "day" : "days") +
        " logged since your last change of stage, and you currently have " + have + ". " +
        "A check-in with any symptom above 0 resets the count. This is the framework's own rule, " +
        "and Pace will not let you click past it.";
      btn.disabled = true;
      btn.textContent = "Move to: " + nextStage;
      note.textContent = "Log a fully symptom-free check-in below when you have one.";
    } else {
      statusEl.className = "status status-wait";
      statusEl.innerHTML = "<strong>" + have + " of " + need + " symptom-free " +
        (need === 1 ? "day" : "days") + " logged at this stage.</strong>" +
        "The framework asks for " + (need === 1 ? "24 hours" : need + " days") +
        " symptom-free before progressing.";
      btn.disabled = true;
      btn.textContent = "Move to: " + nextStage;
      note.textContent = "Log a fully symptom-free check-in below to open the next stage.";
    }
  }

  function renderLog() {
    var el = document.getElementById("logHistory");

    if (state.log.length === 0) {
      el.innerHTML = '<p class="empty-state">No entries yet. Log your first check-in above.</p>';
      return;
    }

    el.innerHTML = "";
    state.log.slice().reverse().forEach(function (entry) {
      var max = P.maxSymptom(entry);
      var notable = max >= P.NOTABLE_THRESHOLD;
      var clear = P.isSymptomFree(entry);

      var div = document.createElement("div");
      div.className = "log-entry" + (notable ? " flag" : clear ? " clear" : "");

      var activity = document.createElement("div");
      activity.className = "log-activity";
      activity.textContent = entry.activity;

      var meta = document.createElement("div");
      meta.className = "log-meta";
      var scores = P.SYMPTOMS.map(function (sym) {
        return sym.label.toLowerCase() + " " + entry[sym.key];
      }).join(", ");
      meta.textContent = formatDate(entry.date) + " — " +
        (clear ? "no symptoms reported" : scores);

      div.appendChild(activity);
      div.appendChild(meta);

      if (notable) {
        var flag = document.createElement("div");
        flag.className = "log-meta log-flag-text";
        flag.textContent = "Notable — consider raising this one with your clinician.";
        div.appendChild(flag);
      }

      el.appendChild(div);
    });
  }

  function render(justBlocked) {
    renderStages();
    renderGate(justBlocked);
    renderLog();
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  document.getElementById("logBtn").addEventListener("click", function () {
    var entry = readSymptomInputs();
    var wasAllowed = P.advanceStatus(state).allowed;

    P.logEntry(state, entry);
    saveState();
    clearSymptomInputs();
    render(false);

    var feedback = document.getElementById("logFeedback");
    if (P.isSymptomFree(entry)) {
      feedback.textContent = "Saved as a symptom-free check-in.";
    } else if (wasAllowed) {
      feedback.textContent = "Saved. Because this check-in had symptoms, the symptom-free " +
        "count is back to zero and the next stage is closed again.";
    } else {
      feedback.textContent = "Saved. This check-in had symptoms, so the symptom-free count stays at zero.";
    }
  });

  document.getElementById("advanceBtn").addEventListener("click", function () {
    // The button is disabled whenever the gate is shut, so this is a second
    // line of defence rather than the only one -- the logic refuses either way.
    if (!P.tryAdvance(state, todayStr())) {
      render(true);
      return;
    }
    saveState();
    render(false);
    document.getElementById("logFeedback").textContent = "";
  });

  document.getElementById("windowSelect").addEventListener("change", function () {
    if (P.setRequiredSymptomFreeDays(state, parseInt(this.value, 10))) {
      saveState();
      render(false);
    }
  });

  document.getElementById("printBtn").addEventListener("click", function () {
    window.print();
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    if (!window.confirm("Erase every check-in and reset to stage 1? This cannot be undone.")) return;
    try { localStorage.removeItem(P.STORAGE_KEY); } catch (e) { /* nothing stored to remove */ }
    state = P.initialState();
    render(false);
    document.getElementById("logFeedback").textContent = "All data erased from this device.";
  });

  // -------------------------------------------------------------------------
  // Start
  // -------------------------------------------------------------------------

  buildSymptomInputs();
  document.getElementById("windowSelect").value = String(state.requiredSymptomFreeDays);
  render(false);

  if (!storageWorks) {
    var warn = document.createElement("div");
    warn.className = "status status-wait";
    warn.setAttribute("role", "note");
    warn.innerHTML = "<strong>This browser is not letting Pace save anything.</strong>" +
      "You can still use it, but your log will be gone when you close the tab. " +
      "Private browsing mode is the usual cause.";
    document.querySelector("main").insertBefore(warn, document.querySelector("main").firstChild);
  }
})();
