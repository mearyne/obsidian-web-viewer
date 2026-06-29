const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const app = fs.readFileSync("app.js", "utf8");

test("mindmap settings live in the tools drawer instead of the options menu", () => {
  assert.doesNotMatch(app, /ensureMindmapOptionsSection\(\);/);
  assert.doesNotMatch(app, /function ensureMindmapOptionsSection\(/);
  assert.match(app, /data-mindmap-options/);
  assert.match(app, /data-mindmap-light-theme-select/);
  assert.match(app, /data-mindmap-auto-fit/);
});

test("mindmap setting changes are saved through shared server settings", () => {
  assert.doesNotMatch(app, /function persistMindmapOptions\(/);
  assert.doesNotMatch(app, /obsidian-web-viewer-mindmap-layout", state\.mindmapOptions\.layout/);
  assert.match(app, /scheduleSettingsSave\(\);/);
  assert.match(app, /mindmapLayout: state\.mindmapOptions\.layout/);
});

test("mindmap base style is configurable and persisted", () => {
  assert.match(app, /MINDMAP_BASE_STYLE_OPTIONS/);
  assert.match(app, /mindmapBaseStyle: state\.mindmapOptions\.baseStyle/);
  assert.match(app, /data-mindmap-base-style-select/);
  assert.match(app, /applyMindmapBaseStyleToThemeConfig/);
});

test("inline mindmap theme changes are stored on the current mindmap document", () => {
  assert.match(app, /mindmapDocumentThemes: new Map\(\)/);
  assert.match(app, /syncMindmapDocumentTheme/);
  assert.match(app, /setMindmapDocumentTheme/);
  assert.match(app, /function buildMindmapFrontmatter\(frontmatter, layout = [^,]+, theme = /);
  assert.doesNotMatch(app, /\[field\]: normalizeMindmapThemeValue\(themeSelect\.value, selectedMindmapThemeName\(\)\)/);
});

test("mindmap toolbar remains visible in light mode", () => {
  assert.match(app, /const toolbarModeClass = canEdit \? "mindmap-toolbar-panel--edit" : "mindmap-toolbar-panel--readonly"/);
  assert.match(app, /<details class="mindmap-toolbar-panel \$\{toolbarModeClass\}"/);
  assert.match(fs.readFileSync("styles.css", "utf8"), /\.mindmap-toolbar-panel--readonly/);
  assert.match(fs.readFileSync("styles.css", "utf8"), /\.mindmap-toolbar-toggle/);
});

test("mindmap edit input uses the same node box variables", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const inputRule = styles.match(/\.mindmap-canvas input \{[\s\S]*?\}/)?.[0] || "";
  assert.match(inputRule, /background: var\(--mindmap-node-bg\)/);
  assert.match(inputRule, /border: 1px solid var\(--mindmap-node-border\)/);
  assert.match(inputRule, /color: var\(--mindmap-node-text\)/);
});
