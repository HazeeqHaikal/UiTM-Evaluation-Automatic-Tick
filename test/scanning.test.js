const test = require("node:test");
const assert = require("node:assert");
const { loadCore } = require("./helpers.js");

const DASH = "https://ufuture.uitm.edu.my/ess/dashboard/home";

test("survey and hub URLs are classified, everything else rejected", () => {
  const { Core } = loadCore("<div></div>");
  const cases = [
    ["https://ufuture.uitm.edu.my/ess/answers/entry/91", "survey", "entrance"],
    ["https://ufuture.uitm.edu.my/ess/answers/exits/91", "survey", "exit"],
    ["https://ufuture.uitm.edu.my/sufo/questions/index/12", "survey", "sufo"],
    ["https://ufuture.uitm.edu.my/kifo/questions/index/12", "survey", "kifo"],
    [DASH, "hub", "hub"],
    ["https://ufuture.uitm.edu.my/sufo/subject/index", "hub", "hub"],
  ];
  for (const [url, kind, type] of cases) {
    const info = Core.classifyUrl(url);
    assert.ok(info, url);
    assert.equal(info.kind, kind, url);
    assert.equal(info.type, type, url);
  }

  assert.equal(Core.classifyUrl("https://example.com/ess/answers/entry/1"), null);
  assert.equal(Core.classifyUrl("https://ufuture.uitm.edu.my/ess/profile"), null);
  assert.equal(Core.classifyUrl(""), null);
});

test("URL comparison survives trailing slashes and case", () => {
  // v2 compared with currentUrl.includes(queueUrl), so a trailing slash meant
  // the finished survey never left the queue and the run looped on it forever.
  const { Core } = loadCore("<div></div>");
  const a = "https://ufuture.uitm.edu.my/ess/answers/entry/91/";
  const b = "https://Ufuture.uitm.edu.my/ess/answers/entry/91";
  assert.ok(Core.sameTarget(a, b));
  assert.ok(!Core.sameTarget(a, "https://ufuture.uitm.edu.my/ess/answers/entry/92"));
});

test("the scanner finds surveys regardless of interface language", () => {
  // v2 required the link text to contain "answer", so a Malay UI reported
  // "no incomplete surveys found" and quietly did nothing.
  const html = `<table>
      <tr><td>BEL422</td><td><a href="/ess/answers/entry/11">Jawab</a></td></tr>
      <tr><td>CSC264</td><td><a href="/ess/answers/exits/12">Answer</a></td></tr>
      <tr><td>MAT183</td><td><a href="/ess/answers/entry/13"><i class="fa fa-pen"></i></a></td></tr>
      <tr><td>HBU111</td><td><a href="/ess/profile/view/9">Profile</a></td></tr>
    </table>`;
  const { doc, Core } = loadCore(html, DASH);
  const links = Core.scanLinks(doc, DASH);

  assert.equal(links.length, 3);
  assert.deepEqual(links.map((l) => l.type), ["entrance", "exit", "entrance"]);
  assert.ok(links.every((l) => l.url.startsWith("https://ufuture.uitm.edu.my/")));
});

test("SuFO and KIFO links are picked up alongside entrance and exit", () => {
  const html = `<div>
      <a href="/ess/answers/entry/11">Answer</a>
      <a href="/sufo/questions/index/55">SuFO</a>
      <a href="/kifo/questions/index/66">KIFO</a>
      <a href="/sufo/subject/index">All SuFO subjects</a>
    </div>`;
  const { doc, Core } = loadCore(html, DASH);
  const links = Core.scanLinks(doc, DASH);

  assert.deepEqual(links.map((l) => l.type).sort(), ["entrance", "hub", "kifo", "sufo"]);
  assert.equal(links.filter((l) => l.kind === "hub").length, 1);
});

test("duplicates, anchors and the current page are excluded", () => {
  const html = `<div>
      <a href="/ess/answers/entry/11">Answer</a>
      <a href="/ess/answers/entry/11/">Answer again</a>
      <a href="#top">Top</a>
      <a href="javascript:void(0)">Menu</a>
      <a href="/ess/dashboard/home">Home</a>
    </div>`;
  const { doc, Core } = loadCore(html, DASH);
  const links = Core.scanLinks(doc, DASH);

  assert.equal(links.length, 1, "one survey, no self-link, no duplicate");
  assert.equal(links[0].type, "entrance");
});

test("link text becomes the label when it is meaningful", () => {
  const html = `<a href="/ess/answers/exits/12">CSC264 Exit Survey</a>`;
  const { doc, Core } = loadCore(html, DASH);
  assert.equal(Core.scanLinks(doc, DASH)[0].label, "CSC264 Exit Survey");
});
