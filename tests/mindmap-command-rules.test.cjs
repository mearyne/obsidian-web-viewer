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

test("mindmap e shortcut starts text editing on the selected node", () => {
  const app = require("node:fs").readFileSync("app.js", "utf8");
  const keydownBody = app.match(/function handleMindmapKeydown\(event\)[\s\S]*?\n}\r?\n\r?\nfunction isMindmapCopyShortcut/)?.[0] || "";
  assert.match(app, /async function beginActiveMindmapNodeTextEdit\(\)/);
  assert.match(app, /function isMindmapNodeTextEditShortcut\(event\)/);
  assert.match(keydownBody, /isMindmapNodeTextEditShortcut\(event\)/);
  assert.match(keydownBody, /void beginActiveMindmapNodeTextEdit\(\)/);
  assert.doesNotMatch(keydownBody, /void enterEditMode\(\)/);
  const editShortcutBody = app.match(/function isMindmapNodeTextEditShortcut\(event\)[\s\S]*?\n}/)?.[0] || "";
  assert.doesNotMatch(editShortcutBody, /isPlainMindmapEnterKey/);
});

test("mindmap enter shortcut inserts a same-level sibling node", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const keydownBody = app.match(/function handleMindmapKeydown\(event\)[\s\S]*?\n}\r?\n\r?\nfunction isMindmapCopyShortcut/)?.[0] || "";
  assert.match(app, /function isMindmapSiblingInsertShortcut\(event\)/);
  assert.match(app, /async function insertMindmapSiblingNodeFromKeyboard\(event\)/);
  assert.match(keydownBody, /isMindmapSiblingInsertShortcut\(event\)/);
  assert.match(keydownBody, /void insertMindmapSiblingNodeFromKeyboard\(event\)/);
  assert.match(app, /execCommand\?\.\("INSERT_NODE"\)/);
  assert.doesNotMatch(keydownBody, /isPlainMindmapEnterKey\(event\)[\s\S]*beginActiveMindmapNodeTextEdit/);
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
    URL,
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
    extractFunction(app, "vaultPathFromMindmapImageUrl"),
    extractFunction(app, "mindmapImageToMarkdownEmbed"),
    extractFunction(app, "handleMindmapCopy"),
    extractFunction(app, "hasMindmapNodesForCopy"),
    extractFunction(app, "selectedMindmapNodes"),
    extractFunction(app, "collectMindmapActiveNodes"),
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

test("mindmap copy includes pasted images as markdown image embeds", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const context = {
    URL,
    state: {
      mindmapInstance: {
        renderer: {
          activeNodeList: [{
            nodeData: {
              data: {
                text: "<p>Text</p>",
                image: "/api/vault-image-thumb?path=Assets%2Fthumb.png&width=360",
                fullImage: "/api/vault-file?path=Assets%2Foriginal.png",
                children: [{ data: { text: "<p>Child</p>" }, children: [] }],
              },
            },
          }],
        },
      },
      mindmapLastClickedNodeUid: null,
    },
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "normalizeMindmapMarkdownTopic"),
    extractFunction(app, "vaultPathFromMindmapImageUrl"),
    extractFunction(app, "mindmapImageToMarkdownEmbed"),
    extractFunction(app, "selectedMindmapNodes"),
    extractFunction(app, "collectMindmapActiveNodes"),
    extractFunction(app, "selectedMindmapNodesToMarkdownBullets"),
  ].join("\n"), context);

  assert.equal(context.selectedMindmapNodesToMarkdownBullets(), "- ![[Assets/original.png]]\n  Text\n  - Child\n");
});

