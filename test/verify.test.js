const test = require("node:test");
const assert = require("node:assert");
const { loadCore, likert } = require("./helpers.js");

test("a fully answered page verifies clean", () => {
  const { doc, Core } = loadCore(likert(6, 5));
  Core.fill(doc, { strategy: "realistic", surveyType: "exit" });
  const check = Core.verify(doc);
  assert.equal(check.ok, true);
  assert.equal(check.total, 6);
  assert.equal(check.answered, 6);
});

test("an unanswered question blocks submission and is named", () => {
  // v2 had no verification at all: it clicked Submit regardless.
  const { doc, Core } = loadCore(likert(3, 5));
  Core.fill(doc, { strategy: "realistic", surveyType: "exit" });
  doc.querySelector('input[name="q1"]:checked').checked = false;

  const check = Core.verify(doc);
  assert.equal(check.ok, false);
  assert.equal(check.answered, 2);
  assert.deepEqual(check.missing.map((m) => m.name), ["q1"]);
});

test("a required comment box counts as an unanswered question", () => {
  const extra = `<textarea name="comment" required></textarea>`;
  const { doc, Core } = loadCore(likert(2, 5, { extra }));
  Core.fill(doc, { strategy: "realistic", surveyType: "exit" });

  const check = Core.verify(doc);
  assert.equal(check.ok, false);
  assert.deepEqual(check.missing.map((m) => m.kind), ["textarea"]);
});

test("an optional comment box is left blank without blocking", () => {
  const extra = `<textarea name="comment"></textarea>`;
  const { doc, Core } = loadCore(likert(2, 5, { extra }));
  Core.fill(doc, { strategy: "realistic", surveyType: "exit" });

  assert.equal(Core.verify(doc).ok, true);
  assert.equal(doc.querySelector("textarea").value, "", "no invented prose");
});

test("dropdown questions are filled and verified", () => {
  const extra = `<select name="overall">
      <option value="">-- choose --</option>
      <option value="1">Poor</option>
      <option value="5">Excellent</option>
    </select>`;
  const { doc, Core } = loadCore(likert(1, 5, { extra }));
  Core.fill(doc, { strategy: "realistic", surveyType: "exit" });

  assert.equal(doc.querySelector("select").value, "5");
  assert.equal(Core.verify(doc).ok, true);
});

test("an empty page never reports as ready to submit", () => {
  const { doc, Core } = loadCore(`<div><p>Nothing here.</p></div>`);
  assert.equal(Core.verify(doc).ok, false);
});

test("a click intercepted by the page still registers via events", () => {
  const { dom, doc, Core } = loadCore(likert(1, 3));
  const target = doc.querySelector('input[name="q0"][value="3"]');
  // Simulate a widget that swallows the click.
  target.addEventListener("click", (e) => e.preventDefault(), true);

  let changes = 0;
  target.addEventListener("change", () => { changes += 1; });

  Core.fill(doc, { strategy: "realistic", surveyType: "exit" });
  assert.equal(target.checked, true);
  assert.ok(changes >= 1, "a change event must reach page listeners");
  dom.window.close();
});

test("submit buttons are found in English and Malay", () => {
  for (const text of ["Submit", "SUBMIT", "Hantar", "Hantar Jawapan", "Simpan"]) {
    const { doc, Core } = loadCore(likert(1, 5, { submitText: text }));
    assert.ok(Core.findSubmitButton(doc), `should match "${text}"`);
  }
});

test("a disabled submit button is not treated as clickable", () => {
  const html = `<form><button type="button" disabled>Submit</button></form>`;
  const { doc, Core } = loadCore(html);
  assert.equal(Core.findSubmitButton(doc), null);
});

test("a confirmation modal's confirm button is located", () => {
  const html = `<div class="swal2-popup" role="dialog">
      <button class="swal2-confirm">Yes, submit</button>
      <button class="swal2-cancel">Cancel</button>
    </div>`;
  const { doc, Core } = loadCore(html);
  const btn = Core.findConfirmButton(doc);
  assert.ok(btn);
  assert.equal(btn.className, "swal2-confirm");
});

test("a Malay confirmation modal is located by button text", () => {
  const html = `<div class="modal show" role="dialog">
      <button class="btn btn-secondary">Batal</button>
      <button class="btn btn-success">Ya, hantar</button>
    </div>`;
  const { doc, Core } = loadCore(html);
  assert.ok(Core.findConfirmButton(doc));
});
