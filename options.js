/** Settings page. Writes chrome.storage.sync; the worker reads it on start. */
(function () {
  "use strict";

  const C = globalThis.UiTMConst;
  const KEY = "settings";

  const fields = {
    strategy: document.getElementById("strategy"),
    autoSubmit: document.getElementById("autoSubmit"),
    dryRun: document.getElementById("dryRun"),
    checkUpdates: document.getElementById("checkUpdates"),
  };
  const savedNote = document.getElementById("saved");
  const updateState = document.getElementById("update-state");
  const updateDetail = document.getElementById("update-detail");
  const checkNow = document.getElementById("check-now");

  let savedTimer = null;
  function flashSaved() {
    savedNote.hidden = false;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { savedNote.hidden = true; }, 1600);
  }

  async function load() {
    const got = await chrome.storage.sync.get(KEY);
    const settings = Object.assign({}, C.DEFAULT_SETTINGS, got[KEY] || {});
    fields.strategy.value = settings.strategy;
    fields.autoSubmit.checked = settings.autoSubmit;
    fields.dryRun.checked = settings.dryRun;
    fields.checkUpdates.checked = settings.checkUpdates;

    const stored = await chrome.storage.local.get("updateInfo");
    renderUpdate(stored.updateInfo);
  }

  async function save() {
    await chrome.storage.sync.set({
      [KEY]: {
        strategy: fields.strategy.value,
        autoSubmit: fields.autoSubmit.checked,
        dryRun: fields.dryRun.checked,
        checkUpdates: fields.checkUpdates.checked,
      },
    });
    flashSaved();
  }

  function renderUpdate(info) {
    const current = chrome.runtime.getManifest().version;
    document.getElementById("version").textContent = `Version ${current}`;

    if (!info) {
      updateState.textContent = "Not checked yet";
      updateDetail.textContent = "";
      return;
    }
    if (info.error) {
      updateState.textContent = "Could not reach GitHub";
      updateDetail.textContent = info.error;
      return;
    }
    if (info.outdated) {
      updateState.textContent = `Version ${info.latest} is available`;
      updateDetail.textContent =
        "Store installs update on their own. Unpacked installs need a manual pull.";
      return;
    }
    updateState.textContent = "Up to date";
    updateDetail.textContent = info.checkedAt
      ? `Last checked ${new Date(info.checkedAt).toLocaleString()}`
      : "";
  }

  for (const field of Object.values(fields)) field.addEventListener("change", save);

  checkNow.addEventListener("click", async () => {
    checkNow.disabled = true;
    updateState.textContent = "Checking…";
    updateDetail.textContent = "";
    try {
      const res = await chrome.runtime.sendMessage({ type: C.MSG.CHECK_UPDATE });
      renderUpdate(res && res.update);
    } finally {
      checkNow.disabled = false;
    }
  });

  load();
})();
