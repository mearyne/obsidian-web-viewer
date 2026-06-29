const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

function functionSlice(name, nextName) {
  const start = Math.max(app.indexOf(`function ${name}()`), app.indexOf(`async function ${name}()`));
  const end = nextName ? Math.max(app.indexOf(`function ${nextName}()`, start), app.indexOf(`async function ${nextName}()`, start)) : -1;
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
  const renderBody = functionSlice("renderMindmapMarkdownPreview", "clearMindmapShell");
  assert.match(app, /data-command="convert-current-mindmap-to-md"/);
  assert.match(app, /async function convertCurrentMindmapToMarkdown\(\)/);
  assert.match(app, /MINDMAP_MARKDOWN_RULES\.mindmapDataToMarkdown/);
  assert.match(app, /renderMarkdown\(markdown/);
  assert.match(renderBody, /displayDocumentTitle\(state\.currentNode\?\.name \|\| state\.currentPath \|\| "Mindmap"\)/);
  assert.match(body, /createTab\(path, \{ mindmapMarkdownPreviewEnabled: true \}\)/);
  assert.doesNotMatch(app, /writeNodeContent\(state\.currentNode,\s*markdown/);
});

test("mindmap markdown conversion is tab scoped and re-renders immediately", () => {
  const body = functionSlice("convertCurrentMindmapToMarkdown", "updateDocumentMindmapToggleButton");
  assert.match(body, /createTab\(path, \{ mindmapMarkdownPreviewEnabled: true \}\)/);
  assert.match(body, /await renderActiveTabFile\(\)/);
});

test("refresh restores mindmap files in mindmap view unless tab requested markdown preview", () => {
  assert.match(app, /function clearConversionPreviewFlags\(tab\)/);
  assert.match(app, /if \(isMindmapDocument\(content\) && !state\.mindmapMarkdownPreviewEnabled\)/);
  assert.match(app, /clearConversionPreviewFlags\(curTab\)/);
});

test("opening a document restores conversion preview flags from the active tab", () => {
  assert.match(app, /async function openFile\(path, \{ preserveTabView = false \} = \{\}\)/);
  assert.match(app, /state\.documentMindmapEnabled = Boolean\(preserveTabView && curTab\?\.path === path && curTab\.documentMindmapEnabled\)/);
  assert.match(app, /state\.mindmapMarkdownPreviewEnabled = Boolean\(preserveTabView && curTab\?\.path === path && curTab\.mindmapMarkdownPreviewEnabled\)/);
  assert.match(app, /await openFile\(tab\.path, \{ preserveTabView: true \}\)/);
  assert.match(app, /documentMindmapEnabled: Boolean\(t\.documentMindmapEnabled\)/);
  assert.match(app, /mindmapMarkdownPreviewEnabled: Boolean\(t\.mindmapMarkdownPreviewEnabled\)/);
  assert.match(app, /documentMindmapEnabled: Boolean\(t\?\.documentMindmapEnabled\)/);
  assert.match(app, /mindmapMarkdownPreviewEnabled: Boolean\(t\?\.mindmapMarkdownPreviewEnabled\)/);
});

test("opening a document keeps one active tab binding to avoid temporal dead zone crashes", () => {
  const start = app.indexOf("async function openFile(");
  const end = app.indexOf("function showDocumentOpenStep(", start);
  assert.notEqual(start, -1, "openFile function exists");
  assert.notEqual(end, -1, "showDocumentOpenStep follows openFile");
  const body = app.slice(start, end);
  assert.equal((body.match(/const curTab = activeTab\(\);/g) || []).length, 1);
});

test("opening an existing document from a link clears conversion preview flags", () => {
  assert.match(app, /async function switchTab\(id, \{ preserveTabView = true \} = \{\}\)/);
  assert.match(app, /await openFile\(tab\.path, \{ preserveTabView \}\)/);
  assert.match(app, /await switchTab\(existingTab\.id, \{ preserveTabView: false \}\)/);
});
