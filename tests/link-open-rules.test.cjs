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

test("normal document wiki links open in the current tab", () => {
  assert.equal(resolveWikiLinkOpenMode({ forceNewTab: false, embeddedNote: false }), "current-tab");
});
