/**
 * Service worker: the only thing allowed to decide where the tab goes next.
 *
 * v2 had three independent navigators (the popup's post-submit timer, the
 * content script's survey handler, and the content script's dashboard handler)
 * racing each other and the site's own redirect. Here the content script only
 * reports and obeys; every transition happens below.
 */
importScripts("src/constants.js", "src/survey-core.js");

const C = self.UiTMConst;
const Core = self.SurveyCore;

const RUN_KEY = "run";
const SETTINGS_KEY = "settings";
const UPDATE_KEY = "updateInfo";
const WATCHDOG = "watchdog";
const UPDATE_ALARM = "updateCheck";

// ------------------------------------------------------------- storage ---

async function loadRun() {
  const got = await chrome.storage.session.get(RUN_KEY);
  return got[RUN_KEY] || null;
}

async function saveRun(state) {
  await chrome.storage.session.set({ [RUN_KEY]: state });
  broadcast(state);
  updateBadge(state);
  return state;
}

async function clearRun() {
  await chrome.storage.session.remove(RUN_KEY);
  await chrome.alarms.clear(WATCHDOG);
}

async function loadSettings() {
  const got = await chrome.storage.sync.get(SETTINGS_KEY);
  return Object.assign({}, C.DEFAULT_SETTINGS, got[SETTINGS_KEY] || {});
}

function broadcast(state) {
  chrome.runtime.sendMessage({ type: C.MSG.STATE, state }).catch(() => {
    /* popup closed — nothing listening, which is fine */
  });
}

function updateBadge(state) {
  const running = state && (state.phase === C.PHASE.FILLING ||
    state.phase === C.PHASE.SCANNING || state.phase === C.PHASE.SUBMITTING);
  if (running) {
    const left = Math.max(0, state.queue.length - state.cursor);
    chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
    chrome.action.setBadgeText({ text: String(left) });
  } else if (state && state.phase === C.PHASE.DONE) {
    chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
    chrome.action.setBadgeText({ text: "✓" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 8000);
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

function log(state, level, msg) {
  state.log = state.log || [];
  state.log.push({ t: Date.now(), level, msg });
  if (state.log.length > 120) state.log = state.log.slice(-120);
  return state;
}

// ------------------------------------------------------------ watchdog ---

function armWatchdog() {
  chrome.alarms.create(WATCHDOG, { when: Date.now() + C.STEP_TIMEOUT_MS });
}

// ------------------------------------------------------ state machine ---

function newRun(tabId, originUrl, settings) {
  return {
    phase: C.PHASE.IDLE,
    tabId,
    originUrl,
    strategy: settings.strategy,
    dryRun: settings.dryRun,
    autoSubmit: settings.autoSubmit,
    queue: [],
    cursor: 0,
    completed: [],
    failed: [],
    log: [],
    message: "",
    startedAt: Date.now(),
    finishedAt: null,
    stepStartedAt: Date.now(),
  };
}

function makeItem(url, kind, type, label, depth) {
  return { url, kind, type, label, depth: depth || 0, attempts: 0, status: "pending" };
}

function alreadyQueued(state, url) {
  const key = Core.normalizeUrl(url);
  return state.queue.some((i) => Core.normalizeUrl(i.url) === key);
}

/** Point the tab at the current queue item, or drive it in place. */
async function goToCursor(state, navigate) {
  const item = state.queue[state.cursor];
  if (!item) return finish(state);

  state.phase = item.kind === "hub" ? C.PHASE.SCANNING : C.PHASE.FILLING;
  state.stepStartedAt = Date.now();
  await saveRun(state);
  armWatchdog();

  if (navigate) {
    await chrome.tabs.update(state.tabId, { url: item.url });
  } else {
    await sendToTab(state.tabId, instructionFor(state));
  }
  return state;
}

async function advance(state) {
  state.cursor += 1;
  if (state.cursor >= state.queue.length) return finish(state);
  return goToCursor(state, true);
}

async function finish(state) {
  state.phase = C.PHASE.DONE;
  state.finishedAt = Date.now();
  const done = state.completed.length;
  const failed = state.failed.length;
  state.message = failed
    ? `Finished ${done} survey(s), ${failed} could not be completed.`
    : `Finished ${done} survey(s).`;
  log(state, failed ? "warn" : "success", state.message);
  await chrome.alarms.clear(WATCHDOG);
  await saveRun(state);

  // Go back to the listing the run started from, so the user can see the
  // updated status. Runs that started on a single survey stay where they are.
  const origin = state.queue[0];
  const last = state.queue[state.queue.length - 1];
  const startedOnListing = origin && origin.kind === "hub";
  if (startedOnListing && last && !Core.sameTarget(state.originUrl, last.url)) {
    try {
      await chrome.tabs.update(state.tabId, { url: state.originUrl });
    } catch { /* tab closed mid-run */ }
  }
  return state;
}

async function stopRun(state, reason) {
  state.phase = C.PHASE.STOPPED;
  state.finishedAt = Date.now();
  state.message = reason;
  log(state, "info", reason);
  await chrome.alarms.clear(WATCHDOG);
  return saveRun(state);
}

async function completeCurrent(state, status) {
  const item = state.queue[state.cursor];
  if (!item) return state;
  item.status = status;
  state.completed.push({ url: item.url, label: item.label, type: item.type, status });
  log(state, "success", `${item.label || item.type}: ${status}`);
  return state;
}

/** Retry the current item, or record it as failed and move on. */
async function failOrRetry(state, reason) {
  const item = state.queue[state.cursor];
  if (!item) return finish(state);

  item.attempts += 1;
  if (item.attempts < C.MAX_ATTEMPTS) {
    log(state, "warn", `${item.label || item.type}: ${reason} — retrying`);
    return goToCursor(state, true);
  }

  item.status = "failed";
  state.failed.push({ url: item.url, label: item.label, type: item.type, reason });
  log(state, "error", `${item.label || item.type}: ${reason} — skipped`);
  return advance(state);
}

function instructionFor(state) {
  const item = state.queue[state.cursor];
  if (!item) return { action: C.MSG.DO_NOTHING };
  if (state.phase === C.PHASE.SCANNING) {
    return { action: C.MSG.DO_SCAN, depth: item.depth };
  }
  if (state.phase === C.PHASE.FILLING) {
    return {
      action: C.MSG.DO_FILL,
      surveyType: item.type,
      strategy: state.strategy,
      dryRun: state.dryRun,
      autoSubmit: state.autoSubmit,
    };
  }
  return { action: C.MSG.DO_NOTHING };
}

async function sendToTab(tabId, payload) {
  try {
    return await chrome.tabs.sendMessage(tabId, payload);
  } catch {
    // No content script yet (extension freshly reloaded). Inject and retry.
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["src/constants.js", "src/survey-core.js", "content.js"],
      });
      return await chrome.tabs.sendMessage(tabId, payload);
    } catch (e) {
      console.warn("sendToTab failed", e);
      return null;
    }
  }
}

