const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

test("calendar extension exclude options are present in settings UI and state", () => {
  assert.match(html, /id="calendarCreatedExcludeExtensionsInput"/);
  assert.match(html, /id="calendarUpdatedExcludeExtensionsInput"/);
  assert.match(html, /id="mergedDocumentExcludeExtensionsInput"/);
  assert.match(app, /const DEFAULT_CALENDAR_EXTENSION_EXCLUDES = \["png", "jpg", "gif"\]/);
  assert.match(app, /calendarCreatedExcludeExtensions: \[\.\.\.DEFAULT_CALENDAR_EXTENSION_EXCLUDES\]/);
  assert.match(app, /calendarUpdatedExcludeExtensions: \[\.\.\.DEFAULT_CALENDAR_EXTENSION_EXCLUDES\]/);
  assert.match(app, /mergedDocumentExcludeExtensions: \[\.\.\.DEFAULT_CALENDAR_EXTENSION_EXCLUDES\]/);
});

test("calendar extension exclude options fall back to the default list", () => {
  assert.match(app, /localStorage\.getItem\("obsidian-web-viewer-calendar-created-exclude-extensions"\) \?\? DEFAULT_CALENDAR_EXTENSION_EXCLUDES/);
  assert.match(app, /localStorage\.getItem\("obsidian-web-viewer-calendar-updated-exclude-extensions"\) \?\? DEFAULT_CALENDAR_EXTENSION_EXCLUDES/);
  assert.match(app, /localStorage\.getItem\("obsidian-web-viewer-merged-document-exclude-extensions"\) \?\? DEFAULT_CALENDAR_EXTENSION_EXCLUDES/);
});

test("created and updated calendar file lists apply separate extension exclusions", () => {
  const body = app.match(/function buildRecentFiles\(\)[\s\S]*?\n}\r?\n\r?\nfunction waitForBrowser/)?.[0] || "";
  assert.match(body, /state\.calendarUpdatedExcludeExtensions/);
  assert.match(body, /state\.calendarCreatedExcludeExtensions/);
  assert.match(body, /FILE_EXTENSION_FILTER_RULES\.isExcludedByExtension/);
});

test("merged document view applies its own extension exclusions", () => {
  const body = app.match(/function collectMergedDocumentFiles\(range\)[\s\S]*?\n}\r?\n\r?\nfunction isTimestampInRange/)?.[0] || "";
  assert.match(body, /isTextVaultFilePath\(node\.name\)/);
  assert.match(body, /state\.mergedDocumentExcludeExtensions/);
  assert.match(body, /FILE_EXTENSION_FILTER_RULES\.isExcludedByExtension/);
});

test("extension exclude settings are loaded and saved with server settings", () => {
  assert.match(app, /calendarCreatedExcludeExtensions: extensionListInputValue\(state\.calendarCreatedExcludeExtensions\)/);
  assert.match(app, /calendarUpdatedExcludeExtensions: extensionListInputValue\(state\.calendarUpdatedExcludeExtensions\)/);
  assert.match(app, /mergedDocumentExcludeExtensions: extensionListInputValue\(state\.mergedDocumentExcludeExtensions\)/);
  assert.match(app, /applyCalendarExtensionExcludeSettings\(settings/);
});

test("low priority calendar tasks are visually subdued and sorted after other tasks", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  assert.match(app, /function isLowPriorityTask\(task\)/);
  assert.match(app, /function compareCalendarTaskOrder\(a, b\)/);
  const body = app.match(/function groupTasksByDate\(tasks\)[\s\S]*?\n}\r?\n\r?\nfunction calendarPreviewTasks/)?.[0] || "";
  assert.match(body, /items\.sort\(compareCalendarTaskOrder\)/);
  assert.match(app, /Number\(isLowPriorityTask\(a\)\) - Number\(isLowPriorityTask\(b\)\)/);
  assert.match(styles, /\.calendar-task-wrap\.pri-하/);
  assert.match(styles, /filter: saturate\(/);
});

