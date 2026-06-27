const test = require("node:test");
const assert = require("node:assert/strict");
const {
  moveEmptyTabsToEnd,
  normalizeTabsAfterChange,
  restoredTabKey,
  selectOpenTabsForRestore,
} = require("../tab-order-rules.js");

test("empty new tabs move behind document tabs", () => {
  const tabs = [
    { id: "note-a", path: "A.md", pinned: false },
    { id: "empty", path: null, title: "새 탭", pinned: false },
    { id: "mindmap", path: "Map.md", pinned: false },
  ];

  moveEmptyTabsToEnd(tabs);

  assert.deepEqual(tabs.map((tab) => tab.id), ["note-a", "mindmap", "empty"]);
});

test("empty new tabs stay behind pinned tabs and document tabs", () => {
  const tabs = [
    { id: "pinned", path: "Pinned.md", pinned: true },
    { id: "empty", path: null, title: "새 탭", pinned: false },
    { id: "calendar", path: null, view: "calendar", pinned: false },
    { id: "note", path: "Note.md", pinned: false },
  ];

  moveEmptyTabsToEnd(tabs);

  assert.deepEqual(tabs.map((tab) => tab.id), ["pinned", "calendar", "note", "empty"]);
});

test("tab changes move empty new tabs behind merged document tabs immediately", () => {
  const tabs = [
    { id: "note", path: "Note.md", pinned: false },
    { id: "empty", path: null, title: "새 탭", pinned: false },
    { id: "merged", path: null, view: "merged", pinned: false },
  ];

  normalizeTabsAfterChange(tabs);

  assert.deepEqual(tabs.map((tab) => tab.id), ["note", "merged", "empty"]);
});

test("saved empty new tabs get distinct restore keys", () => {
  const tabs = [
    { id: "empty-a", path: null, view: null },
    { id: "empty-b", path: null, view: null },
  ];

  assert.notEqual(restoredTabKey(tabs[0], 0), restoredTabKey(tabs[1], 1));
});

test("first open can restore the newest available device tabs", () => {
  const selected = selectOpenTabsForRestore({
    mine: { updatedAt: 10 },
    laptop: {
      updatedAt: 20,
      openTabs: { tabs: [{ id: "old", path: "Old.md" }], activeTabId: "old" },
    },
    desktop: {
      updatedAt: 30,
      openTabs: { tabs: [{ id: "new", path: "New.md" }], activeTabId: "new" },
    },
  }, "mine");

  assert.equal(selected.activeTabId, "new");
});