// -------------------------------------------------------------- start ---

async function startRun(overrides) {
  const settings = Object.assign(await loadSettings(), overrides || {});
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url) {
    throw new Error("No active tab. Open a ufuture.uitm.edu.my page first.");
  }
  const info = Core.classifyUrl(tab.url);
  if (!info) {
    throw new Error("This page is not part of ufuture.uitm.edu.my, or is not a survey or listing page.");
  }

  const state = newRun(tab.id, tab.url, settings);

  // Preview and manual-submit modes act on one page only: walking a whole
  // queue without submitting would just flip through pages to no effect.
  const singlePage = state.dryRun || !state.autoSubmit;
  if (singlePage && info.kind !== "survey") {
    throw new Error("Preview and manual-submit modes need a survey page. Open one first.");
  }

  state.queue = [makeItem(tab.url, info.kind, info.type, info.label, 0)];
  state.cursor = 0;
  log(state, "info", singlePage
    ? `Preparing ${info.label}`
    : `Starting from ${info.label}`);

  return goToCursor(state, false);
}

// ------------------------------------------------- content -> worker ---

async function handlePageReady(tabId, url) {
  let state = await loadRun();
  if (!state || state.tabId !== tabId) return { action: C.MSG.DO_NOTHING };
  if ([C.PHASE.IDLE, C.PHASE.DONE, C.PHASE.STOPPED, C.PHASE.ERROR].includes(state.phase)) {
    return { action: C.MSG.DO_NOTHING };
  }

  if (state.phase === C.PHASE.SUBMITTING) {
    // The page moved after we clicked submit, which is the site accepting it.
    state = await completeCurrent(state, "submitted");
    state = await advance(state);
    if (state.phase !== C.PHASE.FILLING && state.phase !== C.PHASE.SCANNING) {
      return { action: C.MSG.DO_NOTHING };
    }
    // advance() navigated; this page is not the new target.
    if (!Core.sameTarget(url, state.queue[state.cursor].url)) {
      return { action: C.MSG.DO_NOTHING };
    }
  }

  const item = state.queue[state.cursor];
  if (!item || !Core.sameTarget(url, item.url)) return { action: C.MSG.DO_NOTHING };

  state.stepStartedAt = Date.now();
  await saveRun(state);
  armWatchdog();
  return instructionFor(state);
}