test("30d task calendar advances when next week is outside the visible month", () => {
  assert.match(app, /function ensureMonthCalendarShowsNextWeekFromToday\(\)/);
  const renderBody = app.match(/function renderCalendar\(\)[\s\S]*?\n}\r?\n\r?\nfunction renderEisenhowerMatrix/)?.[0] || "";
  assert.match(renderBody, /ensureMonthCalendarShowsNextWeekFromToday\(\)/);
  assert.match(app, /const nextWeek = addDays\(today, 7\)/);
  assert.match(app, /state\.calendarDate = startOfMonth\(nextWeek\)/);
});

test("30d task sorting places deferred last then priority before due date", () => {
  assert.match(app, /function calendarTaskPriorityRank\(task\)/);
  assert.match(app, /function calendarTaskDueSortKey\(task\)/);
  const compareBody = app.match(/function compareCalendarTaskOrder\(a, b\)[\s\S]*?\n}/)?.[0] || "";
  assert.match(compareBody, /Number\(a\.deferred\) - Number\(b\.deferred\)/);
  assert.match(compareBody, /calendarTaskPriorityRank\(a\) - calendarTaskPriorityRank\(b\)/);
  assert.match(compareBody, /calendarTaskDueSortKey\(a\) - calendarTaskDueSortKey\(b\)/);
});

test("1d task view opens on today by default", () => {
  const buildBody = app.match(/async function buildMatrixView\(\)[\s\S]*?\n}\r?\n\r?\nfunction scheduleCalendarRefresh/)?.[0] || "";
  assert.match(buildBody, /state\.calendarDate = new Date\(\)/);
  assert.match(app, /if \(nextMode === "day" && state\.calendarKind === "tasks"\) \{[\s\S]{0,120}state\.calendarDate = new Date\(\)/);
  assert.match(app, /if \(mode === "day"\) \{[\s\S]{0,160}state\.calendarDate = new Date\(\)/);
});

test("mobile 1d matrix avoids forced leftover vertical whitespace", () => {
  const mobileBlock = styles.match(/@media \(max-width: 520px\) \{[\s\S]*?\.markdown-body \.heading-level/)?.[0] || "";
  assert.match(mobileBlock, /\.matrix-shell\s*\{[\s\S]*?height:\s*auto/);
  assert.match(mobileBlock, /\.matrix-grid\s*\{[\s\S]*?grid-template-rows:\s*none/);
  assert.match(mobileBlock, /\.matrix-quadrant\s*\{[\s\S]*?max-height:\s*none/);
});

test("duplicating a task pre-fills the body with a link to the source document", () => {
  assert.match(app, /function taskSourceDocumentLink/);
  const createBody = app.match(/async function showTaskCreateDialog\(dueDate, startDate = "", prefill = null\)[\s\S]*?\n}\r?\n\r?\nfunction positionTaskCreateDialog/)?.[0] || "";
  assert.match(createBody, /taskSourceDocumentLink\(prefill\)/);
  assert.match(createBody, /taskLinkSubItemsToEditableText\(prefill\.subItems\)/);
  assert.doesNotMatch(createBody, /taskSubItemsToEditableText\(prefill\.subItems\)/);
  assert.match(app, /function taskLinkSubItemsToEditableText/);
});

test("task edit delete closes the native dialog before showing app confirm", () => {
  const body = app.match(/els\.taskEditDeleteBtn\?\.addEventListener\("click", async \(\) => \{[\s\S]*?\n  \}\);/)?.[0] || "";
  assert.match(body, /const reopenOnCancel = els\.taskEditDialog\?\.open/);
  assert.match(body, /els\.taskEditDialog\.close\("delete-confirm"\)/);
  assert.match(body, /await appConfirm/);
  assert.match(body, /await showTaskEditDialog\(task\)/);
});

test("recurring tasks store weekdays and render only on selected weekdays", () => {
  assert.match(app, /const TASK_REPEAT_WEEKDAYS = \["월", "화", "수", "목", "금", "토", "일"\]/);
  assert.match(app, /function extractTaskRepeatWeekdays\(text\)/);
  assert.match(app, /function replaceTaskRepeatWeekdays\(line, weekdays\)/);
  assert.match(app, /repeatWeekdays: extractTaskRepeatWeekdays\(rawText\)/);
  const calendarDatesBody = app.match(/function taskCalendarDates\(task\)[\s\S]*?\n}\r?\n\r?\nfunction taskTypeRank/)?.[0] || "";
  assert.match(calendarDatesBody, /if \(task\.isRecurring\) return recurringTaskCalendarDates\(task\)/);
  assert.match(app, /function recurringTaskCalendarDates\(task\)/);
});

test("recurring task dialogs expose weekday toggles", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /id="taskRepeatWeekdays"/);
  assert.match(html, /id="taskEditRepeatWeekdays"/);
  assert.match(html, /data-repeat-all/);
  assert.match(app, /function syncTaskRepeatControls\(scope\)/);
  assert.match(app, /toggleTaskRepeatWeekday\(scope, weekday\)/);
});

test("recurring task dialogs keep start date, remove end time, and separate everyday from weekdays", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /class="task-repeat-everyday"[\s\S]*data-repeat-all/);
  assert.match(html, /class="task-repeat-weekday-list"[\s\S]*data-repeat-weekday/);
  assert.match(app, /const startPart = isRecurring[\s\S]*startDate/);
  assert.match(app, /const duePart = !isRecurring[\s\S]*dueDate/);
  assert.match(app, /const dueTime = isRecurring \? "" : normalizeTaskTimeInput\(els\.taskDueTimeInput\)/);
  assert.match(app, /const dueTime = isRecurring \? "" : normalizeTaskTimeInput\(els\.taskEditDueTimeInput\)/);
  assert.match(app, /const dueField = scope === "edit"[\s\S]*closest\("\.task-create-field"\)/);
  assert.match(app, /if \(dueField\) dueField\.hidden = isRecurring/);
  assert.match(app, /function toggleTaskRepeatEveryday\(scope\)/);
  assert.match(app, /selected\.size === TASK_REPEAT_WEEKDAYS\.length \? \[\] : \[\.\.\.TASK_REPEAT_WEEKDAYS\]/);
});

