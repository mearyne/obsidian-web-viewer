const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

test("document mindmap view has a status toggle and render path", () => {
  assert.match(html, /id="documentMindmapToggleButton"/);
  assert.match(app, /function toggleDocumentMindmapMode\(\)/);
  assert.match(app, /function renderDocumentMindmapPreview\(\)/);
  assert.match(app, /MINDMAP_MARKDOWN_RULES\.markdownToMindmapData\(state\.currentContent\)/);
});

test("document mindmap view is limited to rendered markdown notes", () => {
  assert.match(app, /function canShowDocumentMindmapView\(\)/);
  assert.match(app, /state\.markdownEnabled/);
  assert.match(app, /isMarkdownDocument\(state\.currentPath \|\| ""\)/);
  assert.match(app, /!isMindmapDocument\(state\.currentContent\)/);
});
