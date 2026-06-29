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
