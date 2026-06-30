const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

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
  assert.match(app, /if \(task\.deferred \|\| isLowPriorityTask\(task\)\) return "deferred"/);
  assert.match(app, /function compareMatrixTodoTasks\(a, b\)/);
  assert.match(app, /function compareMatrixDateTasks\(a, b\)/);
  assert.match(app, /completed: \{ key: "completed", checked: true/);
  assert.match(app, /deferred: \{ key: "deferred", deferred: true/);
  assert.match(app, /function replaceMatrixTaskStatus\(line, placement\)/);
  assert.match(app, /if \(button\.getAttribute\("data-matrix-key"\) === "recurring"\)/);
  assert.match(app, /await toggleCalendarTask\(path, line, button\)/);
  assert.match(styles, /\.matrix-quadrant\.active/);
  assert.match(styles, /\.matrix-quadrant\.completed/);
  assert.match(styles, /\.matrix-quadrant\.deferred/);
  assert.match(styles, /grid-row: 1 \/ span 2/);
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
  assert.match(taskBody, /flex-direction: row/);
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
  assert.match(renderTaskBody, /matrixTaskMetaText\(task, due\)/);
  assert.match(app, /function matrixTaskTime\(task, due\)/);
  assert.match(app, /taskTimeForDate\(task, due\)/);
  assert.doesNotMatch(app, /일정과 할 일, 중요도 높은 순/);
  assert.doesNotMatch(app, /미루기와 중요도 낮음/);
  assert.doesNotMatch(app, /오늘 처리한 항목/);
  assert.doesNotMatch(app, /습관은 체크 중심/);
  assert.match(taskBody, /flex-direction: row/);
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
  assert.match(quickAddBody, /matrix-quick-add/);
  assert.match(quickAddBody, /data-matrix-quick-input/);
  assert.match(quickAddBody, /data-matrix-quick-submit/);
  assert.match(bindBody, /bindMatrixQuickAdd/);
  assert.match(app, /async function addMatrixQuickTodo\(title\)/);
  assert.match(app, /const dateKey = formatDate\(matrixDateRange\(\)\.start\)/);
  assert.match(app, /#\$\{TASK_KIND_TODO\} #\$\{TASK_PRIORITY_MEDIUM\}/);
  assert.match(app, /📅 \$\{dateKey\}/);
});
