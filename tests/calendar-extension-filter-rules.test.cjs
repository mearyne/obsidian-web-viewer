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

test("matrix uses todo schedule recurring sections and their sort rules", () => {
  const styles = fs.readFileSync("styles.css", "utf8");
  assert.match(app, /key: "todo"/);
  assert.match(app, /key: "schedule"/);
  assert.match(app, /key: "recurring"/);
  assert.doesNotMatch(app, /key: "urgent"/);
  assert.match(app, /function matrixTaskPlacement\(task\)/);
  assert.match(app, /function compareMatrixTodoTasks\(a, b\)/);
  assert.match(app, /function compareMatrixDateTasks\(a, b\)/);
  assert.match(styles, /\.matrix-quadrant\.todo/);
  assert.match(styles, /grid-row: 1 \/ span 2/);
});
