/**
 * Shared constants. Loaded as a classic script by the service worker
 * (importScripts), the popup, and the content script, and require()d by tests.
 */
(function (global) {
  "use strict";

  const ORIGIN = "https://ufuture.uitm.edu.my";

  // Path fragments that identify an individual survey we know how to fill.
  const SURVEY_PATTERNS = [
    { type: "entrance", match: "/ess/answers/entry/", label: "Entrance Survey" },
    { type: "exit", match: "/ess/answers/exits/", label: "Exit Survey" },
    { type: "sufo", match: "/sufo/questions/index/", label: "SuFO" },
    { type: "kifo", match: "/kifo/questions/index/", label: "KIFO" },
  ];

  // Listing pages that link to surveys rather than being one. Visiting a hub
  // re-runs the scanner and appends whatever it finds to the queue.
  const HUB_PATTERNS = [
    { match: "/ess/dashboard/home", label: "Dashboard" },
    { match: "/sufo/subject/index", label: "SuFO list" },
    { match: "/kifo/subject/index", label: "KIFO list" },
  ];

  const DASHBOARD_URL = ORIGIN + "/ess/dashboard/home";

  // How far the queue may expand through hub pages before we stop crawling.
  const MAX_HUB_DEPTH = 2;
  // Attempts per survey before it is recorded as failed and skipped.
  const MAX_ATTEMPTS = 2;
  // Milliseconds a single survey may occupy before the watchdog intervenes.
  const STEP_TIMEOUT_MS = 45000;

  const STRATEGY = {
    REALISTIC: "realistic",
    HIGHEST: "highest",
    LOWEST: "lowest",
    NEUTRAL: "neutral",
  };

  // Which end of the scale each survey type sits on under "realistic".
  const REALISTIC_POLARITY = {
    entrance: "lowest",
    kifo: "lowest",
    exit: "highest",
    sufo: "highest",
  };

  const PHASE = {
    IDLE: "idle",
    SCANNING: "scanning",
    FILLING: "filling",
    SUBMITTING: "submitting",
    DONE: "done",
    STOPPED: "stopped",
    ERROR: "error",
  };

  const MSG = {
    // popup -> background
    GET_STATE: "GET_STATE",
    START: "START",
    STOP: "STOP",
    CHECK_UPDATE: "CHECK_UPDATE",
    // background -> popup
    STATE: "STATE",
    // content -> background
    PAGE_READY: "PAGE_READY",
    SCAN_RESULT: "SCAN_RESULT",
    FILL_RESULT: "FILL_RESULT",
    SUBMIT_CLICKED: "SUBMIT_CLICKED",
    SUBMIT_STALLED: "SUBMIT_STALLED",
    CONTENT_ERROR: "CONTENT_ERROR",
    // background -> content (as the reply to PAGE_READY)
    DO_NOTHING: "DO_NOTHING",
    DO_SCAN: "DO_SCAN",
    DO_FILL: "DO_FILL",
  };

  const DEFAULT_SETTINGS = {
    strategy: STRATEGY.REALISTIC,
    dryRun: false,
    autoSubmit: true,
    checkUpdates: true,
  };

  const GITHUB_LATEST_RELEASE =
    "https://api.github.com/repos/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick/releases/latest";

  const API = {
    ORIGIN,
    SURVEY_PATTERNS,
    HUB_PATTERNS,
    DASHBOARD_URL,
    MAX_HUB_DEPTH,
    MAX_ATTEMPTS,
    STEP_TIMEOUT_MS,
    STRATEGY,
    REALISTIC_POLARITY,
    PHASE,
    MSG,
    DEFAULT_SETTINGS,
    GITHUB_LATEST_RELEASE,
  };

  global.UiTMConst = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