test("matrix uses today progress completed routine and deferred sections", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  assert.match(app, /key: "active"/);
  assert.match(app, /key: "completed"/);
  assert.match(app, /key: "recurring"/);
  assert.match(app, /key: "deferred"/);
  assert.doesNotMatch(app, /key: "urgent"/);
  assert.doesNotMatch(app, /\.filter\(\(task\) => !task\.checked\)/);
  assert.match(app, /function matrixTaskPlacement\(task\)/);
  assert.match(app, /if \(task\.isRecurring\) return "recurring"/);
  assert.match(app, /if \(task\.checked\) return "completed"/);
  assert.match(app, /if \(task\.deferred\) return "deferred"/);
  assert.doesNotMatch(app, /if \(task\.deferred \|\| isLowPriorityTask\(task\)\) return "deferred"/);
  assert.match(app, /function compareMatrixTodoTasks\(a, b\)/);
  assert.match(app, /function compareMatrixDateTasks\(a, b\)/);
  assert.match(app, /completed: \{ key: "completed", kind: TASK_KIND_TODO, recurring: false, checked: true/);
  assert.match(app, /deferred: \{ key: "deferred", kind: TASK_KIND_TODO, priority: TASK_PRIORITY_MEDIUM, recurring: false, deferred: true/);
  assert.match(app, /function replaceMatrixTaskStatus\(line, placement\)/);
  assert.doesNotMatch(app, /if \(button\.getAttribute\("data-matrix-key"\) === "recurring"\)[\s\S]*?await toggleCalendarTask\(path, line, button\)/);
  assert.match(styles, /\.matrix-quadrant\.active/);
  assert.match(styles, /\.matrix-quadrant\.completed/);
  assert.match(styles, /\.matrix-quadrant\.deferred/);
  assert.match(styles, /grid-row: 1 \/ span 2/);
});

test("matrix removes shell gap", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const shellBody = styles.match(/\.matrix-shell \{[\s\S]*?\n\}/)?.[0] || "";
  assert.doesNotMatch(shellBody, /gap:/);
});

