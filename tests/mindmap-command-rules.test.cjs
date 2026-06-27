const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canAddMindmapToCurrentDocument,
  appendMindmapEmbed,
  contentForMindmapInsertion,
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
