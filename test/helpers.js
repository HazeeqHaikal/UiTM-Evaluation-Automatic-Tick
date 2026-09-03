const { JSDOM } = require("jsdom");

/** Load survey-core against a fresh jsdom window. */
function loadCore(html, url) {
  const dom = new JSDOM(html, { url: url || "https://ufuture.uitm.edu.my/ess/answers/entry/99" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.UiTMConst = require("../src/constants.js");
  delete require.cache[require.resolve("../src/survey-core.js")];
  const Core = require("../src/survey-core.js");
  return { dom, doc: dom.window.document, Core };
}

/** A Likert questionnaire: `count` questions, `scale` options each. */
function likert(count, scale, opts) {
  const o = opts || {};
  const order = o.descending
    ? Array.from({ length: scale }, (_, i) => scale - i)
    : Array.from({ length: scale }, (_, i) => i + 1);

  const questions = Array.from({ length: count }, (_, q) => {
    const inputs = order
      .map((v) => `<label><input type="radio" name="q${q}" value="${v}"> ${v}</label>`)
      .join("");
    return `<div class="question"><p>Question ${q + 1}</p>${inputs}</div>`;
  }).join("");

  return `<form>${questions}${o.extra || ""}<button type="button">${o.submitText || "Submit"}</button></form>`;
}

module.exports = { loadCore, likert };
