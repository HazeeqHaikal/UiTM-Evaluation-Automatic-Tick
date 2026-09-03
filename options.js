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
      updateDetail.textContent = fields.checkUpdates.checked
        ? ""
        : "Turn the check on above to compare against the latest release.";
      return;
    }
    if (info.needsPermission) {
      updateState.textContent = "Permission needed";
      updateDetail.textContent =
        "Switch the check off and on again to grant access to GitHub.";
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

  /**
   * Turning the update check on asks for the api.github.com origin. It is
   * optional so that installing this version never forces existing users to
   * re-approve the extension. Must run from the user gesture, so it is wired
   * directly to the change event.
   */
  async function onCheckUpdatesToggle() {
    if (fields.checkUpdates.checked) {
      let granted = false;
      try {
        granted = await chrome.permissions.request({ origins: [C.GITHUB_ORIGIN] });
      } catch {
        granted = false;
      }
      if (!granted) {
        fields.checkUpdates.checked = false;
        updateState.textContent = "Permission declined";
        updateDetail.textContent =
          "The check needs access to GitHub's public releases endpoint. Nothing else changed.";
        await save();
        return;
      }
    } else {
      try {
        await chrome.permissions.remove({ origins: [C.GITHUB_ORIGIN] });
      } catch { /* already gone */ }
    }
    await save();
    const res = await chrome.runtime.sendMessage({ type: C.MSG.CHECK_UPDATE });
    renderUpdate(res && res.update);
  }

  for (const [name, field] of Object.entries(fields)) {
    field.addEventListener("change", name === "checkUpdates" ? onCheckUpdatesToggle : save);
  }

  checkNow.addEventListener("click", async () => {
    checkNow.disabled = true;
    updateState.textContent = "Checking…";
    updateDetail.textContent = "";
    try {
      if (!fields.checkUpdates.checked) {
        updateState.textContent = "Check is switched off";
        updateDetail.textContent = "Turn it on above to check for new versions.";
        return;
      }
      const res = await chrome.runtime.sendMessage({ type: C.MSG.CHECK_UPDATE });
      renderUpdate(res && res.update);
    } finally {
      checkNow.disabled = false;
    }
  });

  load();
})();
