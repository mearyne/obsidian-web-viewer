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

test("mindmap e shortcut is not blocked by IME composition state", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  assert.match(app, /function isPlainMindmapEditKey\(event\)/);
  assert.match(app, /event\.key\.toLowerCase\(\) === "e"/);
  assert.doesNotMatch(app.match(/function isPlainMindmapEditKey\(event\)[\s\S]*?\n}/)?.[0] || "", /isComposing/);
});

test("mindmap text editor keeps ctrl a inside node editing", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  const guardBody = app.match(/function guardMindmapTextEditingKeydown\(event\)[\s\S]*?\n}/)?.[0] || "";
  assert.match(app, /document\.addEventListener\("keydown", guardMindmapTextEditingKeydown\)/);
  assert.match(guardBody, /event\.stopPropagation\(\)/);
  assert.match(guardBody, /event\.stopImmediatePropagation\?\.\(\)/);
  assert.doesNotMatch(guardBody, /preventDefault/);
  assert.doesNotMatch(guardBody, /isMindmapTextEditingControlKey/);
});

test("mindmap text editor keeps enter inside node editing", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  const shortcutBody = app.match(/function shouldEnableMindmapShortcut\(event\)[\s\S]*?\n}/)?.[0] || "";
  const guardBody = app.match(/function guardMindmapTextEditingKeydown\(event\)[\s\S]*?\n}/)?.[0] || "";
  assert.match(shortcutBody, /return false;/);
  assert.match(guardBody, /isMindmapTextEditingCommitKey\(event\)/);
  assert.doesNotMatch(shortcutBody, /event\?\.key === "Enter"/);
  assert.doesNotMatch(shortcutBody, /event\?\.key === "NumpadEnter"/);
});

test("mindmap text editor lets escape reach the node edit handler", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  const shortcutBody = app.match(/function shouldEnableMindmapShortcut\(event\)[\s\S]*?\n}/)?.[0] || "";
  assert.match(app, /function isMindmapTextEditingCommitKey\(event\)/);
  assert.match(app, /event\?\.key === "Escape"/);
  assert.doesNotMatch(shortcutBody, /event\?\.key === "Escape"/);
});

test("selected mindmap nodes can be copied as markdown bullets", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  assert.match(app, /document\.addEventListener\("copy", handleMindmapCopy\)/);
  assert.match(app, /function handleMindmapCopy\(event\)/);
  assert.match(app, /function selectedMindmapNodesToMarkdownBullets\(\)/);
  assert.match(app, /event\.clipboardData\.setData\("text\/plain", markdown\)/);
});