test("matrix date range navigation keeps arrows from overlapping long titles", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const renderMatrixBody = app.match(/function renderEisenhowerMatrix\(\)[\s\S]*?\n}\r?\nfunction renderCalendarFilterToggleButton/)?.[0] || "";
  const navBody = styles.match(/\.matrix-date-nav \{[\s\S]*?\n\}/)?.[0] || "";
  const titleBody = styles.match(/\.matrix-date-nav strong \{[\s\S]*?\n\}/)?.[0] || "";
  const buttonBody = styles.match(/\.matrix-date-nav button \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(renderMatrixBody, /class="calendar-month-nav matrix-date-nav"/);
  assert.match(navBody, /grid-template-columns: 28px minmax\(0, 1fr\) 28px/);
  assert.match(navBody, /min-width: 0/);
  assert.match(titleBody, /width: 100%/);
  assert.match(titleBody, /text-overflow: ellipsis/);
  assert.match(buttonBody, /width: 28px/);
});

test("matrix hides explanatory rules and keeps task text inside one-line cards", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const matrixBody = app.match(/function renderEisenhowerMatrix\(\)[\s\S]*?\n}\r?\nfunction renderCalendarFilterToggleButton/)?.[0] || "";
  assert.doesNotMatch(matrixBody, /renderMatrixRules/);
  assert.doesNotMatch(app, /오늘 진행: 미완료 일정 \+ 할 일/);
  const taskTextBody = styles.match(/\.matrix-task-text \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(styles, /\.matrix-task \{[\s\S]*?box-sizing: border-box/);
  assert.match(styles, /\.matrix-task-title \{[\s\S]*?overflow: hidden/);
  assert.match(taskTextBody, /overflow-wrap: anywhere/);
  assert.match(taskTextBody, /white-space: nowrap/);
  assert.match(taskTextBody, /text-overflow: ellipsis/);
  assert.doesNotMatch(taskTextBody, /-webkit-line-clamp/);
  assert.match(styles, /\.matrix-task-meta \{[\s\S]*?overflow-wrap: anywhere/);
});

test("matrix task rows are compact one-line title and metadata rows", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const taskBody = styles.match(/\.matrix-task \{[\s\S]*?\n\}/)?.[0] || "";
  const titleBody = styles.match(/\.matrix-task-title \{[\s\S]*?\n\}/)?.[0] || "";
  const metaBody = styles.match(/\.matrix-task-meta \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(taskBody, /flex: 0 0 auto/);
  assert.match(taskBody, /display: grid/);
  assert.match(taskBody, /grid-template-columns: minmax\(0, 1fr\) 126px/);
  assert.match(taskBody, /line-height: 1\.35/);
  assert.match(taskBody, /min-height: 28px/);
  assert.match(titleBody, /flex: 1 1 auto/);
  assert.match(metaBody, /flex: 0 0 auto/);
  assert.match(metaBody, /white-space: nowrap/);
});

test("matrix tasks are one-line cards with time and no per-task attitude text", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const renderTaskBody = app.match(/function renderMatrixTask\(task, quadrant = \{\}\)[\s\S]*?\n}\r?\n\r?\nfunction renderMatrixQuickAdd/)?.[0] || "";
  const taskBody = styles.match(/\.matrix-task \{[\s\S]*?\n\}/)?.[0] || "";
  const textBody = styles.match(/\.matrix-task-text \{[\s\S]*?\n\}/)?.[0] || "";
  const metaBody = styles.match(/\.matrix-task-meta \{[\s\S]*?\n\}/)?.[0] || "";
  assert.doesNotMatch(renderTaskBody, /matrix-task-attitude/);
  assert.match(renderTaskBody, /matrixTaskMetaHtml\(task, due\)/);
  assert.match(app, /function matrixTaskTime\(task, due\)/);
  assert.match(app, /taskTimeForDate\(task, due\)/);
  assert.doesNotMatch(app, /일정과 할 일, 중요도 높은 순/);
  assert.doesNotMatch(app, /미루기와 중요도 낮음/);
  assert.doesNotMatch(app, /오늘 처리한 항목/);
  assert.doesNotMatch(app, /습관은 체크 중심/);
  assert.match(taskBody, /display: grid/);
  assert.match(taskBody, /min-height: 28px/);
  assert.match(textBody, /text-overflow: ellipsis/);
  assert.match(textBody, /white-space: nowrap/);
  assert.match(metaBody, /white-space: nowrap/);
});

