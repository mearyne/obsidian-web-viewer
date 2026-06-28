# Mindmap Tools And Workflow Design

Date: 2026-06-28

## Scope

Implement the approved hybrid mindmap direction:

- Keep the current compact mindmap editing surface.
- Add high-value mindmap actions directly to the toolbar.
- Put broader engine features behind a compact Tools drawer instead of copying the full wanglin2 demo layout.
- Preserve the current Obsidian-style document, tab, vault, and markdown flows.

This same work request also includes focused fixes for saved-status display, tab restoration, task dialog save shortcuts, and the 1d matrix grouping.

## User-Facing Changes

### Mindmap Markdown Import And Export

Add two mindmap actions:

- Export mindmap to Markdown: convert the current mindmap tree into nested Markdown headings or bullets and download or create a `.md` document.
- Import Markdown into mindmap: parse headings and/or nested bullet lists into a mindmap tree, then replace or insert into the current mindmap after confirmation.

The first implementation should use a predictable, simple Markdown tree format:

```markdown
# Root
- Child
  - Grandchild
```

Existing mindmap document storage remains unchanged: mindmaps are still saved as `owv-mindmap` frontmatter plus the JSON data block.

### Mindmap Built-In Features

Use the current `simple-mind-map` instance and expose practical built-in functions in the hybrid UI:

- Always visible: node add/delete, undo/redo, layout, search, fit, expand/collapse.
- Tools drawer: style/theme-related commands, node metadata helpers, image-related actions, relation/outline/summary commands only when the engine exposes a stable command or API.

Avoid wiring demo-only Vue UI concepts directly. Only expose features that are reachable from the library instance or commands already available in the bundled renderer.

### Saved Status Icon

Replace the text label `저장됨` with an icon-style status so narrow UI does not wrap it as `저장\n됨`.

Use text-compatible symbols to avoid introducing a new icon dependency:

- Dirty: `저장`
- Saving: `...`
- Saved: `✓`

### Merged Tab Restore

Fix refresh restoration so merged-document tabs restore during startup rather than appearing only after clicking the remaining new tab.

The restored tab list must include:

- pinned tabs
- document tabs
- merged-document tabs
- calendar tabs
- intentional empty tabs

The active restored tab should render immediately after vault and tab state are ready.

### Task Dialog Ctrl+S

When the create or edit task dialog is open, `Ctrl+S` or `Cmd+S` should save the dialog even when the textarea is not focused.

The shortcut should not save when the dialog is in view-only mode unless it is first switched to edit mode by existing behavior.

### 1d Matrix Grouping

In the 1d matrix, combine `중요+긴급` and `미중요+긴급` into one urgent box.

The resulting matrix should keep four conceptual buckets only if still useful:

- Urgent: all urgent tasks, regardless of importance.
- Important not urgent.
- Not important not urgent.
- Recurring.

Dragging into the urgent box should set an urgent date and preserve or set priority based on the task's existing importance where possible.

## Architecture

Keep changes localized to:

- `app.js` mindmap conversion helpers, toolbar rendering, toolbar action handlers.
- `app.js` tab restoration and task dialog key handling.
- `app.js` matrix bucket definitions and placement logic.
- `styles.css` toolbar, tools drawer, saved status, and matrix layout styles.
- Existing tests where rules can be extracted without browser APIs.

Do not introduce a framework or copy the official wanglin2 web app. The official web app is a separate UI around the same engine; this project should remain a vault/document viewer with mindmap editing embedded.

## Data Flow

### Export

`simple-mind-map data -> legacy mindmap data -> markdown tree string -> download/create document`

### Import

`markdown text/file -> parsed tree -> legacy mindmap data -> simple-mind-map updateData -> editorDirty`

### Restore

`localStorage/server openTabs -> normalized tab list -> active tab render after vault ready`

## Error Handling

- Markdown import should reject empty or unparseable input with a toast.
- Import should confirm before replacing an existing non-empty mindmap.
- Unsupported mindmap engine commands should be hidden or no-op with a short toast, not throw.
- Tab restore should fall back to a new tab only when no valid restored tab exists.

## Testing

Run:

- `node --check app.js`
- `node --check server.cjs` if touched
- `npm test`

Add focused tests if conversion helpers or tab-order rules are extracted into testable rule objects.

## Non-Goals

- Full official wanglin2 demo UI clone.
- New external icon library.
- Changing the persisted mindmap JSON format beyond importing/exporting Markdown.
- Rebuilding all simple-mind-map plugins in one pass.
