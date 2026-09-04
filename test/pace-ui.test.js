/*
 * Pace — user interface assertions.
 *
 * Run:  npm run test:ui     (or: node test/pace-ui.test.js)
 *
 * These drive the real DOM to check that the interface actually honours the
 * stage gate, rather than only the module underneath it. jsdom is the one
 * thing Pace needs that it does not ship: it is a test harness, deliberately
 * NOT a project dependency, because "opens in a browser with no install" is a
 * property worth protecting. When it is absent this file skips rather than
 * fails, so `npm test` stays green on a clean clone.
 *
 *   npm install --no-save jsdom && npm run test:ui
 */

"use strict";

var fs = require("fs");
var path = require("path");

var JSDOM;
try {
  JSDOM = require("jsdom").JSDOM;
} catch (e) {
  console.log("\nPACE — UI TESTS SKIPPED");
  console.log("  jsdom is not installed. To run these:");
  console.log("    npm install --no-save jsdom && npm run test:ui\n");
  process.exit(0);
}

var ROOT = path.join(__dirname, "..");
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

// Build the page, then run the two scripts in document order by hand. jsdom's
// resource loader is left off on purpose -- reading the files directly keeps
// the test honest about which files the page actually depends on.
var dom = new JSDOM(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), {
  runScripts: "dangerously",
  url: "http://localhost/"
});

var doc = dom.window.document;
var win = dom.window;

[...doc.querySelectorAll("script[src]")].forEach(function (tag) {
  win.eval(fs.readFileSync(path.join(ROOT, tag.getAttribute("src")), "utf8"));
});

function $(id) { return doc.getElementById(id); }
function click(el) { el.dispatchEvent(new win.MouseEvent("click", { bubbles: true })); }
function setSlider(key, value) {
  var el = $("sym-" + key);
  el.value = String(value);
  el.dispatchEvent(new win.Event("input", { bubbles: true }));
}

console.log("\nPACE — USER INTERFACE TEST SUITE\n");

// ---------------------------------------------------------------------------
console.log("Structure and accessibility");
// ---------------------------------------------------------------------------

check("Every script the page references resolves to a real file",
  [...doc.querySelectorAll("script[src]")].every(function (t) {
    return fs.existsSync(path.join(ROOT, t.getAttribute("src")));
  }));

check("Every stylesheet the page references resolves to a real file",
  [...doc.querySelectorAll('link[rel="stylesheet"]')].every(function (t) {
    return fs.existsSync(path.join(ROOT, t.getAttribute("href")));
  }));

check("No script uses type=module (would break opening over file://)",
  [...doc.querySelectorAll("script")].every(function (t) { return t.type !== "module"; }));

check("Six stages render", doc.querySelectorAll(".stage-row").length === 6);

check("Four symptom sliders render",
  doc.querySelectorAll("#symptomInputs input[type=range]").length === 4);

check("Every slider has an associated <label for=...>",
  [...doc.querySelectorAll("#symptomInputs input[type=range]")].every(function (i) {
    return !!doc.querySelector('label[for="' + i.id + '"]');
  }));

check("Every slider carries aria-valuetext in words, not a bare number",
  [...doc.querySelectorAll("#symptomInputs input[type=range]")].every(function (i) {
    return /\d,\s*\w/.test(i.getAttribute("aria-valuetext") || "");
  }));

check("Safety banner is present and has no dismiss control",
  !!doc.querySelector(".safety-banner") && !doc.querySelector(".safety-banner button"));

check("Gate result is announced through a live region, not window.alert()",
  $("gateStatus").getAttribute("role") === "status");

check("Stage state is conveyed in text, not by colour alone",
  doc.querySelector(".stage-row .visually-hidden").textContent.includes("current stage"));

// ---------------------------------------------------------------------------
console.log("\nThe stage gate, through the interface");
// ---------------------------------------------------------------------------

check("Advance button starts DISABLED (gate shut at zero symptom-free days)",
  $("advanceBtn").disabled === true);

check("Gate status starts in the waiting state",
  $("gateStatus").className.indexOf("status-wait") !== -1);

click($("logBtn"));
check("A symptom-free check-in enables the advance button",
  $("advanceBtn").disabled === false);

check("Gate status flips to the permitted state",
  $("gateStatus").className.indexOf("status-ok") !== -1);

check("The log shows one entry", doc.querySelectorAll(".log-entry").length === 1);

click($("advanceBtn"));
check("Advancing marks the first stage complete",
  doc.querySelectorAll(".stage-badge.stage-done").length === 1);

check("Advance button is disabled again immediately after advancing",
  $("advanceBtn").disabled === true);

setSlider("headache", 6);
click($("logBtn"));
check("A symptomatic entry keeps the advance button disabled",
  $("advanceBtn").disabled === true);

check("A symptomatic entry is flagged as notable for a clinician",
  !!doc.querySelector(".log-entry.flag") &&
  doc.querySelector(".log-entry.flag").textContent.indexOf("Notable") !== -1);

check("Sliders reset to zero after saving", $("sym-headache").value === "0");

// The moment the demo video turns on: re-enable the button by hand, the way a
// determined user with devtools would, and confirm the logic still refuses.
$("advanceBtn").disabled = false;
click($("advanceBtn"));
check("Forcing the disabled button shows BLOCKED and does not move the stage",
  $("gateStatus").className.indexOf("status-blocked") !== -1 &&
  $("gateStatus").textContent.indexOf("blocked") !== -1 &&
  doc.querySelectorAll(".stage-badge.stage-done").length === 1);

// ---------------------------------------------------------------------------
console.log("\nClinician window and persistence");
// ---------------------------------------------------------------------------

$("windowSelect").value = "3";
$("windowSelect").dispatchEvent(new win.Event("change", { bubbles: true }));
check("A 3-day clinician window is reflected in the status text",
  $("gateStatus").textContent.indexOf("of 3 symptom-free days") !== -1);

check("State is persisted to localStorage",
  !!win.localStorage.getItem("pace_state") &&
  JSON.parse(win.localStorage.getItem("pace_state")).currentStage === 1);

check("Nothing leaves the device: the page makes no network requests",
  doc.querySelectorAll('[src^="http"], [href^="http"]').length === 0);

console.log("\n" + passed + " passed, " + failed + " failed\n");
process.exit(failed === 0 ? 0 : 1);
