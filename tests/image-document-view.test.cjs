const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("image files are openable documents", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const body = app.match(/function isOpenableDocument\(name\)[\s\S]*?\n}/)?.[0] || "";
  assert.match(app, /function isImageDocument\(name\)/);
  assert.match(body, /isImageDocument\(name\)/);
});

test("opening image files skips text reads and renders an image view", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const openBody = app.match(/async function openFile\(path,[\s\S]*?\n}\r?\n\r?\nfunction showDocumentOpenStep/)?.[0] || "";
  const renderBody = app.match(/function renderCurrentDocument\(showOpenStep = null, diagnostics = null\)[\s\S]*?\n}\r?\n\r?\nfunction renderImageDocument/)?.[0] || "";
  assert.match(openBody, /isImageDocument\(node\.name \|\| path\) \? "" : await readFileNode\(node\)/);
  assert.match(app, /function renderImageDocument\(path\)/);
  assert.match(renderBody, /isImageDocument\(state\.currentPath \|\| ""\)/);
  assert.match(renderBody, /renderImageDocument\(state\.currentPath \|\| ""\)/);
});