async function handleScanResult(tabId, links) {
  let state = await loadRun();
  if (!state || state.tabId !== tabId || state.phase !== C.PHASE.SCANNING) return;

  const current = state.queue[state.cursor];
  const nextDepth = (current.depth || 0) + 1;
  let added = 0;

  for (const link of links || []) {
    if (alreadyQueued(state, link.url)) continue;
    if (link.kind === "hub" && nextDepth >= C.MAX_HUB_DEPTH) continue;
    state.queue.push(makeItem(link.url, link.kind, link.type, link.label, nextDepth));
    added += 1;
  }

  log(state, "info", `${current.label || "Listing"}: found ${added} new item(s)`);
  state = await completeCurrent(state, "scanned");

  if (state.queue.length === state.cursor + 1) {
    state.message = "No incomplete surveys found on this page.";
    return stopRun(state, state.message);
  }
  return advance(state);
}

async function handleFillResult(tabId, result) {
  let state = await loadRun();
  if (!state || state.tabId !== tabId || state.phase !== C.PHASE.FILLING) return;

  const item = state.queue[state.cursor];

  if (!result.ok) {
    const names = (result.missing || []).slice(0, 4).map((m) => m.name).join(", ");
    return failOrRetry(state, `${result.answered}/${result.total} answered${names ? ` (missing ${names})` : ""}`);
  }

  if (result.dryRun) {
    log(state, "info", `Preview: would answer ${result.total} question(s) on ${item.label}`);
    state.previewPicks = result.picks || [];
    state.message = `Preview only — ${result.total} question(s) would be answered. Nothing was submitted.`;
    return stopRun(state, state.message);
  }

  if (!state.autoSubmit) {
    state = await completeCurrent(state, "filled");
    state.message = `Filled ${result.total} question(s). Review the page and submit it yourself.`;
    return stopRun(state, state.message);
  }

  // The content script goes on to click submit; wait for the navigation.
  state.phase = C.PHASE.SUBMITTING;
  state.stepStartedAt = Date.now();
  log(state, "info", `${item.label || item.type}: answered ${result.total}, submitting`);
  await saveRun(state);
  armWatchdog();
}

async function handleSubmitStalled(tabId, detail) {
  const state = await loadRun();
  if (!state || state.tabId !== tabId) return;
  if (state.phase !== C.PHASE.SUBMITTING && state.phase !== C.PHASE.FILLING) return;
  return failOrRetry(state, detail || "submit did not go through");
}

async function handleContentError(tabId, message) {
  const state = await loadRun();
  if (!state || state.tabId !== tabId) return;
  if ([C.PHASE.IDLE, C.PHASE.DONE, C.PHASE.STOPPED].includes(state.phase)) return;
  return failOrRetry(state, message || "page error");
}

// ------------------------------------------------------- update check ---