test("mindmap paste turns copied markdown bullets back into child nodes", async () => {
  const app = fs.readFileSync("app.js", "utf8");
  const commands = [];
  const context = {
    MINDMAP_NODE_DATA_STYLE_KEYS: [],
    state: {
      mindmapInstance: {
        renderer: {
          activeNodeList: [{ getData: (key) => key === "uid" ? "target" : undefined }],
        },
        getData: () => ({
          data: { uid: "root", text: "Root", expand: true },
          children: [{ data: { uid: "target", text: "Target", expand: true }, children: [] }],
        }),
        updateData: (data) => {
          context.updatedData = data;
        },
        execCommand: (command, node, active) => commands.push([command, node?.getData?.("uid"), active]),
      },
      mindmapContext: { sourceData: null },
      editMode: true,
      currentNode: {},
      editorDirty: false,
    },
    els: {
      mindmapShell: {
        hidden: false,
        contains: () => true,
      },
    },
    document: {
      activeElement: { className: "mindmap-canvas smm-mind-map-container" },
    },
    canEditNode: () => true,
    createMindmapNodeId: (() => {
      let count = 0;
      return () => `new-${++count}`;
    })(),
    prepareMindmapImagesForPreview: (node) => node,
    clearGeneratedMindmapBranchStyles: () => {},
    applyMindmapBranchTheme: (node) => node,
    renderEditSaveButton: () => {},
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "normalizeMindmapMarkdownTopic"),
    extractFunction(app, "stripMindmapMarkdownFrontmatter"),
    extractFunction(app, "mindmapMarkdownImageUrl"),
    extractFunction(app, "extractMindmapMarkdownImage"),
    extractFunction(app, "cleanupMindmapMarkdownNode"),
    extractFunction(app, "makeMindmapMarkdownNode"),
    extractFunction(app, "markdownToMindmapData"),
    extractFunction(app, "normalizeMindmapText"),
    extractFunction(app, "copyMindmapNodeStyleData"),
    extractFunction(app, "legacyMindmapNodeToSimpleMindMapNode"),
    extractFunction(app, "simpleMindMapNodeToLegacyMindmapNode"),
    extractFunction(app, "simpleMindMapDataToLegacyMindmapData"),
    extractFunction(app, "legacyMindmapDataToSimpleMindMapData"),
    extractFunction(app, "copyMindmapImageData"),
    extractFunction(app, "cloneMindmapLegacyNodeForPaste"),
    extractFunction(app, "pasteMarkdownBulletsToActiveMindmapNode"),
    extractFunction(app, "handleMindmapPaste"),
  ].join("\n"), context);

  const calls = [];
  await context.handleMindmapPaste({
    target: { closest: () => null },
    clipboardData: {
      items: [],
      getData: (type) => type === "text/plain" ? "- Copied\n  - Nested\n" : "",
    },
    preventDefault: () => calls.push("preventDefault"),
    stopPropagation: () => calls.push("stopPropagation"),
    stopImmediatePropagation: () => calls.push("stopImmediatePropagation"),
  });

  assert.deepEqual(calls, ["preventDefault", "stopPropagation", "stopImmediatePropagation"]);
  assert.equal(context.updatedData.children[0].data.text, "Target");
  assert.equal(context.updatedData.children[0].children[0].data.text, "Copied");
  assert.equal(context.updatedData.children[0].children[0].children[0].data.text, "Nested");
  assert.deepEqual(commands.at(-1), ["SET_NODE_ACTIVE", "target", true]);
  assert.equal(context.state.editorDirty, true);
});