test("matrix active quadrant has quick todo input that adds medium-priority todo for the matrix date", () => {
  const renderQuadrantBody = app.match(/function renderMatrixQuadrant\(quadrant\)[\s\S]*?\n}\r?\n\r?\nfunction renderMatrixTask/)?.[0] || "";
  const quickAddBody = app.match(/function renderMatrixQuickAdd\(\)[\s\S]*?\n}\r?\n\r?\nfunction matrixTaskTime/)?.[0] || "";
  const bindBody = app.match(/function bindMatrixEvents\(\)[\s\S]*?\n}\r?\n\r?\nfunction bindMatrixQuickAdd/)?.[0] || "";
  assert.match(renderQuadrantBody, /renderMatrixQuickAdd/);
  assert.match(renderQuadrantBody, /matrix-task-list[\s\S]*renderMatrixQuickAdd/);
  assert.match(quickAddBody, /matrix-quick-add/);
  assert.match(quickAddBody, /data-matrix-quick-input/);
  assert.match(quickAddBody, /data-matrix-quick-submit/);
  assert.match(bindBody, /bindMatrixQuickAdd/);
  assert.match(app, /async function addMatrixQuickTodo\(title\)/);
  assert.match(app, /const dateKey = formatDate\(matrixDateRange\(\)\.start\)/);
  assert.match(app, /#\$\{TASK_KIND_TODO\} #\$\{TASK_PRIORITY_MEDIUM\}/);
  assert.match(app, /📅 \$\{dateKey\}/);
});

test("matrix supports subitem expand controls and compact subitem rows", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const renderTaskBody = app.match(/function renderMatrixTask\(task, quadrant = \{\}\)[\s\S]*?\n}\r?\n\r?\nfunction renderMatrixQuickAdd/)?.[0] || "";
  const bindBody = app.match(/function bindMatrixEvents\(\)[\s\S]*?\n}\r?\n\r?\nfunction bindMatrixQuickAdd/)?.[0] || "";
  const listBody = styles.match(/\.matrix-task-list \{[\s\S]*?\n\}/)?.[0] || "";
  const subItemsBody = styles.match(/\.matrix-task-sub-items \{[\s\S]*?\n\}/)?.[0] || "";
  const subBulletBody = styles.match(/\.matrix-task-sub-items \.task-sub-bullet \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(app, /matrixExpandedTasks: new Set\(\)/);
  assert.match(app, /data-matrix-expand-all/);
  assert.doesNotMatch(renderTaskBody, /matrix-subitems-toggle/);
  assert.match(renderTaskBody, /renderMatrixTaskSubItems\(task\)/);
  assert.match(app, /function renderMatrixTaskSubItems\(task\)/);
  assert.match(app, /renderSubItemsHtml\(task\.subItems\)/);
  assert.match(bindBody, /toggleMatrixAllSubItems/);
  assert.doesNotMatch(bindBody, /toggleMatrixTaskSubItems/);
  assert.match(listBody, /gap: 3px/);
  assert.match(subItemsBody, /grid-column: 1/);
  assert.match(subItemsBody, /padding: 1px 6px 1px/);
  assert.match(subBulletBody, /font-size: 70%/);
});

