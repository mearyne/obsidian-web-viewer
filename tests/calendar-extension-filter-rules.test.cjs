const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

test("calendar extension exclude options are present in settings UI and state", () => {
  assert.match(html, /id="calendarCreatedExcludeExtensionsInput"/);
  assert.match(html, /id="calendarUpdatedExcludeExtensionsInput"/);
  assert.match(html, /id="mergedDocumentExcludeExtensionsInput"/);
  assert.match(app, /const DEFAULT_CALENDAR_EXTENSION_EXCLUDES = \["png", "jpg", "gif"\]/);
  assert.match(app, /calendarCreatedExcludeExtensions: \[\.\.\.DEFAULT_CALENDAR_EXTENSION_EXCLUDES\]/);
  assert.match(app, /calendarUpdatedExcludeExtensions: \[\.\.\.DEFAULT_CALENDAR_EXTENSION_EXCLUDES\]/);
  assert.match(app, /mergedDocumentExcludeExtensions: \[\.\.\.DEFAULT_CALENDAR_EXTENSION_EXCLUDES\]/);
});

test("calendar extension exclude options fall back to the default list", () => {
  assert.match(app, /localStorage\.getItem\("obsidian-web-viewer-calendar-created-exclude-extensions"\) \?\? DEFAULT_CALENDAR_EXTENSION_EXCLUDES/);
  assert.match(app, /localStorage\.getItem\("obsidian-web-viewer-calendar-updated-exclude-extensions"\) \?\? DEFAULT_CALENDAR_EXTENSION_EXCLUDES/);
  assert.match(app, /localStorage\.getItem\("obsidian-web-viewer-merged-document-exclude-extensions"\) \?\? DEFAULT_CALENDAR_EXTENSION_EXCLUDES/);
});

test("created and updated calendar file lists apply separate extension exclusions", () => {
  const body = app.match(/function buildRecentFiles\(\)[\s\S]*?\n}\r?\n\r?\nfunction waitForBrowser/)?.[0] || "";
  assert.match(body, /state\.calendarUpdatedExcludeExtensions/);
  assert.match(body, /state\.calendarCreatedExcludeExtensions/);
  assert.match(body, /FILE_EXTENSION_FILTER_RULES\.isExcludedByExtension/);
});

test("merged document view applies its own extension exclusions", () => {
  const body = app.match(/function collectMergedDocumentFiles\(range\)[\s\S]*?\n}\r?\n\r?\nfunction isTimestampInRange/)?.[0] || "";
  assert.match(body, /isTextVaultFilePath\(node\.name\)/);
  assert.match(body, /state\.mergedDocumentExcludeExtensions/);
  assert.match(body, /FILE_EXTENSION_FILTER_RULES\.isExcludedByExtension/);
});

test("extension exclude settings are loaded and saved with server settings", () => {
  assert.match(app, /calendarCreatedExcludeExtensions: extensionListInputValue\(state\.calendarCreatedExcludeExtensions\)/);
  assert.match(app, /calendarUpdatedExcludeExtensions: extensionListInputValue\(state\.calendarUpdatedExcludeExtensions\)/);
  assert.match(app, /mergedDocumentExcludeExtensions: extensionListInputValue\(state\.mergedDocumentExcludeExtensions\)/);
  assert.match(app, /applyCalendarExtensionExcludeSettings\(settings/);
});