test("mindmap pasted image bullets become visible image nodes", async () => {
  const app = fs.readFileSync("app.js", "utf8");
  const commands = [];
  const context = {
    DEFAULT_MINDMAP_IMAGE_SIZE: { width: 120, height: 80, custom: false },
    MINDMAP_NODE_DATA_STYLE_KEYS: [],
    encodeURIComponent,
    state: {
      mindmapInstance: {
        renderer: {
          activeNodeList: [{ getData: (key) => key === "uid" ? "target" : undefined }],
        },
        getData: () => ({
          data: { uid: "root", text: "Root", expand: true },
          children: [{ data: { uid: "target", text: "Target", expand: true }, children: [] }],
        }),
        updateData: (data) => {
          context.updatedData = data;
        },
        execCommand: (command, node, active) => commands.push([command, node?.getData?.("uid"), active]),
      },
      mindmapContext: { sourceData: null },
      editMode: true,
      currentNode: {},
      editorDirty: false,
    },
    els: {
      mindmapShell: {
        hidden: false,
        contains: () => true,
      },
    },
    document: {
      activeElement: { className: "mindmap-canvas smm-mind-map-container" },
    },
    canEditNode: () => true,
    createMindmapNodeId: (() => {
      let count = 0;
      return () => `new-${++count}`;
    })(),
    prepareMindmapImagesForPreview: (node) => node,
    clearGeneratedMindmapBranchStyles: () => {},
    applyMindmapBranchTheme: (node) => node,
    renderEditSaveButton: () => {},
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "normalizeMindmapMarkdownTopic"),
    extractFunction(app, "stripMindmapMarkdownFrontmatter"),
    extractFunction(app, "mindmapMarkdownImageUrl"),
    extractFunction(app, "extractMindmapMarkdownImage"),
    extractFunction(app, "cleanupMindmapMarkdownNode"),
    extractFunction(app, "makeMindmapMarkdownNode"),
    extractFunction(app, "markdownToMindmapData"),
    extractFunction(app, "normalizeMindmapText"),
    extractFunction(app, "copyMindmapNodeStyleData"),
    extractFunction(app, "legacyMindmapNodeToSimpleMindMapNode"),
    extractFunction(app, "simpleMindMapNodeToLegacyMindmapNode"),
    extractFunction(app, "simpleMindMapDataToLegacyMindmapData"),
    extractFunction(app, "legacyMindmapDataToSimpleMindMapData"),
    extractFunction(app, "copyMindmapImageData"),
    extractFunction(app, "cloneMindmapLegacyNodeForPaste"),
    extractFunction(app, "pasteMarkdownBulletsToActiveMindmapNode"),
    extractFunction(app, "handleMindmapPaste"),
  ].join("\n"), context);

  await context.handleMindmapPaste({
    target: { closest: () => null },
    clipboardData: {
      items: [],
      getData: (type) => type === "text/plain" ? "- ![[Assets/original.png]]\n  Image Text\n" : "",
    },
    preventDefault: () => {},
    stopPropagation: () => {},
    stopImmediatePropagation: () => {},
  });

  const pasted = context.updatedData.children[0].children[0].data;
  assert.equal(pasted.text, "Image Text");
  assert.equal(pasted.image, "/api/vault-file?path=Assets%2Foriginal.png");
  assert.equal(pasted.fullImage, "/api/vault-file?path=Assets%2Foriginal.png");
  assert.equal(pasted.imageSize.width, 120);
  assert.equal(pasted.imageSize.height, 80);
});

test("mindmap canvas exposes context menu copy paste and mobile pinch zoom", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");
  assert.match(app, /function showMindmapContextMenu\(event\)/);
  assert.match(app, /data-action="copy"/);
  assert.match(app, /data-action="paste"/);
  assert.match(app, /canvas\?\.addEventListener\("contextmenu", showMindmapContextMenu, true\)/);
  assert.match(app, /mindMap\.on\("contextmenu", showMindmapContextMenu\)/);
  assert.match(app, /function handleMindmapPinchMove\(event\)/);
  assert.match(app, /canvas\?\.addEventListener\("touchmove", handleMindmapPinchMove, \{ passive: false \}\)/);
  assert.match(app, /state\.mindmapInstance\?\.view\?\.setScale/);
  const menuStyles = styles.match(/\.tab-context-menu\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(menuStyles, /position:\s*fixed/);
  assert.match(menuStyles, /z-index:\s*\d+/);
});

test("new standalone mindmaps append mindmap to generated filenames once", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "mindmapTitleWithSuffix"),
  ].join("\n"), context);

  assert.equal(context.mindmapTitleWithSuffix("Project"), "Project mindmap");
  assert.equal(context.mindmapTitleWithSuffix("Project mindmap"), "Project mindmap");
  assert.equal(context.mindmapTitleWithSuffix("Project mindmap.md"), "Project mindmap.md");
});

