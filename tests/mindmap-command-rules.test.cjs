const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {
  canAddMindmapToCurrentDocument,
  appendMindmapEmbed,
  contentForMindmapInsertion,
  resolveSaveShortcutTarget,
} = require("../mindmap-command-rules.js");

function extractFunction(source, name) {
  let start = source.indexOf(`async function ${name}(`);
  if (start === -1) start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} not found`);
  const braceStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} function body not closed`);
}

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
  assert.match(app, /event\.code === "KeyE"/);
  assert.doesNotMatch(app.match(/function isPlainMindmapEditKey\(event\)[\s\S]*?\n}/)?.[0] || "", /isComposing/);
});

test("mindmap e and enter shortcuts start text editing on the selected node", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  const keydownBody = app.match(/function handleMindmapKeydown\(event\)[\s\S]*?\n}\r?\n\r?\nfunction isPlainMindmapEditKey/)?.[0] || "";
  assert.match(app, /async function beginActiveMindmapNodeTextEdit\(\)/);
  assert.match(app, /function isMindmapNodeTextEditShortcut\(event\)/);
  assert.match(keydownBody, /isMindmapNodeTextEditShortcut\(event\)/);
  assert.match(keydownBody, /void beginActiveMindmapNodeTextEdit\(\)/);
  assert.doesNotMatch(keydownBody, /void enterEditMode\(\)/);
  assert.match(app, /function isPlainMindmapEnterKey\(event\)/);
  assert.match(app, /!event\.ctrlKey/);
  assert.match(app, /event\.key === "Enter" \|\| event\.key === "NumpadEnter"/);
});

test("mindmap node text edit shortcut enables editing without rerendering away selection", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  const body = app.match(/async function beginActiveMindmapNodeTextEdit\(\)[\s\S]*?\n}\r?\n\r?\nfunction startActiveMindmapNodeTextEdit/)?.[0] || "";
  assert.match(body, /ensureNodeWritePermission\(state\.currentNode\)/);
  assert.match(body, /state\.editMode = true/);
  assert.match(body, /jm\.updateConfig\?\.\(\{ readonly: false \}\)/);
  assert.doesNotMatch(body, /renderCurrentDocument\(/);
});

test("mindmap remembers the last pressed node before e opens text editing", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  assert.match(app, /function rememberMindmapNodeForEditing\(node\)/);
  assert.match(app, /mindMap\.on\("node_mousedown", rememberMindmapNodeForEditing\)/);
  assert.match(app, /mindMap\.on\("node_click", rememberMindmapNodeForEditing\)/);
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
  assert.match(app, /document\.addEventListener\("keydown", handleMindmapRichTextCommitKeydown, true\)/);
  assert.doesNotMatch(shortcutBody, /event\?\.key === "Enter"/);
  assert.doesNotMatch(shortcutBody, /event\?\.key === "NumpadEnter"/);
});

test("mindmap text editor lets escape reach the node edit handler", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  const shortcutBody = app.match(/function shouldEnableMindmapShortcut\(event\)[\s\S]*?\n}/)?.[0] || "";
  assert.match(app, /function isMindmapTextEditingCommitKey\(event\)/);
  assert.match(app, /event\?\.key === "Escape"/);
  assert.match(app, /function handleMindmapRichTextCommitKeydown\(event\)/);
  assert.doesNotMatch(shortcutBody, /event\?\.key === "Escape"/);
});

test("rich text mindmap editor commits enter and escape before Quill consumes them", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  const body = app.match(/function handleMindmapRichTextCommitKeydown\(event\)[\s\S]*?\n}\r?\n\r?\nfunction guardMindmapTextEditingKeydown/)?.[0] || "";
  assert.match(body, /isMindmapRichTextEditingTarget\(event\?\.target\)/);
  assert.match(body, /isMindmapTextEditingCommitKey\(event\)/);
  assert.match(body, /event\.preventDefault\(\)/);
  assert.match(body, /state\.mindmapInstance\?\.renderer\?\.textEdit\?\.hideEditTextBox\?\.\(\)/);
  assert.match(body, /finishMindmapTextEditing\(\)/);
});