test("matrix task rows put delete action on the right and shrink quick add height", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const renderTaskBody = app.match(/function renderMatrixTask\(task, quadrant = \{\}\)[\s\S]*?\n}\r?\n\r?\nfunction renderMatrixQuickAdd/)?.[0] || "";
  const bindBody = app.match(/function bindMatrixEvents\(\)[\s\S]*?\n}\r?\n\r?\nfunction bindMatrixQuickAdd/)?.[0] || "";
  const quickAddBody = styles.match(/\.matrix-quick-add \{[\s\S]*?\n\}/)?.[0] || "";
  const quickInputBody = styles.match(/\.matrix-quick-add input \{[\s\S]*?\n\}/)?.[0] || "";
  const quickButtonBody = styles.match(/\.matrix-quick-add button \{[\s\S]*?\n\}/)?.[0] || "";
  const rowTaskBody = styles.match(/\.matrix-task-row > button:is\(\.matrix-task\) \{[\s\S]*?\n\}/)?.[0] || "";
  const rowBody = styles.match(/\.matrix-task-row \{[\s\S]*?\n\}/)?.[0] || "";
  const deleteBody = styles.match(/\.matrix-task-delete \{[\s\S]*?\n\}/)?.[0] || "";
  const taskBody = styles.match(/\.matrix-task \{[\s\S]*?\n\}/)?.[0] || "";
  const metaBody = styles.match(/\.matrix-task-meta \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(renderTaskBody, /matrix-task-row/);
  assert.match(renderTaskBody, /matrix-task-delete/);
  assert.match(renderTaskBody, /data-matrix-delete-path/);
  assert.match(renderTaskBody, /&#128465;/);
  assert.match(bindBody, /deleteMatrixTask/);
  assert.match(app, /async function deleteMatrixTask\(path, line\)/);
  assert.match(app, /await deleteCalendarTaskLine\(path, line\)/);
  assert.match(rowBody, /background: var\(--surface-2\)/);
  assert.match(rowBody, /border: 1px solid var\(--line\)/);
  assert.match(taskBody, /display: grid/);
  assert.match(taskBody, /grid-template-columns: minmax\(0, 1fr\) 126px/);
  assert.match(metaBody, /display: grid/);
  assert.match(metaBody, /grid-template-columns: minmax\(0, 1fr\) 24px/);
  assert.match(deleteBody, /background: transparent/);
  assert.match(deleteBody, /border: 0/);
  assert.match(quickAddBody, /padding: 2px 8px/);
  assert.match(quickInputBody, /font-size: 70%/);
  assert.match(quickInputBody, /padding: 2px 6px/);
  assert.match(quickButtonBody, /font-size: 70%/);
  assert.match(quickButtonBody, /padding: 2px 6px/);
  assert.match(rowTaskBody, /flex: 1 1 auto/);
  assert.match(rowTaskBody, /min-width: 0/);
  assert.match(rowTaskBody, /width: auto/);
});

