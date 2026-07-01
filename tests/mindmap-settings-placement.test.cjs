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

test("mindmap theme selectors are filtered by light and dark mode", () => {
  assert.match(app, /function mindmapThemeMode/);
  assert.match(app, /function mindmapThemeOptionsForMode/);
  assert.match(app, /function currentMindmapThemeMode/);
  assert.match(app, /renderMindmapThemeOptions\(state\.mindmapOptions\.lightTheme, "light"\)/);
  assert.match(app, /renderMindmapThemeOptions\(state\.mindmapOptions\.darkTheme, "dark"\)/);
  assert.match(app, /renderMindmapThemeOptions\(selectedMindmapThemeName\(\), currentMindmapThemeMode\(\)\)/);
});

test("mindmap toolbar remains visible in light mode", () => {
  assert.match(app, /const toolbarModeClass = canEdit \? "mindmap-toolbar-panel--edit" : "mindmap-toolbar-panel--readonly"/);
  assert.match(app, /<details class="mindmap-toolbar-panel \$\{toolbarModeClass\}"/);
  assert.match(fs.readFileSync("styles.css", "utf8"), /\.mindmap-toolbar-panel--readonly/);
  assert.match(fs.readFileSync("styles.css", "utf8"), /\.mindmap-toolbar-toggle/);
});

test("mobile mindmap edit mode keeps the status bar visible", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  assert.match(app, /classList\.toggle\("mindmap-editing-mode"/);
  assert.match(styles, /\.editing-mode:not\(\.mindmap-editing-mode\) \.app-status-bar/);
  assert.match(styles, /\.editing-mode\.mindmap-editing-mode \.app-status-bar/);
});

test("mobile status bar exposes mindmap node edit actions", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  assert.match(app, /function ensureMobileMindmapStatusActions/);
  assert.match(app, /data-mindmap-status-action/);
  assert.match(app, /runMindmapToolbarAction\(button\.dataset\.mindmapStatusAction\)/);
  assert.match(app, /"insert-child",\s*"자식 추가"/);
  assert.match(app, /"insert-sibling",\s*"형제 추가"/);
  assert.match(app, /"remove-node",\s*"삭제"/);
  assert.match(styles, /\.mobile-mindmap-status-actions/);
  assert.match(styles, /\.editing-mode\.mindmap-editing-mode \.mobile-mindmap-status-actions/);
});

test("mindmap edit input uses the same node box variables", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const inputRule = styles.match(/\.mindmap-canvas input \{[\s\S]*?\}/)?.[0] || "";
  assert.match(inputRule, /background: var\(--mindmap-node-bg\)/);
  assert.match(inputRule, /border: 1px solid var\(--mindmap-node-border\)/);
  assert.match(inputRule, /color: var\(--mindmap-node-text\)/);
});

test("mindmap rich text editor uses the same node box variables", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const editRule = styles.match(/\.mindmap-canvas \.smm-node-edit-wrap,[\s\S]*?\.mindmap-canvas \.smm-richtext-node-edit-wrap \.ql-editor \{[\s\S]*?\}/)?.[0] || "";
  assert.match(editRule, /background: var\(--mindmap-node-bg\)/);
  assert.match(editRule, /border: 1px solid var\(--mindmap-node-border\)/);
  assert.match(editRule, /color: var\(--mindmap-node-text\)/);
});

test("mindmap edit overlays are attached inside the themed canvas", () => {
  assert.match(app, /customInnerElsAppendTo: canvas/);
});
