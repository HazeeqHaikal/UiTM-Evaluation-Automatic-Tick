/**
 * Content script: reports what the page is, and does exactly what the service
 * worker tells it to. It never decides where to navigate.
 */
(function () {
  "use strict";

  const C = globalThis.UiTMConst;
  const Core = globalThis.SurveyCore;
  if (!C || !Core) return;

  // The worker injects this file when a tab predates the extension being
  // loaded. Content scripts share one isolated world, so without this guard
  // that tab would end up with two listeners and fill the page twice.
  if (globalThis.__uitmAutoFillLoaded) return;
  globalThis.__uitmAutoFillLoaded = true;

  let busy = false;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function report(type, payload) {
    return chrome.runtime.sendMessage(Object.assign({ type }, payload)).catch(() => null);
  }

  /** Wait until the questionnaire has actually rendered and stopped growing. */
  async function waitForContent(timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 8000);
    let last = -1;
    let stable = 0;
    while (Date.now() < deadline) {
      const count =
        document.querySelectorAll("input[type='radio'], select, a[href]").length;
      if (count > 0 && count === last) {
        if (++stable >= 2) return true;
      } else {
        stable = 0;
      }
      last = count;
      await sleep(250);
    }
    return false;
  }

  async function doScan(currentUrl) {
    await waitForContent(8000);
    const links = Core.scanLinks(document, currentUrl);
    await report(C.MSG.SCAN_RESULT, { links });
  }

  /**
   * After submitting, the site normally navigates. If we are still here with a
   * live submit button, the submission did not take — say so rather than
   * letting the watchdog burn 45 seconds.
   */
  async function watchForStall(hrefBefore) {
    const deadline = Date.now() + 9000;
    while (Date.now() < deadline) {
      await sleep(700);
      if (location.href !== hrefBefore) return;
      const confirm = Core.findConfirmButton(document);
      if (confirm) {
        confirm.click();
        await sleep(1200);
      }
    }
    if (location.href === hrefBefore && Core.findSubmitButton(document)) {
      const check = Core.verify(document);
      const names = check.missing.slice(0, 3).map((m) => m.name).join(", ");
      await report(C.MSG.SUBMIT_STALLED, {
        detail: check.ok
          ? "the page did not respond to submit"
          : `the page rejected it (${check.answered}/${check.total} answered${names ? `, missing ${names}` : ""})`,
      });
    }
  }

  async function doFill(cmd) {
    await waitForContent(8000);

    const filled = Core.fill(document, {
      strategy: cmd.strategy,
      surveyType: cmd.surveyType,
      dryRun: cmd.dryRun,
    });

    // Verification runs against the live DOM, so a click the page silently
    // refused shows up here instead of turning into a blind submit.
    const check = cmd.dryRun
      ? { ok: filled.filled > 0, total: filled.filled, answered: filled.filled, missing: [] }
      : Core.verify(document);

    await report(C.MSG.FILL_RESULT, {
      result: {
        ok: check.ok,
        total: check.total,
        answered: check.answered,
        missing: check.missing,
        picks: filled.picks,
        dryRun: Boolean(cmd.dryRun),
      },
    });

    if (!check.ok || cmd.dryRun || !cmd.autoSubmit) return;

    await sleep(300);
    const submit = Core.findSubmitButton(document);
    if (!submit) {
      await report(C.MSG.SUBMIT_STALLED, { detail: "no submit button found" });
      return;
    }

    const hrefBefore = location.href;
    submit.click();
    await report(C.MSG.SUBMIT_CLICKED, {});

    // ufuture puts a confirmation modal in front of some submissions.
    await sleep(600);
    const confirmBtn = Core.findConfirmButton(document);
    if (confirmBtn) confirmBtn.click();

    await watchForStall(hrefBefore);
  }

  async function execute(cmd, currentUrl) {
    if (!cmd || cmd.action === C.MSG.DO_NOTHING) return;
    if (busy) return;
    busy = true;
    try {
      if (cmd.action === C.MSG.DO_SCAN) await doScan(currentUrl);
      else if (cmd.action === C.MSG.DO_FILL) await doFill(cmd);
    } catch (e) {
      await report(C.MSG.CONTENT_ERROR, { message: String((e && e.message) || e) });
    } finally {
      busy = false;
    }
  }

  // Direct commands (used when a run starts on the page already open).
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.action) return;
    execute(msg, location.href);
    sendResponse({ ok: true });
    return true;
  });

  // Announce ourselves; the worker replies with what to do, if anything.
  async function announce() {
    if (!Core.classifyUrl(location.href)) return;
    const cmd = await chrome.runtime
      .sendMessage({ type: C.MSG.PAGE_READY, url: location.href })
      .catch(() => null);
    await execute(cmd, location.href);
  }

  announce();
})();