test("matrix recurring moves set daily recurring and moving out resets to medium todo", () => {
  const placementBody = app.match(/function matrixPlacementFromKey\(key\)[\s\S]*?\n}\r?\n\r?\nfunction bindMatrixTaskPointerDrag/)?.[0] || "";
  const moveBody = app.match(/async function moveTaskToMatrixQuadrant\(path, lineNumber, placement\)[\s\S]*?\n}\r?\n\r?\nfunction replaceMatrixTaskStatus/)?.[0] || "";
  assert.match(placementBody, /recurring: \{ key: "recurring", kind: TASK_KIND_RECURRING, recurring: true, checked: false, deferred: false \}/);
  assert.match(placementBody, /active: \{ key: "active", kind: TASK_KIND_TODO, priority: TASK_PRIORITY_MEDIUM, recurring: false, checked: false, deferred: false \}/);
  assert.match(placementBody, /completed: \{ key: "completed", kind: TASK_KIND_TODO, recurring: false, checked: true, deferred: false \}/);
  assert.match(placementBody, /deferred: \{ key: "deferred", kind: TASK_KIND_TODO, priority: TASK_PRIORITY_MEDIUM, recurring: false, deferred: true, checked: false \}/);
  assert.match(moveBody, /replaceTaskRepeatWeekdays\(nextLine, TASK_REPEAT_WEEKDAYS\)/);
  assert.match(moveBody, /replaceTaskKindTag\(nextLine, placement\.kind\)/);
  assert.match(moveBody, /replaceTaskPriorityTag\(nextLine, placement\.priority\)/);
});

test("matrix recurring task click opens task view instead of toggling done", () => {
  const bindBody = app.match(/function bindMatrixEvents\(\)[\s\S]*?\n}\r?\n\r?\nfunction toggleMatrixAllSubItems/)?.[0] || "";
  assert.doesNotMatch(bindBody, /if \(button\.getAttribute\("data-matrix-key"\) === "recurring"\)[\s\S]*?toggleCalendarTask/);
  assert.match(bindBody, /if \(task\) await showTaskEditDialog\(task\)/);
});

test("matrix active keeps low priority tasks while deferred only shows postponed tasks", () => {
  const placementBody = app.match(/function matrixTaskPlacement\(task\)[\s\S]*?\n}\r?\nfunction bindMatrixEvents/)?.[0] || "";
  assert.match(placementBody, /if \(task\.deferred\) return "deferred"/);
  assert.doesNotMatch(placementBody, /isLowPriorityTask\(task\)/);
  assert.match(placementBody, /return "active"/);
});

test("matrix task cards use 30d priority background colors", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const renderTaskBody = app.match(/function renderMatrixTask\(task, quadrant = \{\}\)[\s\S]*?\n}\r?\n\r?\nfunction renderMatrixTaskSubItems/)?.[0] || "";
  assert.match(renderTaskBody, /task\.priority \? `pri-\$\{task\.priority\}` : ""/);
  assert.match(renderTaskBody, /matrix-task-card \$\{matrixTaskClasses\(task, hasSubItems\)\}/);
  assert.match(app, /function matrixTaskClasses\(task, hasSubItems\)/);
  assert.match(styles, /\.matrix-task-card\.pri-상 \.matrix-task-row/);
  assert.match(styles, /\.matrix-task-card\.pri-중 \.matrix-task-row/);
  assert.match(styles, /\.matrix-task-card\.pri-하 \.matrix-task-row/);
  assert.match(styles, /color-mix\(in srgb, #e74c3c 13%, var\(--surface-2\)\)/);
  assert.match(styles, /color-mix\(in srgb, #e6a20f 11%, var\(--surface-2\)\)/);
  assert.match(styles, /filter: saturate\(0\.55\) brightness\(0\.96\)/);
});

test("matrix task metadata colors matching dates and priorities consistently", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const metaBody = app.match(/function matrixTaskMetaHtml\(task, due\)[\s\S]*?\n}\r?\n\r?\nfunction matrixTaskTime/)?.[0] || "";
  assert.match(app, /function matrixMetaDateClass\(dateKey\)/);
  assert.match(app, /function matrixPriorityFlag\(task\)/);
  assert.match(metaBody, /matrix-task-meta-datetime \$\{matrixMetaDateClass\(due\)\}/);
  assert.match(metaBody, /matrix-task-meta-priority priority-rank-\$\{matrixPriorityRank\(task\)\}/);
  assert.match(metaBody, /matrixPriorityFlag\(task\)/);
  assert.match(styles, /\.matrix-task-meta-datetime\.date-color-0/);
  assert.match(styles, /\.matrix-task-meta-datetime\.date-color-5/);
  assert.match(styles, /\.matrix-task-meta-priority\.priority-rank-0/);
  assert.match(styles, /\.matrix-task-meta-priority\.priority-rank-1/);
  assert.match(styles, /\.matrix-task-meta-priority\.priority-rank-2/);
  assert.match(styles, /\.matrix-task-meta-priority \{/);
  assert.match(styles, /width: 22px/);
  assert.doesNotMatch(styles, /border: 1px solid currentColor/);
});

test("matrix sorting is priority first then nearest deadline with no deadline last", () => {
  const orderBody = app.match(/function compareMatrixTaskOrder\(a, b\)[\s\S]*?\n}\r?\n\r?\nfunction compareMatrixTodoTasks/)?.[0] || "";
  assert.match(app, /function matrixTaskDeadlineKey\(task\)/);
  assert.match(orderBody, /const priority = matrixPriorityRank\(a\) - matrixPriorityRank\(b\)/);
  assert.match(orderBody, /if \(priority\) return priority/);
  assert.match(orderBody, /if \(!aDeadline && bDeadline\) return 1/);
  assert.match(orderBody, /if \(aDeadline && !bDeadline\) return -1/);
  assert.match(app, /return compareMatrixTaskOrder\(a, b\)/);
});

