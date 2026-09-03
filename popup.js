/** Popup: renders whatever the service worker reports. Holds no run state. */
(function () {
  "use strict";

  const C = globalThis.UiTMConst;

  const el = {
    status: document.getElementById("status"),
    statusMessage: document.getElementById("status-message"),
    progress: document.getElementById("progress"),
    progressLabel: document.getElementById("progress-label"),
    progressCount: document.getElementById("progress-count"),
    progressFill: document.getElementById("progress-fill"),
    action: document.getElementById("action"),
    strategy: document.getElementById("strategy"),
    dryRun: document.getElementById("dryRun"),
    log: document.getElementById("log"),
    updateNote: document.getElementById("update-note"),
    version: document.getElementById("version"),
    settings: document.getElementById("settings"),
  };

  const IDLE_TEXT = "Open a survey or the dashboard, then start.";

  const TONE = {
    [C.PHASE.IDLE]: "idle",
    [C.PHASE.SCANNING]: "running",
    [C.PHASE.FILLING]: "running",
    [C.PHASE.SUBMITTING]: "running",
    [C.PHASE.DONE]: "success",
    [C.PHASE.STOPPED]: "warn",
    [C.PHASE.ERROR]: "error",
  };

  const isRunning = (phase) =>
    phase === C.PHASE.SCANNING || phase === C.PHASE.FILLING || phase === C.PHASE.SUBMITTING;

  function send(type, extra) {
    return chrome.runtime.sendMessage(Object.assign({ type }, extra || {}));
  }

  function phaseText(state) {
    const item = state.queue[state.cursor];
    const name = item ? item.label || item.type : "";
    switch (state.phase) {
      case C.PHASE.SCANNING: return `Looking for surveys on ${name || "this page"}…`;
      case C.PHASE.FILLING: return `Answering ${name}…`;
      case C.PHASE.SUBMITTING: return `Submitting ${name}…`;
      default: return state.message || IDLE_TEXT;
    }
  }

  function renderLog(entries) {
    el.log.textContent = "";
    for (const entry of (entries || []).slice(-40)) {
      const li = document.createElement("li");
      li.dataset.level = entry.level;
      const time = document.createElement("time");
      time.textContent = new Date(entry.t).toLocaleTimeString([], {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
      const span = document.createElement("span");
      span.textContent = entry.msg;
      li.append(time, span);
      el.log.appendChild(li);
    }
    el.log.scrollTop = el.log.scrollHeight;
  }

  function render(state) {
    if (!state) {
      el.status.dataset.tone = "idle";
      el.statusMessage.textContent = IDLE_TEXT;
      el.progress.hidden = true;
      el.action.textContent = "Start";
      el.action.dataset.variant = "start";
      el.action.disabled = false;
      el.strategy.disabled = false;
      el.dryRun.disabled = false;
      renderLog([]);
      return;
    }

    const running = isRunning(state.phase);
    el.status.dataset.tone = state.failed.length && !running ? "warn" : TONE[state.phase] || "idle";
    el.statusMessage.textContent = phaseText(state);

    // Surveys only; the listing pages we crawl are not user-visible work.
    const surveys = state.queue.filter((i) => i.kind === "survey");
    const finished = state.completed.filter((c) => c.status !== "scanned").length;
    const total = surveys.length;

    if (total > 0 && (running || state.phase === C.PHASE.DONE)) {
      el.progress.hidden = false;
      el.progressLabel.textContent = state.failed.length
        ? `${state.failed.length} skipped`
        : "Surveys";
      el.progressCount.textContent = `${finished} / ${total}`;
      const pct = total ? Math.round((finished / total) * 100) : 0;
      el.progressFill.style.width = `${pct}%`;
      el.progressFill.dataset.done = String(state.phase === C.PHASE.DONE);
    } else {
      el.progress.hidden = true;
    }

    el.action.textContent = running ? "Stop" : "Start";
    el.action.dataset.variant = running ? "stop" : "start";
    el.action.disabled = false;
    el.strategy.disabled = running;
    el.dryRun.disabled = running;
    renderLog(state.log);
  }

  function renderUpdate(update) {
    if (!update || !update.outdated) {
      el.updateNote.dataset.show = "false";
      return;
    }
    el.updateNote.textContent = "";
    el.updateNote.append(`Version ${update.latest} is available. `);
    const a = document.createElement("a");
    a.href = update.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "View release";
    el.updateNote.appendChild(a);
    el.updateNote.dataset.show = "true";
  }

  async function refresh() {
    const res = await send(C.MSG.GET_STATE);
    if (!res || !res.ok) return;
    el.strategy.value = res.settings.strategy;
    el.dryRun.checked = res.settings.dryRun;
    render(res.state);
    renderUpdate(res.update);
  }

  el.action.addEventListener("click", async () => {
    el.action.disabled = true;
    const stopping = el.action.dataset.variant === "stop";
    try {
      if (stopping) {
        await send(C.MSG.STOP);
      } else {
        const res = await send(C.MSG.START, {
          settings: { strategy: el.strategy.value, dryRun: el.dryRun.checked },
        });
        if (res && !res.ok) {
          el.status.dataset.tone = "error";
          el.statusMessage.textContent = res.error;
          el.action.disabled = false;
          return;
        }
      }
    } catch (e) {
      el.status.dataset.tone = "error";
      el.statusMessage.textContent = String((e && e.message) || e);
    }
    await refresh();
  });

  // Persist the two inline controls so they survive a popup close.
  for (const control of [el.strategy, el.dryRun]) {
    control.addEventListener("change", async () => {
      const got = await chrome.storage.sync.get("settings");
      await chrome.storage.sync.set({
        settings: Object.assign({}, C.DEFAULT_SETTINGS, got.settings, {
          strategy: el.strategy.value,
          dryRun: el.dryRun.checked,
        }),
      });
    });
  }

  el.settings.addEventListener("click", () => chrome.runtime.openOptionsPage());

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === C.MSG.STATE) render(msg.state);
  });

  el.version.textContent = `Auto-Fill · v${chrome.runtime.getManifest().version}`;
  refresh();
  send(C.MSG.CHECK_UPDATE).then((r) => r && renderUpdate(r.update)).catch(() => {});
})();
