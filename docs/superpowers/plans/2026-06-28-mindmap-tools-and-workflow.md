# Mindmap Tools And Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved hybrid mindmap tools workflow and the related UI/workflow fixes from the user request.

**Architecture:** Keep the current single-file app structure for UI wiring, but extract testable pure rules for markdown/mindmap conversion and tab restoration where practical. Mindmap editing remains embedded in the existing document view; advanced functionality is exposed through a compact Tools drawer rather than cloning the wanglin2 demo app.

**Tech Stack:** Vanilla JavaScript, `simple-mind-map`, existing Node test runner, existing `app.js`, `styles.css`, `tests/*.test.cjs`.

---

## File Structure

- Modify `app.js`: mindmap toolbar/drawer, markdown import/export, task dialog shortcut, matrix bucket changes, tab restore call ordering, saved status label.
- Modify `styles.css`: mindmap tools drawer, saved icon state, matrix urgent grouping layout.
- Modify `tests/tab-order-rules.test.cjs`: restore regression coverage for merged tabs if rule extraction is needed.
- Create `tests/mindmap-markdown-rules.test.cjs`: pure conversion tests if conversion helpers are exposed through `globalThis.MindmapMarkdownRules`.
- Modify `WORK_REQUESTS.md`: append implementation request log if not already present.

## Task 1: Mindmap Markdown Conversion Rules

**Files:**
- Modify: `app.js`
- Create: `tests/mindmap-markdown-rules.test.cjs`
- Modify: `package.json`

- [ ] **Step 1: Add failing conversion tests**

Create `tests/mindmap-markdown-rules.test.cjs`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { MindmapMarkdownRules } = require("../app-rules.cjs");

test("exports mindmap tree to markdown bullets", () => {
  const data = {
    data: {
      topic: "Root",
      children: [
        { topic: "Child A", children: [{ topic: "Grandchild", children: [] }] },
        { topic: "Child B", children: [] },
      ],
    },
  };
  assert.equal(
    MindmapMarkdownRules.mindmapDataToMarkdown(data),
    "# Root\n\n- Child A\n  - Grandchild\n- Child B\n",
  );
});

