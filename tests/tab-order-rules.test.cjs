const test = require("node:test");
const assert = require("node:assert/strict");
const { moveEmptyTabsToEnd } = require("../tab-order-rules.js");

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
