const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canAddMindmapToCurrentDocument,
  appendMindmapEmbed,
  contentForMindmapInsertion,
  resolveSaveShortcutTarget,
} = require("../mindmap-command-rules.js");

test("mindmap command is available while editing a markdown note", () => {
  assert.equal(canAddMindmapToCurrentDocument({
    activeView: "note",
    editMode: true,
    currentPath: "Note.md",
    currentContent: "# Note",
    canEdit: true,
    isMindmap: false,
  }), true);
});

test("mindmap command is not available for mindmap documents", () => {
  assert.equal(canAddMindmapToCurrentDocument({
    activeView: "note",
    editMode: true,
    currentPath: "Map.md",
    currentContent: "---\ntype: owv-mindmap\n---",
    canEdit: true,
    isMindmap: true,
  }), false);
});

test("mindmap command appends embed after current editor content", () => {
  assert.equal(contentForMindmapInsertion({
    currentContent: "# Saved",
    editorContent: "# Draft",
    editMode: true,
  }), "# Draft");
  assert.equal(appendMindmapEmbed("# Draft\n", "Map.md"), "# Draft\n\n![[Map.md]]\n");
});

test("ctrl s saves active mindmap tab even when focus leaves the mindmap shell", () => {
  assert.equal(resolveSaveShortcutTarget({
    activeView: "note",
    activeTabPath: "Map.md",
    currentPath: "Map.md",
    editMode: true,
    canEdit: true,
    isMindmap: true,
    hasMindmapInstance: true,
    targetInMindmap: false,
    activeInMindmap: false,
    keyCaptureActive: false,
  }), "mindmap");
});

test("ctrl s uses normal edit save for non-mindmap notes", () => {
  assert.equal(resolveSaveShortcutTarget({
    activeView: "note",
    activeTabPath: "Note.md",
    currentPath: "Note.md",
    editMode: true,
    canEdit: true,
    isMindmap: false,
    hasMindmapInstance: false,
  }), "editor");
});
