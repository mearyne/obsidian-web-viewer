const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

function functionSlice(name, nextName) {
  const start = app.indexOf(`function ${name}()`);
  const end = nextName ? app.indexOf(`function ${nextName}()`, start) : -1;
  assert.notEqual(start, -1, `${name} function exists`);
  return app.slice(start, end === -1 ? undefined : end);
}

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

test("command palette can show markdown notes as mindmaps without changing the file", () => {
  const body = functionSlice("viewCurrentMarkdownAsMindmap", "canShowMindmapMarkdownPreview");
  assert.match(app, /data-command="view-current-as-mindmap"/);
  assert.match(app, /function viewCurrentMarkdownAsMindmap\(\)/);
  assert.match(body, /state\.documentMindmapEnabled = true/);
  assert.doesNotMatch(body, /createTab/);
});

test("command palette can convert the current mindmap to markdown without replacing mindmap data", () => {
  const body = functionSlice("convertCurrentMindmapToMarkdown", "updateDocumentMindmapToggleButton");
  assert.match(app, /data-command="convert-current-mindmap-to-md"/);
  assert.match(app, /function convertCurrentMindmapToMarkdown\(\)/);
  assert.match(app, /MINDMAP_MARKDOWN_RULES\.mindmapDataToMarkdown/);
  assert.match(app, /renderMarkdown\(markdown/);
  assert.doesNotMatch(body, /createTab/);
  assert.doesNotMatch(app, /writeNodeContent\(state\.currentNode,\s*markdown/);
});

test("opening a document restores conversion preview flags from the active tab", () => {
  assert.match(app, /state\.documentMindmapEnabled = Boolean\(curTab\?\.path === path && curTab\.documentMindmapEnabled\)/);
  assert.match(app, /state\.mindmapMarkdownPreviewEnabled = Boolean\(curTab\?\.path === path && curTab\.mindmapMarkdownPreviewEnabled\)/);
  assert.match(app, /documentMindmapEnabled: Boolean\(t\.documentMindmapEnabled\)/);
  assert.match(app, /mindmapMarkdownPreviewEnabled: Boolean\(t\.mindmapMarkdownPreviewEnabled\)/);
  assert.match(app, /documentMindmapEnabled: Boolean\(t\?\.documentMindmapEnabled\)/);
  assert.match(app, /mindmapMarkdownPreviewEnabled: Boolean\(t\?\.mindmapMarkdownPreviewEnabled\)/);
});