test("mindmap tools drawer can open from the toolbar in edit mode", () => {
  const app = fs.readFileSync("app.js", "utf8");
  assert.match(app, /data-mindmap-tools-drawer/);
  assert.match(app, /data-mindmap-action="tools"/);
  assert.match(app, /async function openMindmapToolsDrawer\(\)/);
  assert.match(app, /if \(action === "tools"\) void openMindmapToolsDrawer\(\)/);
  assert.match(app, /toggleMindmapToolsDrawer\(true\)/);
});

test("mindmap selected nodes expose bulk style and library feature actions", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");
  assert.match(app, /data-mindmap-subtree-color/);
  assert.match(app, /data-mindmap-show-line-marker/);
  assert.match(app, /data-mindmap-action="associate-line"/);
  assert.match(app, /data-mindmap-action="outer-frame"/);
  const toolbarBody = app.match(/<div class="mindmap-toolbar"[\s\S]*?<aside class="mindmap-tools-drawer"/)?.[0] || "";
  const drawerBody = app.match(/<aside class="mindmap-tools-drawer"[\s\S]*?<div class="mindmap-tools-options"/)?.[0] || "";
  assert.match(toolbarBody, /data-mindmap-subtree-color/);
  assert.match(toolbarBody, /data-mindmap-action="associate-line"/);
  assert.match(toolbarBody, /data-mindmap-action="outer-frame"/);
  assert.doesNotMatch(drawerBody, /data-mindmap-subtree-color/);
  assert.doesNotMatch(drawerBody, /data-mindmap-action="associate-line"/);
  assert.doesNotMatch(drawerBody, /data-mindmap-action="outer-frame"/);
  assert.match(app, /function applyMindmapTextColorToSelectedSubtree/);
  assert.match(app, /execCommand\?\.\("SET_NODE_STYLE"/);
  assert.match(app, /execCommand\?\.\("ADD_ASSOCIATIVE_LINE"/);
  assert.match(app, /execCommand\?\.\("ADD_OUTER_FRAME"/);
  assert.match(app, /outerFramePaddingX:\s*4/);
  assert.match(app, /outerFramePaddingY:\s*4/);
  assert.match(toolbarBody, /mindmap-toolbar-text-row/);
  assert.match(toolbarBody, /mindmap-toolbar-feature-row/);
  assert.match(toolbarBody, /mindmap-toolbar-color-row/);
  assert.match(app, /data-action="frame"/);
  assert.match(app, /data-action="subtree-color"/);
  const textRowBody = styles.match(/\.mindmap-toolbar-text-row\s*\{[\s\S]*?\n\}/)?.[0] || "";
  const featureRowBody = styles.match(/\.mindmap-toolbar-feature-row\s*\{[\s\S]*?\n\}/)?.[0] || "";
  const colorRowBody = styles.match(/\.mindmap-toolbar-color-row\s*\{[\s\S]*?\n\}/)?.[0] || "";
  const buttonBody = styles.match(/\.mindmap-toolbar button\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(textRowBody, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(featureRowBody, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(colorRowBody, /grid-template-columns:\s*34px\s+repeat\(6,\s*22px\)/);
  assert.match(buttonBody, /font-weight:\s*500/);
  assert.match(buttonBody, /white-space:\s*nowrap/);
  assert.match(app, /MINDMAP_TEXT_COLOR_PRESETS/);
  assert.match(app, /data-mindmap-color-preset/);
  assert.match(app, /function canUseMindmapEditAction/);
  assert.match(app, /if \(action === "frame"\)[\s\S]*addMindmapOuterFrame\(\)/);
  assert.match(app, /data-action="subtree-color"/);
  assert.match(app, /applyMindmapTextColorToSelectedSubtree\(inputEvent\.target\.value\)/);
});

test("mindmap frame and scroll defaults are localized and horizontal", () => {
  const app = fs.readFileSync("app.js", "utf8");
  assert.match(app, /defaultAssociativeLineText:\s*"연결"/);
  assert.match(app, /defaultOuterFrameText:\s*"프레임"/);
  assert.match(app, /canvas\?\.addEventListener\("wheel", handleMindmapShiftWheel/);
  assert.match(app, /function handleMindmapShiftWheel/);
});

test("mindmap tools layout and theme changes apply to the current document view", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const body = app.match(/function handleMindmapOptionInput\(\)[\s\S]*?\n}\r?\n\r?\nfunction ensureDisplayOptionsSection/)?.[0] || "";
  assert.match(body, /state\.mindmapDocumentLayouts\.set\(state\.currentPath, state\.mindmapOptions\.layout\)/);
  assert.match(body, /setMindmapDocumentTheme\(state\.currentPath, selectedMindmapGlobalThemeName\(\)\)/);
  assert.match(body, /applyMindmapOptions\(/);
  assert.match(app, /jm\.setLayout\?\.\(getMindmapRuntimeLayoutForDocument\(state\.currentPath, \{ fallbackLayout: state\.mindmapOptions\.layout \}\)\);\s*jm\.reRender\?\.\(\)/);
});

test("mindmap rename syncs the root topic and metadata title", () => {
  const app = fs.readFileSync("app.js", "utf8");
  assert.match(app, /function retitleMindmapDocumentContent/);
  const renameBody = app.match(/async function renameCurrentFile\(newTitle\)[\s\S]*?\n}\r?\n\r?\n\/\/ ─── Split view/)?.[0] || "";
  assert.match(renameBody, /retitleMindmapDocumentContent\(state\.currentContent, displayDocumentTitle\(newName\), node\.path\)/);
});

test("mindmap ctrl b toggles bold on selected nodes outside text editing", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const commands = [];
  const calls = [];
  const selected = {
    getStyle: () => "normal",
    getData: () => "node-a",
    nodeData: { data: { text: "Node A" } },
    children: [],
  };
  const context = {
    state: {
      mindmapInstance: {
        renderer: { activeNodeList: [selected] },
        execCommand: (...args) => commands.push(args),
      },
      mindmapKeyCaptureActive: true,
      editMode: true,
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
    },
    navigator: { clipboard: { writeText: async () => {} } },
    isMindmapTextEditingEvent: () => false,
    isMindmapNodeTextEditShortcut: () => false,
    isMindmapSiblingInsertShortcut: () => false,
    isMindmapCopyShortcut: () => false,
    canEditNode: () => true,
    renderEditSaveButton: () => {},
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "handleMindmapKeydown"),
    extractFunction(app, "isMindmapFrameShortcut"),
    extractFunction(app, "isMindmapBoldShortcut"),
    extractFunction(app, "toggleSelectedMindmapBold"),
    extractFunction(app, "selectedMindmapNodes"),
    extractFunction(app, "collectMindmapActiveNodes"),
    extractFunction(app, "applyMindmapStyleToNodeTree"),
    extractFunction(app, "markMindmapDirty"),
  ].join("\n"), context);

  context.handleMindmapKeydown({
    key: "b",
    code: "KeyB",
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    isComposing: false,
    target: { closest: () => null, matches: () => false, isContentEditable: false },
    preventDefault: () => calls.push("preventDefault"),
    stopPropagation: () => calls.push("stopPropagation"),
    stopImmediatePropagation: () => calls.push("stopImmediatePropagation"),
  });

  assert.deepEqual(calls, ["preventDefault", "stopPropagation", "stopImmediatePropagation"]);
  assert.equal(commands[0][0], "SET_NODE_STYLE");
  assert.equal(commands[0][1], selected);
  assert.equal(JSON.stringify(commands[0][2]), JSON.stringify({ fontWeight: "bold" }));
  assert.equal(commands[0][3], false);
  assert.equal(selected.nodeData.data.fontWeight, "bold");
});

test("mindmap ctrl shift b wraps selected nodes in a frame", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const commands = [];
  const calls = [];
  const selected = {
    getData: (key) => (key === "uid" ? "node-a" : ""),
    nodeData: { data: { text: "Node A" } },
    children: [],
  };
  const context = {
    state: {
      mindmapInstance: {
        renderer: { activeNodeList: [selected] },
        execCommand: (...args) => commands.push(args),
      },
      mindmapKeyCaptureActive: true,
      editMode: true,
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
    },
    navigator: { clipboard: { writeText: async () => {} } },
    isMindmapTextEditingEvent: () => false,
    isMindmapNodeTextEditShortcut: () => false,
    isMindmapSiblingInsertShortcut: () => false,
    isMindmapCopyShortcut: () => false,
    isMindmapBoldShortcut: () => false,
    canEditNode: () => true,
    renderEditSaveButton: () => {},
    showAppToast: () => {},
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "handleMindmapKeydown"),
    extractFunction(app, "isMindmapFrameShortcut"),
    extractFunction(app, "addMindmapOuterFrame"),
    extractFunction(app, "selectedMindmapNodes"),
    extractFunction(app, "collectMindmapActiveNodes"),
    extractFunction(app, "markMindmapDirty"),
  ].join("\n"), context);

  context.handleMindmapKeydown({
    key: "B",
    code: "KeyB",
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: true,
    isComposing: false,
    target: { closest: () => null, matches: () => false, isContentEditable: false },
    preventDefault: () => calls.push("preventDefault"),
    stopPropagation: () => calls.push("stopPropagation"),
    stopImmediatePropagation: () => calls.push("stopImmediatePropagation"),
  });

  assert.deepEqual(calls, ["preventDefault", "stopPropagation", "stopImmediatePropagation"]);
  assert.equal(commands[0][0], "ADD_OUTER_FRAME");
  assert.deepEqual(commands[0][1], [selected]);
});