test("matrix quadrants expose independent sort options", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  const renderMatrixBody = app.match(/function renderEisenhowerMatrix\(\)[\s\S]*?\n}\r?\nfunction renderCalendarFilterToggleButton/)?.[0] || "";
  const renderQuadrantBody = app.match(/function renderMatrixQuadrant\(quadrant\)[\s\S]*?\n}\r?\n\r?\nfunction renderMatrixTask/)?.[0] || "";
  const bindBody = app.match(/function bindMatrixEvents\(\)[\s\S]*?\n}\r?\n\r?\nfunction toggleMatrixAllSubItems/)?.[0] || "";
  assert.match(app, /function defaultMatrixSortModes\(\)/);
  assert.match(app, /function defaultMatrixSortDirections\(\)/);
  assert.match(app, /matrixSortModes: defaultMatrixSortModes\(\)/);
  assert.match(app, /matrixSortDirections: defaultMatrixSortDirections\(\)/);
  assert.match(renderMatrixBody, /compareMatrixTasksByMode\(a, b, matrixSortModeForKey\(quadrant\.key\), matrixSortDirectionForKey\(quadrant\.key\)\)/);
  assert.match(renderQuadrantBody, /class="matrix-quadrant-count"/);
  assert.match(renderQuadrantBody, /\$\{quadrant\.tasks\.length\}/);
  assert.match(renderQuadrantBody, /data-matrix-sort="\$\{escapeAttribute\(quadrant\.key\)\}"/);
  assert.match(renderQuadrantBody, /data-matrix-sort-direction="\$\{escapeAttribute\(quadrant\.key\)\}"/);
  assert.match(renderQuadrantBody, /matrixSortModeForKey\(quadrant\.key\)/);
  assert.match(renderQuadrantBody, /matrixSortDirectionForKey\(quadrant\.key\)/);
  assert.match(bindBody, /querySelectorAll\("\[data-matrix-sort\]"\)/);
  assert.match(bindBody, /querySelectorAll\("\[data-matrix-sort-direction\]"\)/);
  assert.match(bindBody, /state\.matrixSortModes\[key\] = mode/);
  assert.match(bindBody, /state\.matrixSortDirections\[key\] = current === "asc" \? "desc" : "asc"/);
  assert.match(app, /return direction === "desc" \? -result : result/);
  assert.match(styles, /\.matrix-sort-control \{/);
  assert.match(styles, /\.matrix-sort-select \{/);
  assert.match(styles, /\.matrix-sort-direction \{/);
  assert.match(styles, /\.matrix-quadrant-count \{/);
});
