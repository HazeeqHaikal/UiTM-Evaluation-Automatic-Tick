/**
 * Survey detection, answer selection and verification.
 *
 * Everything here is a pure function of a DOM subtree so it can be exercised
 * under jsdom in test/. Nothing in this file talks to chrome.* APIs.
 */
(function (global) {
  "use strict";

  const C = global.UiTMConst || require("./constants.js");

  // ---------------------------------------------------------------- URLs ---

  function normalizeUrl(url) {
    if (!url || typeof url !== "string") return "";
    try {
      const u = new URL(url, C.ORIGIN);
      let path = u.pathname.replace(/\/+$/, "");
      return (u.origin + path + u.search).toLowerCase();
    } catch {
      return String(url).trim().replace(/\/+$/, "").toLowerCase();
    }
  }

  function sameTarget(a, b) {
    return normalizeUrl(a) === normalizeUrl(b);
  }

  function classifyUrl(url) {
    const norm = normalizeUrl(url);
    if (!norm.startsWith(C.ORIGIN.toLowerCase())) return null;
    for (const p of C.SURVEY_PATTERNS) {
      if (norm.includes(p.match)) {
        return { kind: "survey", type: p.type, label: p.label };
      }
    }
    for (const h of C.HUB_PATTERNS) {
      if (norm.includes(h.match)) {
        return { kind: "hub", type: "hub", label: h.label };
      }
    }
    return null;
  }

  // ------------------------------------------------------------ scanning ---

  /**
   * Collect survey and hub links from a listing page.
   *
   * Deliberately matches on the href pattern rather than the link text: the
   * ufuture UI ships in both English and Malay, so keying off "Answer" made the
   * scanner report zero surveys on a Malay interface.
   */
  function scanLinks(root, currentUrl) {
    const doc = root.ownerDocument || root;
    const anchors = Array.from(root.querySelectorAll("a[href]"));
    const seen = new Set();
    const found = [];

    for (const a of anchors) {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || /^javascript:/i.test(href)) continue;

      let abs;
      try {
        abs = new URL(href, currentUrl || (doc.location && doc.location.href) || C.ORIGIN).href;
      } catch {
        continue;
      }

      const info = classifyUrl(abs);
      if (!info) continue;

      // Never re-enqueue the page we are standing on.
      if (sameTarget(abs, currentUrl)) continue;

      const key = normalizeUrl(abs);
      if (seen.has(key)) continue;
      seen.add(key);

      found.push({
        url: abs,
        kind: info.kind,
        type: info.type,
        label: (a.textContent || "").trim().slice(0, 80) || info.label,
      });
    }
    return found;
  }

  // ------------------------------------------------------------- ranking ---

  /**
   * Order a group of options low-to-high.
   *
   * Prefers the numeric `value` when it looks like a Likert scale (distinct,
   * 0..10). Otherwise falls back to DOM order, which keeps groups with
   * non-numeric values (yes/no, option ids) fillable instead of skipped.
   */
  function rankOptions(values) {
    const nums = values.map((v) => Number.parseFloat(String(v == null ? "" : v).trim()));
    const allFinite = nums.every((n) => Number.isFinite(n));
    if (allFinite) {
      const distinct = new Set(nums).size === nums.length;
      const min = Math.min.apply(null, nums);
      const max = Math.max.apply(null, nums);
      if (distinct && min >= 0 && max <= 10) {
        return { by: "value", ranks: nums };
      }
    }
    return { by: "dom", ranks: values.map((_, i) => i) };
  }

  function polarityFor(strategy, surveyType) {
    if (strategy === C.STRATEGY.HIGHEST) return "highest";
    if (strategy === C.STRATEGY.LOWEST) return "lowest";
    if (strategy === C.STRATEGY.NEUTRAL) return "neutral";
    return C.REALISTIC_POLARITY[surveyType] || "neutral";
  }

  /** Index of the option to select, given raw option values. */
  function pickIndex(values, strategy, surveyType) {
    if (!values.length) return -1;
    const { ranks } = rankOptions(values);
    const polarity = polarityFor(strategy, surveyType);

    let best = 0;
    if (polarity === "lowest") {
      for (let i = 1; i < ranks.length; i++) if (ranks[i] < ranks[best]) best = i;
    } else if (polarity === "highest") {
      for (let i = 1; i < ranks.length; i++) if (ranks[i] > ranks[best]) best = i;
    } else {
      const min = Math.min.apply(null, ranks);
      const max = Math.max.apply(null, ranks);
      const mid = (min + max) / 2;
      let bestDist = Infinity;
      for (let i = 0; i < ranks.length; i++) {
        // Ties resolve upward, so an even-length scale leans mildly positive.
        const dist = Math.abs(ranks[i] - mid);
        if (dist <= bestDist) {
          bestDist = dist;
          best = i;
        }
      }
    }
    return best;
  }

  // ------------------------------------------------------------ analysis ---

  function isUsable(el) {
    if (!el || el.disabled) return false;
    if (el.type === "hidden") return false;
    return true;
  }

  /**
   * Inventory every answerable control on the page, grouped the way a human
   * would count questions.
   */
  function analyze(root) {
    const radioGroups = new Map();
    for (const el of root.querySelectorAll("input[type='radio']")) {
      if (!isUsable(el)) continue;
      const name = el.name || el.getAttribute("name") || "";
      if (!name) continue;
      if (!radioGroups.has(name)) radioGroups.set(name, []);
      radioGroups.get(name).push(el);
    }

    const groups = Array.from(radioGroups.entries()).map(([name, inputs]) => ({
      name,
      inputs,
      answered: inputs.some((i) => i.checked),
    }));

    const selects = Array.from(root.querySelectorAll("select"))
      .filter(isUsable)
      .map((el) => ({
        el,
        name: el.name || el.id || "select",
        // A select whose current option has no value is still unanswered.
        answered: Boolean(el.value && String(el.value).trim()),
      }));

    // Only *required* free-text blocks a submit. Optional comment boxes are
    // left alone on purpose: this tool does not invent prose on your behalf.
    const textareas = Array.from(root.querySelectorAll("textarea"))
      .filter((el) => isUsable(el) && el.required)
      .map((el) => ({
        el,
        name: el.name || el.id || "textarea",
        answered: Boolean(el.value && el.value.trim()),
      }));

    return { groups, selects, textareas };
  }

  function setChecked(el) {
    el.click();
    if (!el.checked) {
      // Something intercepted the click (custom widget, overlay). Force the
      // value and announce it so framework listeners still see the change.
      el.checked = true;
      el.dispatchEvent(new el.ownerDocument.defaultView.Event("input", { bubbles: true }));
      el.dispatchEvent(new el.ownerDocument.defaultView.Event("change", { bubbles: true }));
    }
    return el.checked;
  }

  function setSelect(el, index) {
    const options = Array.from(el.options).filter((o) => String(o.value).trim() !== "");
    if (!options.length) return false;
    const target = options[Math.min(index, options.length - 1)];
    el.value = target.value;
    const W = el.ownerDocument.defaultView;
    el.dispatchEvent(new W.Event("input", { bubbles: true }));
    el.dispatchEvent(new W.Event("change", { bubbles: true }));
    return Boolean(el.value);
  }

  /**
   * Fill every question. Returns what was touched; does not submit.
   * `dryRun` reports the same shape without mutating the page.
   */
  function fill(root, options) {
    const opts = options || {};
    const strategy = opts.strategy || C.STRATEGY.REALISTIC;
    const surveyType = opts.surveyType || "entrance";
    const dryRun = Boolean(opts.dryRun);

    const inventory = analyze(root);
    const picks = [];

    for (const group of inventory.groups) {
      const values = group.inputs.map((i) => i.value);
      const idx = pickIndex(values, strategy, surveyType);
      if (idx < 0) continue;
      const chosen = group.inputs[idx];
      picks.push({ question: group.name, value: chosen.value, index: idx });
      if (!dryRun) setChecked(chosen);
    }

    for (const sel of inventory.selects) {
      const usable = Array.from(sel.el.options).filter((o) => String(o.value).trim() !== "");
      if (!usable.length) continue;
      const idx = pickIndex(usable.map((o) => o.value), strategy, surveyType);
      if (idx < 0) continue;
      picks.push({ question: sel.name, value: usable[idx].value, index: idx });
      if (!dryRun) setSelect(sel.el, idx);
    }

    return { picks, filled: picks.length, dryRun };
  }

  /** Re-inspect the page and report whether it is safe to submit. */
  function verify(root) {
    const { groups, selects, textareas } = analyze(root);
    const all = [
      ...groups.map((g) => ({ name: g.name, answered: g.answered, kind: "radio" })),
      ...selects.map((s) => ({ name: s.name, answered: s.answered, kind: "select" })),
      ...textareas.map((t) => ({ name: t.name, answered: t.answered, kind: "textarea" })),
    ];
    const missing = all.filter((q) => !q.answered);
    return {
      ok: all.length > 0 && missing.length === 0,
      total: all.length,
      answered: all.length - missing.length,
      missing: missing.map((m) => ({ name: m.name, kind: m.kind })),
    };
  }

  // -------------------------------------------------------------- submit ---

  const SUBMIT_TEXT = /^(submit|hantar|simpan|save)\b/i;
  const CONFIRM_TEXT = /^(ok|okay|yes|ya|confirm|sahkan|teruskan|proceed|hantar|submit)\b/i;

  function visibleText(el) {
    return (el.innerText || el.textContent || el.value || "").replace(/\s+/g, " ").trim();
  }

  function isVisible(el) {
    if (!el) return false;
    const W = el.ownerDocument && el.ownerDocument.defaultView;
    if (!W || !W.getComputedStyle) return true;
    const s = W.getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return false;
    return true;
  }

  function findSubmitButton(root) {
    const candidates = Array.from(
      root.querySelectorAll("button, input[type='submit'], input[type='button'], a.btn")
    );
    for (const el of candidates) {
      if (el.disabled || !isVisible(el)) continue;
      if (SUBMIT_TEXT.test(visibleText(el))) return el;
    }
    return null;
  }

  const DIALOG_SELECTORS = [
    ".swal2-confirm",
    ".swal-button--confirm",
    ".confirm",
    ".modal.show .btn-primary",
    ".modal.in .btn-primary",
    "[role='dialog'] .btn-primary",
  ];

  /** The confirmation control of whatever modal appeared after submitting. */
  function findConfirmButton(root) {
    for (const sel of DIALOG_SELECTORS) {
      const el = root.querySelector(sel);
      if (el && !el.disabled && isVisible(el)) return el;
    }
    const dialogs = Array.from(root.querySelectorAll("[role='dialog'], .modal.show, .modal.in, .swal2-popup"));
    for (const dialog of dialogs) {
      if (!isVisible(dialog)) continue;
      for (const btn of dialog.querySelectorAll("button, input[type='button']")) {
        if (btn.disabled || !isVisible(btn)) continue;
        if (CONFIRM_TEXT.test(visibleText(btn))) return btn;
      }
    }
    return null;
  }

  const API = {
    normalizeUrl,
    sameTarget,
    classifyUrl,
    scanLinks,
    rankOptions,
    polarityFor,
    pickIndex,
    analyze,
    fill,
    verify,
    findSubmitButton,
    findConfirmButton,
    visibleText,
  };

  global.SurveyCore = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