test("selected mindmap nodes can be copied as markdown bullets", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const body = app.match(/function handleMindmapCopy\(event\)[\s\S]*?\n}\r?\n\r?\nfunction selectedMindmapNodesToMarkdownBullets/)?.[0] || "";
  const serializeBody = app.match(/function selectedMindmapNodesToMarkdownBullets\(\)[\s\S]*?\n}\r?\n\r?\nasync function pasteImageToActiveMindmapNodes/)?.[0] || "";
  assert.match(app, /document\.addEventListener\("copy", handleMindmapCopy, true\)/);
  assert.match(app, /function handleMindmapCopy\(event\)/);
  assert.match(app, /function selectedMindmapNodesToMarkdownBullets\(\)/);
  assert.match(body, /event\.stopPropagation\(\)/);
  assert.match(body, /event\.stopImmediatePropagation\?\.\(\)/);
  assert.match(body, /event\.clipboardData\.setData\("text\/plain", markdown\)/);
  assert.match(serializeBody, /state\.mindmapLastClickedNodeUid/);
  assert.match(serializeBody, /findNodeByUid\?\.\(state\.mindmapLastClickedNodeUid\)/);
});

test("mindmap copy writes markdown bullets even when focus is outside the shell", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const context = {
    state: {
      mindmapInstance: {
        renderer: {
          activeNodeList: [{
            nodeData: {
              data: {
                text: "<p>Parent</p>",
                children: [{ data: { text: "<p>Child</p>" }, children: [] }],
              },
            },
          }],
        },
      },
      mindmapKeyCaptureActive: false,
      mindmapLastClickedNodeUid: null,
    },
    els: {
      mindmapShell: {
        hidden: false,
        contains: () => false,
      },
    },
    document: {
      activeElement: { className: "ql-editor" },
    },
    isMindmapTextEditingEvent: () => false,
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "normalizeMindmapMarkdownTopic"),
    extractFunction(app, "handleMindmapCopy"),
    extractFunction(app, "hasMindmapNodesForCopy"),
    extractFunction(app, "selectedMindmapNodesToMarkdownBullets"),
  ].join("\n"), context);

  const clipboard = new Map([["text/plain", "{\"simpleMindMap\":true}"]]);
  const calls = [];
  context.handleMindmapCopy({
    target: { closest: () => null },
    preventDefault: () => calls.push("preventDefault"),
    stopPropagation: () => calls.push("stopPropagation"),
    stopImmediatePropagation: () => calls.push("stopImmediatePropagation"),
    clipboardData: {
      clearData: () => clipboard.clear(),
      setData: (type, value) => clipboard.set(type, value),
      getData: (type) => clipboard.get(type) || "",
    },
  });

  assert.deepEqual(calls, ["preventDefault", "stopPropagation", "stopImmediatePropagation"]);
  assert.equal(clipboard.get("text/plain"), "- Parent\n  - Child\n");
  assert.doesNotMatch(clipboard.get("text/plain"), /simpleMindMap/);
});

test("mindmap ctrl c keydown writes selected nodes as markdown bullets", () => {
  const app = fs.readFileSync("app.js", "utf8");
  let copied = "";
  const calls = [];
  const context = {
    state: {
      mindmapInstance: {
        renderer: {
          activeNodeList: [{
            nodeData: {
              data: {
                text: "<p>Keyboard Parent</p>",
                children: [{ data: { text: "<p>Keyboard Child</p>" }, children: [] }],
              },
            },
          }],
        },
      },
      mindmapKeyCaptureActive: false,
      mindmapLastClickedNodeUid: null,
      editMode: false,
      currentNode: {},
    },
    els: {
      mindmapShell: {
        hidden: false,
        contains: () => true,
      },
    },
    document: {
      activeElement: { className: "mindmap-canvas smm-mind-map-container" },
      execCommand: () => false,
    },
    navigator: {
      clipboard: {
        writeText: async (text) => {
          copied = text;
        },
      },
    },
    isMindmapTextEditingEvent: () => false,
    isMindmapNodeTextEditShortcut: () => false,
    canEditNode: () => false,
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "normalizeMindmapMarkdownTopic"),
    extractFunction(app, "handleMindmapKeydown"),
    extractFunction(app, "isMindmapCopyShortcut"),
    extractFunction(app, "copyMindmapSelectionToClipboard"),
    extractFunction(app, "hasMindmapNodesForCopy"),
    extractFunction(app, "selectedMindmapNodesToMarkdownBullets"),
  ].join("\n"), context);

  context.handleMindmapKeydown({
    key: "c",
    code: "KeyC",
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    isComposing: false,
    target: { closest: () => null },
    preventDefault: () => calls.push("preventDefault"),
    stopPropagation: () => calls.push("stopPropagation"),
    stopImmediatePropagation: () => calls.push("stopImmediatePropagation"),
  });

  assert.deepEqual(calls, ["preventDefault", "stopPropagation", "stopImmediatePropagation"]);
  assert.equal(copied, "- Keyboard Parent\n  - Keyboard Child\n");
  assert.doesNotMatch(copied, /simpleMindMap/);
});