test("imports markdown bullets to mindmap data", () => {
  const data = MindmapMarkdownRules.markdownToMindmapData("# Root\n\n- Child A\n  - Grandchild\n- Child B\n");
  assert.equal(data.data.topic, "Root");
  assert.deepEqual(data.data.children.map((node) => node.topic), ["Child A", "Child B"]);
  assert.equal(data.data.children[0].children[0].topic, "Grandchild");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/mindmap-markdown-rules.test.cjs`

Expected: FAIL because `app-rules.cjs` or `MindmapMarkdownRules` is not defined.

- [ ] **Step 3: Add pure conversion implementation**

Create `app-rules.cjs` with:

```js
function normalizeMindmapTopic(value, fallback = "Untitled") {
  const text = String(value || "").replace(/<[^>]*>/g, "").trim();
  return text || fallback;
}

function mindmapDataToMarkdown(data) {
  const root = data?.data || data;
  const title = normalizeMindmapTopic(root?.topic || root?.text, "Mindmap");
  const lines = [`# ${title}`, ""];
  const visit = (node, depth) => {
    const indent = "  ".repeat(depth);
    lines.push(`${indent}- ${normalizeMindmapTopic(node?.topic || node?.text)}`);
    (node?.children || []).forEach((child) => visit(child, depth + 1));
  };
  (root?.children || []).forEach((child) => visit(child, 0));
  return `${lines.join("\n").replace(/\s+$/u, "")}\n`;
}

function markdownToMindmapData(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  let rootTopic = "";
  const stack = [];
  const root = { topic: "Mindmap", children: [] };
  for (const raw of lines) {
    const heading = raw.match(/^\s*#\s+(.+?)\s*$/);
    if (heading && !rootTopic) {
      rootTopic = heading[1].trim();
      root.topic = normalizeMindmapTopic(rootTopic, "Mindmap");
      continue;
    }
    const bullet = raw.match(/^(\s*)[-*+]\s+(.+?)\s*$/);
    if (!bullet) continue;
    const depth = Math.floor(bullet[1].replace(/\t/g, "  ").length / 2);
    const node = { topic: normalizeMindmapTopic(bullet[2]), children: [] };
    if (depth === 0 || !stack[depth - 1]) root.children.push(node);
    else stack[depth - 1].children.push(node);
    stack[depth] = node;
    stack.length = depth + 1;
  }
  if (!rootTopic && root.children.length === 1) {
    const only = root.children[0];
    root.topic = only.topic;
    root.children = only.children || [];
  }
  return {
    meta: { name: root.topic, author: "obsidian-web-viewer", version: "1.0" },
    format: "node_tree",
    data: root,
  };
}

const MindmapMarkdownRules = { mindmapDataToMarkdown, markdownToMindmapData };

module.exports = { MindmapMarkdownRules };
```

- [ ] **Step 4: Wire app runtime to the rules**

At the top of `app.js`, add a browser fallback:

```js
const MINDMAP_MARKDOWN_RULES = globalThis.MindmapMarkdownRules || {
  mindmapDataToMarkdown,
  markdownToMindmapData,
};
```

In browser scope, define equivalent functions before mindmap save helpers if `require` is unavailable.

- [ ] **Step 5: Add test script entry**

Update `package.json` test/pretest scripts to include `tests/mindmap-markdown-rules.test.cjs`.

- [ ] **Step 6: Verify conversion tests**

Run: `node --test tests/mindmap-markdown-rules.test.cjs`

Expected: PASS.

## Task 2: Mindmap Import/Export And Tools Drawer

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Add toolbar buttons**

In `renderMindmapDocument()` toolbar HTML, add buttons:

```html
<button type="button" data-mindmap-action="export-md" aria-label="Markdown 내보내기" title="Markdown 내보내기">MD↓</button>
<button type="button" data-mindmap-action="import-md" data-edit-only aria-label="Markdown 불러오기" title="Markdown 불러오기">MD↑</button>
<button type="button" data-mindmap-action="tools" aria-label="도구" title="도구">Tools</button>
```

- [ ] **Step 2: Add Tools drawer shell**

In `renderMindmapDocument()` after the toolbar panel, add:

```html
<aside class="mindmap-tools-drawer" data-mindmap-tools-drawer hidden>
  <header>
    <strong>Tools</strong>
    <button type="button" data-mindmap-action="tools-close" aria-label="닫기">×</button>
  </header>
  <div class="mindmap-tools-grid">
    <button type="button" data-mindmap-action="expand-all">Expand all</button>
    <button type="button" data-mindmap-action="collapse-all">Collapse all</button>
    <button type="button" data-mindmap-action="reset-layout">Reset layout</button>
    <button type="button" data-mindmap-action="export-md">Export MD</button>
    <button type="button" data-mindmap-action="import-md" data-edit-only>Import MD</button>
  </div>
</aside>
```

- [ ] **Step 3: Implement export action**

Add helper:

```js
function exportCurrentMindmapMarkdown() {
  const jm = state.mindmapInstance;
  if (!jm) return;
  const data = simpleMindMapDataToLegacyMindmapData(jm.getData(), state.mindmapContext?.sourceData);
  const markdown = MINDMAP_MARKDOWN_RULES.mindmapDataToMarkdown(data);
  const title = displayDocumentTitle(state.currentNode?.name || state.currentPath || "mindmap").replace(/\.md$/i, "");
  downloadTextFile(`${title}.mindmap.md`, markdown, "text/markdown;charset=utf-8");
}
```

Add `downloadTextFile(filename, content, type)` using `Blob`, `URL.createObjectURL`, temporary `<a download>`, and `URL.revokeObjectURL`.

- [ ] **Step 4: Implement import action**

Add helper:

```js
function importMarkdownIntoCurrentMindmap() {
  if (!(state.editMode && canEditNode(state.currentNode))) {
    showAppToast("편집 모드에서만 불러올 수 있습니다.", "error");
    return;
  }
  const text = prompt("Markdown 내용을 붙여넣으세요.");
  if (!text || !text.trim()) return;
  const data = MINDMAP_MARKDOWN_RULES.markdownToMindmapData(text);
  if (!data?.data?.topic) {
    showAppToast("불러올 Markdown 구조를 찾지 못했습니다.", "error");
    return;
  }
  if (!confirm("현재 마인드맵을 Markdown 내용으로 교체할까요?")) return;
  state.mindmapInstance.updateData?.(legacyMindmapDataToSimpleMindMapData(data));
  state.editorDirty = true;
  renderEditSaveButton();
  if (state.mindmapOptions.autoFit) requestAnimationFrame(() => fitMindmapToView());
}
```

- [ ] **Step 5: Route new actions**

In `runMindmapToolbarAction(action)`, add:

```js
if (action === "export-md") exportCurrentMindmapMarkdown();
if (action === "import-md") importMarkdownIntoCurrentMindmap();
if (action === "tools") toggleMindmapToolsDrawer(true);
if (action === "tools-close") toggleMindmapToolsDrawer(false);
```

- [ ] **Step 6: Style drawer**

Add `styles.css`:

```css
.mindmap-tools-drawer {
  background: color-mix(in srgb, var(--surface) 96%, var(--bg) 4%);
  border-left: 1px solid var(--line);
  bottom: 0;
  box-shadow: -12px 0 28px rgba(15, 23, 42, 0.14);
  max-width: min(280px, 88vw);
  padding: 12px;
  position: absolute;
  right: 0;
  top: 0;
  width: 280px;
  z-index: 15;
}
.mindmap-tools-drawer header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.mindmap-tools-grid {
  display: grid;
  gap: 8px;
}
.mindmap-tools-grid button {
  min-height: 34px;
}
```

## Task 3: Saved Status Icon

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Replace saved label**

In `renderEditSaveButton()` replace:

```js
const label = state.editorDirty ? "저장" : "저장됨";
```

with:

```js
const label = state.editorDirty ? "저장" : "✓";
```

Set `title` and `aria-label` to `"저장됨"` when clean, so accessibility keeps the full meaning.

- [ ] **Step 2: Verify no wrapping**

Add CSS:

```css
#saveEditButton,
.bottom-save-status {
  white-space: nowrap;
}
```

## Task 4: Merged Tab Restore Regression

**Files:**
- Modify: `app.js`
- Modify: `tests/tab-order-rules.test.cjs`

- [ ] **Step 1: Inspect startup ordering**

Read `loadSampleVault()`, `initTabs()`, `fetchOpenTabsFromVault()`, `restoreOpenTabsFromLocal()`, and `restoreActiveTab()`.

- [ ] **Step 2: Add focused restore assertion**

Extend `tests/tab-order-rules.test.cjs`:

```js
test("merged tabs keep stable restore keys across reload", () => {
  const tab = { view: "merged", mergedRange: { start: "2026-06-01", end: "2026-06-07" } };
  assert.equal(restoredTabKey(tab, 0), "view:merged:2026-06-01:2026-06-07");
});
```

- [ ] **Step 3: Fix active restore timing**

Ensure `restoreActiveTab()` is called after both vault files and open tab payload are ready. If `initTabs()` currently renders a new tab before async open-tabs restore completes, preserve that as a placeholder but call `restoreActiveTab()` again after `fetchOpenTabsFromVault()` updates local storage.

Concrete change:

```js
async function fetchOpenTabsFromVault() {
  ...
  localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(openTabs));
  restoreOpenTabsFromLocal();
  await restoreActiveTab();
}
```

Guard this so it only runs once after vault loaded:

```js
if (state.vaultLoaded) await restoreActiveTab();
```

## Task 5: Task Dialog Ctrl+S

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add dialog shortcut helper**

Add:

```js
function isSaveShortcut(event) {
  return (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "s";
}
```

Replace duplicate save shortcut checks where practical.

- [ ] **Step 2: Bind create dialog Ctrl+S**

In `bindTaskCreateDialog()` dialog `keydown`, add:

```js
if (isSaveShortcut(e)) {
  e.preventDefault();
  e.stopPropagation();
  els.taskCreateConfirm?.click();
}
```

- [ ] **Step 3: Bind edit dialog Ctrl+S globally within dialog**

In `bindTaskEditDialog()` dialog `keydown`, ensure the current edit-mode save path runs for any focused element inside the dialog:

```js
if (!isView && isSaveShortcut(e)) {
  e.preventDefault();
  e.stopPropagation();
  els.taskEditSaveBtn?.click();
  return;
}
```

## Task 6: 1d Matrix Urgent Group

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Update quadrant definitions**

In `buildMatrixView()`, replace `do` and `delegate` with one urgent quadrant:

```js
{
  key: "urgent",
  title: "긴급",
  attitude: "오늘 처리. 중요도는 유지하고 마감 리스크부터 낮춘다.",
  urgent: true,
  important: null,
}
```

Keep `plan`, `drop`, and `routine`.

- [ ] **Step 2: Update placement**

Change:

```js
if (matrixTaskUrgent(task, range)) {
  return matrixTaskImportant(task) ? "do" : "delegate";
}
```

to:

```js
if (matrixTaskUrgent(task, range)) return "urgent";
```

- [ ] **Step 3: Update drag placement**

Change `matrixPlacementFromKey()`:

```js
urgent: { key: "urgent", urgent: true, important: null, recurring: false, priority: null },
```

In `updateMatrixTaskPlacement()`, only replace priority when `placement.priority` is truthy:

```js
if (placement.priority) nextLine = replaceTaskPriorityTag(nextLine, placement.priority);
```

- [ ] **Step 4: Style urgent quadrant**

Replace `.matrix-quadrant.do` and `.matrix-quadrant.delegate` usage with:

```css
.matrix-quadrant.urgent {
  border-left: 4px solid #d64b3b;
}
```

## Task 7: Verification And Commit

**Files:**
- Modify: `WORK_REQUESTS.md`

- [ ] **Step 1: Append request log**

Add:

```markdown
- 2026-06-28: Implement hybrid mindmap tools drawer, markdown import/export, saved status icon, merged tab restore, task dialog Ctrl+S, and 1d matrix urgent grouping.
```

- [ ] **Step 2: Run checks**

Run:

```powershell
node --check app.js
node --check server.cjs
& 'C:\Program Files\nodejs\npm.cmd' test
```

Expected: all pass.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add app.js styles.css app-rules.cjs tests package.json WORK_REQUESTS.md
git commit -m "Add hybrid mindmap tools and workflow fixes"
git push
```

Expected: commit succeeds and pushes to `main`.

## Self-Review

- Spec coverage: Markdown import/export, built-in mindmap feature exposure, saved icon, merged restore, task dialog save shortcut, and 1d urgent grouping are covered.
- Placeholder scan: no TBD/TODO placeholders are intentionally left.
- Scope check: this is a broad but single approved workflow batch; tasks are isolated enough to implement incrementally.