test("mindmap subtree color uses active node data when activeNodeList is empty", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const commands = [];
  const child = { nodeData: { data: { text: "Child" } }, children: [] };
  const root = { nodeData: { data: { text: "Root", isActive: true } }, children: [child] };
  const context = {
    state: {
      mindmapInstance: {
        renderer: { activeNodeList: [], root },
        execCommand: (...args) => commands.push(args),
      },
      editMode: true,
      currentNode: {},
    },
    canEditNode: () => true,
    renderEditSaveButton: () => {},
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "applyMindmapTextColorToSelectedSubtree"),
    extractFunction(app, "selectedMindmapNodes"),
    extractFunction(app, "collectMindmapActiveNodes"),
    extractFunction(app, "applyMindmapStyleToNodeTree"),
    extractFunction(app, "markMindmapDirty"),
  ].join("\n"), context);

  assert.equal(context.applyMindmapTextColorToSelectedSubtree("#ff0000"), true);
  assert.equal(root.nodeData.data.color, "#ff0000");
  assert.equal(child.nodeData.data.color, "#ff0000");
  assert.equal(commands.length, 2);
});

test("mindmap image nodes get a default imageSize before rendering", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const context = {
    DEFAULT_MINDMAP_IMAGE_SIZE: { width: 120, height: 80, custom: false },
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "copyMindmapImageData"),
  ].join("\n"), context);

  const target = {};
  context.copyMindmapImageData({ image: "/api/vault-file?path=Assets/image.png" }, target);

  assert.equal(target.image, "/api/vault-file?path=Assets/image.png");
  assert.equal(target.imageSize.width, 120);
  assert.equal(target.imageSize.height, 80);
  assert.equal(target.imageSize.custom, false);
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
    isMindmapBoldShortcut: () => false,
    canEditNode: () => false,
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "normalizeMindmapMarkdownTopic"),
    extractFunction(app, "vaultPathFromMindmapImageUrl"),
    extractFunction(app, "mindmapImageToMarkdownEmbed"),
    extractFunction(app, "handleMindmapKeydown"),
    extractFunction(app, "isMindmapCopyShortcut"),
    extractFunction(app, "copyMindmapSelectionToClipboard"),
    extractFunction(app, "hasMindmapNodesForCopy"),
    extractFunction(app, "selectedMindmapNodes"),
    extractFunction(app, "collectMindmapActiveNodes"),
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

