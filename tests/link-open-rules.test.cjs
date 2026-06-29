const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveWikiLinkOpenMode } = require("../link-open-rules.js");

test("merged document wiki links open in a new tab", () => {
  assert.equal(resolveWikiLinkOpenMode({ forceNewTab: true, embeddedNote: false }), "new-tab");
});

test("embedded note wiki links open in a new tab", () => {
  assert.equal(resolveWikiLinkOpenMode({ forceNewTab: false, embeddedNote: true }), "new-tab");
});

test("mindmap embed links open in the current tab", () => {
  assert.equal(resolveWikiLinkOpenMode({ forceNewTab: false, embeddedNote: true, mindmapEmbed: true }), "current-tab");
});

test("mindmap document links open in the current tab even inside embeds", () => {
  assert.equal(resolveWikiLinkOpenMode({ forceNewTab: false, embeddedNote: true, targetMindmap: true }), "current-tab");
});

test("calendar links to mindmap documents open in the current tab", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  assert.match(app, /async function openCalendarPath\(path\)/);
  assert.match(app, /targetMindmap: isMindmapDocument\(state\.files\.get\(normalizedPath\)\?\.content \|\| ""\)/);
  assert.match(app, /await openCalendarPath\(path\)/);
});

test("calendar links do not replace pinned calendar tabs", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  const body = app.match(/async function openCalendarPath\(path\)[\s\S]*?\n}\r?\n\r?\n/)?.[0] || "";
  assert.match(body, /const tab = activeTab\(\)/);
  assert.match(body, /tab\?\.pinned && tab\.view === "calendar"/);
  assert.match(body, /await openFileInNewTab\(normalizedPath\)/);
});

test("calendar tabs clear document mindmap state when shown", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  const body = app.match(/function showCalendarView\(\)[\s\S]*?\n}\r?\n\r?\nfunction removeDuplicateCalendarTabs/)?.[0] || "";
  assert.match(body, /tab\.path = null/);
  assert.match(body, /clearConversionPreviewFlags\(tab\)/);
  assert.match(body, /tab\.renderCache = null/);
});

test("calendar inline wiki links are bound after calendar render", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  assert.match(app, /bindWikiLinks\(els\.calendarView, \{ calendarLinks: true \}\)/);
  assert.match(app, /event\.stopPropagation\(\)/);
});

test("normal document wiki links open in the current tab", () => {
  assert.equal(resolveWikiLinkOpenMode({ forceNewTab: false, embeddedNote: false }), "current-tab");
});
