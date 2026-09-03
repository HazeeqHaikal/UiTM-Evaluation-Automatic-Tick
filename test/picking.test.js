const test = require("node:test");
const assert = require("node:assert");
const { loadCore, likert } = require("./helpers.js");

test("exit surveys take the highest value even when options render descending", () => {
  // v2 clicked every radio and let the last one in the DOM win, which silently
  // produced the *lowest* score on any descending scale.
  const { doc, Core } = loadCore(likert(3, 5, { descending: true }));
  Core.fill(doc, { strategy: "realistic", surveyType: "exit" });

  for (const name of ["q0", "q1", "q2"]) {
    const checked = doc.querySelector(`input[name="${name}"]:checked`);
    assert.equal(checked.value, "5", `${name} should take the top of the scale`);
  }
});

test("exit surveys take the highest value on an ascending scale too", () => {
  const { doc, Core } = loadCore(likert(2, 5));
  Core.fill(doc, { strategy: "realistic", surveyType: "exit" });
  assert.equal(doc.querySelector('input[name="q0"]:checked').value, "5");
});

test("entrance and KIFO surveys take the lowest value", () => {
  for (const type of ["entrance", "kifo"]) {
    const { doc, Core } = loadCore(likert(2, 5, { descending: true }));
    Core.fill(doc, { strategy: "realistic", surveyType: type });
    assert.equal(doc.querySelector('input[name="q0"]:checked').value, "1", type);
  }
});

test("non-numeric options are answered by position instead of skipped", () => {
  // v2 ran parseInt over the value and bailed on NaN, leaving yes/no questions
  // blank and then submitting anyway.
  const html = `<form>
    <label><input type="radio" name="q0" value="no"> No</label>
    <label><input type="radio" name="q0" value="yes"> Yes</label>
    <button type="button">Submit</button></form>`;
  const { doc, Core } = loadCore(html);
  Core.fill(doc, { strategy: "realistic", surveyType: "exit" });
  assert.equal(doc.querySelector("input:checked").value, "yes");
  assert.ok(Core.verify(doc).ok);
});

test("database-style option ids fall back to DOM order rather than value", () => {
  const html = `<form>
    <label><input type="radio" name="q0" value="4071"> Poor</label>
    <label><input type="radio" name="q0" value="4072"> Fair</label>
    <label><input type="radio" name="q0" value="4073"> Excellent</label>
    <button type="button">Submit</button></form>`;
  const { doc, Core } = loadCore(html);
  Core.fill(doc, { strategy: "realistic", surveyType: "exit" });
  assert.equal(doc.querySelector("input:checked").value, "4073");
});

test("neutral picks the middle of the scale", () => {
  const { doc, Core } = loadCore(likert(1, 5));
  Core.fill(doc, { strategy: "neutral", surveyType: "exit" });
  assert.equal(doc.querySelector("input:checked").value, "3");
});

test("explicit strategies override the survey type", () => {
  const { doc, Core } = loadCore(likert(1, 5));
  Core.fill(doc, { strategy: "lowest", surveyType: "exit" });
  assert.equal(doc.querySelector("input:checked").value, "1");
});

test("preview mode changes nothing on the page", () => {
  const { doc, Core } = loadCore(likert(4, 5));
  const result = Core.fill(doc, { strategy: "realistic", surveyType: "exit", dryRun: true });
  assert.equal(result.filled, 4);
  assert.equal(doc.querySelectorAll("input:checked").length, 0);
});

test("disabled inputs are left alone", () => {
  const html = `<form>
    <label><input type="radio" name="q0" value="1" disabled> 1</label>
    <label><input type="radio" name="q0" value="2" disabled> 2</label>
    <button type="button">Submit</button></form>`;
  const { doc, Core } = loadCore(html);
  const result = Core.fill(doc, { strategy: "realistic", surveyType: "exit" });
  assert.equal(result.filled, 0);
});