test("mindmap enter keydown inserts a sibling instead of starting text edit", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const commands = [];
  const calls = [];
  const context = {
    state: {
      mindmapInstance: {
        renderer: {
          activeNodeList: [{ id: "node-a" }],
        },
        execCommand: (command) => commands.push(command),
        updateConfig: () => {},
      },
      mindmapKeyCaptureActive: false,
      mindmapLastClickedNodeUid: null,
      editMode: true,
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
    },
    navigator: { clipboard: { writeText: async () => {} } },
    isMindmapTextEditingEvent: () => false,
    canEditNode: () => true,
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "handleMindmapKeydown"),
    extractFunction(app, "isMindmapCopyShortcut"),
    extractFunction(app, "copyMindmapSelectionToClipboard"),
    extractFunction(app, "hasMindmapNodesForCopy"),
    extractFunction(app, "selectedMindmapNodesToMarkdownBullets"),
    extractFunction(app, "isMindmapSiblingInsertShortcut"),
    extractFunction(app, "insertMindmapSiblingNodeFromKeyboard"),
    extractFunction(app, "isMindmapFrameShortcut"),
    extractFunction(app, "isMindmapBoldShortcut"),
    extractFunction(app, "isMindmapNodeTextEditShortcut"),
    extractFunction(app, "isPlainMindmapEditKey"),
  ].join("\n"), context);

  context.handleMindmapKeydown({
    key: "Enter",
    code: "Enter",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    isComposing: false,
    target: {
      closest: () => null,
      matches: () => false,
      isContentEditable: false,
    },
    preventDefault: () => calls.push("preventDefault"),
    stopPropagation: () => calls.push("stopPropagation"),
    stopImmediatePropagation: () => calls.push("stopImmediatePropagation"),
  });

  assert.deepEqual(calls, ["preventDefault", "stopPropagation", "stopImmediatePropagation"]);
  assert.deepEqual(commands, ["INSERT_NODE"]);
});