function compareVersions(a, b) {
  const pa = String(a).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** Has the user actually granted the optional api.github.com origin? */
async function hasUpdatePermission() {
  try {
    return await chrome.permissions.contains({ origins: [C.GITHUB_ORIGIN] });
  } catch {
    return false;
  }
}

/**
 * Compare against the latest GitHub release. Store-installed copies update
 * themselves; this exists for people running an unpacked build, who get no
 * updates at all otherwise. Sends nothing but an unauthenticated GET, and only
 * once the user has granted the optional permission from the settings page.
 */
async function checkForUpdate() {
  const settings = await loadSettings();
  const current = chrome.runtime.getManifest().version;
  if (!settings.checkUpdates) return null;

  if (!(await hasUpdatePermission())) {
    const info = { current, latest: null, needsPermission: true, checkedAt: Date.now() };
    await chrome.storage.local.set({ [UPDATE_KEY]: info });
    return info;
  }

  try {
    const res = await fetch(C.GITHUB_LATEST_RELEASE, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    const data = await res.json();
    const latest = String(data.tag_name || "").replace(/^v/, "");
    const info = {
      current,
      latest,
      url: data.html_url || "",
      outdated: Boolean(latest) && compareVersions(current, latest) < 0,
      checkedAt: Date.now(),
    };
    await chrome.storage.local.set({ [UPDATE_KEY]: info });
    return info;
  } catch (e) {
    const info = { current, latest: null, error: String(e.message || e), checkedAt: Date.now() };
    await chrome.storage.local.set({ [UPDATE_KEY]: info });
    return info;
  }
}

// ------------------------------------------------------------ wiring ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;

  (async () => {
    try {
      switch (msg && msg.type) {
        case C.MSG.GET_STATE: {
          const [state, settings, stored] = await Promise.all([
            loadRun(),
            loadSettings(),
            chrome.storage.local.get(UPDATE_KEY),
          ]);
          sendResponse({ ok: true, state, settings, update: stored[UPDATE_KEY] || null });
          break;
        }
        case C.MSG.START: {
          await clearRun();
          const state = await startRun(msg.settings);
          sendResponse({ ok: true, state });
          break;
        }
        case C.MSG.STOP: {
          const state = await loadRun();
          if (state) await stopRun(state, "Stopped by you.");
          else updateBadge(null);
          sendResponse({ ok: true });
          break;
        }
        case C.MSG.CHECK_UPDATE: {
          await syncUpdateAlarm();
          sendResponse({ ok: true, update: await checkForUpdate() });
          break;
        }
        case C.MSG.PAGE_READY:
          sendResponse(await handlePageReady(tabId, msg.url));
          break;
        case C.MSG.SCAN_RESULT:
          await handleScanResult(tabId, msg.links);
          sendResponse({ ok: true });
          break;
        case C.MSG.FILL_RESULT:
          await handleFillResult(tabId, msg.result);
          sendResponse({ ok: true });
          break;
        case C.MSG.SUBMIT_CLICKED:
          sendResponse({ ok: true });
          break;
        case C.MSG.SUBMIT_STALLED:
          await handleSubmitStalled(tabId, msg.detail);
          sendResponse({ ok: true });
          break;
        case C.MSG.CONTENT_ERROR:
          await handleContentError(tabId, msg.message);
          sendResponse({ ok: true });
          break;
        default:
          sendResponse({ ok: false, error: "Unknown message" });
      }
    } catch (e) {
      console.error("background error", e);
      sendResponse({ ok: false, error: String(e.message || e) });
    }
  })();

  return true; // async sendResponse
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === UPDATE_ALARM) {
    await checkForUpdate();
    return;
  }
  if (alarm.name !== WATCHDOG) return;

  const state = await loadRun();
  if (!state) return;
  if ([C.PHASE.IDLE, C.PHASE.DONE, C.PHASE.STOPPED, C.PHASE.ERROR].includes(state.phase)) return;
  if (Date.now() - state.stepStartedAt < C.STEP_TIMEOUT_MS - 2000) {
    armWatchdog(); // step moved on since the alarm was set
    return;
  }
  await failOrRetry(state, "timed out waiting for the page");
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await loadRun();
  if (state && state.tabId === tabId && !["done", "stopped", "idle"].includes(state.phase)) {
    await stopRun(state, "The tab was closed before the run finished.");
  }
});

/** The daily check only exists while the user has opted in and granted access. */
async function syncUpdateAlarm() {
  const settings = await loadSettings();
  if (settings.checkUpdates && (await hasUpdatePermission())) {
    chrome.alarms.create(UPDATE_ALARM, { periodInMinutes: 60 * 24 });
  } else {
    await chrome.alarms.clear(UPDATE_ALARM);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await loadSettings();
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
  await syncUpdateAlarm();
});

chrome.runtime.onStartup.addListener(syncUpdateAlarm);

// Revoking the origin from chrome://extensions must stop the check too.
if (chrome.permissions.onRemoved) chrome.permissions.onRemoved.addListener(syncUpdateAlarm);
if (chrome.permissions.onAdded) chrome.permissions.onAdded.addListener(syncUpdateAlarm);