test("hidden rich text editor focus does not block e from reopening node edit", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const hiddenWrap = { style: { display: "none", visibility: "visible" }, hidden: false };
  const hiddenEditor = {
    nodeType: 1,
    closest: (selector) => {
      if (selector.includes(".smm-richtext-node-edit-wrap")) return hiddenWrap;
      if (selector === ".mindmap-shell") return null;
      return null;
    },
  };
  const context = {
    window: {
      getComputedStyle: (element) => element.style || { display: "block", visibility: "visible" },
    },
    document: {
      activeElement: hiddenEditor,
    },
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "isElementVisiblyHidden"),
    extractFunction(app, "isMindmapTextEditingTarget"),
    extractFunction(app, "isMindmapTextEditingEvent"),
  ].join("\n"), context);

  assert.equal(context.isMindmapTextEditingEvent({ target: { closest: () => null } }), false);
});

test("mindmap title editor treats any visible contenteditable in the shell as text editing", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const mindmapShell = { style: { display: "block", visibility: "visible" }, hidden: false };
  const editable = {
    nodeType: 1,
    hidden: false,
    style: { display: "block", visibility: "visible" },
    isContentEditable: true,
    getAttribute: (name) => (name === "contenteditable" ? "plaintext-only" : null),
    closest: (selector) => {
      if (selector === ".mindmap-shell") return mindmapShell;
      if (selector.includes("[contenteditable]")) return editable;
      return null;
    },
  };
  const context = {
    window: {
      getComputedStyle: (element) => element.style || { display: "block", visibility: "visible" },
    },
    document: {
      activeElement: { closest: () => null },
    },
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, "isElementVisiblyHidden"),
    extractFunction(app, "isEditableMindmapTextElement"),
    extractFunction(app, "isMindmapTextEditingTarget"),
    extractFunction(app, "isMindmapTextEditingEvent"),
  ].join("\n"), context);

  assert.equal(context.isMindmapTextEditingEvent({ target: editable }), true);
});
