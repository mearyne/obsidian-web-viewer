const TASKS_DIRTY_KEY = "obsidian-web-viewer-tasks-dirty";
const EDITOR_AUTO_SAVE_INTERVAL = 30 * 1000;
const DOCUMENT_OPEN_SLOW_STEP_MS = 120;
const DOCUMENT_OPEN_SLOW_TOTAL_MS = 500;
function setTasksDirty() { try { localStorage.setItem(TASKS_DIRTY_KEY, "1"); } catch {} }
function clearTasksDirty() { try { localStorage.removeItem(TASKS_DIRTY_KEY); } catch {} }
function isTasksDirty() { try { return localStorage.getItem(TASKS_DIRTY_KEY) === "1"; } catch { return false; } }
const CALENDAR_GESTURE_RULES = globalThis.CalendarGestureRules || {
  thresholds: {
    dragDistance: 10,
    longPressMs: 650,
  },
};
const CALENDAR_DRAG_DISTANCE = CALENDAR_GESTURE_RULES.thresholds.dragDistance;
const CALENDAR_LONG_PRESS_MS = CALENDAR_GESTURE_RULES.thresholds.longPressMs;

const state = {
  files: new Map(),
  directories: new Map(),
  root: makeDirNode("", ""),
  vaultName: "",
  rootHandle: null,
  serverVaultWritable: false,
  currentPath: null,
  currentContent: "",
  currentNode: null,
  editMode: false,
  markdownEnabled: true,
  objectUrls: new Map(),
  readFileRequests: new Map(),
  savedVaults: [],
  tasks: [],
  calendarTaskFiles: new Map(),
  calendarDate: new Date(),
  calendarMode: "month",
  vaultSyncing: false,
  calendarRefreshInFlight: false,
  calendarRefreshTimer: null,
  calendarFilterTimer: null,
  settingsSaveTimer: null,
  suppressPinnedReload: 0,
  calendarRefreshing: false,
  calendarCacheState: "empty",
  calendarSyncedAt: 0,
  holidays: new Map(),
  holidayYearsLoaded: new Set(),
  holidayYearsLoading: new Set(),
  holidayRenderTimer: null,
  metadataSyncedAt: 0,
  recentFiles: { updated: [], created: [] },
  recentlyOpenedPaths: [],
  calendarKind: "tasks",
  matrixPeriodDays: 1,
  mobileCalendarMode: "agenda",
  calendarRowLimit: 5,
  dailyNotePath: "1. Daily",
  newNotePath: "",
  imageSavePath: "",
  searchExcludePaths: [],
  contentSearchTimer: null,
  contentSearchQuery: "",
  contentSearchMatches: null,
  contentSearchSnippetsVisible: false,
  searchTreeAutoExpand: true,
  renderedSearchQuery: "",
  vaultLoaded: false,
  taskDialogActiveField: null,
  taskDialogPickerMonth: null,
  taskDialogMeta: { kind: null, category: null, priority: null, tags: [] },
  taskEditActiveField: null,
  taskEditPickerMonth: null,
  taskEditMeta: { kind: null, category: null, priority: null, tags: [] },
  taskEditTask: null,
  calendarTaskFilters: { types: [], categories: [], tags: [], priorities: [] },
  calendarTaskTags: ["게임", "가족", "공부"],
  calendarFilterOpen: false,
  connectionLost: false,
  connectionRetryTimer: null,
  sidebarResize: null,
  sidebarPinned: false,
  tabDrag: null,
  tabDragSuppressUntil: 0,
  activeTabId: "main",
  tabs: [{ id: "main", path: null, title: "새 탭", pinned: false, scrollTop: 0 }],
  navigationHistories: new Map(),
  navigatingHistory: false,
  lightboxImages: [],
  lightboxIndex: -1,
  treeSortMode: "created",
  treeSortDirection: "desc",
  activeView: "note",
  editorDirty: false,
  autoSaveTimer: null,
  autoSaveInFlight: false,
  calendarDragStartDate: "",
  calendarDragCurrentDate: "",
  calendarDragHandled: false,
  calendarDragPointer: null,
  calendarTaskDrag: null,
  matrixTaskDrag: null,
  calendarTaskPendingStates: new Map(),
  calendarTaskWriteQueues: new Map(),
  noteTitlePressTimer: null,
  noteTitleDeleteSuppressedUntil: 0,
  calendarSwipe: null,
  calendarWheelAt: 0,
  calendarTaskOpenSuppressedUntil: 0,
  calendarDateOpenSuppressedUntil: 0,
  fullscreenAttempted: false,
  fullscreenFallback: false,
  fontDeviceKey: "",
  sseSource: null,
  documentRenderToken: 0,
  recentlyOpenedSaveTimer: null,
  randomMarkdownCacheKey: "",
  randomMarkdownPaths: [],
  randomSeenByTab: new Map(),
  randomOldFirst: false,
  randomNoticeToast: null,
  customConfirmResolve: null,
  lastGPressAt: 0,
  taskCreateSourceDate: "",
  selectedPaths: new Set(),
  lastSelectedPath: null,
  treeVisibleOrder: [],
};

const EXCALIDRAW_PREVIEW_ENABLED = false;

const els = {
  sidebarPanel: document.querySelector("#sidebarPanel"),
  sidebarResizeHandle: document.querySelector("#sidebarResizeHandle"),
  sidebarPinButton: document.querySelector("#sidebarPinButton"),
  fileTree: document.querySelector("#fileTree"),
  openVaultButton: document.querySelector("#openVaultButton"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  searchInput: document.querySelector("#searchInput"),
  caseSearchToggle: document.querySelector("#caseSearchToggle"),
  regexSearchToggle: document.querySelector("#regexSearchToggle"),
  treeSortSelect: document.querySelector("#treeSortSelect"),
  treeSortDirectionButton: document.querySelector("#treeSortDirectionButton"),
  expandTreeButton: document.querySelector("#expandTreeButton"),
  revealCurrentButton: document.querySelector("#revealCurrentButton"),
  collapseTreeButton: document.querySelector("#collapseTreeButton"),
  folderPathInput: document.querySelector("#folderPathInput"),
  calendarPathInput: document.querySelector("#calendarPathInput"),
  randomPathInput: document.querySelector("#randomPathInput"),
  dailyNotePathInput: document.querySelector("#dailyNotePathInput"),
  newNotePathInput: document.querySelector("#newNotePathInput"),
  imagePathInput: document.querySelector("#imagePathInput"),
  clipperFolderInput: document.querySelector("#clipperFolderInput"),
  clipperRuleList: document.querySelector("#clipperRuleList"),
  clipperRuleAddBtn: document.querySelector("#clipperRuleAddBtn"),
  searchExcludeInput: document.querySelector("#searchExcludeInput"),
  discordWebhookInput: document.querySelector("#discordWebhookInput"),
  discordNotifyListTodo: document.querySelector("#discordNotifyListTodo"),
  discordNotifyListEvent: document.querySelector("#discordNotifyListEvent"),
  discordNotifyAddTodoBtn: document.querySelector("#discordNotifyAddTodoBtn"),
  discordNotifyAddEventBtn: document.querySelector("#discordNotifyAddEventBtn"),
  discordFixedListTodo: document.querySelector("#discordFixedListTodo"),
  discordFixedListEvent: document.querySelector("#discordFixedListEvent"),
  discordFixedAddTodoBtn: document.querySelector("#discordFixedAddTodoBtn"),
  discordFixedAddEventBtn: document.querySelector("#discordFixedAddEventBtn"),
  discordTestBtn: document.querySelector("#discordTestBtn"),
  taskNotifyChip: document.querySelector("#taskNotifyChip"),
  taskEditNotifyChip: document.querySelector("#taskEditNotifyChip"),
  searchStatus: document.querySelector("#searchStatus"),
  contentSearchToggleButton: document.querySelector("#contentSearchToggleButton"),
  taskCreateDialog: document.querySelector("#taskCreateDialog"),
  taskTitleInput: document.querySelector("#taskTitleInput"),
  taskStartDateBtn: document.querySelector("#taskStartDateBtn"),
  taskStartDateClearBtn: document.querySelector("#taskStartDateClearBtn"),
  taskDueDateBtn: document.querySelector("#taskDueDateBtn"),
  taskDueDateClearBtn: document.querySelector("#taskDueDateClearBtn"),
  taskDatePickerCal: document.querySelector("#taskDatePickerCal"),
  taskStartTimeInput: document.querySelector("#taskStartTimeInput"),
  taskStartTimeClearBtn: document.querySelector("#taskStartTimeClearBtn"),
  taskDueTimeInput: document.querySelector("#taskDueTimeInput"),
  taskDueTimeClearBtn: document.querySelector("#taskDueTimeClearBtn"),
  taskCreateCancelBtn: document.querySelector("#taskCreateCancelBtn"),
  taskCreateConfirmBtn: document.querySelector("#taskCreateConfirmBtn"),
  taskKindChips: document.querySelector("#taskKindChips"),
  taskCategoryChips: document.querySelector("#taskCategoryChips"),
  taskPriorityChips: document.querySelector("#taskPriorityChips"),
  taskTagChips: document.querySelector("#taskTagChips"),
  taskTagsInput: document.querySelector("#taskTagsInput"),
  taskEditDialog: document.querySelector("#taskEditDialog"),
  taskEditTitleInput: document.querySelector("#taskEditTitleInput"),
  taskEditChecked: document.querySelector("#taskEditChecked"),
  taskEditDeferred: document.querySelector("#taskEditDeferred"),
  taskEditStartDateBtn: document.querySelector("#taskEditStartDateBtn"),
  taskEditStartDateClearBtn: document.querySelector("#taskEditStartDateClearBtn"),
  taskEditDueDateBtn: document.querySelector("#taskEditDueDateBtn"),
  taskEditDueDateClearBtn: document.querySelector("#taskEditDueDateClearBtn"),
  taskEditDatePickerCal: document.querySelector("#taskEditDatePickerCal"),
  taskEditStartTimeInput: document.querySelector("#taskEditStartTimeInput"),
  taskEditStartTimeClearBtn: document.querySelector("#taskEditStartTimeClearBtn"),
  taskEditDueTimeInput: document.querySelector("#taskEditDueTimeInput"),
  taskEditDueTimeClearBtn: document.querySelector("#taskEditDueTimeClearBtn"),
  taskEditCancelBtn: document.querySelector("#taskEditCancelBtn"),
  taskEditConfirmBtn: document.querySelector("#taskEditConfirmBtn"),
  taskEditOpenFileBtn: document.querySelector("#taskEditOpenFileBtn"),
  taskEditDeleteBtn: document.querySelector("#taskEditDeleteBtn"),
  taskEditDuplicateBtn: document.querySelector("#taskEditDuplicateBtn"),
  taskEditKindChips: document.querySelector("#taskEditKindChips"),
  taskEditCategoryChips: document.querySelector("#taskEditCategoryChips"),
  taskEditPriorityChips: document.querySelector("#taskEditPriorityChips"),
  taskEditTagChips: document.querySelector("#taskEditTagChips"),
  taskEditSubItems: document.querySelector("#taskEditSubItems"),
  taskEditSubItemsInput: document.querySelector("#taskEditSubItemsInput"),
  taskSubItemsPreview: document.querySelector("#taskSubItemsPreview"),
  taskEditIndentButton: document.querySelector("#taskEditIndentButton"),
  taskEditOutdentButton: document.querySelector("#taskEditOutdentButton"),
  taskCreateSubItemsInput: document.querySelector("#taskCreateSubItemsInput"),
  taskCreateIndentButton: document.querySelector("#taskCreateIndentButton"),
  taskCreateOutdentButton: document.querySelector("#taskCreateOutdentButton"),
  taskEditBodyEl: document.querySelector("#taskEditBodyEl"),
  taskEditDialogTitle: document.querySelector("#taskEditDialogTitle"),
  taskViewEditBtn: document.querySelector("#taskViewEditBtn"),
  taskViewCloseBtn: document.querySelector("#taskViewCloseBtn"),
  newNoteButton: document.querySelector("#newNoteButton"),
  newNoteDialog: document.querySelector("#newNoteDialog"),
  newNoteTitleInput: document.querySelector("#newNoteTitleInput"),
  newNoteCancelButton: document.querySelector("#newNoteCancelButton"),
  newNoteConfirmButton: document.querySelector("#newNoteConfirmButton"),
  connectionBanner: document.querySelector("#connectionBanner"),
  fontSelect: document.querySelector("#fontSelect"),
  fontResetButton: document.querySelector("#fontResetButton"),
  contentFontSizeInput: document.querySelector("#contentFontSizeInput"),
  calendarRowFontSizeInput: document.querySelector("#calendarRowFontSizeInput"),
  contentAlignSelect: document.querySelector("#contentAlignSelect"),
  contentMaxWidthInput: document.querySelector("#contentMaxWidthInput"),
  splitPane: document.querySelector("#splitPane"),
  splitTitle: document.querySelector("#splitTitle"),
  splitCloseButton: document.querySelector("#splitCloseButton"),
  splitMarkdownView: document.querySelector("#splitMarkdownView"),
  vaultStatus: document.querySelector("#vaultStatus"),
  notePath: document.querySelector("#notePath"),
  mobileDocTitle: document.querySelector("#mobileDocTitle"),
  noteTitle: document.querySelector("#noteTitle"),
  syncStatus: document.querySelector("#syncStatus"),
  viewerWrap: document.querySelector(".viewer-wrap"),
  newTabPage: document.querySelector("#newTabPage"),
  markdownView: document.querySelector("#markdownView"),
  editorShell: document.querySelector("#editorShell"),
  markdownEditor: document.querySelector("#markdownEditor"),
  editorPreview: document.querySelector("#editorPreview"),
  editorStatus: document.querySelector("#editorStatus"),
  editorUndoButton: document.querySelector("#editorUndoButton"),
  editorRedoButton: document.querySelector("#editorRedoButton"),
  editorIndentButton: document.querySelector("#editorIndentButton"),
  editorOutdentButton: document.querySelector("#editorOutdentButton"),
  editorHeadingButton: document.querySelector("#editorHeadingButton"),
  editorBulletButton: document.querySelector("#editorBulletButton"),
  editorTableButton: document.querySelector("#editorTableButton"),
  editorImageButton: document.querySelector("#editorImageButton"),
  editorImageInput: document.querySelector("#editorImageInput"),
  editorTaskButton: document.querySelector("#editorTaskButton"),
  editorGoodEmojiButton: document.querySelector("#editorGoodEmojiButton"),
  editorBadEmojiButton: document.querySelector("#editorBadEmojiButton"),
  calendarView: document.querySelector("#calendarView"),
  noteTitleArea: document.querySelector("#noteTitleArea"),
  headingControlsOverlay: document.querySelector("#headingControlsOverlay"),
  viewControlsOverlay: document.querySelector("#viewControlsOverlay"),
  loadingOverlay: document.querySelector("#loadingOverlay"),
  loadingText: document.querySelector("#loadingText"),
  markdownToggleButton: document.querySelector("#markdownToggleButton"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
  collapseHeadingsButton: document.querySelector("#collapseHeadingsButton"),
  collapseHeadingLevelButton: document.querySelector("#collapseHeadingLevelButton"),
  expandHeadingLevelButton: document.querySelector("#expandHeadingLevelButton"),
  historyBackButton: document.querySelector("#historyBackButton"),
  historyForwardButton: document.querySelector("#historyForwardButton"),
  webEditButton: document.querySelector("#webEditButton"),
  saveEditButton: document.querySelector("#saveEditButton"),
  randomFileButton: document.querySelector("#randomFileButton"),
  randomPriorityToggleButton: document.querySelector("#randomPriorityToggleButton"),
  calendarButton: document.querySelector("#calendarButton"),
  matrixButton: document.querySelector("#matrixButton"),
  optionsButton: document.querySelector("#optionsButton"),
  optionsMenu: document.querySelector("#optionsMenu"),
  optionsBackdrop: document.querySelector("#optionsBackdrop"),
  optionsCloseButton: document.querySelector("#optionsCloseButton"),
  imageLightbox: document.querySelector("#imageLightbox"),
  imageLightboxImg: document.querySelector("#imageLightboxImg"),
  imageLightboxClose: document.querySelector("#imageLightboxClose"),
  savedVaultList: document.querySelector("#savedVaultList"),
  editButton: document.querySelector("#editButton"),
  themeButton: document.querySelector("#themeButton"),
};

let excalidrawPreviewModulePromise = null;

const SAMPLE_FILES = {
  "README.md": `---
title: Obsidian Sample
tags: [web, markdown]
---

# Obsidian Sample Vault

왼쪽에는 vault의 폴더 구조가 표시됩니다. Markdown 파일을 선택하면 이 영역에 내용이 렌더링됩니다.

> [!note] Callout
> Obsidian callout 문법을 기본 형태로 표시합니다.

## Tasks

- [ ] 보고서 작성 📅 2026-06-12
- [ ] 회의 준비 ⏳ 2026-06-08
- [x] 완료한 작업 ✅ 2026-06-04

다음 문서로 이동해보세요: [[notes/링크 문서]]
`,
  "notes/링크 문서.md": `# 링크 문서

이 문서는 \`[[notes/링크 문서]]\` 링크로 열 수 있습니다.

## 코드 블록

\`\`\`js
const vault = "Obsidian";
console.log(\`\${vault} markdown viewer\`);
\`\`\`

## 표

| 항목 | 상태 |
| --- | --- |
| 폴더 트리 | 완료 |
| Markdown 렌더링 | 기본 지원 |
| 이미지 표시 | 지원 |
`,
  "notes/project/회의.md": `# 회의

- 참석자: Kim, Lee
- 관련 문서: [[README]]
- [ ] 프로젝트 리뷰 🛫 2026-06-05 📅 2026-06-07

> 일반 blockquote를 표시합니다.
`,
};

els.openVaultButton?.addEventListener("click", openVault);
els.sidebarToggle.addEventListener("click", toggleSidebar);
els.sidebarPinButton?.addEventListener("click", toggleSidebarPin);
els.searchInput.addEventListener("input", renderTree);
els.caseSearchToggle.addEventListener("change", renderTree);
els.regexSearchToggle.addEventListener("change", renderTree);
els.contentSearchToggleButton?.addEventListener("click", toggleContentSearchSnippets);
els.treeSortSelect.addEventListener("change", updateTreeSortMode);
els.treeSortDirectionButton.addEventListener("click", toggleTreeSortDirection);
els.expandTreeButton.addEventListener("click", expandAllTree);
els.revealCurrentButton.addEventListener("click", revealCurrentFileInTree);
els.collapseTreeButton.addEventListener("click", collapseAllTree);
els.folderPathInput?.addEventListener("input", renderTree);
els.calendarPathInput?.addEventListener("input", handleCalendarFilterInput);
els.randomPathInput?.addEventListener("input", handleRandomPathInput);
els.dailyNotePathInput?.addEventListener("input", updateDailyNotePath);
els.taskTagsInput?.addEventListener("change", () => {
  const tags = (els.taskTagsInput.value || "").split(",").map((t) => t.trim()).filter(Boolean);
  state.calendarTaskTags = tags.length ? tags : ["게임", "가족", "공부"];
  saveCalendarTaskTags();
  if (els.taskTagsInput) els.taskTagsInput.value = state.calendarTaskTags.join(", ");
});
els.newNotePathInput?.addEventListener("input", handleNewNotePathInput);
els.fontSelect?.addEventListener("change", updateAppFont);
els.fontResetButton?.addEventListener("click", resetFontOptions);
els.contentFontSizeInput?.addEventListener("input", () => {
  const v = Number(els.contentFontSizeInput.value);
  if (Number.isFinite(v) && v >= 1) document.documentElement.style.setProperty("--content-font-size", `${Math.max(10, Math.min(28, v))}px`);
});
els.contentFontSizeInput?.addEventListener("change", updateContentFontSize);
els.calendarRowFontSizeInput?.addEventListener("input", () => {
  const v = Number(els.calendarRowFontSizeInput.value);
  if (Number.isFinite(v) && v >= 1) document.documentElement.style.setProperty("--calendar-row-font-size", `${Math.max(6, Math.min(22, v))}px`);
});
els.calendarRowFontSizeInput?.addEventListener("change", updateCalendarRowFontSize);
els.contentAlignSelect?.addEventListener("change", updateContentAlign);
els.contentMaxWidthInput?.addEventListener("input", () => {
  const v = Number(els.contentMaxWidthInput.value);
  if (Number.isFinite(v) && v >= 400) document.documentElement.style.setProperty("--line-width", `${Math.max(400, Math.min(1600, v))}px`);
});
els.contentMaxWidthInput?.addEventListener("change", updateContentMaxWidth);
els.splitCloseButton?.addEventListener("click", closeSplitPane);
initSplitDropZone();
els.viewerWrap.addEventListener("click", closeSidebarFromMain);
els.calendarView.addEventListener("wheel", handleCalendarWheel, { passive: false });
els.calendarView.addEventListener("pointerdown", handleCalendarSwipeStart, true);
els.calendarView.addEventListener("pointerup", handleCalendarSwipeEnd, true);
els.calendarView.addEventListener("pointercancel", clearCalendarSwipe, true);
els.historyBackButton.addEventListener("click", navigateHistoryBack);
els.historyForwardButton.addEventListener("click", navigateHistoryForward);
els.fullscreenButton?.addEventListener("click", enterFullscreen);
els.collapseHeadingsButton?.addEventListener("click", collapseAllHeadings);
els.collapseHeadingLevelButton?.addEventListener("click", collapseCurrentHeadingLevel);
els.expandHeadingLevelButton?.addEventListener("click", expandNextHeadingLevel);
els.markdownToggleButton.addEventListener("click", toggleMarkdownMode);
els.webEditButton.addEventListener("click", handleEditSaveButton);
els.saveEditButton.addEventListener("click", saveCurrentEdit);
els.markdownEditor.addEventListener("keydown", handleEditorKeydown);
els.markdownEditor.addEventListener("input", handleEditorInput);
els.markdownEditor.addEventListener("paste", handleEditorPaste);
els.editorUndoButton?.addEventListener("click", () => runEditorCommand("undo"));
els.editorRedoButton?.addEventListener("click", () => runEditorCommand("redo"));
els.editorIndentButton?.addEventListener("click", () => handleEditorToolbarIndent(false));
els.editorOutdentButton?.addEventListener("click", () => handleEditorToolbarIndent(true));
els.editorHeadingButton?.addEventListener("click", () => prefixSelectedEditorLines("# "));
els.editorBulletButton?.addEventListener("click", () => prefixSelectedEditorLines("- "));
els.editorTableButton?.addEventListener("click", insertEditorTable);
els.editorImageButton?.addEventListener("click", () => els.editorImageInput?.click());
els.editorTaskButton?.addEventListener("click", insertTodayTaskTemplate);
els.editorGoodEmojiButton?.addEventListener("click", () => insertEditorText(els.markdownEditor, "👍"));
els.editorBadEmojiButton?.addEventListener("click", () => insertEditorText(els.markdownEditor, "👎"));
els.editorImageInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;
  e.target.value = "";
  await uploadImageToEditor(file, file.type);
});
els.imagePathInput?.addEventListener("input", handleImagePathInput);
els.clipperFolderInput?.addEventListener("input", () => {
  const folder = normalizeVaultPath(els.clipperFolderInput.value || "") || "Clippings";
  localStorage.setItem("obsidian-web-viewer-clipper-folder", folder);
  updateBookmarkletHref(folder);
});
els.clipperRuleAddBtn?.addEventListener("click", () => { addClipperRuleRow("", "", ""); scheduleSettingsSave(); });
els.searchExcludeInput?.addEventListener("input", handleSearchExcludeInput);
els.discordWebhookInput?.addEventListener("input", scheduleSettingsSave);
els.discordNotifyAddTodoBtn?.addEventListener("click", () => { addDiscordNotifyRow("todo", 60); scheduleSettingsSave(); });
els.discordNotifyAddEventBtn?.addEventListener("click", () => { addDiscordNotifyRow("event", 60); scheduleSettingsSave(); });
els.discordFixedAddTodoBtn?.addEventListener("click", () => { addDiscordFixedRow("todo", "09:00"); scheduleSettingsSave(); });
els.discordFixedAddEventBtn?.addEventListener("click", () => { addDiscordFixedRow("event", "09:00"); scheduleSettingsSave(); });
els.discordTestBtn?.addEventListener("click", async () => {
  const url = els.discordWebhookInput?.value.trim();
  if (!url) { showAppToast("Webhook URL을 입력하세요", "error"); return; }
  els.discordTestBtn.disabled = true;
  showAppToast("테스트 메시지 전송 중...", "info");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "✅ **Obsidian Web Viewer** Discord 알림 연결 테스트 성공!" }),
    });
    if (res.ok) {
      showAppToast("Discord 전송 성공!", "success");
    } else {
      showAppToast(`전송 실패 (HTTP ${res.status})`, "error");
    }
  } catch {
    showAppToast("전송 중 오류 발생", "error");
  } finally {
    els.discordTestBtn.disabled = false;
  }
});
els.newNoteButton?.addEventListener("click", openNewNote);
els.randomFileButton.addEventListener("click", () => {
  void triggerRandomAction();
});
els.randomPriorityToggleButton?.addEventListener("click", toggleRandomPriorityMode);
els.calendarButton.addEventListener("click", openNextCalendarKind);
els.matrixButton?.addEventListener("click", buildMatrixView);
els.syncStatus?.addEventListener("click", handleSyncStatusClick);
document.addEventListener("visibilitychange", handleVisibilityChange);
els.connectionBanner?.addEventListener("click", () => { if (state.connectionLost) window.location.reload(); });
els.optionsButton.addEventListener("click", toggleOptionsMenu);
els.optionsCloseButton.addEventListener("click", closeOptionsMenu);
els.optionsBackdrop.addEventListener("click", closeOptionsMenu);
els.imageLightbox.addEventListener("click", closeImageLightbox);
els.imageLightboxClose.addEventListener("click", closeImageLightbox);
els.editButton.addEventListener("click", openCurrentFileInObsidian);
els.themeButton.addEventListener("click", toggleTheme);
els.sidebarResizeHandle.addEventListener("pointerdown", startSidebarResize);
els.noteTitle?.addEventListener("click", showFullCurrentTitle);
els.noteTitle?.addEventListener("pointerdown", startNoteTitleLongPress);
els.notePath?.addEventListener("click", (e) => {
  if (!state.currentPath) return;
  document.querySelector(".path-popup")?.remove();
  const popup = document.createElement("div");
  popup.className = "path-popup";
  popup.textContent = state.currentPath;
  popup.title = "클릭하면 클립보드에 복사됩니다";
  const rect = els.notePath.getBoundingClientRect();
  popup.style.cssText = `bottom:${window.innerHeight - rect.top + 4}px;left:${rect.left}px;`;
  popup.addEventListener("click", () => {
    navigator.clipboard?.writeText(state.currentPath).catch(() => {});
    popup.textContent = "복사됨!";
    setTimeout(() => popup.remove(), 800);
  });
  document.body.append(popup);
  const dismiss = (ev) => { if (!popup.contains(ev.target) && ev.target !== els.notePath) { popup.remove(); document.removeEventListener("pointerdown", dismiss, true); } };
  setTimeout(() => document.addEventListener("pointerdown", dismiss, true), 0);
});
els.noteTitle?.addEventListener("pointerup", clearNoteTitleLongPress);
els.noteTitle?.addEventListener("pointerleave", clearNoteTitleLongPress);
els.noteTitle?.addEventListener("pointercancel", clearNoteTitleLongPress);
window.addEventListener("keydown", handleGlobalKeydown, true);
document.addEventListener("pointerdown", closeSidebarFromOutside);
document.addEventListener("pointerup", clearCalendarDragIfActive);
document.addEventListener("pointercancel", clearCalendarDragIfActive);
window.addEventListener("resize", handleCalendarResize, { passive: true });
window.addEventListener("orientationchange", () => {
  lockPreferredOrientation();
  handleCalendarResize();
}, { passive: true });
if (shouldAutoRequestFullscreen()) {
  document.addEventListener("pointerdown", requestFullscreenOnce, { once: true });
  document.addEventListener("keydown", requestFullscreenOnce, { once: true });
}
document.addEventListener("fullscreenchange", () => {
  setFullscreenFallback(false);
  lockPreferredOrientation();
});
document.addEventListener("webkitfullscreenchange", () => {
  setFullscreenFallback(false);
  lockPreferredOrientation();
});
registerServiceWorker();
lockPreferredOrientation();

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // PWA support is optional; the viewer must keep working as a normal page.
    });
  });
}

async function lockPreferredOrientation() {
  if (!isTouchPrimaryDevice() && !isStandaloneDisplayMode()) return;
  if (!screen.orientation?.lock) return;
  try {
    await screen.orientation.lock("portrait-primary");
  } catch {
    // Some browsers only allow locking after fullscreen or when installed.
  }
}

function handleGlobalKeydown(event) {
  if (!els.optionsMenu.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeOptionsMenu();
    }
    return;
  }

  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === "KeyN") {
    event.preventDefault();
    event.stopPropagation();
    openNewNote();
    return;
  }

  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === "KeyT") {
    event.preventDefault();
    event.stopPropagation();
    void createTab();
    return;
  }

  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === "KeyW") {
    event.preventDefault();
    event.stopPropagation();
    void closeTab(state.activeTabId);
    return;
  }


  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key === ",") {
    event.preventDefault();
    event.stopPropagation();
    toggleOptionsMenu();
    return;
  }

  if (isTypingTarget(event.target)) return;

  if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === "KeyT") {
    event.preventDefault();
    event.stopPropagation();
    void createTab();
    return;
  }

  if (event.altKey && !event.ctrlKey && !event.metaKey && event.code === "Digit1") {
    event.preventDefault();
    event.stopPropagation();
    openSidebar();
    return;
  }

  if (event.ctrlKey && event.shiftKey && !event.metaKey && event.code === "KeyF") {
    event.preventDefault();
    event.stopPropagation();
    openSidebar();
    els.searchInput.focus();
    els.searchInput.select();
    return;
  }

  if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    if (state.activeView === "calendar" && event.key === "1") {
      event.preventDefault();
      event.stopPropagation();
      setCalendarMode("month");
      return;
    }
    if (state.activeView === "calendar" && event.key === "2") {
      event.preventDefault();
      event.stopPropagation();
      setCalendarMode("week");
      return;
    }
    if (state.activeView === "calendar" && event.key === "3") {
      event.preventDefault();
      event.stopPropagation();
      setCalendarMode("day");
      return;
    }
    if (state.activeView === "calendar" && event.key.toLowerCase() === "t") {
      event.preventDefault();
      event.stopPropagation();
      goCalendarToday();
      return;
    }
    if (state.activeView === "calendar" && event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      state.calendarDate = shiftCalendarDate(-1);
      renderCalendar();
      return;
    }
    if (state.activeView === "calendar" && event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      state.calendarDate = shiftCalendarDate(1);
      renderCalendar();
      return;
    }
    if (state.activeView !== "calendar") {
      const digitMatch = event.code.match(/^Digit([1-5])$/);
      if (digitMatch) {
        const idx = parseInt(digitMatch[1], 10) - 1;
        const tab = state.tabs[idx];
        if (tab) { event.preventDefault(); event.stopPropagation(); void switchTab(tab.id); return; }
      }
    }
    if (event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "g") {
      event.preventDefault();
      event.stopPropagation();
      scrollViewerBottom();
      return;
    }
    if (!event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "g") {
      const now = performance.now();
      const isDoubleG = state.lastGPressAt > 0 && now - state.lastGPressAt <= 420;
      state.lastGPressAt = isDoubleG ? 0 : now;
      if (!isDoubleG) return;
      event.preventDefault();
      event.stopPropagation();
      scrollViewerTop();
      return;
    }
    if (event.key.toLowerCase() === "e") {
      event.preventDefault();
      event.stopPropagation();
      enterEditMode();
      return;
    }
    if (event.key.toLowerCase() === "w") {
      event.preventDefault();
      event.stopPropagation();
      void closeTab(state.activeTabId);
      return;
    }
    if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      event.stopPropagation();
      openNewNote();
      return;
    }
    if (event.key.toLowerCase() === "t") {
      event.preventDefault();
      event.stopPropagation();
      void createTab();
      return;
    }
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      event.stopPropagation();
      void triggerRandomAction();
      return;
    }
    if (event.key.toLowerCase() === "c") {
      event.preventDefault();
      event.stopPropagation();
      openCalendarFromShortcut();
      return;
    }
    if (event.key.toLowerCase() === "d") {
      event.preventDefault();
      event.stopPropagation();
      scrollViewerByPageFraction(1);
      return;
    }
    if (event.key.toLowerCase() === "u") {
      event.preventDefault();
      event.stopPropagation();
      scrollViewerByPageFraction(-1);
      return;
    }
  }

  if (isShortcut(event, "KeyE", "e")) {
    event.preventDefault();
    event.stopPropagation();
    enterEditMode();
  } else if (isShortcut(event, "KeyS", "s")) {
    event.preventDefault();
    event.stopPropagation();
    saveCurrentEdit();
  } else if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && (event.code === "KeyR" || event.key.toLowerCase() === "r")) {
    event.preventDefault();
    event.stopPropagation();
    void triggerRandomAction();
  } else if (event.key === "Escape") {
    closeOptionsMenu();
    closeImageLightbox();
  } else if (event.key === "ArrowLeft") {
    showAdjacentLightboxImage(-1);
  } else if (event.key === "ArrowRight") {
    showAdjacentLightboxImage(1);
  }
}

function isTypingTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
}

function triggerRandomAction() {
  return openRandomMarkdown({ showProgress: true });
}

installCustomAlerts();
initTheme();
initOptions();
loadServerSettings();
bindTaskCreateDialog();
bindTaskEditDialog();
updateMarkdownToggleButton();
updateTreeSortDirectionButton();
initSidebarWidth();
initSidebarPin();
let _saveDeviceTabsTimer = null;
let _tabsRestoredFromStorage = false;
loadSavedVaults();
loadSampleVault();
arrangeChromeControls();
initTabs();
updateEditButtons();
handleUrlAction();

function handleUrlAction() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get("action");
  if (action === "new-note") {
    window.history.replaceState(null, "", window.location.pathname);
    window.addEventListener("vaultReady", () => openNewNote(), { once: true });
  }
  const sharedUrl = params.get("url") || params.get("text") || "";
  const sharedTitle = params.get("title") || "";
  if (sharedUrl && sharedUrl.startsWith("http")) {
    window.history.replaceState(null, "", window.location.pathname);
    handleSharedUrl(sharedUrl, sharedTitle);
  }
}

function handleSharedUrl(sharedUrl, sharedTitle = "") {
  const doCreate = async () => {
    if (!state.serverVaultWritable) {
      showAppToast("공유 저장 실패: Vault가 쓰기 불가능합니다.", "error");
      return;
    }
    const defaultFolder = localStorage.getItem("obsidian-web-viewer-clipper-folder") || "Clippings";
    const rule = matchClipperRule(sharedUrl);
    const folder = rule?.savePath || defaultFolder;
    const today = new Date().toISOString().slice(0, 10);
    const baseTitle = (sharedTitle || sharedUrl).replace(/[/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    const safeTitle = rule?.label ? `${baseTitle} (${rule.label})` : baseTitle;
    const fileName = `${today} ${safeTitle}.md`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    const embedLoading = `\`\`\`embed\nstatus: "loading"\nurl: "${sharedUrl}"\n\`\`\``;
    const esc = (s) => (s || "").replace(/"/g, '\\"');
    const makeFrontmatter = (title) => `---\ntitle: "${esc(title)}"\nurl: ${sharedUrl}\ndate: ${today}\n---\n\n`;
    const initialContent = makeFrontmatter(safeTitle) + embedLoading;
    try {
      const metadata = await writeServerFile(filePath, initialContent, { backup: false });
      if (folder) ensureDirectoryNodePath(folder);
      const node = { name: fileName, path: filePath, content: initialContent, serverBacked: true, kind: "file", ...metadata };
      state.files.set(filePath, node);
      const dir = state.directories.get(folder || "");
      if (dir) dir.children.set(node.name, node);
      refreshDirectoryMetadataFrom(filePath);
      renderTree();
      refreshRecentFilesCache();
      invalidateRandomMarkdownCache();
      await openFile(filePath);
      const meta = await fetchLinkMeta(sharedUrl);
      const updatedTitle = (rule?.label ? `${meta.title || baseTitle} (${rule.label})` : meta.title) || safeTitle;
      const fullBlock = buildEmbedBlock(meta, sharedUrl);
      const updatedContent = makeFrontmatter(updatedTitle) + fullBlock;
      await writeServerFile(filePath, updatedContent, { backup: false });
      node.content = updatedContent;
      if (state.currentPath === filePath) {
        state.currentContent = updatedContent;
        renderCurrentDocument();
      }
    } catch (e) {
      showAppToast(`공유 저장 실패: ${e.message}`, "error");
    }
  };
  if (state.serverVaultWritable) {
    void doCreate();
  } else {
    window.addEventListener("vaultReady", () => void doCreate(), { once: true });
  }
}

function matchClipperRule(pageUrl) {
  const rules = getClipperRules();
  return rules.find((r) => {
    if (!r.urlPattern) return false;
    if (r.urlPattern.includes("*")) {
      const regex = new RegExp(r.urlPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*"));
      return regex.test(pageUrl);
    }
    return pageUrl.includes(r.urlPattern);
  }) || null;
}

function buildClipEmbedContent(title, url, meta) {
  const today = new Date().toISOString().slice(0, 10);
  const esc = (s) => (s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const frontmatter = `---\ntitle: "${esc(title)}"\nurl: ${url}\ndate: ${today}\n---\n\n`;
  const embedBlock = meta
    ? `\`\`\`embed\ntitle: "${esc(meta.title || title)}"\ndescription: "${esc(meta.description || "")}"\nimage: "${esc(meta.image || "")}"\nfavicon: "${esc(meta.favicon || "")}"\nurl: "${esc(url)}"\n\`\`\``
    : `\`\`\`embed\nstatus: "loading"\nurl: "${esc(url)}"\n\`\`\``;
  return frontmatter + embedBlock;
}

function showClipperPopup({ title, url, folder, path: initialPath = "" }) {
  document.getElementById("owv-clip-overlay")?.remove();

  const today = new Date().toISOString().slice(0, 10);
  const rule = url ? matchClipperRule(url) : null;
  const effectiveFolder = (rule?.savePath) || folder || "Clippings";
  const safeTitle = (title || "Clipped Page").replace(/[/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const labeledTitle = rule?.label ? `${safeTitle} (${rule.label})` : safeTitle;
  const defaultPath = initialPath || `${effectiveFolder}/${today} ${labeledTitle}.md`;

  const overlay = document.createElement("div");
  overlay.id = "owv-clip-overlay";

  const styleEl = document.createElement("style");
  styleEl.textContent = "#owv-clip-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}#owv-clip-sheet{background:#1e2124;color:#e2e4e7;width:100%;max-width:680px;max-height:88vh;border-radius:16px 16px 0 0;display:flex;flex-direction:column;box-shadow:0 -8px 40px rgba(0,0,0,.5);box-sizing:border-box}#owv-clip-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px}#owv-clip-badge{font-size:14px;font-weight:600;color:#8b9eb7}#owv-clip-close{background:none;border:none;cursor:pointer;font-size:22px;color:#8b9eb7;line-height:1;padding:0 4px}#owv-clip-fields{padding:0 16px 10px;display:flex;flex-direction:column;gap:8px}.owv-field{display:flex;flex-direction:column;gap:3px}.owv-field label{font-size:11px;color:#8b9eb7}.owv-field input{background:#2a2f35;border:1px solid #3a4048;border-radius:8px;color:#e2e4e7;font-size:14px;padding:8px 10px;width:100%;box-sizing:border-box;outline:none;font-family:inherit}.owv-field input:focus{border-color:#5b8dd9}#owv-clip-preview{flex:1;overflow-y:auto;margin:0 16px;background:#16191c;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.65;color:#b0bac6;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,monospace;min-height:80px}#owv-clip-status{padding:6px 16px;font-size:13px;color:#8b9eb7;min-height:22px;text-align:center}#owv-clip-footer{padding:10px 16px 20px;display:flex;gap:8px}#owv-clip-cancel{background:#2a2f35;border:none;border-radius:8px;color:#e2e4e7;font-size:15px;padding:11px 18px;cursor:pointer;font-family:inherit}#owv-clip-save{flex:1;background:#4a7fd4;border:none;border-radius:8px;color:#fff;font-size:15px;font-weight:600;padding:11px;cursor:pointer;font-family:inherit}#owv-clip-save:disabled{background:#3a4048;color:#8b9eb7}";

  const sheet = document.createElement("div");
  sheet.id = "owv-clip-sheet";
  sheet.innerHTML = `<div id="owv-clip-header"><span id="owv-clip-badge">📎 Web Clipper</span><button id="owv-clip-close" aria-label="닫기">×</button></div><div id="owv-clip-fields"><div class="owv-field"><label>제목</label><input id="owv-clip-title" type="text" autocomplete="off" /></div><div class="owv-field"><label>저장 경로</label><input id="owv-clip-path" type="text" autocomplete="off" /></div></div><div id="owv-clip-preview"></div><div id="owv-clip-status"></div><div id="owv-clip-footer"><button id="owv-clip-cancel">취소</button><button id="owv-clip-save">Vault에 저장</button></div>`;

  overlay.appendChild(styleEl);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  const titleInput = document.getElementById("owv-clip-title");
  const pathInput = document.getElementById("owv-clip-path");
  const preview = document.getElementById("owv-clip-preview");
  const status = document.getElementById("owv-clip-status");
  const saveBtn = document.getElementById("owv-clip-save");

  titleInput.value = labeledTitle;
  pathInput.value = defaultPath;
  preview.textContent = url || "";

  titleInput.addEventListener("input", () => {
    const t = titleInput.value.trim() || safeTitle;
    pathInput.value = `${effectiveFolder}/${today} ${t.replace(/[/\\:*?"<>|]/g, " ").trim().slice(0, 80)}.md`;
  });

  const close = () => overlay.remove();
  document.getElementById("owv-clip-close").addEventListener("click", close);
  document.getElementById("owv-clip-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  saveBtn.addEventListener("click", async () => {
    const saveTitle = titleInput.value.trim() || labeledTitle;
    const savePath = pathInput.value.trim() || defaultPath;
    saveBtn.disabled = true;
    saveBtn.textContent = "저장 중…";
    status.textContent = "";
    try {
      const loadingContent = buildClipEmbedContent(saveTitle, url, null);
      const res = await fetch("/api/clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: savePath, content: loadingContent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "HTTP error");
      const savedPath = json.path || savePath;
      status.textContent = "✓ 저장 완료: " + savedPath;
      status.style.color = "#4caf7d";
      saveBtn.textContent = "저장됨 ✓";
      setTimeout(close, 1200);

      // 백그라운드에서 메타데이터 fetch 후 파일 업데이트
      if (url) {
        try {
          const metaRes = await fetch(`/api/url-meta?url=${encodeURIComponent(url)}`);
          if (metaRes.ok) {
            const meta = await metaRes.json();
            const updatedContent = buildClipEmbedContent(saveTitle, url, meta);
            await fetch("/api/clip", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: savedPath, content: updatedContent, overwrite: true }),
            });
          }
        } catch {}
      }
    } catch (e) {
      status.textContent = "저장 실패: " + e.message;
      status.style.color = "#e05a5a";
      saveBtn.disabled = false;
      saveBtn.textContent = "Vault에 저장";
    }
  });
}

function closeSidebarFromMain(event) {
  if (event.target.closest("button, a, input, textarea, select, summary, details, .loading-overlay")) return;
  closeSidebar();
}

function openSidebar() {
  document.body.classList.add("sidebar-open");
  els.sidebarToggle.setAttribute("aria-expanded", "true");
  els.sidebarToggle.setAttribute("aria-label", "문서 목록 닫기");
  const tabToggle = document.querySelector(".tab-sidebar-toggle");
  if (tabToggle) { tabToggle.setAttribute("aria-expanded", "true"); tabToggle.setAttribute("aria-label", "문서 목록 닫기"); }
}

function closeSidebarFromOutside(event) {
  if (state.sidebarPinned || !document.body.classList.contains("sidebar-open")) return;
  if (event.target.closest("#sidebarPanel, #sidebarToggle")) return;
  closeSidebar();
}

function initSidebarWidth() {
  const saved = Number(localStorage.getItem("obsidian-web-viewer-sidebar-width"));
  if (Number.isFinite(saved) && saved > 0) setSidebarWidth(saved);
}

function initSidebarPin() {
  state.sidebarPinned = localStorage.getItem("obsidian-web-viewer-sidebar-pinned") === "true";
  document.body.classList.toggle("sidebar-pinned", state.sidebarPinned);
  if (state.sidebarPinned) document.body.classList.add("sidebar-open");
  updateSidebarPinButton();
}

function toggleSidebarPin() {
  state.sidebarPinned = !state.sidebarPinned;
  localStorage.setItem("obsidian-web-viewer-sidebar-pinned", String(state.sidebarPinned));
  document.body.classList.toggle("sidebar-pinned", state.sidebarPinned);
  if (state.sidebarPinned) document.body.classList.add("sidebar-open");
  updateSidebarPinButton();
}

function updateSidebarPinButton() {
  if (!els.sidebarPinButton) return;
  els.sidebarPinButton.classList.toggle("active", state.sidebarPinned);
  els.sidebarPinButton.setAttribute("aria-pressed", String(state.sidebarPinned));
  els.sidebarPinButton.textContent = state.sidebarPinned ? "📌" : "📍";
  els.sidebarPinButton.title = state.sidebarPinned ? "사이드바 고정됨" : "사이드바 고정";
  els.sidebarPinButton.setAttribute("aria-label", els.sidebarPinButton.title);
}

function startSidebarResize(event) {
  event.preventDefault();
  event.stopPropagation();
  state.sidebarResize = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startWidth: els.sidebarPanel.getBoundingClientRect().width,
  };
  els.sidebarResizeHandle.setPointerCapture(event.pointerId);
  document.body.classList.add("sidebar-resizing");
  window.addEventListener("pointermove", resizeSidebar);
  window.addEventListener("pointerup", stopSidebarResize);
  window.addEventListener("pointercancel", stopSidebarResize);
}

function resizeSidebar(event) {
  if (!state.sidebarResize || event.pointerId !== state.sidebarResize.pointerId) return;
  setSidebarWidth(state.sidebarResize.startWidth + event.clientX - state.sidebarResize.startX);
}

function stopSidebarResize(event) {
  if (!state.sidebarResize || event.pointerId !== state.sidebarResize.pointerId) return;
  localStorage.setItem("obsidian-web-viewer-sidebar-width", String(Math.round(els.sidebarPanel.getBoundingClientRect().width)));
  state.sidebarResize = null;
  document.body.classList.remove("sidebar-resizing");
  window.removeEventListener("pointermove", resizeSidebar);
  window.removeEventListener("pointerup", stopSidebarResize);
  window.removeEventListener("pointercancel", stopSidebarResize);
}

function setSidebarWidth(width) {
  const max = Math.min(640, Math.max(260, window.innerWidth * 0.9));
  const clamped = Math.max(260, Math.min(max, width));
  document.documentElement.style.setProperty("--sidebar-width", `${Math.round(clamped)}px`);
}

async function openRandomMarkdown({ showProgress = false } = {}) {
  const files = getRandomMarkdownPaths();
  if (!files.length) {
    showRandomNotice(showProgress ? "랜덤 파일: 0개 중 0개" : "조건에 맞는 랜덤 파일이 없습니다.", "error");
    return;
  }

  const seen = getRandomSeenForActiveTab();
  let candidates = files.filter((path) => !seen.has(path));
  const nonCurrentCandidates = candidates.filter((path) => path !== state.currentPath);
  if (nonCurrentCandidates.length) candidates = nonCurrentCandidates;
  if (!candidates.length) {
    showRandomNotice(showProgress ? randomProgressText(files, seen) : "조건에 맞는 새 랜덤 파일이 없습니다.", "error");
    return;
  }

  const path = pickRandomMarkdownPath(candidates);
  if (state.activeView === "calendar") showNoteView();
  await openFile(path);
  seen.add(path);
  if (showProgress) showRandomNotice(randomProgressText(files, seen));
  scrollViewerTop();
}

function showRandomNotice(message, variant = "info") {
  if (state.randomNoticeToast) {
    state.randomNoticeToast.remove();
  }

  const host = ensureToastHost();
  const toast = document.createElement("div");
  toast.className = `app-toast ${variant}`;
  toast.textContent = String(message || "");
  host.append(toast);
  state.randomNoticeToast = toast;
  requestAnimationFrame(() => toast.classList.add("show"));
  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => {
      toast.remove();
      if (state.randomNoticeToast === toast) state.randomNoticeToast = null;
    }, 180);
  }, 2800);
}

function getRandomMarkdownPaths() {
  const searchQuery = els.searchInput?.value || "";
  const trimmedSearch = searchQuery.trim();
  const searchMatcher = trimmedSearch.length >= 2 ? createSearchMatcher(searchQuery, {
    regexMode: els.regexSearchToggle.checked,
    caseSensitive: els.caseSearchToggle.checked,
  }) : null;
  const searchFolders = searchMatcher ? parsePathList(els.folderPathInput?.value || "") : [];
  const searchExcludes = searchMatcher ? state.searchExcludePaths : [];
  const randomExcludes = !searchMatcher ? parsePathList(els.randomPathInput?.value || "") : [];

  return [...state.files.keys()].filter((path) => {
    if (!path.toLowerCase().endsWith(".md")) return false;
    if (searchMatcher) {
      const node = state.files.get(path);
      if (searchFolders.length && node && !nodeInAnyPath(node, searchFolders)) return false;
      if (searchExcludes.length && nodeIsExcluded({ path }, searchExcludes)) return false;
      return searchMatcher(path) || state.contentSearchMatches?.has(path);
    }
    return !randomExcludes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  });
}

function getRandomSeenForActiveTab() {
  const tabId = state.activeTabId || "main";
  if (!state.randomSeenByTab.has(tabId)) state.randomSeenByTab.set(tabId, new Set());
  return state.randomSeenByTab.get(tabId);
}

function randomProgressText(files, seen) {
  const openedCount = files.reduce((count, path) => count + (seen.has(path) ? 1 : 0), 0);
  return `랜덤 파일: ${files.length}개 중 ${openedCount}개`;
}

function pickRandomMarkdownPath(candidates) {
  if (!state.randomOldFirst) return candidates[Math.floor(Math.random() * candidates.length)];
  const lastOpenedByPath = new Map(state.recentlyOpenedPaths.map((entry) => [entry.path, Number(entry.openedAt) || 0]));
  const sorted = [...candidates].sort((a, b) => (lastOpenedByPath.get(a) || 0) - (lastOpenedByPath.get(b) || 0));
  const poolSize = Math.max(1, Math.ceil(sorted.length * 0.25));
  const pool = sorted.slice(0, poolSize);
  return pool[Math.floor(Math.random() * pool.length)];
}

function invalidateRandomMarkdownCache() {
  state.randomMarkdownCacheKey = "";
  state.randomMarkdownPaths = [];
}

async function loadSavedVaults() {
  if (!supportsPersistentHandles()) {
    renderSavedVaults();
    return;
  }

  try {
    const db = await openVaultDb();
    state.savedVaults = await dbGetAll(db);
    renderSavedVaults();
  } catch {
    state.savedVaults = [];
    renderSavedVaults();
  }
}

async function saveVaultHandle(handle) {
  if (!supportsPersistentHandles()) return;
  const db = await openVaultDb();
  const entry = {
    id: handle.name,
    name: handle.name,
    handle,
    savedAt: Date.now(),
  };
  await dbPut(db, entry);
  state.savedVaults = await dbGetAll(db);
  renderSavedVaults();
}

async function deleteSavedVault(id) {
  if (!supportsPersistentHandles()) return;
  const db = await openVaultDb();
  await dbDelete(db, id);
  state.savedVaults = await dbGetAll(db);
  renderSavedVaults();
}

async function openSavedVault(entry) {
  if (!entry?.handle) return;
  let permission = await entry.handle.queryPermission?.({ mode: "readwrite" });
  if (permission !== "granted") {
    permission = await entry.handle.requestPermission?.({ mode: "readwrite" });
  }
  if (permission !== "granted") {
    alert("Vault 편집 권한이 필요합니다.");
    return;
  }
  closeOptionsMenu();
  await loadVaultFromHandle(entry.handle);
}

function renderSavedVaults() {
  if (!els.savedVaultList) return;
  els.savedVaultList.replaceChildren();

  if (!supportsPersistentHandles()) {
    els.savedVaultList.innerHTML = '<p class="saved-vault-empty">이 브라우저는 vault 저장을 지원하지 않습니다.</p>';
    return;
  }

  if (!state.savedVaults.length) {
    els.savedVaultList.innerHTML = '<p class="saved-vault-empty">저장된 vault가 없습니다.</p>';
    return;
  }

  state.savedVaults
    .slice()
    .sort((a, b) => b.savedAt - a.savedAt)
    .forEach((entry) => {
      const row = document.createElement("div");
      row.className = "saved-vault-row";

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "saved-vault-open";
      openButton.textContent = entry.name;
      openButton.title = "브라우저 보안상 실제 전체 경로 대신 폴더 이름만 표시됩니다.";
      openButton.addEventListener("click", () => openSavedVault(entry));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "saved-vault-delete";
      deleteButton.textContent = "삭제";
      deleteButton.addEventListener("click", () => deleteSavedVault(entry.id));

      row.append(openButton, deleteButton);
      els.savedVaultList.append(row);
    });
}

function supportsPersistentHandles() {
  return "indexedDB" in window && "showDirectoryPicker" in window;
}

function openVaultDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("obsidian-web-viewer", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("vaults", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGetAll(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction("vaults", "readonly").objectStore("vaults").getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function dbPut(db, value) {
  return new Promise((resolve, reject) => {
    const request = db.transaction("vaults", "readwrite").objectStore("vaults").put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function dbDelete(db, id) {
  return new Promise((resolve, reject) => {
    const request = db.transaction("vaults", "readwrite").objectStore("vaults").delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function openVault() {
  if (!window.showDirectoryPicker) {
    alert("이 브라우저는 폴더 열기를 지원하지 않습니다. Chrome 또는 Edge에서 localhost로 접속하세요.");
    return;
  }

  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await saveVaultHandle(handle);
  await loadVaultFromHandle(handle);
  closeOptionsMenu();
}

async function loadVaultFromHandle(handle) {
  showLoading(`Vault 여는 중: ${handle.name}`);
  try {
    resetVault();
    state.root = makeDirNode(handle.name, "");
    state.vaultName = handle.name;
    state.rootHandle = handle;
    state.directories.set("", state.root);
    await walkDirectory(handle, "");
    refreshDirectoryMetadata();
    els.vaultStatus.textContent = handle.name;
    renderTree();
    state.calendarDate = new Date();
    showInitialCalendarView();
    loadCalendarCache().finally(scheduleCalendarRefresh);
    loadRecentFilesCache().finally(refreshRecentFilesCache);
    invalidateRandomMarkdownCache();
  } finally {
    hideLoading();
  }
}

async function walkDirectory(dirHandle, prefix) {
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith(".obsidian") || name === ".git" || name === "node_modules") continue;
    const path = prefix ? `${prefix}/${name}` : name;

    if (handle.kind === "directory") {
      const dir = makeDirNode(name, path);
      state.directories.set(path, dir);
      getDirNode(prefix).children.set(name, dir);
      await walkDirectory(handle, path);
    } else if (isIndexedFile(name)) {
      const metadata = await readFileMetadata(handle, path);
      const fileNode = { name, path, handle, dirHandle, kind: "file", ...metadata };
      state.files.set(path, fileNode);
      getDirNode(prefix).children.set(name, fileNode);
    }
  }
}

function creationMetadataStorageKey() {
  return `obsidian-web-viewer:file-created:${state.vaultName || "vault"}`;
}

function readCreationMetadata() {
  try {
    return JSON.parse(localStorage.getItem(creationMetadataStorageKey()) || "{}");
  } catch {
    return {};
  }
}

function writeCreationMetadata(metadata) {
  try {
    localStorage.setItem(creationMetadataStorageKey(), JSON.stringify(metadata));
  } catch {
    // Local metadata is best-effort only.
  }
}

function rememberedCreatedAt(path, fallback) {
  if (!path) return fallback || 0;
  const metadata = readCreationMetadata();
  const stored = Number(metadata[path]);
  if (Number.isFinite(stored) && stored > 0) return stored;
  metadata[path] = fallback || Date.now();
  writeCreationMetadata(metadata);
  return metadata[path];
}

async function readFileMetadata(handle, path = "") {
  try {
    const file = await handle.getFile();
    const updatedAt = file.lastModified || 0;
    return {
      size: file.size || 0,
      updatedAt,
      createdAt: rememberedCreatedAt(path, updatedAt),
    };
  } catch {
    return { size: 0, updatedAt: 0, createdAt: 0 };
  }
}

async function loadSampleVault() {
  try {
    const response = await fetch("/api/vault", { cache: "no-store" });
    if (!response.ok) throw new Error("vault api error");
    const vault = await response.json();
    if (!vault || !Array.isArray(vault.files)) {
      throw new Error("vault payload invalid");
    }
    hydrateServerVault(vault.name || "vault", vault.files || [], Boolean(vault.writable));
  } catch {
    try {
      const response = await fetch("/api/sample-vault", { cache: "no-store" });
      if (!response.ok) throw new Error("Sample vault API failed");
      const vault = await response.json();
      if (!vault || !Array.isArray(vault.files)) throw new Error("sample vault payload invalid");
      hydrateServerVault(vault.name || "sample-vault", vault.files || [], Boolean(vault.writable));
    } catch {
      const files = Object.entries(SAMPLE_FILES).map(([path, content]) => ({ path, content }));
      hydrateServerVault("Sample vault", files, false);
    }
  }
}

function hydrateUnavailableVault(message) {
  resetVault();
  state.root = makeDirNode("Vault unavailable", "");
  state.directories.set("", state.root);
  els.vaultStatus.textContent = "Vault unavailable";
  els.markdownView.classList.add("empty-state");
  els.markdownView.hidden = false;
  els.editorShell.hidden = true;
  els.calendarView.hidden = true;
  els.notePath.textContent = "server vault";
  els.noteTitle.textContent = "Vault unavailable";
  els.markdownView.innerHTML = `<h3>Vault unavailable</h3><p>${escapeHtml(message)}</p>`;
  renderTree();
}

function hydrateServerVault(vaultName, files, writable = false) {
  resetVault();
  state.serverVaultWritable = writable;
  state.vaultName = vaultName;
  state.root = makeDirNode(vaultName, "");
  state.directories.set("", state.root);

  // Start calendar cache fetch immediately while file list is processed below.
  const calendarCachePromise = loadCalendarCache();

  files.forEach((file) => {
    const normalizedPath = normalizeVaultPath(file.path);
    if (!normalizedPath || !isIndexedFile(normalizedPath)) return;

    const parts = normalizedPath.split("/");
    const fileName = parts.pop();
    let dirPath = "";
    let dir = state.root;

    parts.forEach((part) => {
      const nextPath = dirPath ? `${dirPath}/${part}` : part;
      if (!state.directories.has(nextPath)) {
        const node = makeDirNode(part, nextPath);
        state.directories.set(nextPath, node);
        dir.children.set(part, node);
      }
      dir = state.directories.get(nextPath);
      dirPath = nextPath;
    });

    const fileNode = {
      name: fileName,
      path: normalizedPath,
      url: file.url || "",
      serverBacked: true,
      kind: "file",
      size: file.size || (file.content || "").length,
      updatedAt: file.updatedAt || file.modifiedAt || 0,
      createdAt: file.createdAt || file.birthtime || file.updatedAt || file.modifiedAt || 0,
    };
    if (typeof file.content === "string") fileNode.content = file.content;
    state.files.set(normalizedPath, fileNode);
    dir.children.set(fileName, fileNode);
  });

  refreshDirectoryMetadata();
  els.vaultStatus.textContent = vaultName;
  renderTree();
  const firstLoad = !state.vaultLoaded;
  state.vaultLoaded = true;
  if (firstLoad) {
    state.calendarDate = new Date();
    connectSSE();
    // 시작 시 localStorage에서 탭을 못 읽었으면 vault에서 복원 시도
    const vaultTabsPromise = !_tabsRestoredFromStorage
      ? loadOpenTabsFromVault()
      : Promise.resolve();
    // 캘린더 캐시와 탭 복원이 모두 완료된 후 active tab 복원
    Promise.all([calendarCachePromise, vaultTabsPromise]).then(restoreActiveTab, restoreActiveTab);
  }
  calendarCachePromise.finally(scheduleCalendarRefresh);
  loadRecentFilesCache().finally(refreshRecentFilesCache);
  invalidateRandomMarkdownCache();
  window.dispatchEvent(new CustomEvent("vaultReady"));
}

function resetVault() {
  state.files.clear();
  state.directories.clear();
  state.vaultName = "";
  state.rootHandle = null;
  state.serverVaultWritable = false;
  state.currentPath = null;
  state.currentContent = "";
  state.currentNode = null;
  state.editMode = false;
  state.tasks = [];
  state.calendarTaskFiles.clear();
  invalidateRandomMarkdownCache();
  state.calendarDate = new Date();
  state.calendarRefreshInFlight = false;
  state.calendarRefreshing = false;
  state.calendarCacheState = "empty";
  state.calendarSyncedAt = 0;
  state.metadataSyncedAt = 0;
  state.recentFiles = { updated: [], created: [] };
  state.calendarKind = "tasks";
  state.calendarTaskOpenSuppressedUntil = 0;
  state.calendarDateOpenSuppressedUntil = 0;
  state.matrixTaskDrag = null;
  state.vaultLoaded = false;
  state.contentSearchMatches = null;
  if (state.calendarRefreshTimer) {
    window.clearTimeout(state.calendarRefreshTimer);
    state.calendarRefreshTimer = null;
  }
  disconnectSSE();
  state.activeView = "note";
  clearObjectUrls();
}

function makeDirNode(name, path) {
  return { name, path, kind: "directory", children: new Map(), collapsed: Boolean(path), size: 0, fileCount: 0, updatedAt: 0, createdAt: 0 };
}

function isIndexedFile(name) {
  return /\.(md|excalidraw|txt|py|bat|cmd|sh|js|ts|json|yaml|yml|css|html|xml|csv|log|ahk|java|png|jpe?g|gif|webp|svg|bmp|pdf|zip)$/i.test(name);
}

function isTextVaultFilePath(name) {
  return /\.(md|excalidraw|txt|py|bat|cmd|sh|js|ts|json|yaml|yml|css|html|xml|csv|log|ahk|java)$/i.test(name);
}

function isMarkdownDocument(name) {
  return /\.md$/i.test(name);
}

function isExcalidrawDocument(name) {
  return /\.excalidraw(\.md)?$/i.test(name);
}

function isOpenableDocument(name) {
  return isTextVaultFilePath(name);
}

function isImageDocument(name) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

function displayDocumentTitle(name) {
  return name.replace(/\.excalidraw\.md$/i, "").replace(/\.excalidraw$/i, "").replace(/\.md$/i, "");
}

function getDirNode(path) {
  return state.directories.get(path || "") || state.root;
}

function renderTree() {
  const previousScrollTop = els.fileTree.scrollTop;
  state.treeVisibleOrder = [];
  els.fileTree.replaceChildren();
  const query = els.searchInput.value;
  const trimmedQuery = query.trim();
  if (trimmedQuery !== state.renderedSearchQuery) {
    state.renderedSearchQuery = trimmedQuery;
    state.searchTreeAutoExpand = trimmedQuery.length >= 2;
  }
  const matcher = query.length >= 2 ? createSearchMatcher(query, {
    regexMode: els.regexSearchToggle.checked,
    caseSensitive: els.caseSearchToggle.checked,
  }) : null;
  const folderPaths = parsePathList(els.folderPathInput?.value || "");
  const excludePaths = matcher ? state.searchExcludePaths : [];
  if (matcher && state.searchTreeAutoExpand) expandMatchingDirectories(matcher, folderPaths, excludePaths);
  const rootFragment = document.createDocumentFragment();
  const matchCount = renderDirChildren(state.root, rootFragment, matcher, folderPaths, excludePaths);
  els.fileTree.append(rootFragment);
  els.fileTree.scrollTop = Math.min(previousScrollTop, els.fileTree.scrollHeight);
  updateSearchStatus(query, matchCount);
}

function updateSearchStatus(query, matchCount) {
  if (!els.searchStatus) return;
  if (!query || query.length < 2) {
    els.searchStatus.hidden = true;
    if (els.searchStatus.parentElement?.classList.contains("search-status-row")) els.searchStatus.parentElement.hidden = true;
    if (els.contentSearchToggleButton) els.contentSearchToggleButton.hidden = true;
    state.contentSearchMatches = null;
    state.contentSearchQuery = "";
    window.clearTimeout(state.contentSearchTimer);
    return;
  }
  els.searchStatus.hidden = false;
  if (els.searchStatus.parentElement?.classList.contains("search-status-row")) els.searchStatus.parentElement.hidden = false;
  if (els.contentSearchToggleButton) {
    els.contentSearchToggleButton.hidden = false;
    els.contentSearchToggleButton.textContent = state.contentSearchSnippetsVisible ? "본문 내용 숨기기" : "본문 내용 보기";
    els.contentSearchToggleButton.setAttribute("aria-pressed", String(state.contentSearchSnippetsVisible));
  }
  const contentCount = state.contentSearchMatches ? state.contentSearchMatches.size : null;
  const contentPart = contentCount === null ? " | 내용 검색 중…" : contentCount > 0 ? ` | 내용 ${contentCount}개` : "";
  if (matchCount === 0 && !contentCount) {
    els.searchStatus.textContent = "결과 없음" + contentPart;
    els.searchStatus.dataset.state = "empty";
  } else {
    els.searchStatus.textContent = `파일명 ${matchCount}개${contentPart}`;
    els.searchStatus.dataset.state = "found";
  }
  scheduleContentSearch(query);
}

function toggleContentSearchSnippets() {
  state.contentSearchSnippetsVisible = !state.contentSearchSnippetsVisible;
  renderTree();
}

function scheduleContentSearch(query) {
  if (!state.serverVaultWritable) {
    state.contentSearchMatches = new Map();
    return;
  }
  if (query === state.contentSearchQuery && state.contentSearchMatches !== null) return;
  window.clearTimeout(state.contentSearchTimer);
  if (query !== state.contentSearchQuery) {
    state.contentSearchMatches = null;
  }
  state.contentSearchQuery = query;
  state.contentSearchTimer = window.setTimeout(() => runContentSearch(query), 350);
}

async function runContentSearch(query) {
  if (query !== state.contentSearchQuery) return;
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=50`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error();
    const results = await res.json();
    if (query !== state.contentSearchQuery) return;
    state.contentSearchMatches = new Map(results.map((r) => [r.path, r.snippet]));
    if (state.searchTreeAutoExpand) {
      const matcher = createSearchMatcher(query, {
        regexMode: els.regexSearchToggle.checked,
        caseSensitive: els.caseSearchToggle.checked,
      });
      expandMatchingDirectories(matcher, parsePathList(els.folderPathInput?.value || ""), state.searchExcludePaths);
    }
    renderTree();
  } catch {
    if (query !== state.contentSearchQuery) return;
    state.contentSearchMatches = new Map();
    renderTree();
  }
}

function updateTreeSortMode() {
  state.treeSortMode = els.treeSortSelect.value;
  renderTree();
}

function toggleTreeSortDirection() {
  state.treeSortDirection = state.treeSortDirection === "asc" ? "desc" : "asc";
  updateTreeSortDirectionButton();
  renderTree();
}

function updateTreeSortDirectionButton() {
  const asc = state.treeSortDirection === "asc";
  els.treeSortDirectionButton.textContent = asc ? "↑" : "↓";
  els.treeSortDirectionButton.setAttribute("aria-label", asc ? "정렬 방향: 정배" : "정렬 방향: 역배");
  els.treeSortDirectionButton.title = asc ? "정렬 방향: 정배" : "정렬 방향: 역배";
}

function refreshDirectoryMetadata() {
  const dirs = [...state.directories.values()].sort((a, b) => b.path.length - a.path.length);
  dirs.forEach((dir) => {
    const children = [...dir.children.values()];
    dir.size = children.reduce((sum, node) => sum + (node.size || 0), 0);
    dir.fileCount = children.reduce((sum, node) => sum + (node.kind === "directory" ? node.fileCount || 0 : 1), 0);
    dir.updatedAt = children.reduce((latest, node) => Math.max(latest, node.updatedAt || 0), 0);
    dir.createdAt = children.reduce((latest, node) => Math.max(latest, node.createdAt || node.updatedAt || 0), 0);
  });
}

function refreshDirectoryMetadataFrom(path) {
  const parts = normalizeVaultPath(path || "").split("/").filter(Boolean);
  const paths = [""];
  let current = "";
  parts.slice(0, -1).forEach((part) => {
    current = current ? `${current}/${part}` : part;
    paths.push(current);
  });
  paths.reverse().forEach((dirPath) => {
    const dir = state.directories.get(dirPath);
    if (!dir) return;
    const children = [...dir.children.values()];
    dir.size = children.reduce((sum, node) => sum + (node.size || 0), 0);
    dir.fileCount = children.reduce((sum, node) => sum + (node.kind === "directory" ? node.fileCount || 0 : 1), 0);
    dir.updatedAt = children.reduce((latest, node) => Math.max(latest, node.updatedAt || 0), 0);
    dir.createdAt = children.reduce((latest, node) => Math.max(latest, node.createdAt || node.updatedAt || 0), 0);
  });
}

function expandAllTree(event) {
  event?.stopPropagation();
  setTreeCollapsed(false);
}

function collapseAllTree(event) {
  event?.stopPropagation();
  setTreeCollapsed(true);
}

function revealCurrentFileInTree(event) {
  event?.stopPropagation();
  if (!state.currentPath) return;
  expandPathToFile(state.currentPath);
  renderTree();
  requestAnimationFrame(() => {
    const active = els.fileTree.querySelector(".tree-row.active");
    active?.scrollIntoView({ block: "center" });
  });
}

function setTreeCollapsed(collapsed) {
  if (els.searchInput?.value?.trim().length >= 2) {
    state.searchTreeAutoExpand = !collapsed;
  }
  state.directories.forEach((dir, path) => {
    if (path) dir.collapsed = collapsed;
  });
  renderTree();
}

function expandMatchingDirectories(matcher, folderPaths, excludePaths = []) {
  state.directories.forEach((dir, path) => {
    if (!path) return;
    if (dirHasMatch(dir, matcher, folderPaths, excludePaths)) {
      dir.collapsed = false;
    }
  });
}

function expandPathToFile(path) {
  const parts = normalizeVaultPath(path).split("/");
  parts.pop();
  let current = "";

  parts.forEach((part) => {
    current = current ? `${current}/${part}` : part;
    const dir = state.directories.get(current);
    if (dir) dir.collapsed = false;
  });
}

function renderDirChildren(dir, parent, matcher, folderPaths, excludePaths = []) {
  const entries = [...dir.children.values()]
    .sort(compareTreeNodes);

  let fileCount = 0;

  entries.forEach((node) => {
    if (folderPaths.length && !nodeInAnyPath(node, folderPaths)) return;
    if (matcher && excludePaths.length && nodeIsExcluded(node, excludePaths)) return;
    const hasContentMatch = node.kind === "file" && state.contentSearchMatches?.has(node.path);
    if (matcher && node.kind === "file" && !matcher(node.path) && !hasContentMatch) return;
    if (matcher && node.kind === "directory" && !dirHasMatch(node, matcher, folderPaths, excludePaths)) return;

    const group = document.createElement("div");
    group.className = "tree-group";
    if (node.kind === "directory" && node.collapsed) group.classList.add("collapsed");

    const row = document.createElement("button");
    row.type = "button";
    row.className = "tree-row";
    if (node.kind === "file") {
      row.classList.add(`file-ext-${extensionOf(node.name) || "file"}`);
      if (!isOpenableDocument(node.name)) row.classList.add("not-openable");
      fileCount += 1;
    } else {
      row.classList.add("directory");
    }
    if (node.path === state.currentPath) row.classList.add("active");
    if (state.selectedPaths.has(node.path)) row.classList.add("selected");
    state.treeVisibleOrder.push(node.path);

    const toggle = document.createElement("span");
    toggle.className = "tree-toggle";
    toggle.textContent = node.kind === "directory" ? (node.collapsed ? "›" : "⌄") : "";

    const name = document.createElement("span");
    name.className = "tree-name";
    name.textContent = node.name;

    row.append(toggle, name);
    if (node.kind === "directory") {
      const count = document.createElement("span");
      count.className = "tree-count";
      count.textContent = String(matcher ? countDirMatches(node, matcher, folderPaths, excludePaths) : (node.fileCount || 0));
      row.append(count);
    }
    row.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (event.ctrlKey || event.metaKey) {
        if (state.selectedPaths.has(node.path)) state.selectedPaths.delete(node.path);
        else state.selectedPaths.add(node.path);
        state.lastSelectedPath = node.path;
        renderTree();
        return;
      }
      if (event.shiftKey && state.lastSelectedPath) {
        const lastIdx = state.treeVisibleOrder.indexOf(state.lastSelectedPath);
        const curIdx = state.treeVisibleOrder.indexOf(node.path);
        if (lastIdx >= 0 && curIdx >= 0) {
          const lo = Math.min(lastIdx, curIdx), hi = Math.max(lastIdx, curIdx);
          state.treeVisibleOrder.slice(lo, hi + 1).forEach((p) => state.selectedPaths.add(p));
        } else {
          state.selectedPaths.add(node.path);
        }
        renderTree();
        return;
      }
      state.selectedPaths.clear();
      state.selectedPaths.add(node.path);
      state.lastSelectedPath = node.path;
      renderTree();
      if (node.kind === "directory") {
        node.collapsed = !node.collapsed;
        renderTree();
      } else if (isOpenableDocument(node.name)) {
        const isSearchMode = els.searchInput?.value?.trim().length >= 2 || Boolean(state.contentSearchMatches);
        if (isSearchMode) await openFileInNewTab(node.path);
        else await openFile(node.path);
      }
    });
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (!state.selectedPaths.has(node.path) || state.selectedPaths.size <= 1) {
        state.selectedPaths.clear();
        state.selectedPaths.add(node.path);
        state.lastSelectedPath = node.path;
        renderTree();
      }
      showNodeContextMenu(e.clientX, e.clientY, node.path, node.kind === "directory");
    });
    group.append(row);

    if (hasContentMatch && state.contentSearchSnippetsVisible) {
      const snippet = state.contentSearchMatches.get(node.path);
      const snippetEl = document.createElement("div");
      snippetEl.className = "tree-content-snippet";
      const escaped = state.contentSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      snippetEl.innerHTML = escapeHtml(snippet).replace(new RegExp(`(${escaped})`, "gi"), `<mark>$1</mark>`);
      snippetEl.addEventListener("click", () => void openFileInNewTab(node.path));
      group.append(snippetEl);
    }

    if (node.kind === "directory") {
      const children = document.createElement("div");
      children.className = "tree-children";
      fileCount += renderDirChildren(node, children, matcher, folderPaths, excludePaths);
      group.append(children);
    }

    parent.append(group);
  });

  return fileCount;
}

function dirHasMatch(dir, matcher, folderPaths, excludePaths = []) {
  return [...dir.children.values()].some((node) => {
    if (folderPaths.length && !nodeInAnyPath(node, folderPaths)) return false;
    if (excludePaths.length && nodeIsExcluded(node, excludePaths)) return false;
    if (node.kind === "file") return matcher(node.path) || state.contentSearchMatches?.has(node.path);
    return dirHasMatch(node, matcher, folderPaths, excludePaths);
  });
}

function countDirMatches(dir, matcher, folderPaths, excludePaths = []) {
  let count = 0;
  for (const node of dir.children.values()) {
    if (folderPaths.length && !nodeInAnyPath(node, folderPaths)) continue;
    if (excludePaths.length && nodeIsExcluded(node, excludePaths)) continue;
    if (node.kind === "file") {
      if (matcher(node.path) || state.contentSearchMatches?.has(node.path)) count++;
    } else {
      count += countDirMatches(node, matcher, folderPaths, excludePaths);
    }
  }
  return count;
}

function nodeIsExcluded(node, excludePaths) {
  const path = node.path || "";
  return excludePaths.some((ex) => path === ex || path.startsWith(`${ex}/`));
}

function compareTreeNodes(a, b) {
  const direction = state.treeSortDirection === "asc" ? 1 : -1;
  let result = 0;

  if (state.treeSortMode === "name") {
    result = compareName(a, b);
  } else if (state.treeSortMode === "updated") {
    result = compareNumber(a.updatedAt, b.updatedAt) || compareName(a, b);
  } else if (state.treeSortMode === "created") {
    result = compareNumber(a.createdAt || a.updatedAt, b.createdAt || b.updatedAt) || compareName(a, b);
  } else if (state.treeSortMode === "size") {
    result = compareNumber(a.size, b.size) || compareName(a, b);
  } else if (state.treeSortMode === "type") {
    result = compareType(a, b) || compareName(a, b);
  }

  return result * direction;
}

function compareName(a, b) {
  return a.name.localeCompare(b.name, "ko", { numeric: true, sensitivity: "base" });
}

function compareNumber(a = 0, b = 0) {
  return (a || 0) - (b || 0);
}

function compareType(a, b) {
  const aType = a.kind === "directory" ? "0-folder" : extensionOf(a.name);
  const bType = b.kind === "directory" ? "0-folder" : extensionOf(b.name);
  return aType.localeCompare(bType, "ko", { numeric: true, sensitivity: "base" });
}

function extensionOf(name) {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index + 1).toLowerCase();
}

function createSearchMatcher(query, { regexMode, caseSensitive }) {
  const trimmed = query.trim();
  if (!trimmed) {
    els.searchInput.setCustomValidity("");
    return null;
  }

  if (!regexMode) {
    els.searchInput.setCustomValidity("");
    const needle = caseSensitive ? trimmed : trimmed.toLowerCase();
    return (path) => (caseSensitive ? path : path.toLowerCase()).includes(needle);
  }

  try {
    const regex = new RegExp(trimmed, caseSensitive ? "" : "i");
    els.searchInput.setCustomValidity("");
    return (path) => {
      regex.lastIndex = 0;
      return regex.test(path);
    };
  } catch {
    els.searchInput.setCustomValidity("Invalid regular expression");
    return () => false;
  }
}

function parsePathList(value) {
  return value
    .split(/[\n,]+/)
    .map(normalizeVaultPath)
    .filter(Boolean);
}

function nodeInAnyPath(node, paths) {
  if (!paths.length) return true;
  const path = node.path || "";
  return paths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || prefix.startsWith(`${path}/`));
}

async function openFile(path) {
  const curTab = activeTab();
  if (curTab?.pinned && path !== curTab.path) {
    await openFileInNewTab(path);
    return;
  }
  if (!(await confirmDiscardEdit())) return;
  const node = state.files.get(path);
  if (!node || !isOpenableDocument(node.name)) return;

  const startedAt = performance.now();
  let readDoneAt = startedAt;
  let renderDeferred = false;
  let loadingShown = true;
  const diagnostics = createDocumentOpenDiagnostics(node, startedAt);
  const markOpenStep = (step) => {
    diagnostics.mark(step);
    showDocumentOpenStep(node.name, step, startedAt);
  };
  const showOpenStep = (step) => showDocumentOpenStep(node.name, step, startedAt);
  markOpenStep("준비 중");
  try {
    markOpenStep("파일 읽는 중");
    const content = await readFileNode(node);
    readDoneAt = performance.now();
    markOpenStep("탭과 기록 갱신 중");
    state.currentPath = path;
    state.currentContent = content;
    state.currentNode = node;
    state.editMode = false;
    pushNavigationHistory({ type: "file", path });
    els.notePath.textContent = displayDocumentTitle(node.name);
    els.notePath.title = path;
    if (els.mobileDocTitle) els.mobileDocTitle.textContent = displayDocumentTitle(node.name);
    els.noteTitle.textContent = displayDocumentTitle(node.name);
    const curTab = activeTab();
    const pinnedTabChanged = curTab?.pinned && (curTab.path !== path || curTab.title !== displayDocumentTitle(node.name));
    if (curTab && curTab.path === null && !curTab.view) {
      const tabIdx = state.tabs.indexOf(curTab);
      if (tabIdx >= 0 && tabIdx < state.tabs.length - 1) {
        state.tabs.splice(tabIdx, 1);
        state.tabs.push(curTab);
      }
    }
    if (curTab) { curTab.path = path; curTab.title = displayDocumentTitle(node.name); curTab.view = null; }
    if (pinnedTabChanged) {
      savePinnedTabsLocal();
      void savePinnedTabsOrderToVault();
    }
    renderTabStrip();
    pushRecentlyOpened(path, displayDocumentTitle(node.name));
    updateEditButtons();
    els.markdownView.classList.remove("empty-state", "plain-text-mode", "code-document");
    els.markdownView.replaceChildren();
    markOpenStep("화면 전환 중");
    showNoteView();
    scrollViewerTop();
    renderDeferred = true;
    scheduleCurrentDocumentRender(++state.documentRenderToken, startedAt, readDoneAt, loadingShown, node, markOpenStep, showOpenStep, diagnostics);
  } finally {
    if (!renderDeferred) {
      hideLoading();
      diagnostics.finish();
      logOpenFileTiming(node, {
        loadingShown,
        readMs: readDoneAt - startedAt,
        renderMs: 0,
        totalMs: performance.now() - startedAt,
        steps: diagnostics.summary(),
      });
    }
  }
}

function showDocumentOpenStep(fileName, step, startedAt) {
  const elapsed = Math.max(0, Math.round(performance.now() - startedAt));
  showLoadingOverlay(`문서 열기: ${step}\n${fileName}\n${elapsed}ms`);
}

function scheduleCurrentDocumentRender(token, startedAt, readDoneAt, loadingShown, node, markOpenStep, showOpenStep, diagnostics) {
  requestAnimationFrame(() => {
    if (token !== state.documentRenderToken || state.currentPath !== node.path) return;
    const renderStartedAt = performance.now();
    try {
      markOpenStep?.("본문 렌더링 중");
      renderCurrentDocument(showOpenStep, diagnostics);
      markOpenStep?.("완료 중");
    } finally {
      hideLoading();
      diagnostics?.finish();
      logOpenFileTiming(node, {
        loadingShown,
        readMs: readDoneAt - startedAt,
        renderMs: performance.now() - renderStartedAt,
        totalMs: performance.now() - startedAt,
        steps: diagnostics?.summary(),
      });
    }
  });
}

function createDocumentOpenDiagnostics(node, startedAt) {
  const steps = [];
  let current = null;
  return {
    mark(step) {
      const now = performance.now();
      if (current) {
        current.ms = now - current.at;
        warnSlowDocumentOpenStep(node, current);
      }
      current = { step, at: now, ms: 0 };
      steps.push(current);
    },
    finish() {
      if (!current) return;
      const now = performance.now();
      current.ms = now - current.at;
      warnSlowDocumentOpenStep(node, current);
      current = null;
    },
    summary() {
      return steps.map((item) => ({ step: item.step, ms: Math.round(item.ms) }));
    },
    startedAt,
  };
}

function warnSlowDocumentOpenStep(node, item) {
  const ms = Math.round(item.ms || 0);
  if (ms < DOCUMENT_OPEN_SLOW_STEP_MS) return;
  console.warn("[obsidian-web-viewer] slow document open step", {
    cause: item.step,
    ms,
    path: node.path,
    size: node.size || 0,
    serverCache: node.lastServerCache || "",
  });
}

function logOpenFileTiming(node, timing) {
  const totalMs = Math.round(timing.totalMs);
  if (!timing.loadingShown && totalMs < 250) return;
  const payload = {
    path: node.path,
    size: node.size || 0,
    loadingShown: timing.loadingShown,
    readMs: Math.round(timing.readMs),
    renderMs: Math.round(timing.renderMs),
    totalMs,
    serverCache: node.lastServerCache || "",
    steps: timing.steps || [],
  };
  console.info("[obsidian-web-viewer] openFile", payload);
  if (totalMs >= DOCUMENT_OPEN_SLOW_TOTAL_MS) {
    const slowest = payload.steps.reduce((max, item) => (item.ms > (max?.ms || 0) ? item : max), null);
    console.warn("[obsidian-web-viewer] slow document open", {
      cause: slowest?.step || "unknown",
      causeMs: slowest?.ms || 0,
      ...payload,
    });
  }
}

function activeNavigationHistory() {
  if (!state.navigationHistories.has(state.activeTabId)) {
    state.navigationHistories.set(state.activeTabId, { entries: [], index: -1 });
  }
  return state.navigationHistories.get(state.activeTabId);
}

function pushNavigationHistory(entry) {
  if (state.navigatingHistory) {
    updateHistoryButtons();
    return;
  }
  const history = activeNavigationHistory();
  const current = history.entries[history.index];
  if (current?.type === entry.type && current?.path === entry.path) {
    updateHistoryButtons();
    return;
  }
  history.entries = history.entries.slice(0, history.index + 1).concat(entry);
  history.index = history.entries.length - 1;
  updateHistoryButtons();
}

async function navigateHistoryBack() {
  const history = activeNavigationHistory();
  if (history.index <= 0) return;
  history.index -= 1;
  await openHistoryEntry(history.entries[history.index]);
}

async function navigateHistoryForward() {
  const history = activeNavigationHistory();
  if (history.index >= history.entries.length - 1) return;
  history.index += 1;
  await openHistoryEntry(history.entries[history.index]);
}

async function openHistoryEntry(entry) {
  if (!entry) return;
  state.navigatingHistory = true;
  try {
    if (entry.type === "file") await openFile(entry.path);
  } finally {
    state.navigatingHistory = false;
    updateHistoryButtons();
  }
}

function updateHistoryButtons() {
  const history = activeNavigationHistory();
  if (els.historyBackButton) els.historyBackButton.disabled = history.index <= 0;
  if (els.historyForwardButton) els.historyForwardButton.disabled = history.index >= history.entries.length - 1;
}

function scrollViewerTop() {
  els.viewerWrap.scrollTo({ top: 0, behavior: "auto" });
}

function scrollViewerBottom() {
  els.viewerWrap.scrollTo({ top: els.viewerWrap.scrollHeight, behavior: "auto" });
}

function scrollViewerByPageFraction(direction) {
  const amount = Math.max(120, els.viewerWrap.clientHeight / 3);
  const maxTop = Math.max(0, els.viewerWrap.scrollHeight - els.viewerWrap.clientHeight);
  const nextTop = Math.max(0, Math.min(maxTop, els.viewerWrap.scrollTop + amount * direction));
  if (Math.abs(nextTop - els.viewerWrap.scrollTop) < 1) return;
  els.viewerWrap.scrollTo({ top: nextTop, behavior: "auto" });
}

function showFullCurrentTitle() {
  if (Date.now() < state.noteTitleDeleteSuppressedUntil) return;
  if (!state.currentPath) return;
  // PC(마우스)에서는 인라인 편집, 모바일에서는 기존 alert
  const isPointerFine = window.matchMedia("(pointer: fine)").matches;
  if (isPointerFine && state.currentNode?.serverBacked) {
    startInlineTitleEdit();
    return;
  }
  alert(`${displayDocumentTitle(state.currentNode?.name || state.currentPath)}\n${state.currentPath}`);
}

function startInlineTitleEdit() {
  const h2 = els.noteTitle;
  if (!h2 || h2.querySelector("input")) return;
  const currentTitle = displayDocumentTitle(state.currentNode?.name || state.currentPath);
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentTitle;
  input.className = "note-title-edit-input";
  input.setAttribute("aria-label", "제목 편집");
  h2.textContent = "";
  h2.appendChild(input);
  input.focus();
  input.select();
  const commit = async () => {
    const newTitle = input.value.trim();
    h2.textContent = currentTitle;
    if (newTitle && newTitle !== currentTitle) await renameCurrentFile(newTitle);
  };
  const cancel = () => { h2.textContent = currentTitle; };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.removeEventListener("blur", commit); h2.textContent = currentTitle; }
  });
  input.addEventListener("blur", commit, { once: true });
}

function startNoteTitleLongPress() {
  clearNoteTitleLongPress();
  state.noteTitlePressTimer = window.setTimeout(async () => {
    state.noteTitlePressTimer = null;
    state.noteTitleDeleteSuppressedUntil = Date.now() + 1000;
    await confirmDeleteCurrentFile();
  }, 700);
}

function clearNoteTitleLongPress() {
  if (!state.noteTitlePressTimer) return;
  window.clearTimeout(state.noteTitlePressTimer);
  state.noteTitlePressTimer = null;
}

async function confirmDeleteCurrentFile() {
  const node = state.currentNode;
  if (!node || !state.currentPath) return;
  if (!canDeleteNode(node)) {
    alert("현재 문서는 웹에서 삭제할 수 없습니다.");
    return;
  }
  const ok = await appConfirm(`파일을 삭제하시겠습니까?\n${state.currentPath}`, "파일 삭제");
  if (!ok) return;
  await deleteCurrentFileNode(node);
}

function canDeleteNode(node) {
  return Boolean(node?.handle || (node?.serverBacked && state.serverVaultWritable));
}

async function deleteCurrentFileNode(node) {
  const path = node.path;
  showLoading("문서 삭제 중...");
  try {
    if (node.handle && node.dirHandle) {
      await node.dirHandle.removeEntry(node.name);
    } else if (node.serverBacked && state.serverVaultWritable) {
      await deleteServerFile(path);
    } else {
      return;
    }

    removeFileNode(path);
    state.currentPath = null;
    state.currentContent = "";
    state.currentNode = null;
    state.editMode = false;
    state.tasks = state.tasks.filter((task) => task.path !== path);
    state.calendarTaskFiles.delete(path);
    saveCalendarCache();
    refreshDirectoryMetadataFrom(path);
    renderTree();
    refreshRecentFilesCache();
    els.notePath.textContent = "문서를 선택하세요";
    if (els.mobileDocTitle) els.mobileDocTitle.textContent = "";
    els.noteTitle.textContent = "Obsidian Markdown Viewer";
    els.markdownView.classList.add("empty-state");
    els.markdownView.innerHTML = "<p>문서를 선택하세요.</p>";
    showNoteView();
  } finally {
    hideLoading();
  }
}

function removeFileNode(path) {
  const node = state.files.get(path);
  if (!node) return;
  state.files.delete(path);
  forgetCreatedAt(path);
  const parentPath = path.includes("/") ? path.split("/").slice(0, -1).join("/") : "";
  const parent = state.directories.get(parentPath);
  parent?.children.delete(node.name);
  const objectUrl = state.objectUrls.get(path);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  state.objectUrls.delete(path);
  state.readFileRequests.delete(path);
}

function forgetCreatedAt(path) {
  if (!path) return;
  const metadata = readCreationMetadata();
  if (!(path in metadata)) return;
  delete metadata[path];
  writeCreationMetadata(metadata);
}

async function deleteServerFile(path) {
  const response = await fetch(`/api/vault-file?path=${encodeURIComponent(path)}`, { method: "DELETE" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "파일 삭제에 실패했습니다.");
}

async function readFileNode(node) {
  if (typeof node.content === "string") return node.content;
  if (state.readFileRequests.has(node.path)) return state.readFileRequests.get(node.path);
  const request = readFileNodeUncached(node).finally(() => {
    state.readFileRequests.delete(node.path);
  });
  state.readFileRequests.set(node.path, request);
  return request;
}

async function readFileNodeUncached(node) {
  if (node.serverBacked) {
    const response = await fetch(vaultFileReadUrl(node));
    if (!response.ok) throw new Error("파일을 읽지 못했습니다.");
    node.lastServerCache = response.headers.get("X-OWV-File-Cache") || "";
    const content = await response.text();
    if (isTextVaultFilePath(node.path)) node.content = content;
    return content;
  }
  const file = await node.handle.getFile();
  return file.text();
}

function vaultFileReadUrl(node) {
  const version = [node.updatedAt || 0, node.size || 0].join(":");
  return `/api/vault-file?path=${encodeURIComponent(node.path)}&v=${encodeURIComponent(version)}`;
}

function initTheme() {
  const saved = localStorage.getItem("obsidian-web-viewer-theme");
  const preferredDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  setTheme(saved || (preferredDark ? "dark" : "light"));
}

function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("obsidian-web-viewer-theme", theme);
  els.themeButton.textContent = theme === "dark" ? "☀️" : "🌙";
  els.themeButton.title = theme === "dark" ? "Light" : "Dark";
  els.themeButton.setAttribute("aria-label", els.themeButton.title);
}

function initOptions() {
  const savedCalendarPath = localStorage.getItem("obsidian-web-viewer-calendar-paths") || "";
  if (els.calendarPathInput) els.calendarPathInput.value = savedCalendarPath;
  const savedRandomPath = localStorage.getItem("obsidian-web-viewer-random-paths") || "";
  if (els.randomPathInput) els.randomPathInput.value = savedRandomPath;
  state.randomOldFirst = localStorage.getItem("obsidian-web-viewer-random-old-first") === "1";
  updateRandomPriorityToggleButton();
  const savedDailyPath = normalizeDailyNotePath(localStorage.getItem("obsidian-web-viewer-daily-note-path") || state.dailyNotePath);
  state.dailyNotePath = savedDailyPath;
  if (els.dailyNotePathInput) els.dailyNotePathInput.value = savedDailyPath;
  const savedNewNotePath = localStorage.getItem("obsidian-web-viewer-new-note-path") || "";
  state.newNotePath = savedNewNotePath;
  if (els.newNotePathInput) els.newNotePathInput.value = savedNewNotePath;
  const savedImagePath = localStorage.getItem("obsidian-web-viewer-image-path") || "";
  state.imageSavePath = savedImagePath;
  if (els.imagePathInput) els.imagePathInput.value = savedImagePath;
  const savedClipperFolder = localStorage.getItem("obsidian-web-viewer-clipper-folder") || "Clippings";
  if (els.clipperFolderInput) els.clipperFolderInput.value = savedClipperFolder;
  updateBookmarkletHref(savedClipperFolder);
  const savedSearchExclude = localStorage.getItem("obsidian-web-viewer-search-exclude") || "";
  state.searchExcludePaths = parsePathList(savedSearchExclude);
  if (els.searchExcludeInput) els.searchExcludeInput.value = savedSearchExclude;
  // Discord 알림 목록 기본 렌더링 (서버 설정 로드 전 기본값)
  renderDiscordNotifyList("todo", [60]);
  renderDiscordNotifyList("event", [60]);
  renderDiscordFixedList("todo", []);
  renderDiscordFixedList("event", []);
  const savedFont = localStorage.getItem("obsidian-web-viewer-font") || "default";
  const appliedFont = setAppFont(savedFont);
  if (els.fontSelect) els.fontSelect.value = appliedFont;
  applyDeviceDisplayOptions();
  try {
    const sf = localStorage.getItem("obsidian-web-viewer-task-filters");
    if (sf) Object.assign(state.calendarTaskFilters, JSON.parse(sf));
  } catch {}
  const savedTagsStr = localStorage.getItem("obsidian-web-viewer-task-tags");
  if (savedTagsStr) {
    const parsed = savedTagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    if (parsed.length) state.calendarTaskTags = parsed;
  }
  if (els.taskTagsInput) els.taskTagsInput.value = state.calendarTaskTags.join(", ");
}

async function loadServerSettings() {
  try {
    const response = await fetch("/api/settings", { cache: "no-store" });
    if (!response.ok) throw new Error("Settings load failed");
    const settings = await response.json();
    if (typeof settings.calendarPaths === "string" && els.calendarPathInput && settings.calendarPaths !== els.calendarPathInput.value) {
      els.calendarPathInput.value = settings.calendarPaths;
      localStorage.setItem("obsidian-web-viewer-calendar-paths", settings.calendarPaths);
      refreshCalendarForFilterChange();
    }
    if (typeof settings.randomPaths === "string" && els.randomPathInput && settings.randomPaths !== els.randomPathInput.value) {
      els.randomPathInput.value = settings.randomPaths;
      localStorage.setItem("obsidian-web-viewer-random-paths", settings.randomPaths);
      invalidateRandomMarkdownCache();
    }
    if (typeof settings.dailyNotePath === "string" && settings.dailyNotePath) {
      const normalized = normalizeDailyNotePath(settings.dailyNotePath);
      if (normalized !== state.dailyNotePath) {
        state.dailyNotePath = normalized;
        if (els.dailyNotePathInput) els.dailyNotePathInput.value = normalized;
        localStorage.setItem("obsidian-web-viewer-daily-note-path", normalized);
      }
    }
    if (typeof settings.newNotePath === "string") {
      if (settings.newNotePath !== state.newNotePath) {
        state.newNotePath = settings.newNotePath;
        if (els.newNotePathInput) els.newNotePathInput.value = settings.newNotePath;
        localStorage.setItem("obsidian-web-viewer-new-note-path", settings.newNotePath);
      }
    }
    if (typeof settings.imagePath === "string") {
      if (settings.imagePath !== state.imageSavePath) {
        state.imageSavePath = settings.imagePath;
        if (els.imagePathInput) els.imagePathInput.value = settings.imagePath;
        localStorage.setItem("obsidian-web-viewer-image-path", settings.imagePath);
      }
    }
    if (typeof settings.searchExclude === "string") {
      const current = els.searchExcludeInput?.value || "";
      if (settings.searchExclude !== current) {
        if (els.searchExcludeInput) els.searchExcludeInput.value = settings.searchExclude;
        state.searchExcludePaths = parsePathList(settings.searchExclude);
        localStorage.setItem("obsidian-web-viewer-search-exclude", settings.searchExclude);
      }
    }
    if (typeof settings.discordWebhookUrl === "string" && els.discordWebhookInput) {
      els.discordWebhookInput.value = settings.discordWebhookUrl;
    }
    {
      const rawTodo = settings.discordNotifyOffsetsTodo;
      const todoOffsets = Array.isArray(rawTodo) && rawTodo.length
        ? rawTodo
        : [Math.round((Number(settings.discordNotifyHoursTodo) || 1) * 60)];
      renderDiscordNotifyList("todo", todoOffsets);
    }
    {
      const rawEvent = settings.discordNotifyOffsetsEvent;
      const eventOffsets = Array.isArray(rawEvent) && rawEvent.length
        ? rawEvent
        : [Math.round((Number(settings.discordNotifyHoursEvent) || 1) * 60)];
      renderDiscordNotifyList("event", eventOffsets);
    }
    renderDiscordFixedList("todo", Array.isArray(settings.discordFixedTimesTodo) ? settings.discordFixedTimesTodo : []);
    renderDiscordFixedList("event", Array.isArray(settings.discordFixedTimesEvent) ? settings.discordFixedTimesEvent : []);
    renderClipperRuleList(Array.isArray(settings.clipperRules) ? settings.clipperRules : []);
  } catch {
    // Local storage remains the fallback for file:// or unavailable server settings.
  }
}

function updateDailyNotePath() {
  const nextPath = normalizeDailyNotePath(els.dailyNotePathInput?.value || state.dailyNotePath);
  state.dailyNotePath = nextPath;
  localStorage.setItem("obsidian-web-viewer-daily-note-path", nextPath);
  scheduleSettingsSave();
}

function handleNewNotePathInput() {
  const value = normalizeVaultPath(els.newNotePathInput?.value || "");
  state.newNotePath = value;
  localStorage.setItem("obsidian-web-viewer-new-note-path", value);
  scheduleSettingsSave();
}

async function updateBookmarkletHref(folder) {
  const link = document.getElementById("bookmarkletLink");
  if (!link) return;
  try {
    const res = await fetch(`/api/clip-bookmarklet?folder=${encodeURIComponent(folder || "Clippings")}`);
    const code = await res.text();
    link.href = code;
  } catch (e) {
    link.href = "#";
  }
}

function handleImagePathInput() {
  const value = normalizeVaultPath(els.imagePathInput?.value || "");
  state.imageSavePath = value;
  localStorage.setItem("obsidian-web-viewer-image-path", value);
  scheduleSettingsSave();
}


function handleSearchExcludeInput() {
  state.searchExcludePaths = parsePathList(els.searchExcludeInput?.value || "");
  localStorage.setItem("obsidian-web-viewer-search-exclude", els.searchExcludeInput?.value || "");
  scheduleSettingsSave();
  renderTree();
}

async function openNewNote() {
  if (!state.rootHandle && !state.serverVaultWritable) {
    alert("vault를 먼저 열어야 새 노트를 만들 수 있습니다.");
    return;
  }
  const now = new Date();
  const date = formatDate(now);
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  const defaultTitle = `${date} ${time}`;

  const title = await showNewNoteDialog(defaultTitle);
  if (title === null) return;

  await createAndOpenNote(title.trim() || defaultTitle);
}

function positionNewNoteDialog() {
  const dialog = els.newNoteDialog;
  if (!dialog || !isTouchPrimaryDevice()) return;
  const vv = window.visualViewport;
  if (!vv) return;
  const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
  if (keyboardHeight > 80) {
    const top = vv.offsetTop + Math.max(8, (vv.height - dialog.offsetHeight) / 2);
    dialog.style.marginTop = `${top}px`;
    dialog.style.marginBottom = "auto";
  } else {
    dialog.style.marginTop = "";
    dialog.style.marginBottom = "";
  }
}

function showNewNoteDialog(defaultTitle) {
  return new Promise((resolve) => {
    if (!els.newNoteDialog) {
      resolve(prompt("새 노트 제목:", defaultTitle));
      return;
    }
    let settled = false;
    els.newNoteTitleInput.value = defaultTitle;
    els.newNoteDialog.showModal();
    positionNewNoteDialog();
    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", positionNewNoteDialog);
    requestAnimationFrame(() => {
      els.newNoteTitleInput.select();
    });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (els.newNoteDialog.open) els.newNoteDialog.close();
      els.newNoteDialog.removeEventListener("close", onClose);
      els.newNoteDialog.querySelector("form")?.removeEventListener("submit", onSubmit);
      els.newNoteCancelButton.removeEventListener("click", onCancel);
      if (vv) vv.removeEventListener("resize", positionNewNoteDialog);
      els.newNoteDialog.style.marginTop = "";
      els.newNoteDialog.style.marginBottom = "";
      resolve(result);
    };
    const onClose = () => finish(els.newNoteDialog.returnValue === "confirm" ? els.newNoteTitleInput.value : null);
    const onCancel = () => {
      finish(null);
    };
    els.newNoteDialog.returnValue = "";
    els.newNoteDialog.querySelector("form")?.addEventListener("submit", onSubmit, { once: true });
    els.newNoteDialog.addEventListener("close", onClose, { once: true });
    els.newNoteCancelButton.addEventListener("click", onCancel, { once: true });
    function onSubmit() {
      els.newNoteDialog.returnValue = "confirm";
    }
  });
}

async function createAndOpenNote(title, dirPathOverride) {
  const dirPath = dirPathOverride !== undefined
    ? dirPathOverride
    : normalizeVaultPath(state.newNotePath || els.newNotePathInput?.value || "");
  const fileName = title.endsWith(".md") ? title : `${title}.md`;
  const path = dirPath ? `${dirPath}/${fileName}` : fileName;

  if (state.files.has(path)) {
    await openFile(path);
    return;
  }
  const initialContent = `# ${title.replace(/\.md$/i, "")}\n\n`;

  if (!state.rootHandle && state.serverVaultWritable) {
    const metadata = await writeServerFile(path, initialContent, { backup: false });
    if (dirPath) ensureDirectoryNodePath(dirPath);
    const node = { name: fileName, path, content: initialContent, serverBacked: true, kind: "file", ...metadata };
    state.files.set(path, node);
    const dir = state.directories.get(dirPath || "");
    if (dir) dir.children.set(node.name, node);
    refreshDirectoryMetadataFrom(path);
    renderTree();
    refreshRecentFilesCache();
    invalidateRandomMarkdownCache();
    await openCreatedNoteInEditMode(path, node, initialContent);
    return;
  }

  const dirHandle = await getOrCreateDirectoryHandle(dirPath || "");
  const handle = await dirHandle.getFileHandle(fileName, { create: true });
  await writeFileHandle(handle, initialContent);
  if (dirPath) ensureDirectoryNodePath(dirPath);
  const metadata = await readFileMetadata(handle, path);
  const node = { name: fileName, path, handle, dirHandle, kind: "file", ...metadata };
  state.files.set(path, node);
  const dir = state.directories.get(dirPath || "");
  if (dir) dir.children.set(node.name, node);
  refreshDirectoryMetadataFrom(path);
  renderTree();
  refreshRecentFilesCache();
  invalidateRandomMarkdownCache();
  await openCreatedNoteInEditMode(path, node, initialContent);
}

async function openCreatedNoteInEditMode(path, node, content) {
  if (state.activeView === "calendar") {
    await createTab();
  }
  state.currentPath = path;
  state.currentContent = content;
  state.currentNode = node;
  state.editMode = false;
  state.activeView = "note";
  pushNavigationHistory({ type: "file", path });
  els.notePath.textContent = displayDocumentTitle(node.name);
  els.notePath.title = path;
  if (els.mobileDocTitle) els.mobileDocTitle.textContent = displayDocumentTitle(node.name);
  els.noteTitle.textContent = displayDocumentTitle(node.name);
  const curTab = activeTab();
  if (curTab) { curTab.path = path; curTab.title = displayDocumentTitle(node.name); curTab.view = null; }
  renderTabStrip();
  pushRecentlyOpened(path, displayDocumentTitle(node.name));
  if (els.newTabPage) els.newTabPage.hidden = true;
  if (els.noteTitleArea) els.noteTitleArea.hidden = true;
  if (els.headingControlsOverlay) els.headingControlsOverlay.hidden = true;
  await enterEditMode();
}

function handleSyncStatusClick() {
  if (state.activeView === "calendar" && isTaskCalendarKind()) {
    state.calendarSyncedAt = 0;
    state.calendarCacheState = "empty";
    refreshCalendarTasks({ showLoading: true });
    return;
  }
  if (state.vaultSyncing) return;
  state.vaultSyncing = true;
  updateSyncStatus();
  loadSampleVault().finally(() => {
    state.vaultSyncing = false;
    updateSyncStatus();
  });
}

async function handleVisibilityChange() {
  if (document.visibilityState !== "visible") return;
  if (state.vaultLoaded) {
    await loadCalendarCache();
    scheduleCalendarRefresh();
  }
  if (!state.serverVaultWritable) return;
  await checkServerConnection();
}

async function checkServerConnection() {
  try {
    const res = await fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error();
    if (state.connectionLost) {
      state.connectionLost = false;
      stopConnectionRetry();
      showConnectionBanner("서버에 재연결됐습니다.", "reconnected");
      if (state.vaultLoaded) {
        loadCalendarCache().finally(scheduleCalendarRefresh);
      }
    }
  } catch {
    if (!state.connectionLost) {
      state.connectionLost = true;
      showConnectionBanner("서버 연결이 끊겼습니다. 탭하면 새로고침합니다.");
      startConnectionRetry();
    }
  }
}

let _sseBuildId = null;

function connectSSE() {
  if (state.sseSource) { state.sseSource.close(); state.sseSource = null; }
  const es = new EventSource("/api/events");
  state.sseSource = es;

  es.addEventListener("build-id", (e) => {
    const { id } = JSON.parse(e.data);
    if (_sseBuildId === null) { _sseBuildId = id; return; }
    if (_sseBuildId !== id) showUpdateBar();
  });

  es.addEventListener("file-changed", async (e) => {
    const { path, updatedAt, isNew, size } = JSON.parse(e.data);
    if (path === DEVICE_TABS_VAULT_PATH) {
      void loadAndRenderDeviceTabs();
      return;
    }
    if (path === PINNED_TABS_VAULT_PATH) {
      void loadPinnedTabsFromVault();
      return;
    }
    const node = state.files.get(path);
    if (node) {
      node.content = undefined;
      node.updatedAt = updatedAt;
    } else if (isNew && isIndexedFile(path)) {
      // 다른 기기에서 새로 추가된 파일을 state.files에 등록
      registerUploadedFileInVault(path, size || 0);
    }
    if (state.currentPath === path && !state.editMode) {
      const freshNode = state.files.get(path) || state.currentNode;
      if (freshNode) {
        try {
          const content = await readFileNodeUncached(freshNode);
          if (content !== state.currentContent) {
            state.currentContent = content;
            renderCurrentDocument();
          }
        } catch {}
      }
    }
    if (path.toLowerCase().endsWith(".md")) {
      scheduleCalendarRefresh();
    }
  });

  es.addEventListener("device-tabs-changed", () => {
    void loadAndRenderDeviceTabs();
  });

  es.addEventListener("pinned-tabs-changed", () => {
    void loadPinnedTabsFromVault();
  });

  es.addEventListener("file-deleted", (e) => {
    const { path } = JSON.parse(e.data);
    if (state.currentPath === path) {
      state.currentContent = "(파일이 삭제되었습니다)";
      renderCurrentDocument();
    }
  });

  es.onerror = () => {
    es.close();
    state.sseSource = null;
    if (state.vaultLoaded) window.setTimeout(connectSSE, 5000);
  };
}

function disconnectSSE() {
  if (state.sseSource) { state.sseSource.close(); state.sseSource = null; }
}

function showUpdateBar() {
  if (document.getElementById("update-bar")) return;
  const bar = document.createElement("div");
  bar.id = "update-bar";
  bar.innerHTML = `<span>새 버전이 있습니다</span><button onclick="location.reload()">새로고침</button><button id="update-bar-close" aria-label="닫기">✕</button>`;
  document.body.appendChild(bar);
  document.getElementById("update-bar-close").addEventListener("click", () => bar.remove());
}

function startConnectionRetry() {
  if (state.connectionRetryTimer) return;
  state.connectionRetryTimer = window.setInterval(async () => {
    if (!state.connectionLost) {
      stopConnectionRetry();
      return;
    }
    await checkServerConnection();
  }, 8000);
}

function stopConnectionRetry() {
  if (state.connectionRetryTimer) {
    window.clearInterval(state.connectionRetryTimer);
    state.connectionRetryTimer = null;
  }
}

function showConnectionBanner(message, type = "error") {
  if (!els.connectionBanner) return;
  els.connectionBanner.textContent = message;
  els.connectionBanner.className = `connection-banner connection-banner-${type}`;
  els.connectionBanner.hidden = false;
  if (type === "reconnected") {
    window.clearTimeout(showConnectionBanner._timer);
    showConnectionBanner._timer = window.setTimeout(() => {
      if (els.connectionBanner) els.connectionBanner.hidden = true;
    }, 3000);
  }
}

function updateAppFont() {
  setAppFont(els.fontSelect?.value || "default");
}

function resetFontOptions() {
  const deviceKey = currentFontDeviceKey();
  localStorage.removeItem("obsidian-web-viewer-font");
  localStorage.removeItem(deviceOptionStorageKey("content-font-size", deviceKey));
  localStorage.removeItem(deviceOptionStorageKey("calendar-row-font-size", deviceKey));
  localStorage.removeItem(deviceOptionStorageKey("calendar-row-height", deviceKey));
  const appliedFont = setAppFont("default");
  if (els.fontSelect) els.fontSelect.value = appliedFont;
  applyDeviceDisplayOptions();
}

function setAppFont(fontKey) {
  const fonts = {
    default: '"Inter", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    ridibatang: '"RIDIBatang", "리디바탕", "Nanum Myeongjo", "Malgun Gothic", serif',
    "nanum-myeongjo": '"Nanum Myeongjo", "나눔명조", "RIDIBatang", serif',
    "nanum-gothic": '"Nanum Gothic", "나눔고딕", "Malgun Gothic", sans-serif',
    "malgun-gothic": '"Malgun Gothic", "맑은 고딕", "Segoe UI", sans-serif',
  };
  const nextFont = fonts[fontKey] ? fontKey : "default";
  document.documentElement.style.setProperty("--app-font", fonts[nextFont]);
  localStorage.setItem("obsidian-web-viewer-font", nextFont);
  return nextFont;
}

function currentFontDeviceKey() {
  return window.matchMedia("(max-width: 780px)").matches ? "mobile" : "desktop";
}

function deviceOptionStorageKey(optionName, deviceKey = currentFontDeviceKey()) {
  return `obsidian-web-viewer-${optionName}-${deviceKey}`;
}

function applyDeviceDisplayOptions() {
  const deviceKey = currentFontDeviceKey();
  state.fontDeviceKey = deviceKey;
  const contentSize = readNumberOption(deviceOptionStorageKey("content-font-size", deviceKey), 16, 10, 28);
  const rowSize = readNumberOption(deviceOptionStorageKey("calendar-row-font-size", deviceKey), deviceKey === "mobile" ? 10.8 : 14.4, 6, 22);
  const align = readChoiceOption(deviceOptionStorageKey("content-align", deviceKey), "soft-center", ["left", "soft-center", "center"]);
  const maxWidth = readNumberOption("obsidian-web-viewer-content-max-width", 760, 400, 1600);
  localStorage.removeItem(deviceOptionStorageKey("calendar-row-height", deviceKey));
  setContentFontSize(contentSize, { persist: false });
  setCalendarRowFontSize(rowSize, { persist: false });
  setCalendarRowHeight(defaultCalendarRowHeight(deviceKey));
  setContentAlign(align, { persist: false });
  setContentMaxWidth(maxWidth, { persist: false });
}

function readNumberOption(key, fallback, min, max) {
  const saved = Number(localStorage.getItem(key));
  return Number.isFinite(saved) && saved >= min && saved <= max ? saved : fallback;
}

function readChoiceOption(key, fallback, choices) {
  const saved = localStorage.getItem(key);
  return choices.includes(saved) ? saved : fallback;
}

function updateContentFontSize() {
  const value = Number(els.contentFontSizeInput?.value || 16);
  const size = Math.max(10, Math.min(28, Number.isFinite(value) ? value : 16));
  setContentFontSize(size, { persist: true });
}

function setContentFontSize(size, { persist }) {
  document.documentElement.style.setProperty("--content-font-size", `${size}px`);
  if (els.contentFontSizeInput) els.contentFontSizeInput.value = String(size);
  if (persist) localStorage.setItem(deviceOptionStorageKey("content-font-size"), String(size));
}

function updateCalendarRowFontSize() {
  const value = Number(els.calendarRowFontSizeInput?.value || 14.4);
  const size = Math.max(6, Math.min(22, Number.isFinite(value) ? value : 14.4));
  setCalendarRowFontSize(size, { persist: true });
}

function setCalendarRowFontSize(size, { persist }) {
  document.documentElement.style.setProperty("--calendar-row-font-size", `${size}px`);
  if (els.calendarRowFontSizeInput) els.calendarRowFontSizeInput.value = String(size);
  if (persist) localStorage.setItem(deviceOptionStorageKey("calendar-row-font-size"), String(size));
}

function setCalendarRowHeight(height) {
  document.documentElement.style.setProperty("--calendar-row-height", `${height}px`);
}

function defaultCalendarRowHeight(deviceKey = currentFontDeviceKey()) {
  return deviceKey === "mobile" ? 27 : 24.5;
}

function updateContentMaxWidth() {
  const value = Number(els.contentMaxWidthInput?.value || 760);
  const width = Math.max(400, Math.min(1600, Number.isFinite(value) ? value : 760));
  setContentMaxWidth(width, { persist: true });
}

function setContentMaxWidth(width, { persist }) {
  document.documentElement.style.setProperty("--line-width", `${width}px`);
  if (els.contentMaxWidthInput) els.contentMaxWidthInput.value = String(width);
  if (persist) localStorage.setItem("obsidian-web-viewer-content-max-width", String(width));
}

function updateContentAlign() {
  setContentAlign(els.contentAlignSelect?.value || "soft-center", { persist: true });
}

function setContentAlign(align, { persist }) {
  const nextAlign = ["left", "soft-center", "center"].includes(align) ? align : "soft-center";
  document.documentElement.dataset.contentAlign = nextAlign;
  if (els.contentAlignSelect) els.contentAlignSelect.value = nextAlign;
  if (persist) localStorage.setItem(deviceOptionStorageKey("content-align"), nextAlign);
}

function handleCalendarFilterInput() {
  const value = els.calendarPathInput?.value || "";
  localStorage.setItem("obsidian-web-viewer-calendar-paths", value);
  scheduleSettingsSave();
  if (state.activeView !== "calendar") return;
  window.clearTimeout(state.calendarFilterTimer);
  state.calendarFilterTimer = window.setTimeout(() => {
    state.calendarFilterTimer = null;
    refreshCalendarForFilterChange();
  }, 700);
}

function handleRandomPathInput() {
  const value = els.randomPathInput?.value || "";
  localStorage.setItem("obsidian-web-viewer-random-paths", value);
  invalidateRandomMarkdownCache();
  scheduleSettingsSave();
}

function toggleRandomPriorityMode() {
  state.randomOldFirst = !state.randomOldFirst;
  localStorage.setItem("obsidian-web-viewer-random-old-first", state.randomOldFirst ? "1" : "0");
  updateRandomPriorityToggleButton();
}

function updateRandomPriorityToggleButton() {
  if (!els.randomPriorityToggleButton) return;
  const label = state.randomOldFirst ? "랜덤: 본 지 오래된 파일 우선 켜짐" : "랜덤: 본 지 오래된 파일 우선 꺼짐";
  els.randomPriorityToggleButton.classList.toggle("active", state.randomOldFirst);
  els.randomPriorityToggleButton.setAttribute("aria-pressed", String(state.randomOldFirst));
  els.randomPriorityToggleButton.setAttribute("aria-label", label);
  els.randomPriorityToggleButton.title = label;
}

function refreshCalendarForFilterChange() {
  if (state.activeView !== "calendar") return;
  window.clearTimeout(state.calendarRefreshTimer);
  state.calendarRefreshTimer = null;
  state.calendarSyncedAt = 0;
  state.calendarCacheState = "refreshing";
  loadCalendarCache().finally(() => scheduleCalendarRefresh(250));
}

function scheduleSettingsSave() {
  window.clearTimeout(state.settingsSaveTimer);
  state.settingsSaveTimer = window.setTimeout(() => {
    state.settingsSaveTimer = null;
    saveServerSettings();
  }, 700);
}

async function saveServerSettings() {
  try {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calendarPaths: els.calendarPathInput?.value || "",
        randomPaths: els.randomPathInput?.value || "",
        dailyNotePath: state.dailyNotePath || "",
        newNotePath: state.newNotePath || "",
        imagePath: state.imageSavePath || "",
        searchExclude: els.searchExcludeInput?.value || "",
        discordWebhookUrl: els.discordWebhookInput?.value || "",
        discordNotifyOffsetsTodo: getDiscordNotifyOffsets("todo"),
        discordNotifyOffsetsEvent: getDiscordNotifyOffsets("event"),
        discordFixedTimesTodo: getDiscordFixedTimes("todo"),
        discordFixedTimesEvent: getDiscordFixedTimes("event"),
        clipperRules: getClipperRules(),
      }),
    });
  } catch {
    // Server settings are best-effort; localStorage already has the same value.
  }
}

function toggleMarkdownMode() {
  state.markdownEnabled = !state.markdownEnabled;
  updateMarkdownToggleButton();
  if (state.activeView === "note" && state.currentPath) renderCurrentDocument();
}

function updateMarkdownToggleButton() {
  const originalOn = !state.markdownEnabled;
  const label = originalOn ? "원본 보기 ON" : "원본 보기 OFF";
  els.markdownToggleButton.classList.toggle("active", originalOn);
  els.markdownToggleButton.setAttribute("aria-pressed", String(originalOn));
  els.markdownToggleButton.setAttribute("aria-label", label);
  els.markdownToggleButton.title = label;
}

function renderCurrentDocument(showOpenStep = null, diagnostics = null) {
  const markRenderStep = (step) => {
    diagnostics?.mark(step);
    showOpenStep?.(step);
  };
  markRenderStep("렌더 영역 초기화 중");
  els.markdownView.classList.remove("empty-state", "plain-text-mode", "code-document");
  els.editorShell.hidden = true;
  els.markdownView.hidden = false;

  if (isExcalidrawDocument(state.currentPath || "")) {
    if (!EXCALIDRAW_PREVIEW_ENABLED) {
      markRenderStep("원문 표시 중");
      renderPlainTextDocument(state.currentContent);
      return;
    }
    markRenderStep("Excalidraw 렌더링 중");
    els.markdownView.innerHTML = renderExcalidrawPreview(state.currentContent, state.currentPath);
    markRenderStep("링크 연결 중");
    bindWikiLinks(els.markdownView);
    markRenderStep("이미지 준비 중");
    hydrateVaultImages(els.markdownView);
    markRenderStep("임베드 준비 중");
    hydrateEmbeddedDocuments(els.markdownView);
    if (EXCALIDRAW_PREVIEW_ENABLED) hydrateExcalidrawPackagePreviews(els.markdownView);
    return;
  }

  if (state.markdownEnabled) {
    if (!isMarkdownDocument(state.currentPath || "")) {
      markRenderStep("코드 렌더링 중");
      renderCodeDocument(state.currentContent, state.currentPath || "");
      return;
    }
    markRenderStep("Markdown 변환 중");
    els.markdownView.innerHTML = renderMarkdown(state.currentContent, { path: state.currentPath || "" });
    markRenderStep("체크박스 연결 중");
    bindRenderedTaskCheckboxes(els.markdownView);
    bindEmbedCardToggles(els.markdownView);
    markRenderStep("링크 연결 중");
    bindWikiLinks(els.markdownView);
    markRenderStep("이미지 그룹 정리 중");
    arrangeImageGroups(els.markdownView);
    arrangeEmbedGroups(els.markdownView);
    bindImageLightbox(els.markdownView);
    markRenderStep("이미지 준비 중");
    hydrateVaultImages(els.markdownView);
    markRenderStep("임베드 준비 중");
    hydrateEmbeddedDocuments(els.markdownView);
    if (EXCALIDRAW_PREVIEW_ENABLED) hydrateExcalidrawPackagePreviews(els.markdownView);
    return;
  }

  markRenderStep("원문 표시 중");
  renderPlainTextDocument(state.currentContent);
}

function renderPlainTextDocument(content) {
  els.markdownView.classList.add("plain-text-mode");
  const pre = document.createElement("pre");
  pre.textContent = content;
  els.markdownView.replaceChildren(pre);
}

function collapseAllHeadings() {
  els.markdownView.querySelectorAll(".heading-section").forEach((section) => {
    section.open = false;
  });
}

function collapseCurrentHeadingLevel() {
  const openSections = [...els.markdownView.querySelectorAll(".heading-section[open]")];
  if (!openSections.length) return;
  const deepestLevel = Math.max(...openSections.map((section) => headingSectionLevel(section)).filter(Boolean));
  openSections.forEach((section) => {
    if (headingSectionLevel(section) === deepestLevel) section.open = false;
  });
}

function expandNextHeadingLevel() {
  const sections = [...els.markdownView.querySelectorAll(".heading-section")];
  if (!sections.length) return;
  const openLevels = sections
    .filter((section) => section.open)
    .map((section) => headingSectionLevel(section))
    .filter(Boolean);
  const nextLevel = openLevels.length ? Math.min(6, Math.max(...openLevels) + 1) : Math.min(...sections.map(headingSectionLevel).filter(Boolean));
  sections.forEach((section) => {
    const level = headingSectionLevel(section);
    if (level && level <= nextLevel) section.open = true;
  });
}

function headingSectionLevel(section) {
  const match = [...section.classList].find((className) => className.startsWith("heading-section-"))?.match(/(\d)$/);
  return match ? Number(match[1]) : 0;
}

function renderCodeDocument(content, path) {
  els.markdownView.classList.add("plain-text-mode", "code-document");
  const pre = document.createElement("pre");
  const language = codeLanguageFromPath(path);
  pre.dataset.language = language;
  const code = document.createElement("code");
  code.className = `language-${language}`;
  code.innerHTML = highlightCode(content, language);
  pre.append(code);
  els.markdownView.replaceChildren(pre);
}

function codeLanguageFromPath(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  return {
    ahk: "autohotkey",
    bat: "batch",
    cmd: "batch",
    css: "css",
    html: "html",
    java: "java",
    js: "javascript",
    json: "json",
    py: "python",
    sh: "shell",
    ts: "typescript",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
  }[ext] || "text";
}

async function enterEditMode() {
  if (!canEditNode(state.currentNode)) return false;
  if (state.editMode) {
    focusEditor();
    return true;
  }

  const granted = await ensureNodeWritePermission(state.currentNode);
  if (!granted) {
    alert("파일 편집 권한이 필요합니다.");
    return false;
  }

  holdViewerHeightDuringTransition();
  state.editMode = true;
  state.editorDirty = false;
  setEditorValue(state.currentContent);
  els.markdownView.hidden = true;
  els.calendarView.hidden = true;
  els.editorShell.hidden = false;
  if (els.noteTitleArea) els.noteTitleArea.hidden = false;
  requestAnimationFrame(() => {
    resizeEditorToContent();
    const len = els.markdownEditor.value.length;
    els.markdownEditor.setSelectionRange(len, len);
    els.markdownEditor.scrollTop = els.markdownEditor.scrollHeight;
    els.markdownEditor.focus();
  });
  startAutoSave();
  updateEditorStatus();
  updateEditButtons();
  return true;
}

async function saveCurrentEdit() {
  if (!state.editMode || !canEditNode(state.currentNode)) return;
  return persistCurrentEdit({ closeEditor: true });
}

async function handleEditSaveButton() {
  if (state.editMode) {
    await saveCurrentEdit();
    return;
  }
  await enterEditMode();
}

async function autoSaveCurrentEdit() {
  if (!state.editMode || !state.editorDirty || state.autoSaveInFlight || !canEditNode(state.currentNode)) return;
  return persistCurrentEdit({ closeEditor: false });
}

async function persistCurrentEdit({ closeEditor }) {
  if (!state.editMode || !canEditNode(state.currentNode)) return;
  if (state.autoSaveInFlight) return;
  state.autoSaveInFlight = true;
  els.saveEditButton.disabled = true;
  els.webEditButton.disabled = true;
  updateEditorStatus(closeEditor ? "저장 중" : "자동 저장 중");
  try {
    const nextContent = editorValue();
    const contentChanged = normalizeEditableContent(nextContent) !== normalizeEditableContent(state.currentContent);
    if (!contentChanged && !closeEditor) return;
    if (!contentChanged && closeEditor) {
      state.editMode = false;
      updateEditorStatus();
      stopAutoSave();
      holdViewerHeightDuringTransition();
      renderCurrentDocument();
      showNoteView();
      return;
    }
    const metadata = await writeNodeContent(state.currentNode, nextContent, { backup: true, previousContent: state.currentContent });
    Object.assign(state.currentNode, metadata);
    if (typeof state.currentNode.content === "string") state.currentNode.content = nextContent;
    refreshDirectoryMetadata();
    state.currentContent = nextContent;
    state.editorDirty = false;
    updateTasksForFile(state.currentNode.path, nextContent);
    refreshRecentFilesCache();
    renderTree();
    if (closeEditor) {
      state.editMode = false;
      updateEditorStatus();
      stopAutoSave();
      holdViewerHeightDuringTransition();
      renderCurrentDocument();
      showNoteView();
    } else {
      updateEditorStatus("Auto saved");
    }
  } finally {
    state.autoSaveInFlight = false;
    els.saveEditButton.disabled = false;
    els.webEditButton.disabled = false;
    updateEditButtons();
  }
}

function normalizeEditableContent(content) {
  return String(content || "").replace(/\r\n/g, "\n");
}

function handleEditorKeydown(event) {
  if (handleEditorShortcut(event)) {
    return;
  } else if (event.key === "Enter") {
    handleEditorEnter(event);
  } else if (event.key === "Tab") {
    handleEditorTab(event);
  }
}

const EMOJI_SHORTCODES = [
  { code: ";gg", emoji: "👍" },
  { code: ";ㅎㅎ", emoji: "👍" },
  { code: ";bb", emoji: "👎" },
  { code: ";ㅠㅠ", emoji: "👎" },
];

function handleEditorInput() {
  const ta = els.markdownEditor;
  const pos = ta.selectionStart;
  const text = ta.value;
  for (const { code, emoji } of EMOJI_SHORTCODES) {
    if (pos >= code.length && text.slice(pos - code.length, pos) === code) {
      ta.value = text.slice(0, pos - code.length) + emoji + text.slice(pos);
      const newPos = pos - code.length + emoji.length;
      ta.setSelectionRange(newPos, newPos);
      break;
    }
  }
  resizeEditorToContent();
  markEditorDirty();
}

async function uploadImageToEditor(blob, mimeType) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = formatDate(now);
  const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 7);
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/gif" ? "gif" : mimeType === "image/webp" ? "webp" : "jpg";
  const filename = `${dateStr} ${timeStr} ${rand}.${ext}`;
  const dir = normalizeVaultPath(state.imageSavePath || els.imagePathInput?.value || "");
  const filePath = dir ? `${dir}/${filename}` : filename;

  const btn = els.editorImageButton;
  if (btn) btn.classList.add("uploading");
  const prevStatus = els.editorStatus?.textContent || "";
  updateEditorStatus("이미지 업로드 중…");

  try {
    const res = await fetch(`/api/vault-binary-file?path=${encodeURIComponent(filePath)}`, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: blob,
    });
    if (!res.ok) throw new Error("upload failed");
    const wikiLink = `![[${filePath}]]`;
    const textarea = els.markdownEditor;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.slice(0, start) + wikiLink + textarea.value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + wikiLink.length;
    resizeEditorToContent();
    markEditorDirty();
    registerUploadedFileInVault(filePath, blob.size);
  } catch {
    alert("이미지 업로드에 실패했습니다.");
  } finally {
    if (btn) btn.classList.remove("uploading");
    updateEditorStatus(prevStatus);
  }
}

async function downloadRemoteImageToEditor(remoteUrl) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = formatDate(now);
  const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 7);
  const extMatch = remoteUrl.match(/\.(gif|webp|svg|bmp|png|jpe?g|avif|ico)(\?|$)/i);
  const ext = extMatch ? extMatch[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
  const filename = `${dateStr} ${timeStr} ${rand}.${ext}`;
  const dir = normalizeVaultPath(state.imageSavePath || els.imagePathInput?.value || "");
  const savePath = dir ? `${dir}/${filename}` : filename;

  const btn = els.editorImageButton;
  if (btn) btn.classList.add("uploading");
  const prevStatus = els.editorStatus?.textContent || "";
  updateEditorStatus("이미지 다운로드 중…");

  try {
    const res = await fetch("/api/download-remote-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remoteUrl, savePath }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "download failed");
    }
    const data = await res.json();
    const wikiLink = `![[${data.path}]]`;
    const textarea = els.markdownEditor;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.slice(0, start) + wikiLink + textarea.value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + wikiLink.length;
    resizeEditorToContent();
    markEditorDirty();
    registerUploadedFileInVault(data.path, data.size || 0);
    showAppToast("이미지 다운로드 완료", "success");
  } catch (e) {
    showAppToast("이미지 다운로드 실패: " + e.message, "error");
    // 다운로드 실패 시 외부 링크로 폴백
    insertEditorText(els.markdownEditor, `![](${remoteUrl})`);
  } finally {
    if (btn) btn.classList.remove("uploading");
    updateEditorStatus(prevStatus);
  }
}

async function fetchLinkMeta(url) {
  try {
    const res = await fetch(`/api/url-meta?url=${encodeURIComponent(url)}`);
    if (!res.ok) return { title: "", description: "", image: "", favicon: "" };
    const data = await res.json();
    return {
      title: (data.title || "").replace(/\[|\]/g, "").trim(),
      description: data.description || "",
      image: data.image || "",
      favicon: data.favicon || "",
    };
  } catch {
    return { title: "", description: "", image: "", favicon: "" };
  }
}

async function fetchLinkTitle(url) {
  return (await fetchLinkMeta(url)).title;
}

function buildEmbedBlock(meta, url) {
  const esc = (s) => (s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return "```embed\ntitle: \"" + esc(meta.title) + "\"\ndescription: \"" + esc(meta.description) + "\"\nimage: \"" + esc(meta.image) + "\"\nfavicon: \"" + esc(meta.favicon || "") + "\"\nurl: \"" + esc(url) + "\"\n```";
}

async function handleEditorPaste(event) {
  if (!state.serverVaultWritable) return;
  const items = event.clipboardData?.items;
  if (!items) return;
  const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"));
  if (imageItem) {
    event.preventDefault();
    const blob = imageItem.getAsFile();
    if (blob) await uploadImageToEditor(blob, imageItem.type);
    return;
  }
  const text = event.clipboardData.getData("text/plain")?.trim() || "";
  if (/^https?:\/\/\S+$/.test(text)) {
    event.preventDefault();
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(text);
    if (isImage && state.serverVaultWritable) {
      await downloadRemoteImageToEditor(text);
    } else if (isImage) {
      insertEditorText(els.markdownEditor, `![](${text})`);
    } else {
      const ta = els.markdownEditor;
      // 현재 줄이 불릿/체크박스 항목이면 embed 블록 대신 링크로 삽입
      const lineStart = ta.value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
      const currentLine = ta.value.slice(lineStart, ta.selectionStart);
      const isBulletLine = /^\s*[-*+]\s/.test(currentLine);
      if (isBulletLine) {
        const insertAt = ta.selectionStart;
        insertEditorText(ta, `[](${text})`);
        fetchLinkTitle(text).then((title) => {
          if (!title) return;
          const cur = ta.value;
          const placeholder = `[](${text})`;
          const pos = cur.indexOf(placeholder, Math.max(0, insertAt - 1));
          if (pos === -1) return;
          ta.value = cur.slice(0, pos) + `[${title}](${text})` + cur.slice(pos + placeholder.length);
          resizeEditorToContent();
          markEditorDirty();
        });
        return;
      }
      const insertAt = ta.selectionStart;
      const embedPlaceholder = "```embed\nstatus: \"loading\"\nurl: \"" + text + "\"\n```";
      insertEditorText(ta, embedPlaceholder);
      showAppToast("링크 불러오는 중...", "info");
      fetchLinkMeta(text).then((meta) => {
        const fullBlock = buildEmbedBlock(meta, text);
        const cur = ta.value;
        const idx = cur.indexOf(embedPlaceholder, Math.max(0, insertAt - 1));
        if (idx === -1) return;
        ta.value = cur.slice(0, idx) + fullBlock + cur.slice(idx + embedPlaceholder.length);
        resizeEditorToContent();
        markEditorDirty();
        if (meta && meta.title) {
          showAppToast("링크 임베드 완료", "success");
        } else {
          showAppToast("링크 정보를 불러오지 못했습니다", "error");
        }
      }).catch(() => {
        showAppToast("링크 정보를 불러오지 못했습니다", "error");
      });
    }
  }
}

async function handleSubItemsPaste(event) {
  if (event.target.readOnly) return;
  // Image paste
  const items = event.clipboardData?.items;
  if (items) {
    const imageItem = Array.from(items).find((i) => i.type.startsWith("image/"));
    if (imageItem) {
      event.preventDefault();
      const blob = imageItem.getAsFile();
      if (!blob) return;
      try {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const ext = imageItem.type === "image/png" ? "png" : imageItem.type === "image/gif" ? "gif" : imageItem.type === "image/webp" ? "webp" : "jpg";
        const filename = `${formatDate(now)} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())} ${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const dir = normalizeVaultPath(state.imageSavePath || els.imagePathInput?.value || "");
        const filePath = dir ? `${dir}/${filename}` : filename;
        const res = await fetch(`/api/vault-binary-file?path=${encodeURIComponent(filePath)}`, {
          method: "PUT",
          headers: { "Content-Type": imageItem.type },
          body: blob,
        });
        if (!res.ok) throw new Error("upload failed");
        registerUploadedFileInVault(filePath, blob.size);
        const wikiLink = `![[${filePath}]]`;
        const ta = event.target;
        const { selectionStart, selectionEnd, value } = ta;
        ta.value = value.slice(0, selectionStart) + wikiLink + value.slice(selectionEnd);
        ta.setSelectionRange(selectionStart + wikiLink.length, selectionStart + wikiLink.length);
      } catch {
        alert("이미지 업로드에 실패했습니다.");
      }
      return;
    }
  }
  // URL paste
  const text = event.clipboardData?.getData("text/plain")?.trim() || "";
  if (!/^https?:\/\/\S+$/.test(text)) return;
  event.preventDefault();
  const ta = event.target;
  const { selectionStart, selectionEnd, value } = ta;
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(text);
  if (isImage) {
    const insertion = `![](${text})`;
    ta.value = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
    ta.setSelectionRange(selectionStart + insertion.length, selectionStart + insertion.length);
  } else {
    const placeholder = `[](${text})`;
    ta.value = value.slice(0, selectionStart) + placeholder + value.slice(selectionEnd);
    ta.setSelectionRange(selectionStart + 1, selectionStart + 1);
    fetchLinkTitle(text).then((title) => {
      if (!title) return;
      const cur = ta.value;
      const idx = cur.indexOf(placeholder, Math.max(0, selectionStart - 1));
      if (idx === -1) return;
      ta.value = cur.slice(0, idx) + `[${title}](${text})` + cur.slice(idx + placeholder.length);
    });
  }
}

function registerUploadedFileInVault(filePath, size = 0) {
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];
  let dir = state.root;
  let dirPath = "";
  for (const part of parts.slice(0, -1)) {
    const nextPath = dirPath ? `${dirPath}/${part}` : part;
    if (!state.directories.has(nextPath)) {
      const node = makeDirNode(part, nextPath);
      state.directories.set(nextPath, node);
      dir.children.set(part, node);
    }
    dir = state.directories.get(nextPath);
    dirPath = nextPath;
  }
  if (!state.files.has(filePath)) {
    const fileNode = { name: fileName, path: filePath, url: "", serverBacked: true, kind: "file", size, updatedAt: Date.now(), createdAt: Date.now() };
    state.files.set(filePath, fileNode);
    dir.children.set(fileName, fileNode);
  }
  refreshDirectoryMetadata();
  renderTree();
}

function editorValue() {
  return els.markdownEditor.value;
}

function setEditorValue(value) {
  els.markdownEditor.value = value;
  resizeEditorToContent();
}

function resizeEditorToContent() {
  const scrollTop = els.viewerWrap.scrollTop;
  els.markdownEditor.style.height = "auto";
  els.markdownEditor.style.height = `${Math.max(els.markdownEditor.scrollHeight, els.viewerWrap.clientHeight - 184)}px`;
  els.viewerWrap.scrollTop = scrollTop;
}

function keepEditorEndVisible() {
  const editor = els.markdownEditor;
  if (editor.selectionEnd < editor.value.length) return;
  requestAnimationFrame(() => {
    const wrap = els.viewerWrap;
    const editorBottom = editor.offsetTop + editor.offsetHeight;
    const visibleBottom = wrap.scrollTop + wrap.clientHeight;
    if (editorBottom > visibleBottom) {
      wrap.scrollTop = editorBottom - wrap.clientHeight;
    }
  });
}

function holdViewerHeightDuringTransition() {
  const height = Math.max(els.viewerWrap.clientHeight, 1);
  els.viewerWrap.style.minHeight = `${height}px`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      els.viewerWrap.style.minHeight = "";
    });
  });
}

function renderEditorPreview() {
  if (!els.editorPreview) return;
  const value = editorValue();
  els.editorPreview.classList.remove("empty-state", "plain-text-mode");
  if (!value.trim()) {
    els.editorPreview.classList.add("empty-state");
    els.editorPreview.innerHTML = "<p>미리보기</p>";
    return;
  }

  els.editorPreview.innerHTML = renderMarkdown(value);
  bindWikiLinks(els.editorPreview);
  arrangeImageGroups(els.editorPreview);
  arrangeEmbedGroups(els.editorPreview);
  bindImageLightbox(els.editorPreview);
  hydrateVaultImages(els.editorPreview);
  hydrateEmbeddedDocuments(els.editorPreview);
  if (EXCALIDRAW_PREVIEW_ENABLED) hydrateExcalidrawPackagePreviews(els.editorPreview);
}

function focusEditor() {
  els.markdownEditor.focus();
}

function setEditorCursorIndex(index) {
  els.markdownEditor.setSelectionRange(index, index);
}

function handleEditorShortcut(event) {
  if (isShortcut(event, "KeyS", "s")) {
    event.preventDefault();
    saveCurrentEdit();
    return true;
  }
  if (isShortcut(event, "KeyE", "e")) {
    event.preventDefault();
    enterEditMode();
    return true;
  }
  if (isShortcut(event, "KeyL", "l")) {
    event.preventDefault();
    toggleEditorTaskCheckbox(event.currentTarget);
    return true;
  }
  return false;
}

function runEditorCommand(command) {
  focusEditor();
  document.execCommand(command);
  markEditorDirty();
}

function handleEditorToolbarIndent(outdent) {
  focusEditor();
  indentSelectedEditorLines(els.markdownEditor, outdent);
  markEditorDirty();
}

function prefixSelectedEditorLines(prefix) {
  focusEditor();
  const textarea = els.markdownEditor;
  const { value, selectionStart, selectionEnd } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEndIndex = value.indexOf("\n", selectionEnd);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const block = value.slice(lineStart, lineEnd);
  const nextBlock = block.split("\n").map((line) => {
    if (!line.trim()) return prefix;
    const indent = line.match(/^(\s*)/)?.[1] || "";
    const body = line.slice(indent.length);
    return body.startsWith(prefix) ? line : `${indent}${prefix}${body}`;
  }).join("\n");
  textarea.value = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  textarea.setSelectionRange(lineStart + nextBlock.length, lineStart + nextBlock.length);
  markEditorDirty();
}

function insertEditorTable() {
  focusEditor();
  const table = "|  |  |\n| --- | --- |\n|  |  |";
  const textarea = els.markdownEditor;
  const { selectionStart, selectionEnd, value } = textarea;
  textarea.value = value.slice(0, selectionStart) + table + value.slice(selectionEnd);
  const next = selectionStart + 2;
  textarea.setSelectionRange(next, next);
  markEditorDirty();
}

function insertTodayTaskTemplate() {
  focusEditor();
  appendTaskTemplate(formatDate(new Date()));
}

function isShortcut(event, code, key) {
  return (event.ctrlKey || event.metaKey) && !event.altKey && (event.code === code || event.key.toLowerCase() === key);
}

function handleEditorEnter(event) {
  const textarea = event.currentTarget;
  const { selectionStart, selectionEnd, value } = textarea;
  if (selectionStart !== selectionEnd) return;

  const line = currentEditorLine(value, selectionStart);
  const continuation = markdownLineContinuation(line.text);
  if (!continuation) return;

  event.preventDefault();

  if (continuation.exitList) {
    const nextValue = value.slice(0, line.start) + line.text.replace(continuation.removePattern, "") + value.slice(selectionStart);
    textarea.value = nextValue;
    textarea.setSelectionRange(line.start, line.start);
    markEditorDirty();
    return;
  }

  insertEditorText(textarea, `\n${continuation.text}`, continuation.cursorOffset);
}

function markdownLineContinuation(line) {
  const unorderedTask = line.match(/^(\s*)([-*+])\s+\[([ xX-])\]\s+(.*)$/);
  if (unorderedTask) {
    if (!unorderedTask[4].trim()) return { exitList: true, removePattern: /^(\s*)([-*+])\s+\[[ xX-]\]\s*$/ };
    return { text: `${unorderedTask[1]}- ` };
  }

  const unordered = line.match(/^(\s*)([-*+])\s+(.*)$/);
  if (unordered) {
    if (!unordered[3].trim()) return { exitList: true, removePattern: /^(\s*)([-*+])\s*$/ };
    return { text: `${unordered[1]}${unordered[2]} ` };
  }

  const ordered = line.match(/^(\s*)(\d+)([.)])\s+(.*)$/);
  if (ordered) {
    if (!ordered[4].trim()) return { exitList: true, removePattern: /^(\s*)(\d+)([.)])\s*$/ };
    return { text: `${ordered[1]}${Number(ordered[2]) + 1}${ordered[3]} ` };
  }

  const quote = line.match(/^(\s*>\s?)(.*)$/);
  if (quote) {
    if (!quote[2].trim()) return { exitList: true, removePattern: /^(\s*>\s?)$/ };
    return { text: quote[1] };
  }

  return null;
}

function handleEditorTab(event) {
  event.preventDefault();
  const textarea = event.currentTarget;
  indentSelectedEditorLines(textarea, event.shiftKey);
  markEditorDirty();
}

function indentSelectedEditorLines(textarea, outdent) {
  const { value, selectionStart, selectionEnd } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEndIndex = value.indexOf("\n", selectionEnd);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const nextLines = lines.map((line) => (outdent ? line.replace(/^( {1,4}|\t)/, "") : `    ${line}`));
  const nextBlock = nextLines.join("\n");
  textarea.value = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  if (selectionStart === selectionEnd) {
    const delta = nextBlock.length - block.length;
    const nextCursor = Math.max(lineStart, selectionStart + delta);
    textarea.setSelectionRange(nextCursor, nextCursor);
  } else {
    textarea.setSelectionRange(lineStart, lineStart + nextBlock.length);
  }
}

function currentEditorLine(value, offset) {
  const start = value.lastIndexOf("\n", offset - 1) + 1;
  const endIndex = value.indexOf("\n", offset);
  const end = endIndex === -1 ? value.length : endIndex;
  return { start, end, text: value.slice(start, end) };
}

function insertEditorText(textarea, text, cursorOffset = text.length) {
  const { selectionStart, selectionEnd, value } = textarea;
  textarea.value = value.slice(0, selectionStart) + text + value.slice(selectionEnd);
  const next = selectionStart + cursorOffset;
  textarea.setSelectionRange(next, next);
  markEditorDirty();
}

function toggleEditorTaskCheckbox(editor = els.markdownEditor) {
  const textarea = editor;
  const { value, selectionStart, selectionEnd } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEndIndex = value.indexOf("\n", selectionEnd);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const block = value.slice(lineStart, lineEnd);
  const nextBlock = block.split("\n").map(cycleEditorTaskLine).join("\n");

  if (nextBlock === block) return;
  textarea.value = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  textarea.setSelectionRange(selectionStart === selectionEnd ? selectionStart : lineStart, selectionStart === selectionEnd ? selectionStart : lineStart + nextBlock.length);
  markEditorDirty();
}

function cycleEditorTaskLine(line) {
  const indent = line.match(/^(\s*)/)?.[1] || "";
  const body = line.slice(indent.length);
  if (!body.trim()) return line;

  const doneTask = body.match(/^[-*+]\s+\[[xXvV-]\]\s*(.*)$/);
  if (doneTask) return `${indent}${doneTask[1]}`;

  const openTask = body.match(/^[-*+]\s+\[\s\]\s*(.*)$/);
  if (openTask) return `${indent}- [x] ${openTask[1]}`;

  const bullet = body.match(/^[-*+]\s+(.*)$/);
  if (bullet) return `${indent}- [ ] ${bullet[1]}`;

  return `${indent}- ${body}`;
}

function taskDateFromText(text) {
  const dates = extractTaskDates(text);
  return dates.due || dates.end || dates.scheduled || dates.start || "";
}

function taskDateTokenFromText(text) {
  const dates = extractTaskDates(text);
  if (dates.start) return `\u{1F6EB} ${dates.start}`;
  if (dates.scheduled) return `\u{23F3} ${dates.scheduled}`;
  if (dates.due || dates.end) return `\u{1F4C5} ${dates.due || dates.end}`;
  return "";
}

function markEditorDirty() {
  if (!state.editMode) return;
  resizeEditorToContent();
  keepEditorEndVisible();
  state.editorDirty = editorValue() !== state.currentContent;
  updateEditorStatus();
}

function updateEditorStatus(prefix = "") {
  const bottomSaveStatus = document.getElementById("bottomSaveStatus");
  if (!state.editMode) {
    if (bottomSaveStatus) bottomSaveStatus.hidden = true;
    if (els.notePath) els.notePath.hidden = false;
    if (els.editorStatus) {
      els.editorStatus.hidden = true;
      els.editorStatus.textContent = "";
    }
    return;
  }
  if (els.editorStatus) {
    els.editorStatus.hidden = true;
    els.editorStatus.textContent = "";
  }
  if (els.notePath) els.notePath.hidden = false;
  if (bottomSaveStatus) bottomSaveStatus.hidden = true;
}

function startAutoSave() {
  stopAutoSave();
  state.autoSaveTimer = window.setInterval(autoSaveCurrentEdit, EDITOR_AUTO_SAVE_INTERVAL);
}

function stopAutoSave() {
  if (!state.autoSaveTimer) return;
  window.clearInterval(state.autoSaveTimer);
  state.autoSaveTimer = null;
}

async function ensureWritePermission(handle) {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  let permission = await handle.queryPermission({ mode: "readwrite" });
  if (permission !== "granted") permission = await handle.requestPermission({ mode: "readwrite" });
  return permission === "granted";
}

async function ensureNodeWritePermission(node) {
  if (node?.handle) return ensureWritePermission(node.handle);
  return Boolean(node?.serverBacked && state.serverVaultWritable && isTextVaultFilePath(node.path));
}

function canEditNode(node) {
  if (!node || !isTextVaultFilePath(node.path)) return false;
  return Boolean(node.handle || (node.serverBacked && state.serverVaultWritable));
}

async function writeBackupFile(node, content) {
  if (!node.dirHandle) return;
  const backupHandle = await node.dirHandle.getFileHandle(`${node.name}.bak`, { create: true });
  await writeFileHandle(backupHandle, content);
}

async function writeFileHandle(handle, content) {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function writeNodeContent(node, content, { backup = true, previousContent = state.currentContent } = {}) {
  if (node.handle) {
    if (backup) await writeBackupFile(node, previousContent);
    await writeFileHandle(node.handle, content);
    return preserveCreatedAt(node, await readFileMetadata(node.handle, node.path));
  }

  if (node.serverBacked && state.serverVaultWritable) {
    return preserveCreatedAt(node, await writeServerFile(node.path, content, { backup }));
  }

  throw new Error("File is not writable");
}

function preserveCreatedAt(node, metadata) {
  const createdAt = Number(node?.createdAt);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return metadata;
  return { ...metadata, createdAt };
}

async function writeServerFile(path, content, { backup = true } = {}) {
  const response = await fetch(`/api/vault-file?path=${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, backup }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "파일 저장에 실패했습니다.");
  return {
    size: result.size || content.length,
    updatedAt: result.updatedAt || Date.now(),
    createdAt: result.createdAt || result.updatedAt || Date.now(),
  };
}

function updateEditButtons() {
  const canEdit = canEditNode(state.currentNode) && state.activeView === "note";
  document.documentElement.classList.toggle("editing-mode", state.editMode);
  els.editButton.disabled = state.activeView !== "note" || !state.vaultName || !state.currentPath;
  els.webEditButton.disabled = !canEdit || state.autoSaveInFlight;
  els.webEditButton.hidden = state.activeView !== "note";
  renderEditSaveButton();
  if (els.newNoteButton) els.newNoteButton.hidden = state.editMode;
  if (els.randomFileButton) els.randomFileButton.hidden = state.editMode;
  if (els.calendarButton) els.calendarButton.hidden = false;
  if (els.matrixButton) els.matrixButton.hidden = false;
  els.markdownToggleButton.disabled = state.editMode;
  els.markdownToggleButton.hidden = state.activeView !== "note";
  if (els.saveEditButton) {
    els.saveEditButton.hidden = true;
    els.saveEditButton.disabled = true;
  }
  if (els.editorImageButton) els.editorImageButton.hidden = !(state.editMode && state.serverVaultWritable);
}

function renderEditSaveButton() {
  if (!els.webEditButton) return;
  if (state.editMode) {
    els.webEditButton.classList.add("is-saving-mode");
    els.webEditButton.setAttribute("aria-label", "저장");
    els.webEditButton.title = "저장";
    els.webEditButton.textContent = "저장";
    return;
  }
  els.webEditButton.classList.remove("is-saving-mode");
  els.webEditButton.setAttribute("aria-label", "웹에서 편집");
  els.webEditButton.title = "웹에서 편집";
  els.webEditButton.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  `;
}

function arrangeChromeControls() {
  const sidebarOptions = document.querySelector(".sidebar-options");
  if (sidebarOptions && els.fullscreenButton && els.fullscreenButton.parentElement !== sidebarOptions) {
    sidebarOptions.insertBefore(els.fullscreenButton, sidebarOptions.querySelector("#themeButton") || sidebarOptions.firstChild);
  }
  if (sidebarOptions && !document.getElementById("reloadButton")) {
    const reloadBtn = document.createElement("button");
    reloadBtn.id = "reloadButton";
    reloadBtn.type = "button";
    reloadBtn.setAttribute("aria-label", "새로고침");
    reloadBtn.title = "새로고침";
    reloadBtn.textContent = "↻";
    reloadBtn.addEventListener("click", () => window.location.reload());
    sidebarOptions.insertBefore(reloadBtn, els.optionsButton || null);
  }

  let statusBar = document.querySelector(".app-status-bar");
  if (!statusBar) {
    statusBar = document.createElement("footer");
    statusBar.className = "app-status-bar";
    statusBar.setAttribute("aria-label", "History and sync status");
    const historyWrap = document.createElement("div");
    historyWrap.className = "status-history";
    historyWrap.append(els.historyBackButton, els.historyForwardButton);
    const saveStatusEl = document.createElement("span");
    saveStatusEl.id = "bottomSaveStatus";
    saveStatusEl.className = "bottom-save-status";
    saveStatusEl.hidden = true;
    if (els.markdownToggleButton) els.markdownToggleButton.classList.add("status-markdown-toggle");
    statusBar.append(historyWrap);
    if (els.markdownToggleButton) statusBar.append(els.markdownToggleButton);
    const isMobile = window.matchMedia("(max-width: 780px)").matches;
    if (isMobile) {
      const mobileRight = document.createElement("div");
      mobileRight.className = "mobile-status-right";
      const mobileTabsBtn = document.createElement("button");
      mobileTabsBtn.type = "button";
      mobileTabsBtn.className = "mobile-tabs-btn icon-button";
      mobileTabsBtn.title = "전체 탭";
      mobileTabsBtn.textContent = "1";
      mobileTabsBtn.addEventListener("click", showAllTabsOverlay);
      mobileRight.append(mobileTabsBtn, els.syncStatus);
      statusBar.append(els.notePath, saveStatusEl, mobileRight);
    } else {
      statusBar.append(els.notePath, saveStatusEl, els.syncStatus);
    }

    document.body.append(statusBar);
    return;
  }
  const historyWrap = statusBar.querySelector(".status-history") || document.createElement("div");
  historyWrap.className = "status-history";
  if (els.historyBackButton && els.historyBackButton.parentElement !== historyWrap) historyWrap.append(els.historyBackButton);
  if (els.historyForwardButton && els.historyForwardButton.parentElement !== historyWrap) historyWrap.append(els.historyForwardButton);
  if (!historyWrap.parentElement) statusBar.append(historyWrap);
  if (els.markdownToggleButton) {
    els.markdownToggleButton.classList.add("status-markdown-toggle");
    const markdownRef = els.notePath?.parentElement === statusBar ? els.notePath : (els.syncStatus?.parentElement === statusBar ? els.syncStatus : null);
    if (els.markdownToggleButton.parentElement !== statusBar) statusBar.insertBefore(els.markdownToggleButton, markdownRef);
  }
  if (els.notePath && els.notePath.parentElement !== statusBar) statusBar.insertBefore(els.notePath, els.syncStatus);
  if (!document.getElementById("bottomSaveStatus")) {
    const el = document.createElement("span");
    el.id = "bottomSaveStatus";
    el.className = "bottom-save-status";
    el.hidden = true;
    statusBar.insertBefore(el, els.syncStatus);
  }
  const isMobile = window.matchMedia("(max-width: 780px)").matches;
  if (isMobile) {
    let mobileRight = statusBar.querySelector(".mobile-status-right");
    if (!mobileRight) {
      mobileRight = document.createElement("div");
      mobileRight.className = "mobile-status-right";
      const mobileTabsBtn = document.createElement("button");
      mobileTabsBtn.type = "button";
      mobileTabsBtn.className = "mobile-tabs-btn icon-button";
      mobileTabsBtn.title = "전체 탭";
      mobileTabsBtn.textContent = "1";
      mobileTabsBtn.addEventListener("click", showAllTabsOverlay);
      mobileRight.append(mobileTabsBtn);
      statusBar.append(mobileRight);
    }
    if (els.syncStatus && els.syncStatus.parentElement !== mobileRight) mobileRight.append(els.syncStatus);
  } else if (els.syncStatus && els.syncStatus.parentElement !== statusBar) {
    statusBar.append(els.syncStatus);
  }
}

function openCurrentFileInObsidian() {
  if (!state.vaultName || !state.currentPath) return;
  const href = obsidianOpenHref(state.currentPath);
  if (href) window.location.href = href;
}

function toggleSidebar(event) {
  event?.stopPropagation();
  const open = document.body.classList.toggle("sidebar-open");
  if (!open && state.sidebarPinned) {
    state.sidebarPinned = false;
    localStorage.setItem("obsidian-web-viewer-sidebar-pinned", "false");
    document.body.classList.remove("sidebar-pinned");
    updateSidebarPinButton();
  }
  els.sidebarToggle.setAttribute("aria-expanded", String(open));
  els.sidebarToggle.setAttribute("aria-label", open ? "문서 목록 닫기" : "문서 목록 열기");
  const tabToggle = document.querySelector(".tab-sidebar-toggle");
  if (tabToggle) { tabToggle.setAttribute("aria-expanded", String(open)); tabToggle.setAttribute("aria-label", open ? "문서 목록 닫기" : "문서 목록 열기"); }
}

function closeSidebar({ force = false } = {}) {
  if (state.sidebarPinned && !force) return;
  if (force && state.sidebarPinned) {
    state.sidebarPinned = false;
    localStorage.setItem("obsidian-web-viewer-sidebar-pinned", "false");
    document.body.classList.remove("sidebar-pinned");
    updateSidebarPinButton();
  }
  document.body.classList.remove("sidebar-open");
  els.sidebarToggle.setAttribute("aria-expanded", "false");
  els.sidebarToggle.setAttribute("aria-label", "문서 목록 열기");
  const tabToggle = document.querySelector(".tab-sidebar-toggle");
  if (tabToggle) { tabToggle.setAttribute("aria-expanded", "false"); tabToggle.setAttribute("aria-label", "문서 목록 열기"); }
}

function toggleOptionsMenu(event) {
  event.stopPropagation();
  const open = els.optionsMenu.hidden;
  if (open) closeSidebar({ force: true });
  els.optionsMenu.hidden = !open;
  els.optionsBackdrop.hidden = !open;
  document.body.classList.toggle("options-open", open);
  els.optionsButton.setAttribute("aria-expanded", String(open));
}

function closeOptionsMenu() {
  els.optionsMenu.hidden = true;
  els.optionsBackdrop.hidden = true;
  document.body.classList.remove("options-open");
  els.optionsButton.setAttribute("aria-expanded", "false");
}

async function confirmDiscardEdit() {
  if (!state.editMode) return true;
  const ok = await appConfirm("저장하지 않은 편집을 저장하고 이동할까요?", "편집 저장");
  if (ok) await saveCurrentEdit();
  return ok;
}

async function openImageLightbox(image) {
  const images = [...els.markdownView.querySelectorAll("img")].filter((item) => imageSource(item));
  state.lightboxImages = images;
  state.lightboxIndex = Math.max(0, images.indexOf(image));
  await showLightboxImage(image);
}

async function showLightboxImage(image) {
  const src = await fullImageSource(image);
  if (!src) return;
  els.imageLightboxImg.src = src;
  els.imageLightboxImg.alt = image.alt || "";
  els.imageLightbox.hidden = false;
}

function showAdjacentLightboxImage(direction) {
  if (els.imageLightbox.hidden || !state.lightboxImages.length) return;
  const count = state.lightboxImages.length;
  state.lightboxIndex = (state.lightboxIndex + direction + count) % count;
  void showLightboxImage(state.lightboxImages[state.lightboxIndex]);
}

function imageSource(image) {
  return image.currentSrc || image.src || image.getAttribute("data-vault-src") || "";
}

async function fullImageSource(image) {
  const fullPath = image.getAttribute("data-full-vault-src") || image.getAttribute("data-vault-src") || "";
  if (fullPath) return getOrCreateFileUrl(fullPath);
  return image.currentSrc || image.src || "";
}

function closeImageLightbox(event) {
  if (event && event.type === "click" && event.target === els.imageLightboxImg) return;
  els.imageLightbox.hidden = true;
  state.lightboxImages = [];
  state.lightboxIndex = -1;
  els.imageLightboxImg.removeAttribute("src");
}

function installCustomAlerts() {
  ensureNotificationHost();
  window.alert = (message) => {
    showAppToast(message);
  };
}

function ensureNotificationHost() {
  if (!document.querySelector(".app-toast-host")) {
    const host = document.createElement("div");
    host.className = "app-toast-host";
    document.body.append(host);
  }
  if (!document.querySelector(".app-confirm-backdrop")) {
    const backdrop = document.createElement("div");
    backdrop.className = "app-confirm-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="app-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="appConfirmTitle">
        <h2 id="appConfirmTitle">확인</h2>
        <p class="app-confirm-message"></p>
        <div class="app-confirm-actions">
          <button type="button" class="app-confirm-cancel">취소</button>
          <button type="button" class="app-confirm-ok">확인</button>
        </div>
      </section>
    `;
    document.body.append(backdrop);
    backdrop.querySelector(".app-confirm-cancel")?.addEventListener("click", () => resolveAppConfirm(false));
    backdrop.querySelector(".app-confirm-ok")?.addEventListener("click", () => resolveAppConfirm(true));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) resolveAppConfirm(false);
    });
    backdrop.addEventListener("keydown", (event) => {
      if (event.key === "Escape") resolveAppConfirm(false);
      if (event.key === "Enter") resolveAppConfirm(true);
    });
  }
}

function showAppToast(message, variant = "info") {
  const host = ensureToastHost();
  const toast = document.createElement("div");
  toast.className = `app-toast ${variant}`;
  toast.textContent = String(message || "");
  host.append(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 180);
  }, 2800);
}

function ensureToastHost() {
  ensureNotificationHost();
  return document.querySelector(".app-toast-host");
}

function appConfirm(message, title = "확인") {
  ensureNotificationHost();
  if (state.customConfirmResolve) resolveAppConfirm(false);
  const backdrop = document.querySelector(".app-confirm-backdrop");
  backdrop.querySelector("#appConfirmTitle").textContent = title;
  backdrop.querySelector(".app-confirm-message").textContent = String(message || "");
  backdrop.hidden = false;
  backdrop.querySelector(".app-confirm-ok")?.focus();
  return new Promise((resolve) => {
    state.customConfirmResolve = resolve;
  });
}

function resolveAppConfirm(value) {
  const backdrop = document.querySelector(".app-confirm-backdrop");
  if (backdrop) backdrop.hidden = true;
  const resolve = state.customConfirmResolve;
  state.customConfirmResolve = null;
  if (resolve) resolve(Boolean(value));
}

function showLoading(message) {
  showLoadingOverlay(message);
}

function showLoadingOverlay(message) {
  els.loadingText.textContent = message || "로딩 중...";
  els.loadingOverlay.hidden = false;
}

function hideLoading() {
  els.loadingOverlay.hidden = true;
}

async function buildCalendarView() {
  if (!(await confirmDiscardEdit())) return;
  closeOptionsMenu();
  closeSidebar();
  state.calendarKind = "tasks";
  state.calendarMode = "month";
  state.calendarDate = new Date();
  showCalendarView();
  renderCalendar();
  scheduleCalendarRefresh();
}

async function buildRecentCalendarView(type) {
  if (!(await confirmDiscardEdit())) return;
  closeOptionsMenu();
  closeSidebar();
  state.calendarKind = type === "created" ? "created" : "updated";
  state.calendarMode = "week";
  showCalendarView();
  renderCalendar();
  loadRecentFilesCache().finally(refreshRecentFilesCache);
}

async function openNextCalendarKind() {
  const calTab = state.tabs.find((t) => t.view === "calendar");
  if (calTab && calTab.id !== state.activeTabId) {
    await switchTab(calTab.id);
    return;
  }
  if (state.activeView !== "calendar") {
    await buildCalendarView();
  } else if (state.calendarKind === "tasks") {
    await buildRecentCalendarView("created");
  } else if (state.calendarKind === "created") {
    await buildRecentCalendarView("updated");
  } else {
    await buildCalendarView();
  }
}

function showInitialCalendarView() {
  state.calendarMode = "month";
  state.calendarDate = new Date();
  showCalendarView();
  renderCalendar();
}

async function buildMatrixView() {
  if (!(await confirmDiscardEdit())) return;
  closeOptionsMenu();
  closeSidebar();
  state.calendarKind = "matrix";
  state.matrixPeriodDays = state.matrixPeriodDays || 1;
  showCalendarView();
  renderCalendar();
  scheduleCalendarRefresh();
}

function scheduleCalendarRefresh(delay = 0) {
  if (state.calendarRefreshTimer || state.calendarRefreshInFlight) return;
  state.calendarRefreshTimer = window.setTimeout(() => {
    state.calendarRefreshTimer = null;
    refreshCalendarTasks({ showLoading: false });
  }, delay);
}

async function refreshCalendarTasks({ showLoading }) {
  if (state.calendarRefreshInFlight) return;
  if (state.activeView !== "calendar" || !isTaskCalendarKind()) return;
  state.calendarRefreshInFlight = true;
  const refreshView = state.activeView;
  const refreshKind = state.calendarKind;
  state.calendarRefreshing = showLoading;
  state.calendarCacheState = state.tasks.length ? "stale" : "refreshing";
  updateSyncStatus();

  try {
    const pathPrefixes = parsePathList(els.calendarPathInput.value);
    if (refreshView !== "calendar" || !isTaskCalendarKind(refreshKind) || state.activeView !== "calendar" || !isTaskCalendarKind()) return;
    if (showLoading) {
      showLoadingOverlay("캘린더 불러오는 중...");
    }

    const mdFiles = [...state.files.values()].filter((node) => {
      if (!node.name.toLowerCase().endsWith(".md")) return false;
      return !pathPrefixes.length || pathPrefixes.some((prefix) => node.path === prefix || node.path.startsWith(`${prefix}/`));
    });

    const cacheByPath = new Map();
    state.tasks.forEach((task) => {
      if (!cacheByPath.has(task.path)) cacheByPath.set(task.path, []);
      cacheByPath.get(task.path).push(task);
    });

    const parsed = [];
    const changedFiles = [];
    mdFiles.forEach((node) => {
      const cachedFile = state.calendarTaskFiles.get(node.path);
      if (cachedFile && isSameCalendarTaskFile(node, cachedFile)) {
        parsed.push(...(cacheByPath.get(node.path) || []));
        return;
      }
      changedFiles.push(node);
    });

    for (let index = 0; index < changedFiles.length; index += 8) {
      const batch = changedFiles.slice(index, index + 8);
      await Promise.all(
        batch.map(async (node) => {
          const content = await readFileNode(node);
          parsed.push(...parseTasks(content, node.path));
        }),
      );

      if (index + 8 < changedFiles.length) {
        await waitForBrowser();
      }
    }

    if (state.activeView !== "calendar" || !isTaskCalendarKind()) return;
    state.tasks = parsed;
    state.calendarTaskFiles = buildCalendarTaskFileMap(mdFiles);
    state.calendarSyncedAt = Date.now();
    state.calendarCacheState = "fresh";
    saveCalendarCache();
  } finally {
    state.calendarRefreshInFlight = false;
    state.calendarRefreshing = false;
    if (state.activeView === "calendar" && isTaskCalendarKind()) renderCalendar();
    if (showLoading) hideLoading();
  }
}

function calendarCacheKey() {
  const filter = parsePathList(els.calendarPathInput.value).join(",");
  return `obsidian-web-viewer-calendar:${state.vaultName || "vault"}:${filter || "all"}`;
}

async function loadCalendarCache() {
  const shouldRender = () => state.activeView === "calendar" && isTaskCalendarKind();
  try {
    const response = await fetch(`/api/calendar-cache?key=${encodeURIComponent(calendarCacheKey())}`, { cache: "no-store" });
    if (response.status === 404) {
      state.tasks = [];
      state.calendarTaskFiles.clear();
      state.calendarCacheState = "refreshing";
      state.calendarSyncedAt = 0;
      if (shouldRender()) renderCalendar();
      return;
    }
    if (!response.ok) throw new Error("Calendar cache failed");

    const cached = await response.json();
    if (!Array.isArray(cached.tasks)) throw new Error("Invalid calendar cache");
    const syncedAt = Number(cached.syncedAt || 0);
    if (state.calendarCacheState === "fresh" && state.calendarSyncedAt > syncedAt) return;
    state.tasks = cached.tasks;
    state.calendarTaskFiles = calendarTaskFileMapFromCache(cached.files);
    state.calendarSyncedAt = syncedAt;
    state.calendarCacheState = "stale";
    if (shouldRender()) renderCalendar();
  } catch {
    state.tasks = [];
    state.calendarTaskFiles.clear();
    state.calendarCacheState = "refreshing";
    state.calendarSyncedAt = 0;
    if (shouldRender()) renderCalendar();
  }
}

async function saveCalendarCache() {
  try {
    await fetch(`/api/calendar-cache?key=${encodeURIComponent(calendarCacheKey())}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: 1,
        syncedAt: state.calendarSyncedAt,
        tasks: state.tasks,
        files: [...state.calendarTaskFiles.values()],
      }),
    });
  } catch {
    // Cache is best-effort; server write failures should not block the app.
  }
}

function updateTasksForFile(path, content) {
  if (!path || !path.toLowerCase().endsWith(".md")) return;
  state.tasks = state.tasks.filter((task) => task.path !== path).concat(parseTasks(content, path));
  applyPendingTaskStates();
  const node = state.files.get(path);
  if (node) state.calendarTaskFiles.set(path, calendarTaskFileMeta(node));
  state.calendarSyncedAt = Date.now();
  state.calendarCacheState = "fresh";
  saveCalendarCache();
  if (state.activeView === "calendar") renderCalendar();
}

function setCalendarMode(mode) {
  if (!["month", "week", "day"].includes(mode)) return;
  if (state.calendarMode === mode) return;
  state.calendarMode = mode;
  if (state.activeView === "calendar") renderCalendar();
}

async function openCalendarFromShortcut() {
  const calTab = state.tabs.find((t) => t.view === "calendar");
  if (calTab && calTab.id !== state.activeTabId) {
    await switchTab(calTab.id);
    state.calendarKind = "tasks";
    state.calendarMode = "month";
    state.calendarDate = new Date();
    showCalendarView();
    renderCalendar();
    return;
  }
  if (state.activeView !== "calendar") {
    await buildCalendarView();
    return;
  }
  await openNextCalendarKind();
}

function calendarTaskFileMapFromCache(files) {
  const map = new Map();
  if (!Array.isArray(files)) return map;
  files.forEach((file) => {
    if (!file || typeof file.path !== "string") return;
    map.set(file.path, {
      path: file.path,
      updatedAt: Number(file.updatedAt || 0),
      size: Number(file.size || 0),
    });
  });
  return map;
}

function buildCalendarTaskFileMap(files) {
  const map = new Map();
  files.forEach((node) => map.set(node.path, calendarTaskFileMeta(node)));
  return map;
}

function calendarTaskFileMeta(node) {
  return {
    path: node.path,
    updatedAt: Number(node.updatedAt || 0),
    size: Number(node.size || 0),
  };
}

function isSameCalendarTaskFile(node, cachedFile) {
  return Number(node.updatedAt || 0) === Number(cachedFile.updatedAt || 0) && Number(node.size || 0) === Number(cachedFile.size || 0);
}

function metadataCacheKey() {
  return `obsidian-web-viewer-metadata:${state.vaultName || "vault"}`;
}

async function loadRecentFilesCache() {
  try {
    const response = await fetch(`/api/calendar-cache?key=${encodeURIComponent(metadataCacheKey())}`, { cache: "no-store" });
    if (!response.ok) return;
    const cached = await response.json();
    if (!Array.isArray(cached.updated) || !Array.isArray(cached.created)) return;
    const syncedAt = Number(cached.syncedAt || 0);
    if (state.metadataSyncedAt && syncedAt < state.metadataSyncedAt) return;
    state.recentFiles = { updated: cached.updated, created: cached.created };
    state.metadataSyncedAt = syncedAt;
    if (state.activeView === "calendar" && !isTaskCalendarKind()) renderCalendar();
  } catch {
    // Metadata cache is best-effort.
  }
}

async function refreshRecentFilesCache() {
  state.recentFiles = buildRecentFiles();
  state.metadataSyncedAt = Date.now();
  if (state.activeView === "calendar" && !isTaskCalendarKind()) renderCalendar();
  try {
    await fetch(`/api/calendar-cache?key=${encodeURIComponent(metadataCacheKey())}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        syncedAt: state.metadataSyncedAt,
        tasks: [],
        updated: state.recentFiles.updated,
        created: state.recentFiles.created,
      }),
    });
  } catch {
    // Metadata cache is best-effort.
  }
}

function buildRecentFiles() {
  const files = [...state.files.values()]
    .filter((node) => node.kind === "file" && isOpenableDocument(node.name))
    .map((node) => ({
      path: node.path,
      name: node.name,
      updatedAt: node.updatedAt || 0,
      createdAt: node.createdAt || 0,
    }));

  return {
    updated: files.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 80),
    created: files.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 80),
  };
}

function waitForBrowser() {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(resolve, { timeout: 100 });
      return;
    }
    window.setTimeout(resolve, 0);
  });
}

function showNoteView() {
  state.activeView = "note";
  document.documentElement.classList.remove("matrix-mode");
  if (els.newTabPage) els.newTabPage.hidden = true;
  els.markdownView.hidden = false;
  els.editorShell.hidden = true;
  els.calendarView.hidden = true;
  if (els.noteTitleArea) els.noteTitleArea.hidden = true;
  if (els.headingControlsOverlay) els.headingControlsOverlay.hidden = false;
  if (els.viewControlsOverlay) els.viewControlsOverlay.hidden = false;
  els.calendarButton.classList.remove("active");
  updateCalendarKindButton();
  updateSyncStatus();
  updateEditButtons();
}

function showCalendarView() {
  state.activeView = "calendar";
  document.documentElement.classList.toggle("matrix-mode", state.calendarKind === "matrix");
  updateCalendarTitle();
  const tab = activeTab();
  if (tab) {
    tab.view = "calendar";
    tab.calendarKind = state.calendarKind;
    tab.title = "캘린더";
    if (tab.pinned) {
      savePinnedTabsLocal();
      void savePinnedTabsOrderToVault();
    }
    renderTabStrip();
  }
  if (els.newTabPage) els.newTabPage.hidden = true;
  els.markdownView.hidden = true;
  els.editorShell.hidden = true;
  els.calendarView.hidden = false;
  els.viewerWrap.scrollTop = 0;
  if (els.noteTitleArea) els.noteTitleArea.hidden = true;
  if (els.headingControlsOverlay) els.headingControlsOverlay.hidden = true;
  if (els.viewControlsOverlay) els.viewControlsOverlay.hidden = false;
  els.calendarButton.classList.add("active");
  els.matrixButton?.classList.toggle("active", state.calendarKind === "matrix");
  updateCalendarKindButton();
  els.editButton.disabled = true;
  updateEditButtons();
}

function updateCalendarKindButton() {
  if (!els.calendarButton) return;
  els.matrixButton?.classList.toggle("active", state.activeView === "calendar" && state.calendarKind === "matrix");
  if (state.activeView !== "calendar" || state.calendarKind === "tasks" || state.calendarKind === "matrix") {
    els.calendarButton.textContent = "📅";
    els.calendarButton.title = "Task 캘린더";
    els.calendarButton.setAttribute("aria-label", "Task 캘린더");
  } else if (state.calendarKind === "created") {
    els.calendarButton.textContent = "➕";
    els.calendarButton.title = "최근 생성 파일";
    els.calendarButton.setAttribute("aria-label", "최근 생성 파일 캘린더");
  } else {
    els.calendarButton.textContent = "✏️";
    els.calendarButton.title = "최근 수정 파일";
    els.calendarButton.setAttribute("aria-label", "최근 수정 파일 캘린더");
  }
}

function updateCalendarTitle() {
  const pathPrefixes = parsePathList(els.calendarPathInput.value);
  document.documentElement.classList.toggle("matrix-mode", state.activeView === "calendar" && state.calendarKind === "matrix");
  if (state.calendarKind === "tasks") {
    els.notePath.textContent = pathPrefixes.length ? `calendar: ${pathPrefixes.join(", ")}` : "calendar: vault";
    els.noteTitle.textContent = "Tasks Calendar";
  } else if (state.calendarKind === "matrix") {
    els.notePath.textContent = pathPrefixes.length ? `matrix: ${pathPrefixes.join(", ")}` : "matrix: vault";
    els.noteTitle.textContent = "아이젠하워 매트릭스";
  } else {
    els.notePath.textContent = `calendar: ${calendarTitle()}`;
    els.noteTitle.textContent = state.calendarKind === "created" ? "최근 생성 파일" : "최근 수정 파일";
  }
  updateSyncStatus();
}

function isTaskCalendarKind(kind = state.calendarKind) {
  return kind === "tasks" || kind === "matrix";
}

function normalizeLineIndent(line) {
  return (line.match(/^(\s*)/)?.[1] || "").replace(/\t/g, "  ");
}

function parseTasks(content, path) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  return lines.flatMap((line, index) => {
      const taskIndentLen = normalizeLineIndent(line).length;
      const match = line.match(/^\s*[-*+]\s+\[([ xX>-])\]\s*(.*)$/);
      if (!match) return [];

      const deferred = match[1] === ">";
      const checked = !deferred && (match[1].toLowerCase() === "x" || match[1] === "-");
      const rawText = match[2].trim();
      const dates = extractTaskDates(rawText);
      const implicitDailyDate = dailyDateFromPath(path);
      if (!dates.due && !dates.end && !dates.scheduled && !dates.start && implicitDailyDate) {
        dates.due = implicitDailyDate;
        dates.end = implicitDailyDate;
      }
      const displayDate = dates.due || dates.end || dates.scheduled || dates.start;
      if (!displayDate) return [];

      const subItems = [];
      const childIndentLen = taskIndentLen + 2;
      for (let i = index + 1; i < lines.length; i++) {
        const subLine = lines[i];
        if (subLine.trim() === "") break;
        const subIndent = normalizeLineIndent(subLine).length;
        if (subIndent <= taskIndentLen) break;
        subItems.push(subLine.slice(Math.min(subLine.length, childIndentLen)));
      }

      const meta = extractTaskMeta(rawText);
      const dueTime = findTaskTime(rawText, "📅");
      const startTime = findTaskTime(rawText, "🛫");
      return [
        {
          path,
          line: index + 1,
          checked,
          deferred,
          text: cleanTaskText(rawText),
          rawText,
          date: displayDate,
          type: dates.due || dates.end ? "due" : dates.scheduled ? "scheduled" : "start",
          dates,
          dueTime,
          startTime,
          indent: Math.floor(taskIndentLen / 2),
          subItems,
          kind: meta.kind,
          category: meta.category,
          priority: meta.priority,
          tags: meta.tags,
          notify: !/🔕/.test(rawText),
        },
      ];
    });
}

function dailyDateFromPath(path) {
  const dailyPath = normalizeDailyNotePath(state.dailyNotePath || els.dailyNotePathInput?.value || "");
  const normalizedPath = normalizeVaultPath(path || "");
  if (!dailyPath || !normalizedPath.startsWith(`${dailyPath}/`)) return "";
  const name = normalizedPath.split("/").pop() || "";
  const match = name.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
  return match ? match[1] : "";
}

function extractTaskDates(text) {
  return {
    due: findTaskDate(text, "📅"),
    scheduled: findTaskDate(text, "⏳"),
    start: findTaskDate(text, "🛫"),
    done: findTaskDate(text, "✅"),
    cancelled: findTaskDate(text, "❌"),
  };
}

function findTaskDate(text, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}\\s*(\\d{4}-\\d{2}-\\d{2})`, "u"));
  return match ? match[1] : null;
}

function cleanTaskText(text) {
  return text
    .replace(/[📅⏳🛫✅❌]\s*\d{4}-\d{2}-\d{2}/gu, "")
    .replace(/🔕/gu, "")
    .replace(/#[\p{L}\p{N}_/-]+/gu, "")
    .trim();
}

function extractTaskDates(text) {
  const due = findTaskDate(text, "📅") || findBareTaskDate(text);
  return {
    due,
    scheduled: findTaskDate(text, "⏳"),
    start: findTaskDate(text, "🛫"),
    done: findTaskDate(text, "✅"),
    cancelled: findTaskDate(text, "❌"),
  };
}

function findBareTaskDate(text) {
  const match = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  return match ? match[1] : null;
}

function cleanTaskText(text) {
  return text
    .replace(/[📅⏳🛫✅❌]?\s*\b\d{4}-\d{2}-\d{2}\b/gu, "")
    .replace(/🔕/gu, "")
    .replace(/#[\p{L}\p{N}_/-]+/gu, "")
    .trim();
}

function extractTaskDates(text) {
  const done = findTaskDateByMarkers(text, ["\u{2705}", "done"]);
  const cancelled = findTaskDateByMarkers(text, ["\u{274C}", "cancelled", "canceled"]);
  // Strip completion/cancellation dates before bare-date search to prevent them from
  // being picked up as due dates (e.g., ✅ 2026-06-10 should not become the due date).
  const textForBareDate = text
    .replace(/(?:\u{2705}|done)\s*\d{4}-\d{2}-\d{2}/giu, "")
    .replace(/(?:\u{274C}|cancelled|canceled)\s*\d{4}-\d{2}-\d{2}/giu, "");
  const due = findTaskDateByMarkers(text, ["\u{1F4C5}", "due", "end"]) || findBareTaskDate(textForBareDate);
  const start = findTaskDateByMarkers(text, ["\u{1F6EB}", "start"]);
  return {
    due,
    end: due,
    scheduled: findTaskDateByMarkers(text, ["\u{23F3}", "scheduled"]),
    start,
    done,
    cancelled,
  };
}

function findTaskDateByMarkers(text, markers) {
  for (const marker of markers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`(?:${escaped})\\s*(\\d{4}-\\d{2}-\\d{2})`, "iu"));
    if (match) return match[1];
  }
  return null;
}

function cleanTaskText(text) {
  return text
    .replace(/(?:\u{1F4C5}|\u{1F6EB}|\u{23F3}|\u{2705}|\u{274C}|due|start|end|scheduled|done|cancelled|canceled)\s*\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?/giu, "")
    .replace(/🔕/gu, "")
    .replace(/#[\p{L}\p{N}_/-]+/gu, "")
    .trim();
}

function findTaskTime(text, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}\\s*\\d{4}-\\d{2}-\\d{2}\\s+(\\d{2}:\\d{2})`, "u"));
  return match ? match[1] : null;
}

function taskTimeForDate(task, dateKey) {
  const range = taskRangePosition(task, dateKey);
  if (range === "middle") return "";
  if (range === "start") return task.startTime || "";
  if (range === "end") return task.dueTime || "";
  // 범위 없음 (단일 날짜 또는 start=due 동일 날짜)
  if (task.startTime && task.dueTime) return `${task.startTime}~${task.dueTime}`;
  return task.dueTime || task.startTime || "";
}

function extractTaskMeta(text) {
  const KIND_SET = new Set(["일정", "할일"]);
  const CAT_SET = new Set(["회사", "개인", "기타"]);
  const PRI_SET = new Set(["상", "중", "하"]);
  let kind = null, category = null, priority = null;
  const tags = [];
  for (const m of text.matchAll(/#([\p{L}\p{N}_]+)/gu)) {
    const v = m[1];
    if (!kind && KIND_SET.has(v)) { kind = v; continue; }
    if (!category && CAT_SET.has(v)) { category = v; continue; }
    if (!priority && PRI_SET.has(v)) { priority = v; continue; }
    tags.push(v);
  }
  return { kind, category, priority, tags };
}

function saveCalendarTaskFilters() {
  localStorage.setItem("obsidian-web-viewer-task-filters", JSON.stringify(state.calendarTaskFilters));
}

function saveCalendarTaskTags() {
  localStorage.setItem("obsidian-web-viewer-task-tags", state.calendarTaskTags.join(","));
  if (els.taskTagsInput) els.taskTagsInput.value = state.calendarTaskTags.join(", ");
}

function applyCalendarTaskFilters(tasks) {
  const { types, categories, tags, priorities } = state.calendarTaskFilters;
  if (!types.length && !categories.length && !tags.length && !priorities.length) return tasks;
  return tasks.filter((task) => {
    if (types.length && !types.includes(task.kind)) return false;
    if (categories.length && !categories.includes(task.category)) return false;
    if (priorities.length && !priorities.includes(task.priority)) return false;
    if (tags.length && !tags.some((t) => (task.tags || []).includes(t))) return false;
    return true;
  });
}

function renderCalendarFilterBar() {
  const { types, categories, tags, priorities } = state.calendarTaskFilters;
  const allTags = state.calendarTaskTags || [];
  const chip = (val, arr, filterType, label) =>
    `<button class="filter-chip${arr.includes(val) ? " active" : ""}" type="button" data-filter-type="${filterType}" data-filter-val="${escapeAttribute(val)}">${label}</button>`;
  const groups = [
    { label: "종류", chips: [["일정", "🗓 일정"], ["할일", "✓ 할일"]].map(([v, l]) => chip(v, types, "types", l)).join("") },
    { label: "분류", chips: ["회사", "개인", "기타"].map((v) => chip(v, categories, "categories", v)).join("") },
    { label: "중요도", chips: [["상", "🔴 상"], ["중", "🟡 중"], ["하", "🔵 하"]].map(([v, l]) => chip(v, priorities, "priorities", l)).join("") },
    ...(allTags.length ? [{ label: "태그", chips: allTags.map((v) => chip(v, tags, "tags", `#${v}`)).join("") }] : []),
  ];
  const hasActive = types.length + categories.length + tags.length + priorities.length > 0;
  const isOpen = state.calendarFilterOpen;
  const groupsHtml = groups.map((g, i) =>
    `${i > 0 ? '<span class="filter-group-sep" aria-hidden="true"></span>' : ""}<div class="filter-group"><span class="filter-label">${g.label}</span><div class="filter-chips">${g.chips}</div></div>`
  ).join("");
  return `<div class="calendar-filter-bar${isOpen ? " open" : ""}">
    ${renderCalendarFilterToggleButton()}
    <div class="filter-bar-body">
      ${groupsHtml}
      ${hasActive ? '<button class="filter-reset-btn" type="button" data-filter-reset>초기화</button>' : ""}
    </div>
  </div>`;
}

function updateTaskDialogMetaUI() {
  const { kind, category, priority, tags } = state.taskDialogMeta;
  els.taskKindChips?.querySelectorAll("[data-meta='kind']").forEach((b) => b.classList.toggle("active", b.dataset.val === kind));
  els.taskCategoryChips?.querySelectorAll("[data-meta='category']").forEach((b) => b.classList.toggle("active", b.dataset.val === category));
  els.taskPriorityChips?.querySelectorAll("[data-meta='priority']").forEach((b) => b.classList.toggle("active", b.dataset.val === priority));
  els.taskTagChips?.querySelectorAll("[data-meta='tags']").forEach((b) => b.classList.toggle("active", tags.includes(b.dataset.val)));
}

function renderDialogTagChips() {
  if (!els.taskTagChips) return;
  els.taskTagChips.innerHTML = (state.calendarTaskTags || [])
    .map((tag) => `<button type="button" class="task-meta-chip" data-meta="tags" data-val="${escapeAttribute(tag)}">#${escapeHtml(tag)}</button>`)
    .join("");
  els.taskTagChips.querySelectorAll("[data-meta='tags']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.val;
      const idx = state.taskDialogMeta.tags.indexOf(val);
      if (idx >= 0) state.taskDialogMeta.tags.splice(idx, 1);
      else state.taskDialogMeta.tags.push(val);
      updateTaskDialogMetaUI();
    });
  });
}

function renderCalendar() {
  if (state.activeView === "calendar") updateCalendarTitle();
  if (state.calendarKind === "matrix") {
    renderEisenhowerMatrix();
    return;
  }
  const showingTasks = state.calendarKind === "tasks";
  const month = startOfMonth(state.calendarDate);
  const monthKey = formatMonth(month);
  const todayKey = formatDate(new Date());
  const firstGridDate = startOfWeek(month, 0);
  const visibleTasks = calendarPreviewTasks();
  const tasksByDate = groupTasksByDate(visibleTasks);
  const recentField = state.calendarKind === "created" ? "createdAt" : "updatedAt";
  const recentByDate = groupRecentFilesByDate(state.recentFiles[state.calendarKind] || [], recentField);
  const rowLimit = state.calendarRowLimit || 5;
  const cells = [];
  const agendaItems = calendarAgendaDates(month).map((date) => {
    const dateKey = formatDate(date);
    const holidays = state.holidays.get(dateKey) || [];
    return showingTasks
      ? renderAgendaDay(date, tasksByDate.get(dateKey) || [], dateKey === todayKey, holidays)
      : renderRecentAgendaDay(date, recentByDate.get(dateKey) || [], dateKey === todayKey, recentField, holidays);
  });

  for (let offset = 0; offset < 42; offset += 1) {
    const date = addDays(firstGridDate, offset);
    const dateKey = formatDate(date);
    const dayTasks = tasksByDate.get(dateKey) || [];
    const dayFiles = recentByDate.get(dateKey) || [];
    const holidays = state.holidays.get(dateKey) || [];
    const hasDailyNote = hasDailyNoteForDate(dateKey);
    const classes = ["calendar-cell"];
    if (formatMonth(date) !== monthKey) classes.push("outside-month");
    if (dateKey === todayKey) classes.push("today");
    if (date.getDay() === 0) classes.push("sunday");
    if (holidays.length) classes.push("holiday");
    cells.push(`
      <div class="${classes.join(" ")}" data-calendar-date="${dateKey}">
        <div class="calendar-day"><span class="${hasDailyNote ? "has-daily-note" : ""}">${date.getDate()}</span>${renderHolidayNames(holidays)}</div>
        ${renderHolidayBadges(holidays, true)}
        <div class="calendar-tasks">
          ${
            showingTasks
              ? renderCalendarRows(dayTasks, dateKey, rowLimit, (task) => renderCalendarTask(task, dateKey))
              : renderCalendarRows(dayFiles, dateKey, rowLimit, (item) => renderCalendarFile(item, recentField))
          }
        </div>
      </div>
    `);

  }

  els.calendarView.innerHTML = `
    <div class="calendar-shell calendar-mode-${state.calendarMode} mobile-${state.mobileCalendarMode}" style="--calendar-row-count: ${rowLimit};">
      <div class="calendar-toolbar">
        ${showingTasks ? renderCalendarFilterToggleButton("calendar-toolbar-filter-btn") : ""}
        <div class="calendar-month-nav">
          <button type="button" data-calendar-action="prev">&lt;</button>
          <strong>${calendarTitle()}</strong>
          <button type="button" data-calendar-action="next">&gt;</button>
        </div>
        <div class="calendar-nav-group">
          <button class="calendar-today-button" type="button" data-calendar-action="today">Today</button>
          <input class="calendar-date-jump" type="date" value="${formatDate(state.calendarDate)}" aria-label="날짜로 이동" title="날짜로 이동">
          <button type="button" data-calendar-mode="month" class="calendar-mode-btn${state.calendarMode === "month" ? " active" : ""}">30d</button>
          <button type="button" data-calendar-mode="week" class="calendar-mode-btn${state.calendarMode === "week" ? " active" : ""}">7d</button>
          <button type="button" data-calendar-mode="day" class="calendar-mode-btn${state.calendarMode === "day" ? " active" : ""}">1d</button>
        </div>
      </div>
      ${showingTasks ? renderCalendarFilterBar() : ""}
      <div class="calendar-weekdays">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<div>${day}</div>`).join("")}
      </div>
      <div class="calendar-grid">${cells.join("")}</div>
      <div class="calendar-agenda">
        ${agendaItems.length ? agendaItems.join("") : '<div class="calendar-empty">No items this month</div>'}
      </div>
    </div>
  `;

  bindCalendarEvents();
  highlightCalendarTaskDropTarget();
  updateSyncStatus();
  ensureVisibleHolidays();
  requestAnimationFrame(syncCalendarRowLimit);
  if (state.calendarMode === "week" || state.calendarMode === "day") {
    requestAnimationFrame(scrollAgendaToToday);
  }
}

function renderEisenhowerMatrix() {
  const range = matrixDateRange();
  const tasks = matrixVisibleTasks(range);
  const unclassified = tasks.filter((task) => !task.priority);
  const quadrants = [
    { key: "do", icon: "🔥", title: "긴급 · 중요", urgent: true, important: true },
    { key: "plan", icon: "📌", title: "덜 긴급 · 중요", urgent: false, important: true },
    { key: "delegate", icon: "⚡", title: "긴급 · 덜 중요", urgent: true, important: false },
    { key: "drop", icon: "💤", title: "덜 긴급 · 덜 중요", urgent: false, important: false },
  ].map((quadrant) => ({
    ...quadrant,
    tasks: tasks.filter((task) => matrixTaskUrgent(task, range) === quadrant.urgent && matrixTaskImportant(task) === quadrant.important),
  }));

  els.calendarView.innerHTML = `
    <div class="matrix-shell">
      <div class="calendar-toolbar matrix-toolbar">
        <div class="calendar-month-nav">
          <button type="button" data-matrix-action="prev">&lt;</button>
          <strong>${escapeHtml(matrixTitle())}</strong>
          <button type="button" data-matrix-action="next">&gt;</button>
        </div>
        <button class="calendar-today-button" type="button" data-matrix-action="today">Today</button>
        <div class="calendar-mode-switch" aria-label="Matrix range">
          ${[30, 7, 1].map((days) => `<button type="button" data-matrix-period="${days}" class="${state.matrixPeriodDays === days ? "active" : ""}">${days}d</button>`).join("")}
        </div>
      </div>
      ${renderCalendarFilterBar()}
      ${renderMatrixRules(range)}
      ${renderMatrixUnclassified(unclassified)}
      <div class="matrix-grid">
        ${quadrants.map((quadrant) => renderMatrixQuadrant(quadrant)).join("")}
      </div>
    </div>
  `;

  bindMatrixEvents();
  updateSyncStatus();
}

function renderCalendarFilterToggleButton(extraClass = "") {
  const activeCount = Object.values(state.calendarTaskFilters).reduce((sum, arr) => sum + arr.length, 0);
  return `
    <button type="button" class="filter-bar-toggle ${extraClass}" data-filter-toggle>
      <span>필터</span>
      ${activeCount ? `<span class="filter-active-badge">${activeCount}</span>` : ""}
      <span class="filter-toggle-arrow">${state.calendarFilterOpen ? "▲" : "▼"}</span>
    </button>
  `;
}

function renderMatrixQuadrant(quadrant) {
  return `
    <section class="matrix-quadrant ${quadrant.key}" data-matrix-urgent="${quadrant.urgent}" data-matrix-important="${quadrant.important}">
      <header>
        <strong><span aria-hidden="true">${quadrant.icon}</span>${escapeHtml(quadrant.title)}</strong>
        <span>${quadrant.tasks.length}</span>
      </header>
      <div class="matrix-task-list">
        ${quadrant.tasks.length ? quadrant.tasks.map(renderMatrixTask).join("") : '<div class="matrix-empty">No tasks</div>'}
      </div>
    </section>
  `;
}

function renderMatrixTask(task) {
  const due = task.dates?.due || task.dates?.end || task.dates?.scheduled || task.dates?.start || task.date || "";
  return `
    <button class="matrix-task ${task.checked ? "done" : task.deferred ? "deferred" : ""}" type="button" draggable="true" data-path="${escapeAttribute(task.path)}" data-line="${task.line}" title="${escapeAttribute(`${task.path}: ${task.rawText || task.text}`)}">
      <span class="matrix-task-title"><span class="matrix-task-icon" aria-hidden="true">${taskDisplayIcon(task)}</span>${escapeHtml(task.text)}</span>
      <span class="matrix-task-meta">${escapeHtml(due)}${task.priority ? ` · ${escapeHtml(task.priority)}` : ""}</span>
    </button>
  `;
}

function renderMatrixRules(range) {
  const cutoff = addDays(matrixUrgentCutoff(range), -1);
  return `
    <div class="matrix-rules">
      <span>긴급: ${escapeHtml(formatDate(range.start))} - ${escapeHtml(formatDate(cutoff))}</span>
      <span>중요: #상</span>
      <span>덜 중요: #중/#하/미분류</span>
    </div>
  `;
}

function renderMatrixUnclassified(tasks) {
  if (!tasks.length) return "";
  return `
    <section class="matrix-unclassified">
      <header><strong>미분류 빠른 분류</strong><span>${tasks.length}</span></header>
      <div class="matrix-unclassified-list">
        ${tasks.slice(0, 8).map((task) => `
          <div class="matrix-unclassified-row">
            <span>${taskDisplayIcon(task)} ${escapeHtml(task.text)}</span>
            <div>
              <button type="button" data-matrix-quick="do" data-path="${escapeAttribute(task.path)}" data-line="${task.line}">🔥</button>
              <button type="button" data-matrix-quick="plan" data-path="${escapeAttribute(task.path)}" data-line="${task.line}">📌</button>
              <button type="button" data-matrix-quick="delegate" data-path="${escapeAttribute(task.path)}" data-line="${task.line}">⚡</button>
              <button type="button" data-matrix-quick="drop" data-path="${escapeAttribute(task.path)}" data-line="${task.line}">💤</button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function matrixDateRange() {
  const days = state.matrixPeriodDays || 1;
  if (days === 30) {
    const start = startOfMonth(state.calendarDate);
    return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
  }
  if (days === 7) {
    const start = startOfWeek(state.calendarDate, 0);
    return { start, end: addDays(start, 7) };
  }
  const start = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), state.calendarDate.getDate());
  return { start, end: addDays(start, 1) };
}

function matrixTitle() {
  const days = state.matrixPeriodDays || 1;
  if (days === 1) return formatDate(state.calendarDate);
  if (days === 7) {
    const start = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), state.calendarDate.getDate());
    const week = Math.ceil((start.getDate() + startOfMonth(start).getDay()) / 7);
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")} ${week}W`;
  }
  const month = startOfMonth(state.calendarDate);
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
}

function matrixVisibleTasks(range = matrixDateRange()) {
  return calendarPreviewTasks()
    .filter((task) => !task.checked)
    .filter((task) => {
      const date = parseDateKey(task.dates?.due || task.dates?.end || task.dates?.scheduled || task.dates?.start || task.date);
      return date && date >= range.start && date < range.end;
    })
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || taskTypeRank(a.type) - taskTypeRank(b.type) || a.text.localeCompare(b.text, "ko"));
}

function matrixUrgentCutoff(range) {
  const days = state.matrixPeriodDays || 1;
  const urgentDays = days >= 30 ? 7 : days >= 7 ? 2 : 1;
  return addDays(range.start, urgentDays);
}

function matrixTaskUrgent(task, range = matrixDateRange()) {
  const date = parseDateKey(task.dates?.due || task.dates?.end || task.dates?.scheduled || task.dates?.start || task.date);
  return Boolean(date && date < matrixUrgentCutoff(range));
}

function matrixTaskImportant(task) {
  return task.priority === "상";
}

function bindMatrixEvents() {
  bindCalendarFilterEvents();

  els.calendarView.querySelectorAll("[data-matrix-quick]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const placement = matrixPlacementFromKey(button.getAttribute("data-matrix-quick"));
      if (!placement) return;
      await moveTaskToMatrixQuadrant(button.getAttribute("data-path"), Number(button.getAttribute("data-line")), placement);
    });
  });

  els.calendarView.querySelectorAll("[data-matrix-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-matrix-action");
      if (action === "prev") state.calendarDate = shiftMatrixDate(-1);
      if (action === "next") state.calendarDate = shiftMatrixDate(1);
      if (action === "today") state.calendarDate = new Date();
      renderCalendar();
    });
  });

  els.calendarView.querySelectorAll("[data-matrix-period]").forEach((button) => {
    button.addEventListener("click", () => {
      state.matrixPeriodDays = Number(button.getAttribute("data-matrix-period")) || 1;
      renderCalendar();
    });
  });

  els.calendarView.querySelectorAll(".matrix-task").forEach((button) => {
    bindMatrixTaskPointerDrag(button);
    button.addEventListener("click", async (event) => {
      if (button.dataset.dragged === "true") {
        event.preventDefault();
        event.stopPropagation();
        button.dataset.dragged = "";
        return;
      }
      const path = button.getAttribute("data-path");
      const line = Number(button.getAttribute("data-line"));
      const task = state.tasks.find((item) => item.path === path && item.line === line);
      if (task) await showTaskEditDialog(task);
    });
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify({
        path: button.getAttribute("data-path"),
        line: Number(button.getAttribute("data-line")),
      }));
      button.classList.add("dragging");
    });
    button.addEventListener("dragend", () => {
      button.classList.remove("dragging");
      button.dataset.dragged = "true";
      window.setTimeout(() => {
        button.dataset.dragged = "";
      }, 250);
    });
  });

  els.calendarView.querySelectorAll(".matrix-quadrant").forEach((quadrant) => {
    quadrant.addEventListener("dragover", (event) => {
      event.preventDefault();
      quadrant.classList.add("drag-over");
    });
    quadrant.addEventListener("dragleave", () => quadrant.classList.remove("drag-over"));
    quadrant.addEventListener("drop", async (event) => {
      event.preventDefault();
      quadrant.classList.remove("drag-over");
      let payload = {};
      try {
        payload = JSON.parse(event.dataTransfer.getData("text/plain") || "{}");
      } catch {
        payload = {};
      }
      if (!payload.path || !Number.isInteger(payload.line)) return;
      const urgent = quadrant.getAttribute("data-matrix-urgent") === "true";
      const important = quadrant.getAttribute("data-matrix-important") === "true";
      await moveTaskToMatrixQuadrant(payload.path, payload.line, { urgent, important });
    });
  });
}

function shiftMatrixDate(direction) {
  const days = state.matrixPeriodDays || 1;
  if (days === 30) return addMonths(state.calendarDate, direction);
  if (days === 7) return addDays(state.calendarDate, direction * 7);
  return addDays(state.calendarDate, direction);
}

function matrixPlacementFromKey(key) {
  return {
    do: { urgent: true, important: true },
    plan: { urgent: false, important: true },
    delegate: { urgent: true, important: false },
    drop: { urgent: false, important: false },
  }[key] || null;
}

function bindMatrixTaskPointerDrag(button) {
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    state.matrixTaskDrag = {
      pointerId: event.pointerId,
      path: button.getAttribute("data-path"),
      line: Number(button.getAttribute("data-line")),
      x: event.clientX,
      y: event.clientY,
      active: false,
      button,
      target: null,
    };
    button.setPointerCapture?.(event.pointerId);
  });

  button.addEventListener("pointermove", (event) => {
    const drag = state.matrixTaskDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    if (!drag.active && distance < CALENDAR_DRAG_DISTANCE) return;
    if (!drag.active) {
      drag.active = true;
      button.dataset.dragged = "true";
      button.classList.add("dragging");
    }
    event.preventDefault();
    updateMatrixDragTarget(event.clientX, event.clientY);
  });

  const finish = async (event) => {
    const drag = state.matrixTaskDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    state.matrixTaskDrag = null;
    button.releasePointerCapture?.(event.pointerId);
    button.classList.remove("dragging");
    clearMatrixDragTarget();
    if (drag.active && drag.target) {
      event.preventDefault();
      event.stopPropagation();
      const urgent = drag.target.getAttribute("data-matrix-urgent") === "true";
      const important = drag.target.getAttribute("data-matrix-important") === "true";
      await moveTaskToMatrixQuadrant(drag.path, drag.line, { urgent, important });
    }
    window.setTimeout(() => {
      button.dataset.dragged = "";
    }, 250);
  };

  button.addEventListener("pointerup", finish);
  button.addEventListener("pointercancel", finish);
}

function updateMatrixDragTarget(x, y) {
  const drag = state.matrixTaskDrag;
  if (!drag) return;
  const target = document.elementFromPoint(x, y)?.closest?.(".matrix-quadrant") || null;
  if (target === drag.target) return;
  clearMatrixDragTarget();
  drag.target = target;
  target?.classList.add("drag-over");
}

function clearMatrixDragTarget() {
  els.calendarView.querySelectorAll(".matrix-quadrant.drag-over").forEach((item) => item.classList.remove("drag-over"));
}

function bindCalendarFilterEvents() {
  els.calendarView.querySelectorAll("[data-filter-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.filterType;
      const val = btn.dataset.filterVal;
      const arr = state.calendarTaskFilters[type];
      if (!arr) return;
      const idx = arr.indexOf(val);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(val);
      saveCalendarTaskFilters();
      renderCalendar();
    });
  });

  els.calendarView.querySelector("[data-filter-reset]")?.addEventListener("click", () => {
    state.calendarTaskFilters = { types: [], categories: [], tags: [], priorities: [] };
    saveCalendarTaskFilters();
    renderCalendar();
  });

  els.calendarView.querySelectorAll("[data-filter-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarFilterOpen = !state.calendarFilterOpen;
      const bar = els.calendarView.querySelector(".calendar-filter-bar");
      if (bar) bar.classList.toggle("open", state.calendarFilterOpen);
      els.calendarView.querySelectorAll(".filter-toggle-arrow").forEach((arrow) => {
        arrow.textContent = state.calendarFilterOpen ? "▲" : "▼";
      });
    });
  });
}

function scrollAgendaToToday() {
  const todayEl = els.calendarView.querySelector(".calendar-agenda-day.today");
  if (todayEl) todayEl.scrollIntoView({ behavior: "instant", block: "start" });
}

function goCalendarToday() {
  state.calendarDate = new Date();
  renderCalendar();
  requestAnimationFrame(scrollAgendaToToday);
}

function renderCalendarRows(items, context, rowLimit, renderer) {
  const safeLimit = Math.max(1, Math.min(5, rowLimit));
  const visibleLimit = items.length > safeLimit ? Math.max(0, safeLimit - 1) : safeLimit;
  const visible = items.slice(0, visibleLimit);
  const rows = visible.map((item) => renderer(item, context));
  if (items.length > safeLimit) rows.push(`<button class="calendar-more" type="button" data-calendar-more="${context}">+${items.length - visibleLimit}</button>`);
  while (rows.length < safeLimit) rows.push('<span class="calendar-row-spacer" aria-hidden="true"></span>');
  return rows.join("");
}

function syncCalendarRowLimit() {
  if (state.activeView !== "calendar" || state.calendarMode !== "month" || els.calendarView.hidden) return;
  if (state.calendarRowLimit !== 5) {
    state.calendarRowLimit = 5;
    renderCalendar();
  }
}

function handleCalendarResize() {
  const nextFontDeviceKey = currentFontDeviceKey();
  if (state.fontDeviceKey && state.fontDeviceKey !== nextFontDeviceKey) applyDeviceDisplayOptions();
  if (state.activeView !== "calendar" || state.calendarMode !== "month") return;
  window.clearTimeout(handleCalendarResize.timer);
  handleCalendarResize.timer = window.setTimeout(syncCalendarRowLimit, 80);
}

function updateSyncStatus() {
  if (!els.syncStatus) return;
  els.syncStatus.hidden = false;

  if (state.activeView !== "calendar" || !isTaskCalendarKind()) {
    els.syncStatus.className = `sync-status ${state.vaultSyncing ? "refreshing" : "idle"}`;
    els.syncStatus.textContent = "↻";
    els.syncStatus.title = state.vaultSyncing ? "동기화 중..." : "동기화";
    return;
  }

  els.syncStatus.className = `sync-status ${state.calendarRefreshing ? "refreshing" : state.calendarCacheState}`;

  if (state.calendarRefreshing) {
    els.syncStatus.textContent = "⟳";
    els.syncStatus.title = state.calendarCacheState === "stale" ? "캐시 표시 중, 최신화 중" : "최신화 중";
  } else if (state.calendarCacheState === "fresh") {
    els.syncStatus.textContent = "✓";
    els.syncStatus.title = state.calendarSyncedAt ? `최신화 완료: ${new Date(state.calendarSyncedAt).toLocaleString()}` : "최신화 완료";
  } else if (state.calendarCacheState === "stale") {
    els.syncStatus.textContent = "!";
    els.syncStatus.title = state.calendarSyncedAt ? `캐시 표시 중: ${new Date(state.calendarSyncedAt).toLocaleString()}` : "캐시 표시 중";
  } else {
    els.syncStatus.textContent = "…";
    els.syncStatus.title = "최신화 대기 중";
  }
}

function currentCalendarRange() {
  if (state.calendarMode === "day") {
    const start = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), state.calendarDate.getDate());
    return { start, end: addDays(start, 1) };
  }
  if (state.calendarMode === "week") {
    const start = addDays(state.calendarDate, -1);
    const normalized = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    return { start: normalized, end: addDays(normalized, 8) };
  }
  const start = startOfMonth(state.calendarDate);
  return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
}

function calendarAgendaDates(month) {
  if (state.calendarMode === "day") return [state.calendarDate];
  if (state.calendarMode === "week") {
    const firstDate = addDays(state.calendarDate, -1);
    return Array.from({ length: 8 }, (_, index) => addDays(firstDate, index));
  }

  const dates = [];
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day += 1) dates.push(new Date(month.getFullYear(), month.getMonth(), day));
  return dates;
}

function calendarTitle() {
  if (state.calendarMode === "day") return formatDate(state.calendarDate);
  if (state.calendarMode === "week") {
    const start = addDays(state.calendarDate, -1);
    const week = Math.ceil((start.getDate() + startOfMonth(start).getDay()) / 7);
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")} ${week}W`;
  }

  const month = startOfMonth(state.calendarDate);
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
}

function renderAgendaDay(date, tasks, isToday, holidays = []) {
  const classes = ["calendar-agenda-day"];
  if (isToday) classes.push("today");
  if (date.getDay() === 0) classes.push("sunday");
  if (holidays.length) classes.push("holiday");
  const hasDailyNote = hasDailyNoteForDate(formatDate(date));
  return `
    <section class="${classes.join(" ")}" data-calendar-date="${formatDate(date)}">
      <div class="calendar-agenda-date">
        <strong class="${hasDailyNote ? "has-daily-note" : ""}">${date.getDate()}</strong>
        <span>${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]}</span>
        ${tasks.length ? `<span class="agenda-day-count">${tasks.length}</span>` : ""}
        ${renderHolidayBadges(holidays)}
      </div>
      <div class="calendar-agenda-tasks">
        ${tasks.length ? tasks.map((task) => renderCalendarTask(task, formatDate(date), true)).join("") : '<div class="calendar-empty">No tasks</div>'}
      </div>
    </section>
  `;
}

function renderRecentAgendaDay(date, files, isToday, field, holidays = []) {
  const classes = ["calendar-agenda-day"];
  if (isToday) classes.push("today");
  if (date.getDay() === 0) classes.push("sunday");
  if (holidays.length) classes.push("holiday");
  const hasDailyNote = hasDailyNoteForDate(formatDate(date));
  return `
    <section class="${classes.join(" ")}" data-calendar-date="${formatDate(date)}">
      <div class="calendar-agenda-date">
        <strong class="${hasDailyNote ? "has-daily-note" : ""}">${date.getDate()}</strong>
        <span>${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]}</span>
        ${files.length ? `<span class="agenda-day-count">${files.length}</span>` : ""}
        ${renderHolidayBadges(holidays)}
      </div>
      <div class="calendar-agenda-tasks">
        ${files.length ? files.map((file) => renderCalendarFile(file, field, true)).join("") : '<div class="calendar-empty">No files</div>'}
      </div>
    </section>
  `;
}

function renderHolidayBadges(holidays, compact = false) {
  if (!holidays.length) return "";
  const label = holidays.map((holiday) => holiday.name).join(", ");
  return `<span class="${compact ? "calendar-holiday compact" : "calendar-holiday"}" title="${escapeAttribute(label)}">${compact ? "휴" : escapeHtml(label)}</span>`;
}

function renderHolidayNames(holidays) {
  if (!holidays.length) return "";
  const label = holidays.map((holiday) => holiday.name).join(", ");
  return `<span class="calendar-holiday-name" title="${escapeAttribute(label)}">${escapeHtml(label)}</span>`;
}

function hasDailyNoteForDate(dateKey) {
  const dailyPath = normalizeDailyNotePath(state.dailyNotePath || els.dailyNotePathInput?.value || "");
  if (!dailyPath || !dateKey) return false;
  return state.files.has(`${dailyPath}/${dateKey}.md`);
}

function ensureVisibleHolidays() {
  if (state.activeView !== "calendar") return;
  visibleCalendarYears().forEach((year) => {
    if (state.holidayYearsLoaded.has(year) || state.holidayYearsLoading.has(year)) return;
    loadHolidaysForYear(year);
  });
}

function visibleCalendarYears() {
  const years = new Set();
  const month = startOfMonth(state.calendarDate);
  const firstGridDate = startOfWeek(month, 0);
  if (state.calendarMode === "month") {
    for (let offset = 0; offset < 42; offset += 1) years.add(addDays(firstGridDate, offset).getFullYear());
  } else {
    calendarAgendaDates(month).forEach((date) => years.add(date.getFullYear()));
  }
  return years;
}

async function loadHolidaysForYear(year) {
  state.holidayYearsLoading.add(year);
  try {
    const response = await fetch(`/api/holidays?year=${year}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Holiday API failed");
    if (Array.isArray(payload.holidays)) {
      payload.holidays.forEach((holiday) => {
        if (!holiday?.date || !holiday?.name) return;
        const list = state.holidays.get(holiday.date) || [];
        state.holidays.set(holiday.date, list.filter((item) => item.name !== holiday.name).concat(holiday));
      });
    }
    state.holidayYearsLoaded.add(year);
    scheduleHolidayRender();
  } catch {
    console.warn(`Holiday load failed for ${year}`);
  } finally {
    state.holidayYearsLoading.delete(year);
  }
}

function scheduleHolidayRender() {
  if (state.activeView !== "calendar" || state.holidayRenderTimer) return;
  state.holidayRenderTimer = window.setTimeout(() => {
    state.holidayRenderTimer = null;
    if (state.activeView === "calendar") renderCalendar();
  }, 50);
}

function renderSubItemContent(content) {
  const text = String(content || "").trim();
  const wikiEmbed = text.match(/^!\[\[([^\]]+)\]\]$/);
  if (wikiEmbed) {
    const target = wikiEmbed[1].split("|")[0].trim();
    const filePath = resolveVaultPath(target);
    if (filePath && isImageDocument(filePath)) {
      const src = `/api/vault-image-thumb?path=${encodeURIComponent(filePath)}&width=240`;
      return `<img class="task-sub-img" src="${escapeAttribute(src)}" alt="${escapeAttribute(target)}" loading="lazy">`;
    }
    // resolveVaultPath가 실패해도 파일명으로 직접 API를 시도
    if (!filePath && /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\|.*)?$/i.test(target)) {
      const src = `/api/vault-image-thumb?path=${encodeURIComponent(target)}&width=240`;
      return `<img class="task-sub-img" src="${escapeAttribute(src)}" alt="${escapeAttribute(target)}" loading="lazy">`;
    }
    return `<span>${escapeHtml(content)}</span>`;
  }
  const mdImg = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (mdImg) {
    return `<img class="task-sub-img" src="${escapeAttribute(mdImg[2])}" alt="${escapeAttribute(mdImg[1])}" loading="lazy">`;
  }
  return `<span>${renderInline(text)}</span>`;
}

function renderInlineMarkdown(text) {
  const parts = [];
  let last = 0;
  const linkRe = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    parts.push(escapeHtml(text.slice(last, m.index)));
    parts.push(`<a href="${m[2].replace(/"/g, "%22")}" target="_blank" rel="noopener noreferrer">${escapeHtml(m[1] || m[2])}</a>`);
    last = m.index + m[0].length;
  }
  parts.push(escapeHtml(text.slice(last)));
  let html = parts.join("");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*\s][^*]*?)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

function renderSubItemsHtml(subItems) {
  const normalizedSubItems = (subItems || [])
    .map((item) => String(item || ""))
    .filter((item) => item.trim().length > 0);
  if (!normalizedSubItems.length) return `<div class="task-sub-empty">비어있음</div>`;

  return normalizedSubItems.map((item) => {
    const indent = item.match(/^(\s*)/)?.[1] || "";
    const body = item.slice(indent.length);
    const listItem = body.match(/^[-*+]\s+(.*)$/);
    const rendered = renderSubItemContent((listItem ? listItem[1] : body).trim());
    const indentStyle = indent ? ` style="margin-left: ${Math.min(48, indent.length * 4)}px"` : "";
    return `<div class="task-sub-bullet"${indentStyle}><span>•</span>${rendered}</div>`;
  }).join("");
}


function renderCalendarTask(task, dateKey = task.date, showDelete = false) {
  const title = `${task.path}: ${task.text}`;
  const range = taskRangePosition(task, dateKey);
  const colorClass = range ? `range-color-${rangeColorIndex(task)}` : "";
  const icon = range && range !== "start" ? taskContinuationIcon(range) : taskDisplayIcon(task);
  const deleteBtn = showDelete
    ? `<button class="agenda-delete-btn" type="button" data-agenda-delete data-path="${escapeAttribute(task.path)}" data-line="${task.line}" aria-label="삭제" title="삭제">🗑️</button>`
    : "";
  const indentPx = (task.indent || 0) * 24;
  const wrapIndentStyle = indentPx > 0 ? ` style="padding-left: ${indentPx}px"` : "";
  const hasSubItems = task.subItems && task.subItems.length > 0;
  const inlineSubItems = hasSubItems && showDelete
    ? `<div class="task-sub-items-inline">${renderSubItemsHtml(task.subItems)}</div>`
    : "";
  const wrapMetaClasses = [
    task.category ? `cat-${task.category}` : "",
    task.priority ? `pri-${task.priority}` : "",
    task.kind === "할일" ? "kind-todo-task" : "",
  ].filter(Boolean).join(" ");
  return `
    <div class="calendar-task-wrap${showDelete ? " has-delete" : ""}${hasSubItems ? " has-sub" : ""} ${wrapMetaClasses}"${wrapIndentStyle}>
      <button class="calendar-task ${task.checked ? "done" : task.deferred ? "deferred" : ""} ${task.type} ${range ? `range-task ${colorClass}` : ""} ${task.draggingPreview ? "drag-preview" : ""}" type="button" data-path="${escapeAttribute(task.path)}" data-line="${task.line}" data-date="${escapeAttribute(dateKey)}" title="${escapeAttribute(title)}">
        <span>${icon}</span>
        <span>${escapeHtml(task.text)}${taskTimeForDate(task, dateKey) ? `<span class="task-time-badge">${escapeHtml(taskTimeForDate(task, dateKey))}</span>` : ""}</span>
      </button>
      ${deleteBtn}
      ${inlineSubItems}
    </div>
  `;
}

function taskContinuationIcon(range) {
  return range === "end" ? "↳" : "↔";
}

function taskRangePosition(task, dateKey) {
  const startKey = task.dates?.start || "";
  const endKey = task.dates?.end || task.dates?.due || "";
  if (!startKey || !endKey || startKey === endKey) return "";
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  if (!start || !end) return "";
  const fromKey = formatDate(start <= end ? start : end);
  const toKey = formatDate(start <= end ? end : start);
  if (dateKey === fromKey) return "start";
  if (dateKey === toKey) return "end";
  return "middle";
}

function rangeColorIndex(task) {
  const key = `${task.path}:${task.line}:${task.dates?.start || ""}:${task.dates?.end || task.dates?.due || ""}`;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return hash % 6;
}

function renderCalendarFile(file, field, showDelete = false) {
  const title = `${file.path}: ${file[field] ? new Date(file[field]).toLocaleString() : ""}`;
  const deleteBtn = showDelete
    ? `<button class="agenda-delete-btn" type="button" data-agenda-delete-file data-path="${escapeAttribute(file.path)}" aria-label="삭제" title="삭제">🗑️</button>`
    : "";
  return `
    <div class="calendar-task-wrap${showDelete ? " has-delete" : ""}">
      <button class="calendar-task calendar-file" type="button" data-path="${escapeAttribute(file.path)}" title="${escapeAttribute(title)}">
        <span class="${field === "createdAt" ? "calendar-file-icon created" : "calendar-file-icon"}">${field === "createdAt" ? "➕" : "✏️"}</span>
        <span>${escapeHtml(displayDocumentTitle(file.name || file.path.split("/").pop() || file.path))}</span>
      </button>
      ${deleteBtn}
    </div>
  `;
}

function bindCalendarEvents() {
  els.calendarView.querySelectorAll("[data-calendar-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-calendar-action");
      if (action === "prev") state.calendarDate = shiftCalendarDate(-1);
      if (action === "next") state.calendarDate = shiftCalendarDate(1);
      if (action === "today") {
        goCalendarToday();
        return;
      }
      renderCalendar();
    });
  });

  els.calendarView.querySelector(".calendar-date-jump")?.addEventListener("change", (event) => {
    const date = parseDateKey(event.currentTarget.value);
    if (!date) return;
    state.calendarDate = date;
    renderCalendar();
  });

  els.calendarView.querySelectorAll("[data-calendar-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarMode = button.getAttribute("data-calendar-mode") || "month";
      renderCalendar();
    });
  });

  bindCalendarFilterEvents();

  els.calendarView.querySelectorAll("[data-calendar-more]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const date = parseDateKey(button.getAttribute("data-calendar-more"));
      if (!date) return;
      state.calendarDate = date;
      state.calendarMode = "day";
      renderCalendar();
    });
  });

  els.calendarView.querySelectorAll(".calendar-task").forEach((button) => {
    if (button.hasAttribute("data-line")) {
      bindTaskDrag(button);
      bindTaskLongPress(button);
    } else {
      bindCalendarRowLongPressGuard(button);
    }
    button.addEventListener("click", async (event) => {
      if (button.dataset.longPressed === "true" || button.dataset.dragged === "true" || Date.now() < state.calendarTaskOpenSuppressedUntil) {
        event.preventDefault();
        event.stopPropagation();
        button.dataset.longPressed = "";
        button.dataset.dragged = "";
        return;
      }
      const path = button.getAttribute("data-path");
      const line = Number(button.getAttribute("data-line"));
      if (path && Number.isInteger(line)) {
        event.preventDefault();
        event.stopPropagation();
        const task = state.tasks.find((t) => t.path === path && t.line === line);
        if (task) await showTaskEditDialog(task);
        else await openFileInNewTab(path);
      } else if (path) {
        await openFileInNewTab(path);
      }
    });
  });

  els.calendarView.querySelectorAll("[data-agenda-delete]").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const filePath = btn.getAttribute("data-path");
      const line = Number(btn.getAttribute("data-line"));
      if (!filePath) return;
      await deleteCalendarTaskLine(filePath, line);
    });
  });

  els.calendarView.querySelectorAll("[data-agenda-delete-file]").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const filePath = btn.getAttribute("data-path");
      if (!filePath) return;
      if (!(await appConfirm(`"${filePath.split("/").pop()}" 파일을 삭제할까요?`, "파일 삭제"))) return;
      await deleteVaultFileByPath(filePath);
    });
  });

  els.calendarView.querySelectorAll("[data-calendar-date]").forEach((target) => {
    bindDateClick(target);
  });
}


async function deleteCalendarTaskLine(filePath, lineNumber) {
  try {
    const res = await fetch(`/api/vault-file?path=${encodeURIComponent(filePath)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    const text = await res.text();
    const lines = text.split("\n");
    const idx = lineNumber - 1;
    if (idx < 0 || idx >= lines.length) return;
    const taskIndentLen = normalizeLineIndent(lines[idx]).length;
    // sub-items: 뒤따르는 더 깊은 들여쓰기의 줄들도 함께 삭제
    let deleteEnd = idx + 1;
    while (deleteEnd < lines.length) {
      if (lines[deleteEnd].trim() === "") break;
      if (normalizeLineIndent(lines[deleteEnd]).length <= taskIndentLen) break;
      deleteEnd += 1;
    }
    lines.splice(idx, deleteEnd - idx);
    const updated = lines.join("\n");
    await fetch(`/api/vault-file?path=${encodeURIComponent(filePath)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: updated }),
    });
    updateTasksForFile(filePath, updated);
  } catch {
    alert("삭제에 실패했습니다.");
  }
}

async function deleteVaultFileByPath(filePath) {
  try {
    const res = await fetch(`/api/vault-file?path=${encodeURIComponent(filePath)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete failed");
    removeFileNode(filePath);
    state.tasks = state.tasks.filter((task) => task.path !== filePath);
    state.calendarTaskFiles.delete(filePath);
    saveCalendarCache();
    refreshDirectoryMetadataFrom(filePath);
    refreshRecentFilesCache();
    invalidateRandomMarkdownCache();
    const tabsToClose = state.tabs.filter((t) => t.path === filePath).map((t) => t.id);
    for (const id of tabsToClose) await closeTab(id);
    if (state.currentPath === filePath) {
      state.currentPath = "";
      state.currentContent = "";
      state.currentNode = null;
      els.markdownView.innerHTML = "<h3>파일이 삭제됐습니다.</h3>";
    }
    renderTree();
    renderCalendar();
  } catch {
    showAppToast("삭제에 실패했습니다.", "error");
  }
}

async function reloadVaultFileList() {
  try {
    const res = await fetch("/api/vault", { cache: "no-store" });
    if (!res.ok) return;
    const vault = await res.json();
    if (!vault || !Array.isArray(vault.files)) return;
    state.files.clear();
    state.directories.clear();
    state.root = makeDirNode(vault.name || state.vaultName, "");
    state.directories.set("", state.root);
    vault.files.forEach((file) => {
      const normalizedPath = normalizeVaultPath(file.path);
      if (!normalizedPath || !isIndexedFile(normalizedPath)) return;
      const parts = normalizedPath.split("/");
      const fileName = parts.pop();
      let dir = state.root;
      let dirPath = "";
      parts.forEach((part) => {
        const nextPath = dirPath ? `${dirPath}/${part}` : part;
        if (!state.directories.has(nextPath)) {
          const node = makeDirNode(part, nextPath);
          state.directories.set(nextPath, node);
          dir.children.set(part, node);
        }
        dir = state.directories.get(nextPath);
        dirPath = nextPath;
      });
      const fileNode = {
        kind: "file",
        name: fileName,
        path: normalizedPath,
        url: file.url || "",
        serverBacked: true,
        size: file.size || 0,
        updatedAt: file.updatedAt || file.modifiedAt || 0,
        createdAt: file.createdAt || file.birthtime || file.updatedAt || 0,
      };
      state.files.set(normalizedPath, fileNode);
      dir.children.set(fileName, fileNode);
    });
    refreshDirectoryMetadata();
    renderTree();
  } catch {}
}

async function deleteVaultFolder(folderPath) {
  if (!confirm(`"${folderPath}" 폴더와 그 안의 모든 파일을 삭제하시겠습니까?`)) return;
  try {
    const res = await fetch(`/api/vault-folder?path=${encodeURIComponent(folderPath)}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "삭제 실패");
    state.selectedPaths.delete(folderPath);
    const tabsToClose = state.tabs.filter((t) => t.path && (t.path === folderPath || t.path.startsWith(folderPath + "/"))).map((t) => t.id);
    for (const id of tabsToClose) await closeTab(id);
    await reloadVaultFileList();
    showAppToast("폴더를 삭제했습니다.", "success");
  } catch (e) {
    showAppToast(e.message || "삭제에 실패했습니다.", "error");
  }
}

async function deleteSelected() {
  const paths = [...state.selectedPaths];
  if (!paths.length) return;
  if (!confirm(`선택한 ${paths.length}개 항목을 삭제하시겠습니까?`)) return;
  const folderPaths = paths.filter((p) => state.directories.has(p));
  const filePaths = paths.filter((p) => !state.directories.has(p));
  let errors = 0;
  for (const p of filePaths) {
    try {
      const res = await fetch(`/api/vault-file?path=${encodeURIComponent(p)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      removeFileNode(p);
      state.tasks = state.tasks.filter((t) => t.path !== p);
      state.calendarTaskFiles.delete(p);
    } catch { errors++; }
  }
  for (const p of folderPaths) {
    try {
      const res = await fetch(`/api/vault-folder?path=${encodeURIComponent(p)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch { errors++; }
  }
  const tabsToClose = state.tabs.filter((t) => t.path && paths.some((p) => t.path === p || t.path.startsWith(p + "/"))).map((t) => t.id);
  for (const id of tabsToClose) await closeTab(id);
  state.selectedPaths.clear();
  await reloadVaultFileList();
  saveCalendarCache();
  refreshRecentFilesCache();
  invalidateRandomMarkdownCache();
  renderCalendar();
  if (errors > 0) showAppToast(`${errors}개 삭제에 실패했습니다.`, "error");
  else showAppToast(`${paths.length}개 항목을 삭제했습니다.`, "success");
}

function showMoveMultiDialog() {
  document.getElementById("owv-move-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "owv-move-overlay";
  overlay.className = "owv-move-overlay";
  const count = state.selectedPaths.size;

  const dialog = document.createElement("div");
  dialog.className = "owv-move-dialog";
  dialog.innerHTML = `<div class="owv-move-title">이동하기 (${count}개)</div><label class="owv-move-label">대상 폴더 경로</label><input class="owv-move-input" type="text" placeholder="예: Archive/2024"><div class="owv-move-footer"><button class="owv-move-cancel">취소</button><button class="owv-move-confirm">이동</button></div>`;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const input = dialog.querySelector(".owv-move-input");
  const close = () => overlay.remove();
  input.focus();

  dialog.querySelector(".owv-move-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  dialog.querySelector(".owv-move-confirm").addEventListener("click", async () => {
    const destFolder = input.value.trim().replace(/\/$/, "");
    if (!destFolder) return;
    const paths = [...state.selectedPaths];
    let errors = 0;
    for (const oldPath of paths) {
      const name = oldPath.split("/").pop();
      const newPath = `${destFolder}/${name}`;
      const isDir = state.directories.has(oldPath);
      try {
        const endpoint = isDir ? "/api/vault-folder" : "/api/vault-file";
        const res = await fetch(`${endpoint}?path=${encodeURIComponent(oldPath)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPath }),
        });
        if (!res.ok) throw new Error();
      } catch { errors++; }
    }
    state.selectedPaths.clear();
    await reloadVaultFileList();
    renderTabStrip();
    saveOpenTabs();
    if (errors > 0) showAppToast(`${errors}개 이동에 실패했습니다.`, "error");
    else showAppToast(`${paths.length}개 항목을 이동했습니다.`, "success");
    close();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") dialog.querySelector(".owv-move-confirm").click();
    if (e.key === "Escape") close();
  });
}

function showMergeDialog(initialPaths) {
  document.getElementById("owv-merge-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "owv-merge-overlay";
  overlay.className = "owv-move-overlay";

  const dialog = document.createElement("div");
  dialog.className = "owv-move-dialog";
  dialog.style.maxWidth = "520px";

  // 기본 저장 경로: 첫 번째 파일의 폴더 + "합치기.md"
  const firstPath = initialPaths[0] || "";
  const defaultFolder = firstPath.includes("/") ? firstPath.slice(0, firstPath.lastIndexOf("/")) : "";
  const defaultSavePath = (defaultFolder ? defaultFolder + "/" : "") + "합치기.md";

  let orderedPaths = [...initialPaths];

  function getName(p) { return p.split("/").pop().replace(/\.md$/i, ""); }

  function renderList() {
    listEl.innerHTML = "";
    orderedPaths.forEach((p, i) => {
      const item = document.createElement("div");
      item.className = "owv-merge-item";
      item.innerHTML = `<span class="owv-merge-name" title="${p}">${getName(p)}</span><span class="owv-merge-btns"><button type="button" data-dir="-1" data-i="${i}" ${i === 0 ? "disabled" : ""}>▲</button><button type="button" data-dir="1" data-i="${i}" ${i === orderedPaths.length - 1 ? "disabled" : ""}>▼</button></span>`;
      listEl.appendChild(item);
    });
  }

  dialog.innerHTML = `
    <div class="owv-move-title">합치기 (${initialPaths.length}개)</div>
    <div class="owv-merge-list-wrap"></div>
    <label class="owv-move-label" style="margin-top:10px">저장 경로 (.md)</label>
    <input class="owv-move-input" type="text" value="${defaultSavePath}">
    <div class="owv-move-footer"><button class="owv-move-cancel">취소</button><button class="owv-move-confirm">합치기</button></div>`;

  const listEl = document.createElement("div");
  listEl.className = "owv-merge-list";
  dialog.querySelector(".owv-merge-list-wrap").appendChild(listEl);
  renderList();

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-dir]");
    if (!btn) return;
    const i = Number(btn.dataset.i);
    const dir = Number(btn.dataset.dir);
    const j = i + dir;
    if (j < 0 || j >= orderedPaths.length) return;
    [orderedPaths[i], orderedPaths[j]] = [orderedPaths[j], orderedPaths[i]];
    renderList();
  });

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const pathInput = dialog.querySelector(".owv-move-input");
  const close = () => overlay.remove();

  dialog.querySelector(".owv-move-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  dialog.querySelector(".owv-move-confirm").addEventListener("click", async () => {
    const savePath = pathInput.value.trim();
    if (!savePath || !savePath.endsWith(".md")) {
      showAppToast("저장 경로는 .md 파일이어야 합니다.", "error");
      return;
    }

    const confirmBtn = dialog.querySelector(".owv-move-confirm");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "합치는 중…";

    try {
      const parts = [];
      for (const p of orderedPaths) {
        const res = await fetch(`/api/vault-file?path=${encodeURIComponent(p)}`);
        if (!res.ok) throw new Error(`읽기 실패: ${p}`);
        let body = await res.text();
        // frontmatter 제거
        if (body.startsWith("---")) {
          const end = body.indexOf("\n---", 3);
          if (end !== -1) body = body.slice(end + 4).trimStart();
        }
        parts.push(`# ${getName(p)}\n\n${body}`);
      }

      const merged = parts.join("\n\n---\n\n");
      const putRes = await fetch(`/api/vault-file?path=${encodeURIComponent(savePath)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: merged }),
      });
      if (!putRes.ok) {
        const j = await putRes.json().catch(() => ({}));
        throw new Error(j.error || "저장 실패");
      }

      // 원본 삭제
      for (const p of orderedPaths) {
        await fetch(`/api/vault-file?path=${encodeURIComponent(p)}`, { method: "DELETE" }).catch(() => {});
        removeFileNode(p);
        state.tasks = state.tasks.filter((t) => t.path !== p);
        state.calendarTaskFiles.delete(p);
        const tabsToClose = state.tabs.filter((t) => t.path === p).map((t) => t.id);
        for (const id of tabsToClose) await closeTab(id);
      }

      state.selectedPaths.clear();
      await reloadVaultFileList();
      await openFile(savePath);
      showAppToast(`${orderedPaths.length}개 파일을 합쳤습니다.`, "success");
      close();
    } catch (e) {
      showAppToast(`합치기 실패: ${e.message}`, "error");
      confirmBtn.disabled = false;
      confirmBtn.textContent = "합치기";
    }
  });

  pathInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  pathInput.focus();
  pathInput.setSelectionRange(pathInput.value.length, pathInput.value.length);
}

async function moveVaultFile(oldPath, newPath) {
  const res = await fetch(`/api/vault-file?path=${encodeURIComponent(oldPath)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPath }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "이동에 실패했습니다.");
  return json.path;
}

function showMoveDialog(filePath, isDirectory = false) {
  document.getElementById("owv-move-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "owv-move-overlay";
  overlay.className = "owv-move-overlay";

  const dialog = document.createElement("div");
  dialog.className = "owv-move-dialog";
  dialog.innerHTML = `<div class="owv-move-title">파일 이동</div><label class="owv-move-label">새 경로</label><input class="owv-move-input" type="text" value="${filePath.replace(/"/g, "&quot;")}"><div class="owv-move-footer"><button class="owv-move-cancel">취소</button><button class="owv-move-confirm">이동</button></div>`;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const input = dialog.querySelector(".owv-move-input");
  const close = () => overlay.remove();

  // 경로 끝에서 파일명만 선택
  input.focus();
  const lastSlash = filePath.lastIndexOf("/");
  input.setSelectionRange(lastSlash + 1, filePath.length);

  dialog.querySelector(".owv-move-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  dialog.querySelector(".owv-move-confirm").addEventListener("click", async () => {
    const newPath = input.value.trim();
    if (!newPath || newPath === filePath) { close(); return; }
    try {
      const endpoint = isDirectory ? "/api/vault-folder" : "/api/vault-file";
      const res = await fetch(`${endpoint}?path=${encodeURIComponent(filePath)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPath }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "이동에 실패했습니다.");
      if (isDirectory) {
        state.selectedPaths.delete(filePath);
        const tabsToUpdate = state.tabs.filter((t) => t.path && t.path.startsWith(filePath + "/"));
        tabsToUpdate.forEach((t) => { t.path = newPath + t.path.slice(filePath.length); });
        await reloadVaultFileList();
        renderTabStrip();
        saveOpenTabs();
        showAppToast("이동 완료: " + newPath, "success");
        close();
        return;
      }
      const resultPath = json.path || newPath;
      state.tabs.forEach((t) => {
        if (t.path === filePath) { t.path = resultPath; t.title = resultPath.split("/").pop(); }
      });
      if (state.currentPath === filePath) state.currentPath = resultPath;
      state.selectedPaths.delete(filePath);
      await reloadVaultFileList();
      renderTabStrip();
      saveOpenTabs();
      showAppToast("이동 완료: " + resultPath, "success");
      close();
    } catch (e) {
      showAppToast(e.message || "이동에 실패했습니다.", "error");
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") dialog.querySelector(".owv-move-confirm").click();
    if (e.key === "Escape") close();
  });
}

function shiftCalendarDate(direction) {
  if (state.calendarMode === "day") return addDays(state.calendarDate, direction);
  if (state.calendarMode === "week") return addDays(state.calendarDate, direction * 7);
  return addMonths(state.calendarDate, direction);
}

function moveCalendarByScroll(direction) {
  navigateCalendarAnimated(direction);
}

function navigateCalendarAnimated(direction) {
  const oldShell = els.calendarView.querySelector(".calendar-shell");
  if (!oldShell) {
    state.calendarDate = shiftCalendarDate(direction);
    renderCalendar();
    return;
  }
  const clone = oldShell.cloneNode(true);
  state.calendarDate = shiftCalendarDate(direction);
  renderCalendar();
  const newShell = els.calendarView.querySelector(".calendar-shell");
  if (!newShell) return;

  clone.style.cssText += ";position:absolute;inset:0;z-index:5;margin:0;transform:translateX(0)";
  newShell.style.transform = `translateX(${direction * 100}%)`;
  els.calendarView.appendChild(clone);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const t = "transform 0.28s ease";
      newShell.style.transition = t;
      clone.style.transition = t;
      newShell.style.transform = "translateX(0)";
      clone.style.transform = `translateX(${-direction * 100}%)`;
      clone.addEventListener("transitionend", () => {
        clone.remove();
        newShell.style.transition = "";
        newShell.style.transform = "";
      }, { once: true });
    });
  });
}

function handleCalendarWheel(event) {
  if (state.activeView !== "calendar") return;
  if (Math.abs(event.deltaX) < 28 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.2) return;
  const now = Date.now();
  if (now - state.calendarWheelAt < 260) {
    event.preventDefault();
    return;
  }
  state.calendarWheelAt = now;
  event.preventDefault();
  moveCalendarByScroll(event.deltaX > 0 ? 1 : -1);
}

function handleCalendarSwipeStart(event) {
  if (state.activeView !== "calendar" || event.pointerType === "mouse") return;
  if (event.target.closest("[data-calendar-date]")) return;
  state.calendarSwipe = { x: event.clientX, y: event.clientY, time: Date.now() };
}

function handleCalendarSwipeEnd(event) {
  const swipe = state.calendarSwipe;
  state.calendarSwipe = null;
  if (!swipe || state.activeView !== "calendar") return;
  if (state.calendarDragStartDate) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.35 || Date.now() - swipe.time > 900) return;
  state.calendarDragStartDate = "";
  state.calendarDragCurrentDate = "";
  state.calendarDragHandled = true;
  clearCalendarDragHighlight();
  event.preventDefault();
  event.stopPropagation();
  moveCalendarByScroll(dx < 0 ? 1 : -1);
  window.setTimeout(() => {
    state.calendarDragHandled = false;
  }, 0);
}

function clearCalendarSwipe() {
  state.calendarSwipe = null;
}

function requestFullscreenOnce(event) {
  if (event?.target?.closest?.("#fullscreenButton")) return;
  if (state.fullscreenAttempted || document.fullscreenElement) return;
  state.fullscreenAttempted = true;
  enterFullscreen();
}

function shouldAutoRequestFullscreen() {
  return isStandaloneDisplayMode() || isTouchPrimaryDevice();
}

function isStandaloneDisplayMode() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
}

function isTouchPrimaryDevice() {
  return window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches;
}

async function enterFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    await (document.exitFullscreen?.() || document.webkitExitFullscreen?.())?.catch?.(() => {});
    setFullscreenFallback(false);
    return;
  }
  const target = document.documentElement;
  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen();
      setFullscreenFallback(false);
      return;
    }
    if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
      setFullscreenFallback(false);
      return;
    }
  } catch {
    // Mobile browsers can reject fullscreen unless installed as an app.
  }
  setFullscreenFallback(!state.fullscreenFallback);
  window.moveTo?.(0, 0);
  window.resizeTo?.(screen.availWidth || screen.width, screen.availHeight || screen.height);
}

function setFullscreenFallback(enabled) {
  state.fullscreenFallback = enabled;
  document.body.classList.toggle("fullscreen-fallback", enabled);
  els.fullscreenButton?.classList.toggle("active", enabled || Boolean(document.fullscreenElement || document.webkitFullscreenElement));
}

function parseDateKey(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function bindTaskDrag(button) {
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    state.calendarTaskDrag = {
      pointerId: event.pointerId,
      path: button.getAttribute("data-path") || "",
      line: Number(button.getAttribute("data-line")),
      sourceDate: button.getAttribute("data-date") || "",
      previewDate: "",
      x: event.clientX,
      y: event.clientY,
      active: false,
      button,
    };
    button.setPointerCapture?.(event.pointerId);
    startCalendarTaskDragListeners();
  });

  button.addEventListener("pointermove", (event) => {
    const drag = state.calendarTaskDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    if (!drag.active && distance < CALENDAR_DRAG_DISTANCE) return;
    if (!drag.active) {
      drag.active = true;
      button.dataset.dragged = "true";
      button.classList.add("dragging");
      suppressCalendarRowOpen();
    }
    event.preventDefault();
    updateCalendarTaskDragPreview(event.clientX, event.clientY);
  });

  button.addEventListener("pointerup", async (event) => {
    const drag = state.calendarTaskDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    button.releasePointerCapture?.(event.pointerId);
    clearCalendarTaskDropTarget();
    const targetDate = drag.previewDate || calendarDateFromPoint(event.clientX, event.clientY);
    state.calendarTaskDrag = null;
    stopCalendarTaskDragListeners();
    button.classList.remove("dragging");
    if (!drag.active) return;
    event.preventDefault();
    event.stopPropagation();
    suppressCalendarRowOpen();
    button.dataset.dragged = "true";
    if (targetDate && targetDate !== drag.sourceDate) {
      await moveCalendarTaskDate(drag.path, drag.line, targetDate, drag.sourceDate);
    } else if (state.activeView === "calendar" && isTaskCalendarKind()) {
      renderCalendar();
    }
    window.setTimeout(() => {
      button.dataset.dragged = "";
    }, 0);
  });

  button.addEventListener("pointercancel", () => {
    button.classList.remove("dragging");
    clearCalendarTaskDropTarget();
    state.calendarTaskDrag = null;
    stopCalendarTaskDragListeners();
    if (state.activeView === "calendar" && isTaskCalendarKind()) renderCalendar();
    window.setTimeout(() => {
      button.dataset.dragged = "";
    }, 0);
  });
}

function bindCalendarRowLongPressGuard(button) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  const clear = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };

  button.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
    timer = window.setTimeout(() => {
      timer = null;
      button.dataset.longPressed = "true";
      suppressCalendarRowOpen();
    }, CALENDAR_LONG_PRESS_MS);
  });
  button.addEventListener("pointermove", (event) => {
    if (!timer) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > CALENDAR_DRAG_DISTANCE) clear();
  });
  button.addEventListener("pointerup", () => {
    if (button.dataset.longPressed === "true") suppressCalendarRowOpen();
    clear();
  });
  button.addEventListener("pointerleave", clear);
  button.addEventListener("pointercancel", clear);
}

function suppressCalendarRowOpen(duration = 2500) {
  state.calendarTaskOpenSuppressedUntil = Math.max(state.calendarTaskOpenSuppressedUntil, Date.now() + duration);
}

function startCalendarTaskDragListeners() {
  window.addEventListener("pointermove", handleWindowCalendarTaskDragMove, true);
  window.addEventListener("pointerup", handleWindowCalendarTaskDragEnd, true);
  window.addEventListener("pointercancel", handleWindowCalendarTaskDragCancel, true);
}

function stopCalendarTaskDragListeners() {
  window.removeEventListener("pointermove", handleWindowCalendarTaskDragMove, true);
  window.removeEventListener("pointerup", handleWindowCalendarTaskDragEnd, true);
  window.removeEventListener("pointercancel", handleWindowCalendarTaskDragCancel, true);
}

function handleWindowCalendarTaskDragMove(event) {
  const drag = state.calendarTaskDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const distance = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    if (!drag.active && distance < CALENDAR_DRAG_DISTANCE) return;
  if (!drag.active) {
    drag.active = true;
    drag.button?.classList.add("dragging");
    if (drag.button) drag.button.dataset.dragged = "true";
    suppressCalendarRowOpen();
  }
  event.preventDefault();
  updateCalendarTaskDragPreview(event.clientX, event.clientY);
}

async function handleWindowCalendarTaskDragEnd(event) {
  const drag = state.calendarTaskDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  clearCalendarTaskDropTarget();
  const targetDate = drag.previewDate || calendarDateFromPoint(event.clientX, event.clientY);
  state.calendarTaskDrag = null;
  stopCalendarTaskDragListeners();
  drag.button?.classList.remove("dragging");
  if (!drag.active) return;
  event.preventDefault();
  event.stopPropagation();
  suppressCalendarRowOpen();
  if (drag.button) drag.button.dataset.dragged = "true";
  if (targetDate && targetDate !== drag.sourceDate) {
    await moveCalendarTaskDate(drag.path, drag.line, targetDate, drag.sourceDate);
  } else if (state.activeView === "calendar" && isTaskCalendarKind()) {
    renderCalendar();
  }
  window.setTimeout(() => {
    if (drag.button) drag.button.dataset.dragged = "";
  }, 0);
}

function handleWindowCalendarTaskDragCancel(event) {
  const drag = state.calendarTaskDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  drag.button?.classList.remove("dragging");
  clearCalendarTaskDropTarget();
  state.calendarTaskDrag = null;
  stopCalendarTaskDragListeners();
  if (state.activeView === "calendar" && isTaskCalendarKind()) renderCalendar();
}

function updateCalendarTaskDragPreview(x, y) {
  const drag = state.calendarTaskDrag;
  if (!drag) return;
  const date = calendarDateFromPoint(x, y);
  if (date === drag.previewDate) return;
  drag.previewDate = date;
  if (state.activeView === "calendar" && isTaskCalendarKind()) renderCalendar();
}

function clearCalendarTaskDropTarget() {
  els.calendarView.querySelectorAll(".task-drop-target").forEach((cell) => {
    cell.classList.remove("task-drop-target");
  });
}

function highlightCalendarTaskDropTarget() {
  const date = state.calendarTaskDrag?.previewDate || "";
  if (!date) return;
  els.calendarView.querySelectorAll(`[data-calendar-date="${date}"]`).forEach((cell) => {
    cell.classList.add("task-drop-target");
  });
}

function calendarDateFromPoint(x, y) {
  return document.elementFromPoint(x, y)?.closest?.("[data-calendar-date]")?.getAttribute("data-calendar-date") || "";
}

function bindTaskLongPress(button) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  const clear = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };

  button.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
    const path = button.getAttribute("data-path");
    const line = Number(button.getAttribute("data-line"));
    timer = window.setTimeout(async () => {
      timer = null;
      button.dataset.longPressed = "true";
      suppressCalendarRowOpen();
      await toggleCalendarTask(path, line, button);
    }, CALENDAR_LONG_PRESS_MS);
  });
  button.addEventListener("pointermove", (event) => {
    if (!timer) return;
    const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
    if (distance > CALENDAR_DRAG_DISTANCE) clear();
  });
  button.addEventListener("pointerup", () => {
    if (button.dataset.longPressed === "true") suppressCalendarRowOpen();
    clear();
  });
  button.addEventListener("pointerleave", clear);
  button.addEventListener("pointercancel", clear);
}

async function toggleCalendarTask(path, lineNumber, button) {
  const node = state.files.get(path);
  if (!canEditNode(node) || !Number.isInteger(lineNumber) || lineNumber < 1) {
    alert("실제 vault 파일에서만 완료 상태를 바꿀 수 있습니다.");
    return;
  }

  const granted = await ensureNodeWritePermission(node);
  if (!granted) {
    alert("파일 편집 권한이 필요합니다.");
    return;
  }

  const desiredChecked = nextCalendarTaskChecked(path, lineNumber, button);
  const queueKey = `${path}:${lineNumber}`;
  state.calendarTaskPendingStates.set(queueKey, desiredChecked);
  applyTaskTogglePreview(path, lineNumber, desiredChecked, button);
  if (state.activeView === "calendar" && isTaskCalendarKind()) renderCalendar();

  const previousWrite = state.calendarTaskWriteQueues.get(queueKey) || Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => {})
    .then(async () => {
      const content = await readFileNode(node);
      await persistTaskCheckedState(node, path, lineNumber, desiredChecked, content);
    })
    .catch((error) => {
      console.error("Task toggle failed", error);
      alert("Task 상태를 저장하지 못했습니다.");
    })
    .finally(() => {
      if (state.calendarTaskWriteQueues.get(queueKey) === nextWrite) {
        state.calendarTaskWriteQueues.delete(queueKey);
        state.calendarTaskPendingStates.delete(queueKey);
      }
    });
  state.calendarTaskWriteQueues.set(queueKey, nextWrite);
  return nextWrite;
}

function nextCalendarTaskChecked(path, lineNumber, button) {
  if (button && "checked" in button) return Boolean(button.checked);
  const task = state.tasks.find((item) => item.path === path && item.line === lineNumber);
  if (task) return !task.checked;
  return !button?.classList?.contains("done");
}

function applyTaskTogglePreview(path, lineNumber, checked, button) {
  state.tasks = state.tasks.map((task) => (task.path === path && task.line === lineNumber ? { ...task, checked } : task));
  if (button && "checked" in button) button.checked = checked;
  button?.classList?.toggle("done", checked);
  button?.closest?.(".task-list-item")?.classList.toggle("done", checked);
}

function applyPendingTaskStates() {
  if (!state.calendarTaskPendingStates.size) return;
  state.tasks = state.tasks.map((task) => {
    const key = `${task.path}:${task.line}`;
    return state.calendarTaskPendingStates.has(key) ? { ...task, checked: state.calendarTaskPendingStates.get(key) } : task;
  });
}

async function persistTaskCheckedState(node, path, lineNumber, checked, content) {
  const queueKey = `${path}:${lineNumber}`;
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const index = lineNumber - 1;
  if (!lines[index] || !/^\s*[-*+]\s+\[[ xX>-]\]/.test(lines[index])) return;

  const taskDate = formatDate(new Date());
  const nextLine = lines[index].replace(/^(\s*[-*+]\s+\[)([ xX>-])(\])(.*)$/, (_, head, currentChecked, tail, rest) => {
    const cleanRest = rest.replace(/\s*\u{2705}\s*\d{4}-\d{2}-\d{2}/gu, "");
    return `${head}${checked ? "x" : " "}${tail}${cleanRest}${checked ? ` \u{2705} ${taskDate}` : ""}`;
  });
  if (nextLine === lines[index]) return;

  lines[index] = nextLine;
  const nextContent = lines.join("\n");
  const metadata = await writeNodeContent(node, nextContent, { backup: false, previousContent: content });
  Object.assign(node, metadata);
  refreshDirectoryMetadata();
  if (typeof node.content === "string") node.content = nextContent;
  updateTasksForFile(path, nextContent);

  const pendingChecked = state.calendarTaskPendingStates.get(queueKey);
  const hasNewerPendingState = pendingChecked !== undefined && pendingChecked !== checked;
  if (state.currentPath === path && !hasNewerPendingState) {
    state.currentContent = nextContent;
    if (state.editMode) {
      setEditorValue(nextContent);
      markEditorDirty();
    } else if (state.activeView === "note") {
      renderCurrentDocument();
    }
  }

  if (state.activeView === "calendar" && isTaskCalendarKind()) renderCalendar();
}

async function moveCalendarTaskDate(path, lineNumber, targetDate, sourceDate = "") {
  const node = state.files.get(path);
  if (!canEditNode(node) || !Number.isInteger(lineNumber) || lineNumber < 1 || !parseDateKey(targetDate)) {
    alert("실제 vault 파일에서만 task 날짜를 바꿀 수 있습니다.");
    return;
  }

  const granted = await ensureNodeWritePermission(node);
  if (!granted) {
    alert("파일 편집 권한이 필요합니다.");
    return;
  }

  const content = await readFileNode(node);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const index = lineNumber - 1;
  if (!lines[index] || !/^\s*[-*+]\s+\[[ xX-]\]/.test(lines[index])) return;

  const task = state.tasks.find((item) => item.path === path && item.line === lineNumber);
  const moveMode = calendarTaskMoveMode(task, sourceDate);
  const nextLine = moveMode === "range-shift"
    ? shiftTaskLineDateRange(lines[index], task, sourceDate, targetDate)
    : replaceTaskLineDate(lines[index], targetDate, taskDateMarkerForMove(task, sourceDate));
  if (nextLine === lines[index]) return;

  lines[index] = nextLine;
  const nextContent = lines.join("\n");
  const metadata = await writeNodeContent(node, nextContent, { backup: false, previousContent: content });
  Object.assign(node, metadata);
  refreshDirectoryMetadata();
  if (typeof node.content === "string") node.content = nextContent;
  updateTasksForFile(path, nextContent);

  if (state.currentPath === path) {
    state.currentContent = nextContent;
    if (state.editMode) {
      setEditorValue(nextContent);
      markEditorDirty();
    } else if (state.activeView === "note") {
      renderCurrentDocument();
    }
  }

  if (state.activeView === "calendar" && isTaskCalendarKind()) renderCalendar();
}

async function moveTaskToMatrixQuadrant(path, lineNumber, placement) {
  const node = state.files.get(path);
  if (!canEditNode(node) || !Number.isInteger(lineNumber) || lineNumber < 1) {
    alert("실제 vault 파일에서만 task 위치를 바꿀 수 있습니다.");
    return;
  }

  const granted = await ensureNodeWritePermission(node);
  if (!granted) {
    alert("파일 편집 권한이 필요합니다.");
    return;
  }

  const content = await readFileNode(node);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const index = lineNumber - 1;
  if (!lines[index] || !/^\s*[-*+]\s+\[[ xX-]\]/.test(lines[index])) return;

  const range = matrixDateRange();
  const targetDate = placement.urgent ? formatDate(range.start) : formatDate(addDays(range.end, -1));
  let nextLine = replaceTaskLineDate(lines[index], targetDate, "\u{1F4C5}");
  nextLine = replaceTaskPriorityTag(nextLine, placement.important ? "상" : "하");
  if (nextLine === lines[index]) return;

  lines[index] = nextLine;
  const nextContent = lines.join("\n");
  const metadata = await writeNodeContent(node, nextContent, { backup: false, previousContent: content });
  Object.assign(node, metadata);
  refreshDirectoryMetadata();
  if (typeof node.content === "string") node.content = nextContent;
  updateTasksForFile(path, nextContent);

  if (state.currentPath === path) {
    state.currentContent = nextContent;
    if (state.editMode) {
      setEditorValue(nextContent);
      markEditorDirty();
    } else if (state.activeView === "note") {
      renderCurrentDocument();
    }
  }

  if (state.activeView === "calendar" && isTaskCalendarKind()) renderCalendar();
}

function replaceTaskPriorityTag(line, priority) {
  const cleaned = line.replace(/\s+#(?:상|중|하)(?=\s|$)/gu, "");
  const target = priority ? ` #${priority}` : "";
  const dateMarker = cleaned.search(/\s+(?:\u{1F4C5}|\u{1F6EB}|\u{23F3}|\u{2705}|\u{274C})\s*\d{4}-\d{2}-\d{2}/u);
  if (dateMarker >= 0) return `${cleaned.slice(0, dateMarker)}${target}${cleaned.slice(dateMarker)}`;
  return `${cleaned}${target}`;
}

function taskDateMarkerForMove(task, sourceDate) {
  if (task?.dates?.start && sourceDate === task.dates.start) return "\u{1F6EB}";
  if (task?.dates?.scheduled) return "\u{23F3}";
  if (task?.dates?.start && !task?.dates?.due && !task?.dates?.end) return "\u{1F6EB}";
  return "\u{1F4C5}";
}

function calendarTaskMoveMode(task, sourceDate) {
  const startKey = task?.dates?.start || "";
  const endKey = task?.dates?.end || task?.dates?.due || "";
  if (!startKey || !endKey || !sourceDate) return "single";
  if (startKey === endKey) return "range-shift";
  if (sourceDate !== startKey && sourceDate !== endKey) return "range-shift";
  return "single";
}

function shiftTaskLineDateRange(line, task, sourceDate, targetDate) {
  const start = parseDateKey(task?.dates?.start);
  const end = parseDateKey(task?.dates?.end || task?.dates?.due);
  const source = parseDateKey(sourceDate);
  const target = parseDateKey(targetDate);
  if (!start || !end || !source || !target) return line;

  const delta = calendarDayDiff(source, target);
  const nextStart = formatDate(addDays(start, delta));
  const nextEnd = formatDate(addDays(end, delta));
  let nextLine = replaceSpecificTaskLineDate(line, nextStart, ["\u{1F6EB}", "start"]);
  nextLine = replaceSpecificTaskLineDate(nextLine, nextEnd, ["\u{1F4C5}", "due", "end"]);
  return nextLine;
}

function replaceSpecificTaskLineDate(line, targetDate, markers) {
  for (const marker of markers) {
    const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(${escapedMarker}\\s*)\\d{4}-\\d{2}-\\d{2}`, "iu");
    if (pattern.test(line)) return line.replace(pattern, `$1${targetDate}`);
  }
  return line;
}

function replaceTaskLineDate(line, targetDate, marker = "\u{1F4C5}") {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const markerPattern = new RegExp(`(${escapedMarker}\\s*)\\d{4}-\\d{2}-\\d{2}`, "u");
  if (markerPattern.test(line)) return line.replace(markerPattern, `$1${targetDate}`);

  const anyMarkerPattern = /([\u{1F4C5}\u{1F6EB}\u{23F3}\u{2705}\u{274C}]\s*)\d{4}-\d{2}-\d{2}/u;
  if (anyMarkerPattern.test(line)) return line.replace(anyMarkerPattern, `$1${targetDate}`);

  const bareDatePattern = /\b\d{4}-\d{2}-\d{2}\b/;
  if (bareDatePattern.test(line)) return line.replace(bareDatePattern, targetDate);

  return `${line} ${marker} ${targetDate}`;
}

function bindDateClick(target) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  const clearLongPress = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };

  const suppressDateOpen = (duration = 2500) => {
    state.calendarDateOpenSuppressedUntil = Math.max(state.calendarDateOpenSuppressedUntil, Date.now() + duration);
  };

  target.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".calendar-task, .calendar-more, .agenda-delete-btn")) return;
    const isAgendaDate = target.classList.contains("calendar-agenda-day");
    startX = event.clientX;
    startY = event.clientY;
    if (!isAgendaDate) event.preventDefault();
    if (!isAgendaDate) target.setPointerCapture?.(event.pointerId);
    state.calendarDragStartDate = target.getAttribute("data-calendar-date") || "";
    state.calendarDragCurrentDate = state.calendarDragStartDate;
    state.calendarDragPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, agenda: isAgendaDate };
    updateCalendarDragHighlight();
    timer = window.setTimeout(async () => {
      timer = null;
      target.dataset.longPressed = "true";
      suppressDateOpen();
      const date = target.getAttribute("data-calendar-date");
      if (!date) return;
      await openDateEditor(date);
    }, CALENDAR_LONG_PRESS_MS);
  });

  target.addEventListener("pointermove", (event) => {
    if (timer && Math.hypot(event.clientX - startX, event.clientY - startY) > CALENDAR_DRAG_DISTANCE) clearLongPress();
    if (!state.calendarDragStartDate) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) event.preventDefault();
  });

  target.addEventListener("pointerup", async (event) => {
    if (event.target.closest(".calendar-task, .calendar-more, .agenda-delete-btn")) return;
    target.releasePointerCapture?.(event.pointerId);
    clearLongPress();
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    state.calendarDragPointer = null;
    state.calendarDragStartDate = "";
    state.calendarDragCurrentDate = "";
    clearCalendarDragHighlight();
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      state.calendarDragHandled = true;
      navigateCalendarAnimated(dx < 0 ? 1 : -1);
      window.setTimeout(() => { state.calendarDragHandled = false; }, 0);
      suppressDateOpen();
    }
  });

  target.addEventListener("pointercancel", (event) => {
    target.releasePointerCapture?.(event.pointerId);
    clearLongPress();
    target.dataset.longPressed = "";
  });
  target.addEventListener("pointerleave", clearLongPress);

  target.addEventListener("click", async (event) => {
    if (event.target.closest(".calendar-task, .calendar-more, .agenda-delete-btn")) return;
    if (state.calendarDragHandled || Date.now() < state.calendarDateOpenSuppressedUntil || target.dataset.longPressed === "true") {
      target.dataset.longPressed = "";
      return;
    }
    const date = target.getAttribute("data-calendar-date");
    if (!date) return;
    const dailyPath = normalizeDailyNotePath(state.dailyNotePath || els.dailyNotePathInput?.value || "");
    const node = state.files.get(`${dailyPath}/${date}.md`);
    if (!node) return;
    await openFile(node.path);
  });
}

function updateCalendarDragHighlight() {
  clearCalendarDragHighlight();
  const start = parseDateKey(state.calendarDragStartDate);
  const current = parseDateKey(state.calendarDragCurrentDate);
  if (!start || !current) return;
  const from = start <= current ? start : current;
  const to = start <= current ? current : start;
  els.calendarView.querySelectorAll("[data-calendar-date]").forEach((cell) => {
    const date = parseDateKey(cell.getAttribute("data-calendar-date"));
    if (!date || date < from || date > to) return;
    cell.classList.add("drag-range");
    if (formatDate(date) === state.calendarDragStartDate) cell.classList.add("drag-start");
    if (formatDate(date) === state.calendarDragCurrentDate) cell.classList.add("drag-end");
  });
}

function clearCalendarDragHighlight() {
  els.calendarView.querySelectorAll(".drag-range, .drag-start, .drag-end").forEach((cell) => {
    cell.classList.remove("drag-range", "drag-start", "drag-end");
  });
}

function clearCalendarDragIfActive() {
  if (!state.calendarDragStartDate && !state.calendarDragCurrentDate) return;
  clearCalendarDragState();
}

function clearCalendarDragState() {
  state.calendarDragPointer = null;
  state.calendarDragStartDate = "";
  state.calendarDragCurrentDate = "";
  clearCalendarDragHighlight();
}

async function openDateEditor(date, startDate = "") {
  if (!date || (!state.rootHandle && !state.serverVaultWritable)) {
    alert("실제 vault를 먼저 열어야 날짜 편집을 시작할 수 있습니다.");
    return;
  }

  let taskStartDate = "";
  let taskDueDate = date;
  if (startDate) {
    const noteDate = parseDateKey(date);
    const rangeDate = parseDateKey(startDate);
    if (noteDate && rangeDate) {
      taskStartDate = formatDate(noteDate <= rangeDate ? noteDate : rangeDate);
      taskDueDate = formatDate(noteDate <= rangeDate ? rangeDate : noteDate);
    }
  }

  await showTaskCreateDialog(taskDueDate, taskStartDate);
}

function toggleNotifyChip(btn) {
  const on = btn.dataset.notify !== "true";
  btn.dataset.notify = String(on);
  btn.textContent = on ? "🔔" : "🔕";
}

function setNotifyChip(btn, on) {
  if (!btn) return;
  btn.dataset.notify = String(on);
  btn.textContent = on ? "🔔" : "🔕";
}

async function showTaskCreateDialog(dueDate, startDate = "", prefill = null) {
  if (!els.taskCreateDialog) return;

  // reset state
  state.taskDialogActiveField = null;
  state.taskDialogMeta = prefill
    ? { kind: prefill.kind || "할일", category: prefill.category || null, priority: prefill.priority || null, tags: [...(prefill.tags || [])] }
    : { kind: "할일", category: null, priority: null, tags: [] };
  state.taskCreateSourceDate = startDate || dueDate;
  if (els.taskTitleInput) els.taskTitleInput.value = prefill?.text || "";
  if (els.taskCreateSubItemsInput) els.taskCreateSubItemsInput.value = prefill ? taskSubItemsToEditableText(prefill.subItems) : "";
  if (els.taskStartTimeInput) {
    els.taskStartTimeInput.value = prefill?.startTime || "";
    if (els.taskStartTimeClearBtn) els.taskStartTimeClearBtn.hidden = !els.taskStartTimeInput.value;
  }
  if (els.taskDueTimeInput) {
    els.taskDueTimeInput.value = prefill?.dueTime || "";
    if (els.taskDueTimeClearBtn) els.taskDueTimeClearBtn.hidden = !els.taskDueTimeInput.value;
  }
  syncMobileTaskTimePlaceholders();
  setTaskDialogDate("due", dueDate);
  setTaskDialogDate("start", startDate);
  renderTaskDatePicker(null);
  renderDialogTagChips();
  updateTaskDialogMetaUI();
  setNotifyChip(els.taskNotifyChip, prefill ? prefill.notify !== false : true);

  els.taskCreateDialog.showModal();
  positionTaskCreateDialog();

  const vv = window.visualViewport;
  if (vv) vv.addEventListener("resize", positionTaskCreateDialog);

  await new Promise((resolve) => {
    const onClose = () => {
      els.taskCreateDialog.removeEventListener("close", onClose);
      if (vv) vv.removeEventListener("resize", positionTaskCreateDialog);
      els.taskCreateDialog.style.marginTop = "";
      els.taskCreateDialog.style.marginBottom = "";
      resolve();
    };
    els.taskCreateDialog.addEventListener("close", onClose);
  });
}

function positionTaskCreateDialog() {
  const dialog = els.taskCreateDialog;
  if (!dialog || !isTouchPrimaryDevice()) return;
  const vv = window.visualViewport;
  if (!vv) return;
  const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
  if (keyboardHeight > 80) {
    dialog.style.marginTop = `${Math.max(8, vv.offsetTop + 8)}px`;
    dialog.style.marginBottom = "auto";
  } else {
    dialog.style.marginTop = "";
    dialog.style.marginBottom = "";
  }
}

function positionTaskEditDialog() {
  const dialog = els.taskEditDialog;
  if (!dialog || !isTouchPrimaryDevice()) return;
  const vv = window.visualViewport;
  if (!vv) return;
  const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
  if (keyboardHeight > 80) {
    dialog.style.marginTop = `${Math.max(8, vv.offsetTop + 8)}px`;
    dialog.style.marginBottom = "auto";
  } else {
    dialog.style.marginTop = "";
    dialog.style.marginBottom = "";
  }
}

function setTaskDialogDate(field, value) {
  const btn = field === "start" ? els.taskStartDateBtn : els.taskDueDateBtn;
  const clearBtn = field === "start" ? els.taskStartDateClearBtn : els.taskDueDateClearBtn;
  if (!btn) return;
  btn.dataset.date = value || "";
  if (!btn.dataset.emptyLabel) btn.dataset.emptyLabel = btn.textContent || "";
  const emptyLabel = isTouchPrimaryDevice() ? "--" : btn.dataset.emptyLabel;
  btn.textContent = value ? formatDateKorean(value) : emptyLabel;
  btn.classList.toggle("has-date", Boolean(value));
  if (clearBtn) clearBtn.hidden = !value;
}

function syncMobileTaskTimePlaceholders() {
  if (!isTouchPrimaryDevice()) return;
  [els.taskStartTimeInput, els.taskDueTimeInput, els.taskEditStartTimeInput, els.taskEditDueTimeInput].forEach((input) => {
    if (input) input.placeholder = "--";
  });
}

function applyTaskCreateStartDateHint() {
  if (!state.taskCreateSourceDate) return;
  if (!els.taskStartTimeInput?.value) return;
  if (!els.taskStartDateBtn || els.taskStartDateBtn.dataset.date) return;
  setTaskDialogDate("start", state.taskCreateSourceDate);
}

function applyTaskEditStartDateHint() {
  if (!els.taskEditStartDateBtn || els.taskEditStartDateBtn.dataset.date) return;
  if (!els.taskEditStartTimeInput?.value) return;
  const dueDate = els.taskEditDueDateBtn?.dataset.date;
  if (dueDate) setTaskEditDate("start", dueDate);
}

function normalizeTaskTimeInput(input) {
  if (!input?.value) return "";
  const match = input.value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return input.value;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  const rounded = Math.round(minutes / 5) * 5;
  const normalized = `${String(Math.floor(rounded / 60) % 24).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
  input.value = normalized;
  return normalized;
}

function formatDateKorean(dateKey) {
  const d = parseDateKey(dateKey);
  if (!d) return dateKey;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function renderTaskDatePicker(field) {
  if (!els.taskDatePickerCal) return;
  if (field) { getClockEl("create").hidden = true; clockPicker.dialog = null; clockPicker.field = null; }
  if (!field) {
    els.taskDatePickerCal.hidden = true;
    els.taskDatePickerCal.innerHTML = "";
    state.taskDialogPickerMonth = null;
    return;
  }

  const activeDate = field === "start" ? els.taskStartDateBtn?.dataset.date : els.taskDueDateBtn?.dataset.date;
  const base = parseDateKey(activeDate) || new Date();
  if (!state.taskDialogPickerMonth || field !== state.taskDialogActiveField) {
    state.taskDialogPickerMonth = new Date(base.getFullYear(), base.getMonth(), 1);
  }

  state.taskDialogActiveField = field;
  const month = state.taskDialogPickerMonth;
  const year = month.getFullYear();
  const mon = month.getMonth();
  const todayKey = formatDate(new Date());
  const selectedKey = activeDate || "";

  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  const prevBtn = `<button type="button" class="tpicker-nav" data-tpicker-nav="-1">‹</button>`;
  const nextBtn = `<button type="button" class="tpicker-nav" data-tpicker-nav="1">›</button>`;
  const header = `<div class="tpicker-header">${prevBtn}<span>${year}년 ${mon + 1}월</span>${nextBtn}</div>`;

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"].map((d) => `<span class="tpicker-dow">${d}</span>`).join("");
  let cells = `<span></span>`.repeat(firstDay);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(mon + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cls = ["tpicker-day", key === todayKey ? "today" : "", key === selectedKey ? "selected" : ""].filter(Boolean).join(" ");
    cells += `<button type="button" class="${cls}" data-tpicker-date="${key}">${d}</button>`;
  }

  els.taskDatePickerCal.innerHTML = `${header}<div class="tpicker-days">${dayNames}${cells}</div>`;
  els.taskDatePickerCal.hidden = false;

  els.taskDatePickerCal.querySelectorAll("[data-tpicker-nav]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const dir = Number(btn.dataset.tpickerNav);
      state.taskDialogPickerMonth = new Date(year, mon + dir, 1);
      renderTaskDatePicker(state.taskDialogActiveField);
    });
  });

  els.taskDatePickerCal.querySelectorAll("[data-tpicker-date]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const picked = btn.dataset.tpickerDate;
      setTaskDialogDate(state.taskDialogActiveField, picked);
      renderTaskDatePicker(null);
      state.taskDialogActiveField = null;
    });
  });
}

function bindTaskCreateDialog() {
  if (!els.taskCreateDialog) return;

  // Meta chip bindings (kind, category, priority - single select/toggle)
  [els.taskKindChips, els.taskCategoryChips, els.taskPriorityChips].forEach((container) => {
    container?.querySelectorAll("[data-meta]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.meta;
        const val = btn.dataset.val;
        state.taskDialogMeta[key] = state.taskDialogMeta[key] === val ? null : val;
        updateTaskDialogMetaUI();
      });
    });
  });

  els.taskStartDateBtn?.addEventListener("click", () => {
    const field = "start";
    if (state.taskDialogActiveField === field) {
      renderTaskDatePicker(null);
      state.taskDialogActiveField = null;
    } else {
      renderTaskDatePicker(field);
    }
  });

  els.taskStartDateClearBtn?.addEventListener("click", () => {
    setTaskDialogDate("start", "");
    state.taskDialogActiveField = null;
    renderTaskDatePicker(null);
  });

  els.taskStartTimeClearBtn?.addEventListener("click", () => {
    if (els.taskStartTimeInput) els.taskStartTimeInput.value = "";
    els.taskStartTimeClearBtn.hidden = true;
  });

  els.taskStartTimeInput?.addEventListener("input", () => {
    if (els.taskStartTimeClearBtn) els.taskStartTimeClearBtn.hidden = !els.taskStartTimeInput.value;
    applyTaskCreateStartDateHint();
  });

  els.taskDueDateBtn?.addEventListener("click", () => {
    const field = "due";
    if (state.taskDialogActiveField === field) {
      renderTaskDatePicker(null);
      state.taskDialogActiveField = null;
    } else {
      renderTaskDatePicker(field);
    }
  });

  els.taskDueDateClearBtn?.addEventListener("click", () => {
    setTaskDialogDate("due", "");
    state.taskDialogActiveField = null;
    renderTaskDatePicker(null);
  });

  els.taskDueTimeClearBtn?.addEventListener("click", () => {
    if (els.taskDueTimeInput) els.taskDueTimeInput.value = "";
    els.taskDueTimeClearBtn.hidden = true;
  });

  els.taskDueTimeInput?.addEventListener("input", () => {
    if (els.taskDueTimeClearBtn) els.taskDueTimeClearBtn.hidden = !els.taskDueTimeInput.value;
  });

  els.taskNotifyChip?.addEventListener("click", () => toggleNotifyChip(els.taskNotifyChip));
  els.taskEditNotifyChip?.addEventListener("click", () => toggleNotifyChip(els.taskEditNotifyChip));

  els.taskCreateCancelBtn?.addEventListener("click", () => {
    els.taskCreateDialog.close("cancel");
  });

  els.taskTitleInput?.addEventListener("keydown", (e) => {
    handleTaskTitleEnter(e, els.taskCreateConfirmBtn);
  });
  els.taskStartTimeInput?.addEventListener("click", () => {
    if (!isTouchPrimaryDevice()) toggleInlineClock("create", "start");
  });
  els.taskDueTimeInput?.addEventListener("click", () => {
    if (!isTouchPrimaryDevice()) toggleInlineClock("create", "due");
  });
  els.taskCreateConfirmBtn?.addEventListener("click", async () => {
    const title = els.taskTitleInput?.value.trim() || "";
    const dueDate = els.taskDueDateBtn?.dataset.date || "";
    const startDate = els.taskStartDateBtn?.dataset.date || "";

    applyTaskCreateStartDateHint();

    if (!dueDate) {
      els.taskDueDateBtn?.focus();
      return;
    }

    els.taskCreateDialog.close("confirm");

    const node = await getOrCreateDailyNote(dueDate);
    const content = await readFileNode(node);
    const prefix = content.endsWith("\n") ? "" : "\n";
    const { kind, category, priority, tags } = state.taskDialogMeta;
    const hashParts = [kind, category, priority, ...tags].filter(Boolean).map((v) => `#${v}`);
    const metaStr = hashParts.length ? ` ${hashParts.join(" ")}` : "";
    const startTime = normalizeTaskTimeInput(els.taskStartTimeInput);
    const dueTime = normalizeTaskTimeInput(els.taskDueTimeInput);
    const startPart = startDate ? ` 🛫 ${startDate}${startTime ? " " + startTime : ""}` : "";
    const duePart = ` 📅 ${dueDate}${dueTime ? " " + dueTime : ""}`;
    const notifyOff = els.taskNotifyChip?.dataset.notify === "false";
    const notifyPart = notifyOff ? " 🔕" : "";
    const subItemsText = els.taskCreateSubItemsInput?.value || "";
    const subItemLines = normalizeTaskSubItemsInput(subItemsText).map((line) => `  ${line}`);
    const taskLine = `${prefix}- [ ] ${title}${metaStr}${startPart}${duePart}${notifyPart}`;
    const subItemsStr = subItemLines.length ? "\n" + subItemLines.join("\n") : "";
    const nextContent = content + taskLine + subItemsStr + "\n";
    await writeNodeContent(node, nextContent, { backup: false, previousContent: content });
    if (typeof node.content === "string") node.content = nextContent;
    if (state.currentPath === node.path) {
      state.currentContent = nextContent;
      if (state.activeView === "note" && !state.editMode) renderCurrentDocument();
    }
    updateTasksForFile(node.path, nextContent);
    refreshRecentFilesCache();
    if (state.activeView === "calendar" && isTaskCalendarKind()) renderCalendar();
    else setTasksDirty();
  });

  els.taskCreateSubItemsInput?.addEventListener("keydown", handleTaskCreateSubItemsEnter);
  els.taskCreateSubItemsInput?.addEventListener("focus", ensureTaskCreateSubItemBullet);
  els.taskCreateSubItemsInput?.addEventListener("input", normalizeTaskCreateSubItemDraft);
  els.taskCreateSubItemsInput?.addEventListener("paste", handleSubItemsPaste);
  els.taskCreateIndentButton?.addEventListener("click", () => adjustTaskCreateSubItemDepth(false));
  els.taskCreateOutdentButton?.addEventListener("click", () => adjustTaskCreateSubItemDepth(true));

  els.taskCreateDialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); els.taskCreateDialog.close("cancel"); }
    if (e.key === "Enter" && e.target === els.taskTitleInput) { e.preventDefault(); els.taskCreateConfirmBtn?.click(); }
  });
}

function bindTaskEditDialog() {
  if (!els.taskEditDialog) return;

  [els.taskEditKindChips, els.taskEditCategoryChips, els.taskEditPriorityChips].forEach((container) => {
    container?.querySelectorAll("[data-meta]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.meta;
        const val = btn.dataset.val;
        state.taskEditMeta[key] = state.taskEditMeta[key] === val ? null : val;
        updateTaskEditMetaUI();
      });
    });
  });

  els.taskEditStartDateBtn?.addEventListener("click", () => {
    const field = "start";
    state.taskEditActiveField = state.taskEditActiveField === field ? null : field;
    renderTaskEditDatePicker(state.taskEditActiveField);
  });

  els.taskEditStartDateClearBtn?.addEventListener("click", () => {
    setTaskEditDate("start", "");
    state.taskEditActiveField = null;
    renderTaskEditDatePicker(null);
  });

  els.taskEditDueDateBtn?.addEventListener("click", () => {
    const field = "due";
    state.taskEditActiveField = state.taskEditActiveField === field ? null : field;
    renderTaskEditDatePicker(state.taskEditActiveField);
  });

  els.taskEditDueDateClearBtn?.addEventListener("click", () => {
    setTaskEditDate("due", "");
    state.taskEditActiveField = null;
    renderTaskEditDatePicker(null);
  });

  els.taskEditStartTimeInput?.addEventListener("click", () => {
    if (!isTouchPrimaryDevice()) toggleInlineClock("edit", "start");
  });

  els.taskEditDueTimeInput?.addEventListener("click", () => {
    if (!isTouchPrimaryDevice()) toggleInlineClock("edit", "due");
  });

  els.taskEditStartTimeInput?.addEventListener("input", () => {
    if (els.taskEditStartTimeClearBtn) els.taskEditStartTimeClearBtn.hidden = !els.taskEditStartTimeInput.value;
    applyTaskEditStartDateHint();
  });

  els.taskEditStartTimeClearBtn?.addEventListener("click", () => {
    if (els.taskEditStartTimeInput) els.taskEditStartTimeInput.value = "";
    els.taskEditStartTimeClearBtn.hidden = true;
  });

  els.taskEditDueTimeInput?.addEventListener("input", () => {
    if (els.taskEditDueTimeClearBtn) els.taskEditDueTimeClearBtn.hidden = !els.taskEditDueTimeInput.value;
  });

  els.taskEditDueTimeClearBtn?.addEventListener("click", () => {
    if (els.taskEditDueTimeInput) els.taskEditDueTimeInput.value = "";
    els.taskEditDueTimeClearBtn.hidden = true;
  });

  els.taskEditChecked?.addEventListener("change", () => {
    if (els.taskEditChecked.checked && els.taskEditDeferred) els.taskEditDeferred.checked = false;
  });
  els.taskEditDeferred?.addEventListener("change", () => {
    if (els.taskEditDeferred.checked && els.taskEditChecked) els.taskEditChecked.checked = false;
  });

  els.taskViewEditBtn?.addEventListener("click", () => {
    setTaskDialogMode("edit");
    els.taskEditDialogTitle?.focus();
    els.taskEditDialogTitle?.select();
  });

  els.taskViewCloseBtn?.addEventListener("click", async () => {
    const task = state.taskEditTask;
    if (task) {
      const checked = els.taskEditChecked?.checked ?? false;
      const deferred = els.taskEditDeferred?.checked ?? false;
      if (checked !== (task.checked ?? false) || deferred !== (task.deferred ?? false)) {
        const dueDate = els.taskEditDueDateBtn?.dataset.date || task.dates?.due || task.dates?.end || task.date || "";
        const startDate = els.taskEditStartDateBtn?.dataset.date || task.dates?.start || "";
        await saveTaskEdit(task, task.text, state.taskEditMeta, dueDate, startDate, checked, task.dueTime || "", task.startTime || "", taskSubItemsToEditableText(task.subItems || []), deferred);
      }
    }
    els.taskEditDialog.close("close");
  });

  els.taskEditCancelBtn?.addEventListener("click", () => {
    els.taskEditDialog.close("cancel");
  });

  els.taskEditDeleteBtn?.addEventListener("click", async () => {
    const task = state.taskEditTask;
    if (!task) return;
    if (!(await appConfirm("태스크를 삭제할까요?", "태스크 삭제"))) return;
    els.taskEditDialog.close("cancel");
    await deleteCalendarTaskLine(task.path, task.line);
  });

  els.taskEditOpenFileBtn?.addEventListener("click", async () => {
    const task = state.taskEditTask;
    els.taskEditDialog.close("open");
    if (task?.path) await openFile(task.path);
  });

  els.taskEditDuplicateBtn?.addEventListener("click", async () => {
    const task = state.taskEditTask;
    if (!task) return;
    els.taskEditDialog.close("cancel");
    const dueDate = task.dates?.due || task.dates?.end || task.date || "";
    const startDate = task.dates?.start || "";
    await showTaskCreateDialog(dueDate, startDate, task);
  });

  els.taskEditDialogTitle?.addEventListener("keydown", (e) => {
    handleTaskTitleEnter(e, els.taskEditConfirmBtn);
  });

  els.taskEditSubItemsInput?.addEventListener("keydown", handleTaskSubItemsEnter);
  els.taskEditSubItemsInput?.addEventListener("focus", ensureTaskEditSubItemBullet);
  els.taskEditSubItemsInput?.addEventListener("input", normalizeTaskEditSubItemDraft);
  els.taskEditSubItemsInput?.addEventListener("paste", handleSubItemsPaste);
  els.taskCreateSubItemsInput?.addEventListener("paste", handleSubItemsPaste);
  els.taskEditIndentButton?.addEventListener("click", () => adjustTaskEditSubItemDepth(false));
  els.taskEditOutdentButton?.addEventListener("click", () => adjustTaskEditSubItemDepth(true));

  els.taskEditConfirmBtn?.addEventListener("click", async () => {
    const title = els.taskEditDialogTitle?.value.trim() || "";
    const dueDate = els.taskEditDueDateBtn?.dataset.date || "";
    const startDate = els.taskEditStartDateBtn?.dataset.date || "";
    const dueTime = normalizeTaskTimeInput(els.taskEditDueTimeInput);
    const startTime = normalizeTaskTimeInput(els.taskEditStartTimeInput);
    const checked = els.taskEditChecked?.checked || false;
    const deferred = els.taskEditDeferred?.checked || false;
    if (!dueDate) { els.taskEditDueDateBtn?.focus(); return; }
    const task = state.taskEditTask;
    if (!task) return;
    const subItemsText = els.taskEditSubItemsInput?.value || "";
    els.taskEditDialog.close("confirm");
    await saveTaskEdit(task, title, state.taskEditMeta, dueDate, startDate, checked, dueTime, startTime, subItemsText, deferred);
  });

  els.taskEditDialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); els.taskEditDialog.close("cancel"); }
    if (e.key === "Enter" && e.target === els.taskEditDialogTitle) { e.preventDefault(); els.taskEditConfirmBtn?.click(); }
    const isView = els.taskEditDialog.querySelector(".task-create-form")?.classList.contains("task-mode-view");
    if (isView && e.key === "e" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      setTaskDialogMode("edit");
      els.taskEditDialogTitle?.focus();
      els.taskEditDialogTitle?.select();
    }
    if (!isView && (e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      els.taskEditConfirmBtn?.click();
    }
  });
}

function handleTaskTitleEnter(event, confirmButton) {
  if (event.key !== "Enter" && event.key !== "NumpadEnter") return;
  if (event.isComposing || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  event.stopPropagation();
  confirmButton?.click();
}

function handleTaskCreateSubItemsEnter(event) {
  if (event.target.readOnly) return;
  if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) {
    event.preventDefault();
    adjustTaskCreateSubItemDepth(event.shiftKey);
    return;
  }
  if (event.key !== "Enter" && event.key !== "NumpadEnter") return;
  if (event.isComposing || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  const textarea = event.currentTarget;
  const { selectionStart, selectionEnd, value } = textarea;
  const line = currentEditorLine(value, selectionStart).text;
  const indent = line.match(/^(\s*)/)?.[1] || "";
  const body = line.slice(indent.length);
  const bullet = body.match(/^[-*+]\s+/)?.[0] || "- ";
  const insertion = `\n${indent}${bullet}`;
  textarea.value = `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionEnd)}`;
  const next = selectionStart + insertion.length;
  textarea.setSelectionRange(next, next);
}

function handleTaskSubItemsEnter(event) {
  if (event.target.readOnly) return;
  if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) {
    event.preventDefault();
    adjustTaskEditSubItemDepth(event.shiftKey);
    return;
  }
  if (event.key !== "Enter" && event.key !== "NumpadEnter") return;
  if (event.isComposing || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  const textarea = event.currentTarget;
  const { selectionStart, selectionEnd, value } = textarea;
  const line = currentEditorLine(value, selectionStart).text;
  const indent = line.match(/^(\s*)/)?.[1] || "";
  const body = line.slice(indent.length);
  const bullet = body.match(/^[-*+]\s+/)?.[0] || "- ";
  const insertion = `\n${indent}${bullet}`;
  textarea.value = `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionEnd)}`;
  const next = selectionStart + insertion.length;
  textarea.setSelectionRange(next, next);
}

function ensureTaskEditSubItemBullet(event) {
  const textarea = event.currentTarget;
  if (textarea.readOnly || textarea.value.trim()) return;
  textarea.value = "- ";
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function normalizeTaskEditSubItemDraft(event) {
  const textarea = event.currentTarget;
  if (textarea.readOnly) return;
  const { value, selectionStart, selectionEnd } = textarea;
  const nextValue = value.replace(/(^|\n)([ \t]*)(?![-*+]\s)(\S)/g, "$1$2- $3");
  if (nextValue === value) return;
  const delta = nextValue.length - value.length;
  textarea.value = nextValue;
  textarea.setSelectionRange(selectionStart + delta, selectionEnd + delta);
}

function adjustTaskEditSubItemDepth(outdent) {
  const textarea = els.taskEditSubItemsInput;
  if (!textarea) return;
  textarea.focus();
  indentSelectedEditorLines(textarea, outdent);
}

function ensureTaskCreateSubItemBullet(event) {
  const textarea = event.currentTarget;
  if (textarea.readOnly || textarea.value.trim()) return;
  textarea.value = "- ";
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function normalizeTaskCreateSubItemDraft(event) {
  const textarea = event.currentTarget;
  if (textarea.readOnly) return;
  const { value, selectionStart, selectionEnd } = textarea;
  const nextValue = value.replace(/(^|\n)([ \t]*)(?![-*+]\s)(\S)/g, "$1$2- $3");
  if (nextValue === value) return;
  const delta = nextValue.length - value.length;
  textarea.value = nextValue;
  textarea.setSelectionRange(selectionStart + delta, selectionEnd + delta);
}

function adjustTaskCreateSubItemDepth(outdent) {
  const textarea = els.taskCreateSubItemsInput;
  if (!textarea) return;
  textarea.focus();
  indentSelectedEditorLines(textarea, outdent);
}

function updateTaskEditMetaUI() {
  const { kind, category, priority, tags } = state.taskEditMeta;
  els.taskEditKindChips?.querySelectorAll("[data-meta='kind']").forEach((b) => b.classList.toggle("active", b.dataset.val === kind));
  els.taskEditCategoryChips?.querySelectorAll("[data-meta='category']").forEach((b) => b.classList.toggle("active", b.dataset.val === category));
  els.taskEditPriorityChips?.querySelectorAll("[data-meta='priority']").forEach((b) => b.classList.toggle("active", b.dataset.val === priority));
  els.taskEditTagChips?.querySelectorAll("[data-meta='tags']").forEach((b) => b.classList.toggle("active", tags.includes(b.dataset.val)));
}

function renderEditTagChips() {
  if (!els.taskEditTagChips) return;
  els.taskEditTagChips.innerHTML = (state.calendarTaskTags || [])
    .map((tag) => `<button type="button" class="task-meta-chip" data-meta="tags" data-val="${escapeAttribute(tag)}">#${escapeHtml(tag)}</button>`)
    .join("");
  els.taskEditTagChips.querySelectorAll("[data-meta='tags']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.val;
      const idx = state.taskEditMeta.tags.indexOf(val);
      if (idx >= 0) state.taskEditMeta.tags.splice(idx, 1);
      else state.taskEditMeta.tags.push(val);
      updateTaskEditMetaUI();
    });
  });
}

function setTaskEditDate(field, value) {
  const btn = field === "start" ? els.taskEditStartDateBtn : els.taskEditDueDateBtn;
  const clearBtn = field === "start" ? els.taskEditStartDateClearBtn : els.taskEditDueDateClearBtn;
  if (!btn) return;
  btn.dataset.date = value || "";
  btn.textContent = value ? formatDateKorean(value) : "";
  btn.classList.toggle("has-date", Boolean(value));
  if (clearBtn) clearBtn.hidden = !value;
}

function renderTaskEditDatePicker(field) {
  if (!els.taskEditDatePickerCal) return;
  if (field) { getClockEl("edit").hidden = true; clockPicker.dialog = null; clockPicker.field = null; }
  if (!field) {
    els.taskEditDatePickerCal.hidden = true;
    els.taskEditDatePickerCal.innerHTML = "";
    return;
  }
  const activeDate = field === "start" ? els.taskEditStartDateBtn?.dataset.date : els.taskEditDueDateBtn?.dataset.date;
  const base = parseDateKey(activeDate) || new Date();
  if (!state.taskEditPickerMonth || field !== state.taskEditActiveField) {
    state.taskEditPickerMonth = new Date(base.getFullYear(), base.getMonth(), 1);
  }
  const month = state.taskEditPickerMonth;
  const year = month.getFullYear();
  const mon = month.getMonth();
  const todayKey = formatDate(new Date());
  const selectedKey = activeDate || "";
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const prevBtn = `<button type="button" class="tpicker-nav" data-tpicker-nav="-1">‹</button>`;
  const nextBtn = `<button type="button" class="tpicker-nav" data-tpicker-nav="1">›</button>`;
  const header = `<div class="tpicker-header">${prevBtn}<span>${year}년 ${mon + 1}월</span>${nextBtn}</div>`;
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"].map((d) => `<span class="tpicker-dow">${d}</span>`).join("");
  let cells = `<span></span>`.repeat(firstDay);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(mon + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cls = ["tpicker-day", key === todayKey ? "today" : "", key === selectedKey ? "selected" : ""].filter(Boolean).join(" ");
    cells += `<button type="button" class="${cls}" data-tpicker-date="${key}">${d}</button>`;
  }
  els.taskEditDatePickerCal.innerHTML = `${header}<div class="tpicker-days">${dayNames}${cells}</div>`;
  els.taskEditDatePickerCal.hidden = false;
  els.taskEditDatePickerCal.querySelectorAll("[data-tpicker-nav]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.taskEditPickerMonth = new Date(year, mon + Number(btn.dataset.tpickerNav), 1);
      renderTaskEditDatePicker(state.taskEditActiveField);
    });
  });
  els.taskEditDatePickerCal.querySelectorAll("[data-tpicker-date]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setTaskEditDate(state.taskEditActiveField, btn.dataset.tpickerDate);
      state.taskEditActiveField = null;
      renderTaskEditDatePicker(null);
    });
  });
}

function setTaskDialogMode(mode) {
  const isView = mode === "view";
  const form = els.taskEditDialog?.querySelector(".task-create-form");
  if (form) form.classList.toggle("task-mode-view", isView);

  if (els.taskEditSubItemsInput) {
    els.taskEditSubItemsInput.readOnly = isView;
    els.taskEditSubItemsInput.hidden = isView;
  }

  // Prepare preview HTML but keep it hidden until layout is measured (prevents
  // images from expanding the dialog before max-height is applied)
  if (els.taskSubItemsPreview) {
    if (isView) els.taskSubItemsPreview.innerHTML = renderSubItemsHtml(state.taskEditTask?.subItems || []);
    els.taskSubItemsPreview.hidden = true;
  }

  [
    els.taskEditStartDateBtn,
    els.taskEditDueDateBtn,
    els.taskEditStartTimeInput,
    els.taskEditDueTimeInput,
    els.taskEditIndentButton,
    els.taskEditOutdentButton,
  ].forEach((el) => { if (el) el.disabled = isView; });

  if (isView) {
    [els.taskEditStartDateClearBtn, els.taskEditDueDateClearBtn,
      els.taskEditStartTimeClearBtn, els.taskEditDueTimeClearBtn]
      .forEach((el) => { if (el) el.hidden = true; });
  } else {
    if (els.taskEditStartDateClearBtn) els.taskEditStartDateClearBtn.hidden = !els.taskEditStartDateBtn?.dataset.date;
    if (els.taskEditDueDateClearBtn) els.taskEditDueDateClearBtn.hidden = !els.taskEditDueDateBtn?.dataset.date;
    if (els.taskEditStartTimeClearBtn) els.taskEditStartTimeClearBtn.hidden = !els.taskEditStartTimeInput?.value;
    if (els.taskEditDueTimeClearBtn) els.taskEditDueTimeClearBtn.hidden = !els.taskEditDueTimeInput?.value;
  }

  if (els.taskEditDialogTitle) els.taskEditDialogTitle.readOnly = isView;
  if (els.taskViewEditBtn) els.taskViewEditBtn.hidden = !isView;
  if (els.taskViewCloseBtn) els.taskViewCloseBtn.hidden = !isView;
  if (els.taskEditCancelBtn) els.taskEditCancelBtn.hidden = isView;
  if (els.taskEditConfirmBtn) els.taskEditConfirmBtn.hidden = isView;

  if (!isView) {
    // Edit mode: restore right column to natural height
    if (els.taskEditSubItems) els.taskEditSubItems.style.maxHeight = "";
  } else {
    // View mode: after showModal() renders the dialog, measure left column height
    // then clamp right column and reveal the preview
    requestAnimationFrame(() => {
      if (window.innerWidth > 768) {
        const leftH = els.taskEditBodyEl?.querySelector(".task-edit-main")?.offsetHeight || 0;
        if (leftH > 0 && els.taskEditSubItems) {
          els.taskEditSubItems.style.maxHeight = leftH + "px";
        }
      }
      if (els.taskSubItemsPreview) {
        els.taskSubItemsPreview.hidden = false;
        hydrateVaultImages(els.taskSubItemsPreview);
      }
    });
  }
}

async function showTaskEditDialog(task) {
  if (!els.taskEditDialog) return;
  state.taskEditTask = task;
  state.taskEditMeta = {
    kind: task.kind || null,
    category: task.category || null,
    priority: task.priority || null,
    tags: [...(task.tags || [])],
  };
  state.taskEditActiveField = null;
  state.taskEditPickerMonth = null;
  if (els.taskEditTitleInput) els.taskEditTitleInput.value = task.text || "";
  if (els.taskEditDialogTitle) els.taskEditDialogTitle.value = task.text || "";
  if (els.taskEditChecked) els.taskEditChecked.checked = task.checked || false;
  if (els.taskEditDeferred) els.taskEditDeferred.checked = task.deferred || false;
  if (els.taskEditStartTimeInput) els.taskEditStartTimeInput.value = task.startTime || "";
  if (els.taskEditStartTimeClearBtn) els.taskEditStartTimeClearBtn.hidden = !task.startTime;
  if (els.taskEditDueTimeInput) els.taskEditDueTimeInput.value = task.dueTime || "";
  if (els.taskEditDueTimeClearBtn) els.taskEditDueTimeClearBtn.hidden = !task.dueTime;
  syncMobileTaskTimePlaceholders();
  renderTaskEditSubItems(task.subItems);
  setTaskEditDate("start", task.dates?.start || "");
  setTaskEditDate("due", task.dates?.due || task.dates?.end || task.date || "");
  renderEditTagChips();
  updateTaskEditMetaUI();
  renderTaskEditDatePicker(null);
  setNotifyChip(els.taskEditNotifyChip, task.notify !== false);
  setTaskDialogMode("view");
  els.taskEditDialog.showModal();
  positionTaskEditDialog();
  const vvEdit = window.visualViewport;
  if (vvEdit) vvEdit.addEventListener("resize", positionTaskEditDialog);
  await new Promise((resolve) => {
    const onClose = () => {
      els.taskEditDialog.removeEventListener("close", onClose);
      if (vvEdit) vvEdit.removeEventListener("resize", positionTaskEditDialog);
      els.taskEditDialog.style.marginTop = "";
      els.taskEditDialog.style.marginBottom = "";
      resolve();
    };
    els.taskEditDialog.addEventListener("close", onClose);
  });
}

function renderTaskEditSubItems(subItems) {
  if (!els.taskEditSubItemsInput) return;
  els.taskEditSubItemsInput.value = taskSubItemsToEditableText(subItems);
}

function taskSubItemsToEditableText(subItems) {
  if (!subItems || !subItems.length) return "";
  return subItems
    .map((item) => {
      const line = String(item || "").replace(/\r\n/g, "\n");
      const indent = line.match(/^(\s*)/)?.[1] || "";
      const body = line.slice(indent.length);
      return /^[-*+]\s+/.test(body) ? `${indent}${body}` : `${indent}- ${body}`;
    })
    .join("\n");
}

function normalizeTaskSubItemsInput(value) {
  return (value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .filter((line) => line.trim())
    .map((line) => {
      const indent = line.match(/^(\s*)/)?.[1] || "";
      const body = line.slice(indent.length);
      return /^[-*+]\s+/.test(body) ? `${indent}${body}` : `${indent}- ${body.replace(/^[-*+]\s*/, "")}`;
    });
}

async function saveTaskEdit(task, title, meta, dueDate, startDate, checked, dueTime = "", startTime = "", subItemsText = "", deferred = false) {
  try {
    const node = state.files.get(task.path);
    if (!node) { alert("파일을 찾을 수 없습니다."); return; }
    const content = await readFileNode(node);
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const idx = task.line - 1;
    if (idx < 0 || idx >= lines.length) { alert("태스크 줄을 찾을 수 없습니다."); return; }
    const indentStr = (lines[idx].match(/^(\s*)/)?.[1]) || "";
    const taskIndentLen = normalizeLineIndent(lines[idx]).length;
    const { kind, category, priority, tags } = meta;
    const hashParts = [kind, category, priority, ...tags].filter(Boolean).map((v) => `#${v}`);
    const metaStr = hashParts.length ? ` ${hashParts.join(" ")}` : "";
    const startPart = startDate ? ` 🛫 ${startDate}${startTime ? " " + startTime : ""}` : "";
    const duePart = ` 📅 ${dueDate}${dueTime ? " " + dueTime : ""}`;
    const notifyOff = els.taskEditNotifyChip?.dataset.notify === "false";
    const notifyPart = notifyOff ? " 🔕" : "";
    const statusChar = checked ? "x" : deferred ? ">" : " ";
    lines[idx] = `${indentStr}- [${statusChar}] ${title}${metaStr}${startPart}${duePart}${notifyPart}`;
    let childEnd = idx + 1;
    while (childEnd < lines.length) {
      if (lines[childEnd].trim() === "") break;
      if (normalizeLineIndent(lines[childEnd]).length <= taskIndentLen) break;
      childEnd += 1;
    }
    const childIndent = `${indentStr}  `;
    const subItemLines = normalizeTaskSubItemsInput(subItemsText).map((line) => `${childIndent}${line}`);
    lines.splice(idx + 1, childEnd - idx - 1, ...subItemLines);
    const newContent = lines.join("\n");
    await writeNodeContent(node, newContent, { backup: false, previousContent: content });
    if (typeof node.content === "string") node.content = newContent;
    if (state.currentPath === node.path) {
      state.currentContent = newContent;
      if (state.activeView === "note" && !state.editMode) renderCurrentDocument();
    }
    updateTasksForFile(task.path, newContent);
  } catch {
    alert("저장에 실패했습니다.");
  }
}

async function getOrCreateDailyNote(date) {
  const dirPath = normalizeDailyNotePath(els.dailyNotePathInput?.value || state.dailyNotePath);
  state.dailyNotePath = dirPath;
  localStorage.setItem("obsidian-web-viewer-daily-note-path", dirPath);
  const path = `${dirPath}/${date}.md`;
  const existing = state.files.get(path);
  if (existing) return existing;

  if (!state.rootHandle && state.serverVaultWritable) {
    const initialContent = `# ${date}\n\n`;
    const metadata = await writeServerFile(path, initialContent, { backup: false });
    ensureDirectoryNodePath(dirPath);
    const node = { name: `${date}.md`, path, content: initialContent, serverBacked: true, kind: "file", ...metadata };
    state.files.set(path, node);
    state.directories.get(dirPath).children.set(node.name, node);
    refreshDirectoryMetadataFrom(path);
    renderTree();
    return node;
  }

  const dirHandle = await getOrCreateDirectoryHandle(dirPath);
  const handle = await dirHandle.getFileHandle(`${date}.md`, { create: true });
  const initialContent = `# ${date}\n\n`;
  await writeFileHandle(handle, initialContent);

  ensureDirectoryNodePath(dirPath);

  const metadata = await readFileMetadata(handle, path);
  const node = { name: `${date}.md`, path, handle, dirHandle, kind: "file", ...metadata };
  state.files.set(path, node);
  state.directories.get(dirPath).children.set(node.name, node);
  refreshDirectoryMetadataFrom(path);
  renderTree();
  return node;
}

async function getOrCreateDirectoryHandle(dirPath) {
  let current = state.rootHandle;
  for (const part of dirPath.split("/").filter(Boolean)) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

function ensureDirectoryNodePath(dirPath) {
  let currentPath = "";
  let parent = state.root;

  dirPath.split("/").filter(Boolean).forEach((part) => {
    const nextPath = currentPath ? `${currentPath}/${part}` : part;
    if (!state.directories.has(nextPath)) {
      const dir = makeDirNode(part, nextPath);
      state.directories.set(nextPath, dir);
      parent.children.set(part, dir);
    }
    parent = state.directories.get(nextPath);
    currentPath = nextPath;
  });
}

function appendTaskTemplate(date, startDate = "") {
  const value = editorValue();
  const prefix = value.endsWith("\n") ? "" : "\n";
  const taskLine = startDate ? `${prefix}- [ ]  🛫 ${startDate} 📅 ${date}` : `${prefix}- [ ]  📅 ${date}`;
  const start = value.length + prefix.length + "- [ ] ".length;
  setEditorValue(value + taskLine);
  focusEditor();
  setEditorCursorIndex(start);
  markEditorDirty();
}

function groupTasksByDate(tasks) {
  const map = new Map();
  tasks.forEach((task) => {
    taskCalendarDates(task).forEach((date) => {
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(task);
    });
  });
  map.forEach((items) => {
    items.sort((a, b) => Number(a.checked) - Number(b.checked) || taskTypeRank(a.type) - taskTypeRank(b.type) || a.text.localeCompare(b.text, "ko"));
  });
  return map;
}

function calendarPreviewTasks() {
  const drag = state.calendarTaskDrag;
  const base = (!drag?.active || !drag.previewDate) ? state.tasks : state.tasks.map((task) => {
    if (task.path !== drag.path || task.line !== drag.line) return task;
    const dates = { ...(task.dates || {}) };
    const moveMode = calendarTaskMoveMode(task, drag.sourceDate);
    if (moveMode === "range-shift") {
      const source = parseDateKey(drag.sourceDate);
      const target = parseDateKey(drag.previewDate);
      const start = parseDateKey(dates.start);
      const end = parseDateKey(dates.end || dates.due);
      if (source && target && start && end) {
        const delta = calendarDayDiff(source, target);
        dates.start = formatDate(addDays(start, delta));
        dates.due = formatDate(addDays(end, delta));
        dates.end = dates.due;
      }
    } else {
      const marker = taskDateMarkerForMove(task, drag.sourceDate);
      if (marker === "\u{1F6EB}") {
        dates.start = drag.previewDate;
      } else if (marker === "\u{23F3}") {
        dates.scheduled = drag.previewDate;
      } else {
        dates.due = drag.previewDate;
        dates.end = drag.previewDate;
      }
    }
    const date = dates.due || dates.end || dates.scheduled || dates.start || drag.previewDate;
    return {
      ...task,
      date,
      dates,
      draggingPreview: true,
      type: dates.due || dates.end ? "due" : dates.scheduled ? "scheduled" : "start",
    };
  });
  return applyCalendarTaskFilters(base);
}

function taskCalendarDates(task) {
  const start = parseDateKey(task.dates?.start);
  const end = parseDateKey(task.dates?.end || task.dates?.due);
  // For done tasks with a start but no explicit end/due, use the done date as the range end.
  const doneEnd = !end && task.checked ? parseDateKey(task.dates?.done) : null;
  const rangeEnd = end || doneEnd;
  if (!start || !rangeEnd) return [task.date].filter(Boolean);

  const from = start <= rangeEnd ? start : rangeEnd;
  const to = start <= rangeEnd ? rangeEnd : start;
  const dates = [];
  for (let current = new Date(from); current <= to; current = addDays(current, 1)) {
    dates.push(formatDate(current));
  }
  return dates.length ? dates : [task.date].filter(Boolean);
}

function taskTypeRank(type) {
  return { due: 0, scheduled: 1, start: 2, done: 3, cancelled: 4 }[type] ?? 9;
}

function groupRecentFilesByDate(files, field) {
  const map = new Map();
  files.forEach((file) => {
    const value = file[field] || 0;
    if (!value) return;
    const date = formatDate(new Date(value));
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(file);
  });
  map.forEach((group) => group.sort((a, b) => (b[field] || 0) - (a[field] || 0)));
  return map;
}

function taskTypeIcon(type) {
  return {
    due: "📅",
    scheduled: "⏳",
    start: "🛫",
    done: "✅",
    cancelled: "❌",
  }[type] || "•";
}

const TAG_EMOJI_MAP = {
  게임: "🎮", 가족: "👨‍👩‍👧", 공부: "📚",
  운동: "💪", 건강: "🏥", 여행: "✈️",
  쇼핑: "🛒", 음식: "🍽️", 영화: "🎬",
  음악: "🎵", 독서: "📖", 취미: "🎨",
  약속: "🤝", 친구: "👥", 데이트: "💕",
  병원: "🏥", 청소: "🧹", 요리: "👨‍🍳",
  스포츠: "⚽", 산책: "🚶", 회의: "📋",
  업무: "💼", 프로젝트: "🗂️", 독서: "📖",
  뉴스: "📰", 일기: "✏️", 쇼핑몰: "🏬",
};

function taskDisplayIcon(task) {
  if (task.tags && task.tags.length > 0) {
    return TAG_EMOJI_MAP[task.tags[0]] || "🏷️";
  }
  if (task.kind === "일정") return '<span class="kind-schedule">🗓</span>';
  if (task.kind === "할일") return '<span class="kind-todo">☑</span>';
  return taskTypeIcon(task.type);
}

function normalizeVaultPath(path) {
  return path.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function normalizeDailyNotePath(path) {
  const normalized = normalizeVaultPath(path || "1. Daily")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  return normalized || "1. Daily";
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date, firstDay) {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (base.getDay() - firstDay + 7) % 7;
  return addDays(base, -diff);
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function calendarDayDiff(from, to) {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86400000);
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function renderMarkdown(source, context = {}) {
  const { frontmatter, body } = extractFrontmatter(source);
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;
  let currentDepth = 0;
  const openHeadings = [];
  const documentPath = context.path || "";

  if (frontmatter) html.push(renderFrontmatter(frontmatter));

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim().split(/\s+/)[0] || "";
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      html.push(renderCodeBlock(code.join("\n"), language, currentDepth));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      while (openHeadings.length && openHeadings[openHeadings.length - 1] >= level) {
        html.push("</details>");
        openHeadings.pop();
      }
      html.push(`<details class="heading-section heading-section-${level}" open><summary><h${level} class="heading-level heading-level-${level}" data-heading-label="h${level}"><span class="heading-text">${renderInline(heading[2])}</span></h${level}></summary>`);
      openHeadings.push(level);
      currentDepth = Math.min(level + 1, 6);
      i += 1;
      continue;
    }

    if (/^#{1,6}\s*$/.test(line)) {
      i += 1;
      continue;
    }

    if (line.startsWith("> [!")) {
      const title = line.replace(/^>\s*\[!(.+?)\]\s*/, "$1 ");
      const bodyLines = [];
      i += 1;
      while (i < lines.length && lines[i].startsWith(">")) {
        bodyLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      html.push(`<div class="callout${depthClass(currentDepth, true)}"><div class="callout-title">${escapeHtml(title.trim())}</div>${renderBlocks(bodyLines, context)}</div>`);
      continue;
    }

    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      html.push(`<blockquote${depthAttribute(currentDepth)}>${renderBlocks(quote, context)}</blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const listLines = [];
      while (i < lines.length && (/^\s*[-*+]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        listLines.push({ line: lines[i], lineNum: i + 1 });
        i += 1;
      }
      html.push(renderNestedListFromLines(listLines, currentDepth, documentPath));
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i]);
        i += 1;
      }
      html.push(renderTable(rows, currentDepth));
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      html.push(`<hr${depthAttribute(currentDepth)}>`);
      i += 1;
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^#{1,6}\s*$/.test(lines[i]) &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("```") &&
      !/^\s*---+\s*$/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    html.push(`<p${depthAttribute(currentDepth)}>${renderInline(paragraph.join(" "))}</p>`);
  }

  while (openHeadings.length) {
    html.push("</details>");
    openHeadings.pop();
  }

  return html.join("\n");
}

function renderListItem(item, path, children = "") {
  const task = item.text.match(/^\[([ xX-])\]\s*(.*)$/);
  if (!task) return `<li>${renderInline(item.text)}${children}</li>`;

  const checked = task[1].toLowerCase() === "x" || task[1] === "-";
  const disabled = path ? "" : " disabled";
  const data = path ? ` data-task-path="${escapeAttribute(path)}" data-task-line="${item.line}"` : "";
  return `
    <li class="task-list-item${checked ? " done" : ""}">
      <label class="task-list-label">
        <input class="task-list-checkbox" type="checkbox"${checked ? " checked" : ""}${disabled}${data}>
        <span>${renderInline(task[2])}</span>
      </label>${children}
    </li>
  `;
}

function getLineIndent(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].replace(/\t/g, "  ").length : 0;
}

function renderNestedListFromLines(listLines, docDepth, path) {
  const items = listLines.map(({ line, lineNum }) => {
    const indent = getLineIndent(line);
    const isOrdered = /^\s*\d+\.\s+/.test(line);
    const text = isOrdered ? line.replace(/^\s*\d+\.\s+/, "") : line.replace(/^\s*[-*+]\s+/, "");
    return { indent, text, isOrdered, lineNum };
  });
  return buildListHtml(items, 0, items.length, path, docDepth, true);
}

function buildListHtml(items, start, end, path, docDepth, isTop) {
  if (start >= end) return "";
  const baseIndent = items[start].indent;
  const tag = items[start].isOrdered ? "ol" : "ul";
  const depthAttr = isTop ? depthAttribute(docDepth) : "";
  let html = `<${tag}${depthAttr}>`;
  let i = start;
  while (i < end) {
    const item = items[i];
    if (item.indent < baseIndent) { i += 1; continue; }
    if (item.indent === baseIndent) {
      let childEnd = i + 1;
      while (childEnd < end && items[childEnd].indent > baseIndent) childEnd += 1;
      const children = childEnd > i + 1 ? buildListHtml(items, i + 1, childEnd, path, docDepth, false) : "";
      html += renderListItem({ text: item.text, line: item.lineNum }, path, children);
      i = childEnd;
    } else {
      i += 1;
    }
  }
  html += `</${tag}>`;
  return html;
}

function bindEmbedCardToggles(root) {
  root.querySelectorAll(".link-embed-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrap = btn.closest(".link-embed-wrap");
      if (!wrap) return;
      const collapsed = wrap.classList.toggle("collapsed");
      btn.textContent = collapsed ? "▸" : "▾";
      btn.title = collapsed ? "펼치기" : "접기";
      btn.setAttribute("aria-expanded", String(!collapsed));
    });
  });
}

function bindRenderedTaskCheckboxes(root) {
  root.querySelectorAll(".task-list-checkbox[data-task-path][data-task-line]").forEach((checkbox) => {
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    checkbox.addEventListener("input", () => {
      const path = checkbox.getAttribute("data-task-path");
      const line = Number(checkbox.getAttribute("data-task-line"));
      if (!path || !Number.isInteger(line)) return;
      state.tasks = state.tasks.map((task) => (task.path === path && task.line === line ? { ...task, checked: checkbox.checked } : task));
      if (state.activeView === "calendar" && isTaskCalendarKind()) renderCalendar();
    });
    checkbox.addEventListener("change", async () => {
      const path = checkbox.getAttribute("data-task-path");
      const line = Number(checkbox.getAttribute("data-task-line"));
      await toggleCalendarTask(path, line, checkbox);
    });
  });
}

function renderEmbedBlock(code) {
  const get = (key) => {
    const m = code.match(new RegExp(`^${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m"));
    return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : "";
  };
  const status = get("status");
  const title = get("title");
  const description = get("description");
  const image = get("image");
  const url = get("url");
  if (!url) return `<pre class="code-block language-text"><code>${escapeHtml(code)}</code></pre>`;
  if (status === "loading") {
    return `<div class="link-embed-wrap">` +
      `<div class="link-embed-card link-embed-loading">` +
      `<div class="link-embed-body">` +
      `<div class="link-embed-title link-embed-fetching">불러오는 중...</div>` +
      `<div class="link-embed-url"><span>${escapeHtml(url)}</span></div>` +
      `</div></div></div>`;
  }
  const favicon = get("favicon");
  const noVisual = !image && !favicon;
  const collapsed = noVisual ? " collapsed" : "";
  const toggleLabel = noVisual ? "펼치기" : "접기";
  const toggleIcon = noVisual ? "▸" : "▾";
  const toggleExpanded = noVisual ? "false" : "true";
  let visualHtml = "";
  if (image) {
    visualHtml = `<div class="link-embed-image" style="background-image:url('${escapeAttribute(image)}')"></div>`;
  } else if (favicon) {
    visualHtml = `<div class="link-embed-favicon-image"><img src="${escapeAttribute(favicon)}" alt="" aria-hidden="true" onerror="this.parentElement.style.display='none'"></div>`;
  }
  return `<div class="link-embed-wrap${collapsed}">` +
    `<button class="link-embed-toggle" type="button" title="${toggleLabel}" aria-expanded="${toggleExpanded}">${toggleIcon}</button>` +
    `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener" class="link-embed-card">` +
    visualHtml +
    `<div class="link-embed-body">` +
    `<div class="link-embed-title">${escapeHtml(title || url)}</div>` +
    (description ? `<div class="link-embed-description">${escapeHtml(description)}</div>` : "") +
    `<div class="link-embed-url"><span>${escapeHtml(url)}</span></div>` +
    `</div></a></div>`;
}

function renderCodeBlock(code, language, depth) {
  if (language === "embed") return renderEmbedBlock(code);
  const normalizedLanguage = codeLanguageAlias(language);
  const depthClassName = depthClass(depth);
  const classes = ["code-block", `language-${normalizedLanguage}`, depthClassName].filter(Boolean).join(" ");
  return `<pre class="${escapeAttribute(classes)}" data-language="${escapeAttribute(normalizedLanguage)}"><code>${highlightCode(code, normalizedLanguage)}</code></pre>`;
}

function codeLanguageAlias(language) {
  const clean = String(language || "text").toLowerCase();
  return {
    ahk: "autohotkey",
    bash: "shell",
    cmd: "batch",
    js: "javascript",
    ps1: "powershell",
    py: "python",
    ts: "typescript",
    yml: "yaml",
  }[clean] || clean || "text";
}

function highlightCode(code, language) {
  const keywordSets = {
    css: "\\b(?:align-items|background|border|color|content|display|font-size|font-weight|gap|grid|height|justify-content|margin|overflow|padding|position|width)\\b",
    html: "\\b(?:DOCTYPE|html|head|body|main|section|article|header|footer|div|span|button|input|script|style|link|meta|class|id)\\b",
    javascript: "\\b(?:const|let|var|function|return|if|else|for|while|class|new|await|async|import|export|from|try|catch|throw|switch|case|break|continue|true|false|null|undefined)\\b",
    typescript: "\\b(?:const|let|var|function|return|if|else|for|while|class|interface|type|new|await|async|import|export|from|try|catch|throw|switch|case|break|continue|true|false|null|undefined|private|public|readonly)\\b",
    python: "\\b(?:def|return|if|elif|else|for|while|class|import|from|as|try|except|raise|with|lambda|True|False|None|async|await|yield|in|is|not|and|or)\\b",
    java: "\\b(?:class|public|private|protected|static|final|void|int|long|double|float|boolean|char|new|return|if|else|for|while|switch|case|break|continue|try|catch|throw|throws|extends|implements|import|package|null|true|false)\\b",
    autohotkey: "\\b(?:if|else|return|class|try|catch|throw|Loop|While|For|In|SetTimer|Send|Click|Sleep|Hotkey|MsgBox|WinActivate|WinWait)\\b",
    shell: "\\b(?:if|then|else|fi|for|while|do|done|case|esac|function|return|export|local|sudo|echo|cd|grep|awk|sed)\\b",
    powershell: "\\b(?:function|param|if|else|elseif|foreach|while|return|try|catch|throw|New-Object|Get-ChildItem|Set-Content|Write-Host)\\b",
  };
  const tokens = [];
  const stash = (className, value) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(`<span class="${className}">${value}</span>`);
    return token;
  };
  const commentPatterns = {
    autohotkey: /(;.*)$/gm,
    java: /(\/\/.*)$/gm,
    javascript: /(\/\/.*)$/gm,
    powershell: /(#.*)$/gm,
    python: /(#.*)$/gm,
    shell: /(#.*)$/gm,
    typescript: /(\/\/.*)$/gm,
  };

  let highlighted = escapeHtml(code)
    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;|`.*?`)/g, (value) => stash("code-string", value));

  if (commentPatterns[language]) {
    highlighted = highlighted.replace(commentPatterns[language], (value) => stash("code-comment", value));
  }

  highlighted = highlighted.replace(new RegExp(keywordSets[language] || "\\b(?:true|false|null)\\b", "g"), '<span class="code-keyword">$&</span>');
  return highlighted.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)] || "");
}

function renderBlocks(lines, context = {}) {
  return renderMarkdown(lines.join("\n"), context);
}

function depthClass(level, includeLeadingSpace = false) {
  if (level < 2) return "";
  return `${includeLeadingSpace ? " " : ""}markdown-depth markdown-depth-${level}`;
}

function depthAttribute(level) {
  const className = depthClass(level);
  return className ? ` class="${className}"` : "";
}

function extractFrontmatter(source) {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { frontmatter: null, body: source };
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) return { frontmatter: null, body: source };
  return {
    frontmatter: normalized.slice(4, end).trim(),
    body: normalized.slice(end + 4).replace(/^\n/, ""),
  };
}

function renderFrontmatter(raw) {
  const rows = raw.split("\n").map((line) => {
    const index = line.indexOf(":");
    if (index === -1) return `<div>${escapeHtml(line)}</div>`;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    const renderedValue = key.toLowerCase() === "source" ? renderSourceFrontmatterValue(value) : escapeHtml(value);
    return `<div class="frontmatter-row"><span class="frontmatter-key">${escapeHtml(key)}</span><span>${renderedValue}</span></div>`;
  });
  return `<details class="frontmatter"><summary>Frontmatter</summary>${rows.join("")}</details>`;
}

function renderSourceFrontmatterValue(value) {
  const cleanValue = stripYamlQuotes(value);
  if (!cleanValue) return "";

  if (/^https?:\/\//i.test(cleanValue)) {
    return `<a class="frontmatter-source" href="${escapeAttribute(cleanValue)}" target="_blank" rel="noreferrer">${escapeHtml(cleanValue)}</a>`;
  }

  const path = resolveVaultPath(cleanValue);
  if (path) {
    return `<a class="frontmatter-source wiki-link" href="#" data-wiki="${escapeAttribute(path)}">${escapeHtml(cleanValue)}</a>`;
  }

  return `<span class="wiki-link missing">${escapeHtml(cleanValue)}</span>`;
}

function stripYamlQuotes(value) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function renderTable(rows, depth = 0) {
  const cells = rows.map(splitTableRow);
  const header = cells[0] || [];
  const body = cells.slice(2);
  return `<table${depthAttribute(depth)}><thead><tr>${header.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function splitTableRow(row) {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInline(input) {
  let text = escapeHtml(input);

  text = text.replace(/!\[\[([^\]]+)\]\]/g, (_, target) => renderEmbed(target));
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const image = resolveMarkdownImage(src);
    if (image.path) {
      return `<img src="${escapeAttribute(image.src)}" data-full-vault-src="${escapeAttribute(image.path)}" alt="${escapeAttribute(alt)}" loading="lazy">`;
    }
    return `<img src="${escapeAttribute(image.src)}" alt="${escapeAttribute(alt)}" loading="lazy">`;
  });
  text = text.replace(/\[\[([^\]]+)\]\]/g, (_, target) => renderWikiLink(target));
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${label}</a>`);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return text;
}

function renderEmbed(rawTarget) {
  const target = rawTarget.split("|")[0].trim();
  const path = resolveVaultPath(target);
  if (!path) return `<span class="wiki-link missing">![[${escapeHtml(rawTarget)}]]</span>`;

  if (isImageDocument(path)) {
    const thumb = getThumbnailUrl(path);
    const cached = thumb || getFileUrl(path);
    const src = cached ? `src="${escapeAttribute(cached)}" data-full-vault-src="${escapeAttribute(path)}"` : `data-vault-src="${escapeAttribute(path)}"`;
    return `<img ${src} alt="${escapeAttribute(target)}" loading="lazy">`;
  }

  if (isOpenableDocument(path)) {
    const node = state.files.get(path);
    if (typeof node?.content === "string") {
      return `<div class="embedded-note">${renderEmbeddedDocumentContent(path, node.content)}</div>`;
    }
    return `<div class="embedded-note embedded-note-loading" data-embed-path="${escapeAttribute(path)}">Preview loading...</div>`;
  }

  return `<a class="wiki-link" href="#" data-wiki="${escapeAttribute(path)}">${escapeHtml(target)}</a>`;
}

function resolveMarkdownImage(src) {
  const cleanSrc = decodeURIComponent(src.trim().replace(/^<|>$/g, "")).split("#")[0];
  if (!cleanSrc || /^(https?:|data:|blob:|\/)/i.test(cleanSrc)) return { src, path: "" };

  const currentDir = state.currentPath?.includes("/") ? state.currentPath.split("/").slice(0, -1).join("/") : "";
  const candidates = [cleanSrc];
  if (currentDir) candidates.unshift(`${currentDir}/${cleanSrc}`);

  for (const candidate of candidates) {
    const path = resolveVaultPath(normalizeVaultPath(candidate));
    if (!path || !isImageDocument(path)) continue;
    return { src: getThumbnailUrl(path) || getFileUrl(path) || src, path };
  }

  return { src, path: "" };
}

function renderWikiLink(rawTarget) {
  const [target, alias] = rawTarget.split("|").map((value) => value.trim());
  const path = resolveVaultPath(target);
  const label = alias || target;
  if (!path) return `<a class="wiki-link missing" href="#" data-wiki-create="${escapeAttribute(target)}">${escapeHtml(label)}</a>`;
  return `<a class="wiki-link" href="#" data-wiki="${escapeAttribute(path)}">${escapeHtml(label)}</a>`;
}

function renderEmbeddedDocumentContent(path, content) {
  if (isExcalidrawDocument(path) && !EXCALIDRAW_PREVIEW_ENABLED) return renderDisabledExcalidrawEmbed(path);
  if (isExcalidrawDocument(path)) return renderExcalidrawPreview(content, path, { embedded: true });
  return renderMarkdown(content, { path });
}

function renderDisabledExcalidrawEmbed(path) {
  const title = displayDocumentTitle(path.split("/").pop() || path);
  return `
    <div class="excalidraw-preview embedded">
      <div class="excalidraw-preview-header">
        <strong>${escapeHtml(title)}</strong>
        <span>Excalidraw preview disabled</span>
      </div>
    </div>
  `;
}

async function hydrateEmbeddedDocuments(root) {
  const embeds = [...root.querySelectorAll("[data-embed-path]")];
  await Promise.all(
    embeds.map(async (embed) => {
      const path = embed.getAttribute("data-embed-path");
      const node = state.files.get(path);
      if (!node) return;
      const content = await readFileNode(node);
      embed.classList.remove("embedded-note-loading");
      embed.removeAttribute("data-embed-path");
      embed.innerHTML = renderEmbeddedDocumentContent(path, content);
      bindWikiLinks(embed);
      bindRenderedTaskCheckboxes(embed);
      hydrateVaultImages(embed);
      hydrateEmbeddedDocuments(embed);
      if (EXCALIDRAW_PREVIEW_ENABLED) hydrateExcalidrawPackagePreviews(embed);
    }),
  );
}

function ensureExcalidrawPreviewModule() {
  if (!excalidrawPreviewModulePromise) {
    ensureExcalidrawPreviewStyles();
    excalidrawPreviewModulePromise = import("./vendor/excalidraw-preview.js");
  }
  return excalidrawPreviewModulePromise;
}

function ensureExcalidrawPreviewStyles() {
  if (document.querySelector('link[data-excalidraw-preview-style="true"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./vendor/excalidraw-preview.css";
  link.dataset.excalidrawPreviewStyle = "true";
  document.head.append(link);
}

async function hydrateExcalidrawPackagePreviews(root) {
  const bodies = [...root.querySelectorAll("[data-excalidraw-preview]")].filter((body) => body.dataset.excalidrawHydrated !== "true");
  if (!bodies.length) return;

  let previewModule;
  try {
    previewModule = await ensureExcalidrawPreviewModule();
  } catch {
    return;
  }

  await Promise.all(
    bodies.map(async (body) => {
      const path = body.getAttribute("data-excalidraw-path") || "";
      let content = "";
      if (path && path === state.currentPath) {
        content = state.currentContent;
      } else {
        const node = path ? state.files.get(path) : null;
        if (!node) return;
        content = await readFileNode(node);
      }

      const scene = extractExcalidrawScene(content);
      if (!scene) return;
      body.dataset.excalidrawHydrated = "true";
      body.classList.add("excalidraw-preview-loading");
      try {
        previewModule.renderExcalidrawPreview(body, scene, {
          path,
          theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
        });
      } catch {
        body.dataset.excalidrawHydrated = "false";
      } finally {
        body.classList.remove("excalidraw-preview-loading");
      }
    }),
  );
}

function renderExcalidrawPreview(content, path, { embedded = false } = {}) {
  const title = displayDocumentTitle(path.split("/").pop() || path);
  const openHref = obsidianOpenHref(path);
  const scene = extractExcalidrawScene(content);
  const body = scene ? renderExcalidrawScene(scene, content) : renderMarkdown(content, { path });
  return `
    <div class="${embedded ? "excalidraw-preview embedded" : "excalidraw-preview"}">
      <div class="excalidraw-preview-header">
        <strong>${escapeHtml(title)}</strong>
        ${openHref ? `<a href="${escapeAttribute(openHref)}">Obsidian에서 열기</a>` : ""}
      </div>
      <div class="excalidraw-preview-body" data-excalidraw-preview data-excalidraw-path="${escapeAttribute(path)}">${body}</div>
    </div>
  `;
}

function extractExcalidrawScene(content) {
  const trimmed = content.trim();
  const candidates = [];
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) candidates.push(trimmed);
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?"elements"\s*:\s*\[[\s\S]*?)```/i);
  if (codeBlock) candidates.push(codeBlock[1].trim());
  const objectStart = content.indexOf("{");
  const objectEnd = content.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) candidates.push(content.slice(objectStart, objectEnd + 1));

  for (const candidate of candidates) {
    try {
      const scene = JSON.parse(candidate);
      if (scene && Array.isArray(scene.elements)) return scene;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function renderExcalidrawScene(scene, originalContent) {
  try {
    const elements = Array.isArray(scene.elements) ? scene.elements : [];
    const svg = renderExcalidrawSvg(elements);
    if (svg) return svg;
    const textElements = elements
      .filter((item) => typeof item.text === "string" && item.text.trim())
      .slice(0, 12)
      .map((item) => `<li>${escapeHtml(item.text.trim())}</li>`)
      .join("");
    return `
      <p class="excalidraw-preview-meta">${elements.length} elements</p>
      ${textElements ? `<ul>${textElements}</ul>` : `<pre><code>${escapeHtml(originalContent.slice(0, 1200))}${originalContent.length > 1200 ? "\n..." : ""}</code></pre>`}
    `;
  } catch {
    return `<pre><code>${escapeHtml(originalContent.slice(0, 1200))}${originalContent.length > 1200 ? "\n..." : ""}</code></pre>`;
  }
}

function renderExcalidrawSvg(elements) {
  const visible = elements.filter((item) => item && !item.isDeleted && Number.isFinite(item.x) && Number.isFinite(item.y));
  if (!visible.length) return "";

  const bounds = excalidrawBounds(visible);
  const padding = 40;
  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`;
  const markup = visible.map(renderExcalidrawElement).filter(Boolean).join("");
  if (!markup) return "";

  return `
    <div class="excalidraw-canvas">
      <svg viewBox="${escapeAttribute(viewBox)}" role="img" aria-label="Excalidraw preview">
        ${markup}
      </svg>
    </div>
  `;
}

function excalidrawBounds(elements) {
  const points = elements.flatMap((item) => {
    const width = Math.abs(Number(item.width) || 0);
    const height = Math.abs(Number(item.height) || 0);
    return [
      [item.x, item.y],
      [item.x + width, item.y + height],
    ];
  });
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function renderExcalidrawElement(element) {
  const x = Number(element.x) || 0;
  const y = Number(element.y) || 0;
  const width = Math.abs(Number(element.width) || 0);
  const height = Math.abs(Number(element.height) || 0);
  const stroke = escapeAttribute(element.strokeColor || "#1e1e1e");
  const fill = element.backgroundColor && element.backgroundColor !== "transparent" ? escapeAttribute(element.backgroundColor) : "none";
  const strokeWidth = Math.max(1, Number(element.strokeWidth) || 1);
  const common = `stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"`;

  if (element.type === "rectangle") return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" ${common} />`;
  if (element.type === "ellipse") return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" ${common} />`;
  if (element.type === "diamond") {
    const points = `${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`;
    return `<polygon points="${escapeAttribute(points)}" ${common} />`;
  }
  if (element.type === "line" || element.type === "arrow") return renderExcalidrawLine(element, common);
  if (element.type === "freedraw" || element.type === "draw") return renderExcalidrawLine(element, common);
  if (element.type === "text") {
    const fontSize = Math.max(10, Number(element.fontSize) || 18);
    const text = escapeHtml(element.text || "");
    return `<text x="${x}" y="${y + fontSize}" fill="${stroke}" font-size="${fontSize}" font-family="inherit">${text}</text>`;
  }
  return "";
}

function renderExcalidrawLine(element, common) {
  const x = Number(element.x) || 0;
  const y = Number(element.y) || 0;
  const points = Array.isArray(element.points) ? element.points : [];
  if (points.length) {
    const polyline = points.map(([px, py]) => `${x + (Number(px) || 0)},${y + (Number(py) || 0)}`).join(" ");
    return `<polyline points="${escapeAttribute(polyline)}" ${common} fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  const width = Number(element.width) || 0;
  const height = Number(element.height) || 0;
  return `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y + height}" ${common} stroke-linecap="round" />`;
}

function obsidianOpenHref(path) {
  if (!state.vaultName || !path) return "";
  const uri = new URL("obsidian://open");
  uri.searchParams.set("vault", state.vaultName);
  uri.searchParams.set("file", path);
  return uri.toString();
}

function resolveVaultPath(target) {
  const cleanTarget = decodeURIComponent(target).replace(/^\/+/, "").split("#")[0];
  const candidates = [cleanTarget, `${cleanTarget}.md`, `${cleanTarget}.excalidraw`, `${cleanTarget}.excalidraw.md`];
  for (const candidate of candidates) {
    if (state.files.has(candidate)) return candidate;
  }

  const basename = cleanTarget
    .split("/")
    .pop()
    .replace(/\.excalidraw\.md$/i, "")
    .replace(/\.excalidraw$/i, "")
    .replace(/\.md$/i, "")
    .toLowerCase();
  return [...state.files.keys()].find((path) => {
    const name = path
      .split("/")
      .pop()
      .replace(/\.excalidraw\.md$/i, "")
      .replace(/\.excalidraw$/i, "")
      .replace(/\.md$/i, "")
      .toLowerCase();
    return name === basename;
  });
}

function bindWikiLinks(root) {
  root.querySelectorAll("[data-wiki]").forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const path = link.getAttribute("data-wiki");
      if (path && isOpenableDocument(path)) await openFile(path);
    });
  });

  root.querySelectorAll("[data-wiki-create]").forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const target = link.getAttribute("data-wiki-create");
      if (!target) return;
      await createAndOpenWikiFile(target);
    });
  });
}

async function createAndOpenWikiFile(target) {
  if (!state.rootHandle && !state.serverVaultWritable) {
    alert("vault를 먼저 열어야 파일을 만들 수 있습니다.");
    return;
  }
  const cleanTarget = target.split("#")[0].trim();
  const hasExtension = /\.[a-z]+$/i.test(cleanTarget);
  const title = hasExtension ? cleanTarget.replace(/\.md$/i, "") : cleanTarget;
  const fileName = hasExtension ? cleanTarget : `${cleanTarget}.md`;

  const currentDir = state.currentPath?.includes("/")
    ? state.currentPath.split("/").slice(0, -1).join("/")
    : "";
  const hasSlash = cleanTarget.includes("/");
  const dirPath = hasSlash
    ? normalizeVaultPath(fileName.split("/").slice(0, -1).join("/"))
    : currentDir;
  const baseName = hasSlash ? fileName.split("/").pop() : fileName;
  const path = dirPath ? `${dirPath}/${baseName}` : baseName;

  if (state.files.has(path)) {
    await openFile(path);
    return;
  }
  await createAndOpenNote(title, dirPath);
}

function arrangeImageGroups(root) {
  root.querySelectorAll("p").forEach((paragraph) => {
    const nodes = [...paragraph.childNodes].filter((node) => node.nodeType !== Node.TEXT_NODE || node.textContent.trim());
    if (nodes.length < 2 || !nodes.every((node) => node.nodeType === Node.ELEMENT_NODE && node.tagName === "IMG")) return;

    const gallery = document.createElement("div");
    gallery.className = "image-grid";
    nodes.forEach((image) => gallery.append(image));
    paragraph.replaceWith(gallery);
  });

  const children = [...root.children];
  let group = [];
  children.forEach((child) => {
    if (child.tagName === "IMG") {
      group.push(child);
      return;
    }
    flushImageGroup(group);
    group = [];
  });
  flushImageGroup(group);
}

function bindImageLightbox(root) {
  root.querySelectorAll("img").forEach((image) => {
    image.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openImageLightbox(image);
    });
  });
}

function flushImageGroup(images) {
  if (images.length < 2) return;
  const gallery = document.createElement("div");
  gallery.className = "image-grid";
  images[0].before(gallery);
  images.forEach((image) => gallery.append(image));
}

function arrangeEmbedGroups(root) {
  const children = [...root.children];
  let group = [];
  children.forEach((child) => {
    if (child.classList.contains("link-embed-wrap")) {
      group.push(child);
      return;
    }
    flushEmbedGroup(group);
    group = [];
    if (child.tagName === "DETAILS" || child.tagName === "BLOCKQUOTE") {
      arrangeEmbedGroups(child);
    }
  });
  flushEmbedGroup(group);
}

function flushEmbedGroup(wraps) {
  if (wraps.length < 2) return;
  const grid = document.createElement("div");
  grid.className = "embed-grid";
  wraps[0].before(grid);
  wraps.forEach((wrap) => grid.append(wrap));
}

function getFileUrl(path) {
  const node = state.files.get(path);
  if (!node || typeof node.content === "string") return "";
  if (node.url) return node.url;
  return state.objectUrls.get(path) || "";
}

async function hydrateVaultImages(root) {
  const images = [...root.querySelectorAll("img[data-vault-src]")];
  images.forEach((image) => {
    const path = image.getAttribute("data-vault-src");
    const thumb = getThumbnailUrl(path);
    if (thumb) {
      image.src = thumb;
      image.setAttribute("data-full-vault-src", path);
      image.removeAttribute("data-vault-src");
      image.classList.add("thumbnail-loaded");
    } else {
      getOrCreateFileUrl(path).then((url) => {
        if (!url) return;
        image.src = url;
        image.removeAttribute("data-vault-src");
      });
    }
  });
}

function getThumbnailUrl(path) {
  const node = state.files.get(path);
  if (!node || !isImageDocument(node.name || path)) return "";
  if (!node.serverBacked && !node.url) return "";
  return `/api/vault-image-thumb?path=${encodeURIComponent(path)}&width=360`;
}

async function getOrCreateFileUrl(path) {
  const node = state.files.get(path);
  if (!node || typeof node.content === "string") return "";
  if (node.url) return node.url;
  const cached = state.objectUrls.get(path);
  if (cached) return cached;
  if (!node.handle) return "";
  const file = await node.handle.getFile();
  const url = URL.createObjectURL(file);
  state.objectUrls.set(path, url);
  return url;
}

function clearObjectUrls() {
  state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.objectUrls.clear();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

// ─── Tab management ───────────────────────────────────────────────────────────

function generateTabId() {
  return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function activeTab() {
  return state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0];
}

function initTabs() {
  const hasOpenTabs = loadOpenTabs();
  _tabsRestoredFromStorage = hasOpenTabs;
  if (!hasOpenTabs) {
    loadPinnedTabs();
  }
  orderTabsByPinnedList(pinnedTabsPayload());
  if (!hasOpenTabs) {
    const firstPinned = state.tabs.find((tab) => tab.pinned && (tab.path || tab.view));
    if (firstPinned) state.activeTabId = firstPinned.id;
  }
  loadRecentlyOpened();
  renderTabStrip();
  void loadPinnedTabsFromVault();
  void loadRecentlyOpenedFromVault();
}

async function createTab(path = null) {
  const id = generateTabId();
  state.tabs.push({ id, path: null, title: "새 탭", pinned: false, scrollTop: 0 });
  await switchTab(id);
  if (path) await openFile(path);
  else showEmptyTab();
}

async function switchTab(id) {
  if (id === state.activeTabId && state.tabs.find((t) => t.id === id)) return;
  if (state.editMode) {
    if (state.editorDirty && !state.autoSaveInFlight) {
      await persistCurrentEdit({ closeEditor: false });
    }
    state.editMode = false;
    els.editorShell.hidden = true;
    els.markdownView.hidden = false;
    stopAutoSave();
    updateEditButtons();
  }
  const cur = activeTab();
  if (cur) cur.scrollTop = els.viewerWrap.scrollTop;
  state.activeTabId = id;
  renderTabStrip();
  updateHistoryButtons();
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab) return;
  if (tab.view === "calendar") {
    state.calendarKind = tab.calendarKind || "tasks";
    if (els.calendarView.children.length > 0) {
      showCalendarView();
    } else {
      showInitialCalendarView();
      if (isTaskCalendarKind(tab.calendarKind || state.calendarKind)) scheduleCalendarRefresh();
    }
  } else if (tab.path && state.files.has(tab.path)) {
    const wasNavigating = state.navigatingHistory;
    state.navigatingHistory = true;
    await openFile(tab.path);
    state.navigatingHistory = wasNavigating;
    requestAnimationFrame(() => { els.viewerWrap.scrollTop = tab.scrollTop || 0; });
  } else {
    showEmptyTab();
  }
}

async function closeTab(id) {
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab) return;
  if (tab.pinned) {
    tab.pinned = false;
    orderTabsByPinnedList(pinnedTabsPayload());
    savePinnedTabsLocal();
    void updatePinnedTabInVault("unpin", tab);
    renderTabStrip();
    return;
  }
  const idx = state.tabs.indexOf(tab);
  state.tabs.splice(idx, 1);
  state.randomSeenByTab.delete(id);
  if (state.tabs.length === 0) {
    state.tabs.push({ id: generateTabId(), path: null, title: "새 탭", pinned: false, scrollTop: 0 });
  }
  if (state.activeTabId === id) {
    const newIdx = Math.max(0, Math.min(idx, state.tabs.length - 1));
    state.activeTabId = null;
    await switchTab(state.tabs[newIdx].id);
  } else {
    renderTabStrip();
  }
}

function pinTab(id) {
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab) return;
  if (!tab.path && !tab.view) return;
  if (tab.pinned) {
    tab.pinned = false;
    orderTabsByPinnedList(pinnedTabsPayload());
    savePinnedTabsLocal();
    void updatePinnedTabInVault("unpin", tab);
  } else {
    moveTabToPinnedTail(tab);
    tab.pinned = true;
    savePinnedTabsLocal();
    state.suppressPinnedReload = Date.now() + 3000;
    void updatePinnedTabInVault("pin", tab);
  }
  renderTabStrip();
  requestAnimationFrame(() => {
    const el = document.querySelector(`.tab-item[data-tab-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

function showNodeContextMenu(x, y, path, isDirectory = false) {
  document.querySelector(".tab-context-menu")?.remove();
  const menu = document.createElement("div");
  menu.className = "tab-context-menu";

  const count = state.selectedPaths.size;
  if (count > 1) {
    const onlyFiles = [...state.selectedPaths].every((p) => !state.directories.has(p));
    menu.innerHTML = `<button type="button" data-action="move">이동하기 (${count}개)</button>${onlyFiles ? `<button type="button" data-action="merge">합치기 (${count}개)</button>` : ""}<button type="button" data-action="delete" class="danger">삭제하기 (${count}개)</button>`;
    menu.querySelector("[data-action='move']").addEventListener("click", () => { menu.remove(); showMoveMultiDialog(); });
    menu.querySelector("[data-action='merge']")?.addEventListener("click", () => { menu.remove(); showMergeDialog([...state.selectedPaths]); });
    menu.querySelector("[data-action='delete']").addEventListener("click", () => { menu.remove(); void deleteSelected(); });
  } else {
    menu.innerHTML = `<button type="button" data-action="move">이동하기</button><button type="button" data-action="delete" class="danger">삭제하기${isDirectory ? " (폴더)" : ""}</button>`;
    menu.querySelector("[data-action='move']").addEventListener("click", () => { menu.remove(); showMoveDialog(path, isDirectory); });
    menu.querySelector("[data-action='delete']").addEventListener("click", () => {
      menu.remove();
      if (isDirectory) void deleteVaultFolder(path);
      else void deleteVaultFileByPath(path);
    });
  }

  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9999;`;
  const dismiss = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("mousedown", dismiss, true); document.removeEventListener("touchstart", dismiss, true); } };
  document.addEventListener("mousedown", dismiss, true);
  document.addEventListener("touchstart", dismiss, true);
  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + "px";
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + "px";
}

function showTabContextMenu(x, y, tabId) {
  document.querySelector(".tab-context-menu")?.remove();
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab) return;
  const menu = document.createElement("div");
  menu.className = "tab-context-menu";
  const hasFile = Boolean(tab.path);
  menu.innerHTML = `<button type="button" data-action="pin">${tab.pinned ? "고정 해제" : "고정하기"}</button>${hasFile ? `<button type="button" data-action="move">이동하기</button>` : ""}<button type="button" data-action="tab-close">탭 닫기</button>${hasFile ? `<button type="button" data-action="delete" class="danger">삭제하기</button>` : ""}`;
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9999;`;
  menu.querySelector("[data-action='pin']").addEventListener("click", () => { menu.remove(); pinTab(tabId); });
  menu.querySelector("[data-action='tab-close']").addEventListener("click", () => { menu.remove(); void closeTab(tabId); });
  menu.querySelector("[data-action='move']")?.addEventListener("click", () => { menu.remove(); showMoveDialog(tab.path); });
  menu.querySelector("[data-action='delete']")?.addEventListener("click", () => { menu.remove(); void deleteVaultFileByPath(tab.path); });
  const dismiss = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("mousedown", dismiss, true); document.removeEventListener("touchstart", dismiss, true); } };
  document.addEventListener("mousedown", dismiss, true);
  document.addEventListener("touchstart", dismiss, true);
  document.body.append(menu);
  // Clamp to viewport
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + "px";
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + "px";
}

const OPEN_TABS_KEY = "obsidian-web-viewer-open-tabs";

function saveOpenTabs() {
  const data = {
    tabs: state.tabs.map((t) => ({ id: t.id, path: t.path, title: t.title, pinned: t.pinned, scrollTop: t.scrollTop, view: t.view || null, calendarKind: t.calendarKind || null })),
    activeTabId: state.activeTabId,
  };
  try { localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(data)); } catch {}
  debouncedSaveOpenTabsToVault();
}

function loadOpenTabs() {
  try {
    const stored = localStorage.getItem(OPEN_TABS_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored);
    if (!data || !Array.isArray(data.tabs)) return false;

    const seen = new Set();
    state.tabs = [];
    data.tabs.forEach((t) => {
      const path = t?.path || null;
      const view = t?.view || null;
      const tabKey = view === "calendar" ? "view:calendar" : path || "empty";
      if (seen.has(tabKey)) return;
      seen.add(tabKey);
      state.tabs.push({
        id: t?.id || generateTabId(),
        path,
        title: t?.title || "새 탭",
        pinned: Boolean(t?.pinned),
        scrollTop: Number(t?.scrollTop) || 0,
        view,
        calendarKind: t?.calendarKind || null,
      });
    });
    if (!state.tabs.length) return false;
    state.activeTabId = data.activeTabId && state.tabs.some((tab) => tab.id === data.activeTabId) ? data.activeTabId : state.tabs[0].id;
    return true;
  } catch { return false; }
}

async function restoreActiveTab() {
  const tab = state.tabs.find((t) => t.id === state.activeTabId);
  if (tab?.view === "calendar") {
    state.calendarKind = tab.calendarKind || "tasks";
    showInitialCalendarView();
  } else if (tab?.path && state.files.has(tab.path)) {
    await openFile(tab.path);
    requestAnimationFrame(() => { els.viewerWrap.scrollTop = tab.scrollTop || 0; });
  } else {
    showInitialCalendarView();
  }
}

function renderTabStrip() {
  const contentPane = document.querySelector(".content-pane");
  if (!contentPane) return;
  let strip = document.querySelector(".tab-strip");
  if (!strip) {
    strip = document.createElement("div");
    strip.className = "tab-strip";
    contentPane.insertBefore(strip, contentPane.firstChild);
    // Mobile: also insert before status bar
    const statusBar = document.querySelector(".app-status-bar");
    if (statusBar && window.matchMedia("(max-width: 780px)").matches) {
      document.body.insertBefore(strip, statusBar);
    }
  }

  const isMobile = window.matchMedia("(max-width: 780px)").matches;
  const sidebarOpen = document.body.classList.contains("sidebar-open");
  const sidebarToggleHtml = !isMobile
    ? `<button class="tab-sidebar-toggle icon-button" type="button" aria-expanded="${sidebarOpen}" aria-label="${sidebarOpen ? "문서 목록 닫기" : "문서 목록 열기"}" title="문서 목록">☰</button>`
    : "";

  const newStripHtml = sidebarToggleHtml + state.tabs.map((tab) => {
    const isActive = tab.id === state.activeTabId;
    const title = escapeHtml(tab.title || "새 탭");
    const pinMark = tab.pinned ? '<span class="tab-pin">📌</span>' : "";
    const draggable = (tab.path && !isMobile) ? ' draggable="true"' : "";
    return `<div class="tab-item${isActive ? " active" : ""}${tab.pinned ? " pinned" : ""}" data-tab-id="${escapeAttribute(tab.id)}" data-tab-path="${escapeAttribute(tab.path || "")}" title="${title}"${draggable}>
      ${pinMark}<span class="tab-title">${title}</span>
      <button class="tab-close" data-tab-id="${escapeAttribute(tab.id)}" title="${tab.pinned ? "핀 해제" : "탭 닫기"}" type="button">×</button>
    </div>`;
  }).join("") + `<button class="tab-new" type="button" title="새 탭 (T)">+</button>`;

  const needsRebuild = strip.dataset.renderedHtml !== newStripHtml;
  if (!needsRebuild) return;
  strip.dataset.renderedHtml = newStripHtml;
  strip.innerHTML = newStripHtml;

  if (!isMobile && els.viewControlsOverlay && els.viewControlsOverlay.parentElement !== strip) {
    strip.appendChild(els.viewControlsOverlay);
  }

  strip.querySelectorAll(".tab-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest(".tab-close")) return;
      if (Date.now() < state.tabDragSuppressUntil) return;
      void switchTab(el.dataset.tabId);
    });
    el.addEventListener("pointerdown", (e) => startTabPointerDrag(e, el));
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showTabContextMenu(e.clientX, e.clientY, el.dataset.tabId);
    });
    let longPressTimer = null;
    el.addEventListener("touchstart", (e) => {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        const touch = e.touches[0];
        showTabContextMenu(touch.clientX, touch.clientY, el.dataset.tabId);
      }, 500);
    }, { passive: true });
    el.addEventListener("touchend", () => { clearTimeout(longPressTimer); longPressTimer = null; });
    el.addEventListener("touchmove", () => { clearTimeout(longPressTimer); longPressTimer = null; });
    if (el.draggable) {
      el.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", el.dataset.tabPath);
        e.dataTransfer.effectAllowed = "copy";
        document.querySelector(".app-shell")?.classList.add("dragging-tab");
      });
      el.addEventListener("dragend", () => {
        document.querySelector(".app-shell")?.classList.remove("dragging-tab");
      });
    }
  });
  strip.querySelectorAll(".tab-close").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      void closeTab(btn.dataset.tabId);
    });
  });
  strip.querySelector(".tab-new")?.addEventListener("click", () => void createTab());
  strip.querySelector(".tab-sidebar-toggle")?.addEventListener("click", () => {
    if (document.body.classList.contains("sidebar-open")) closeSidebar();
    else openSidebar();
  });

  const mobileTabsBtn = document.querySelector(".mobile-tabs-btn");
  if (mobileTabsBtn) mobileTabsBtn.textContent = state.tabs.length;

  requestAnimationFrame(() => {
    const activeEl = strip.querySelector(".tab-item.active");
    if (activeEl) activeEl.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  saveOpenTabs();
}

function startTabPointerDrag(event, element) {
  if (event.pointerType === "mouse" || event.target.closest(".tab-close")) return;
  const tab = state.tabs.find((item) => item.id === element.dataset.tabId);
  if (!tab) return;
  state.tabDrag = {
    pointerId: event.pointerId,
    tabId: tab.id,
    startX: event.clientX,
    startY: event.clientY,
    dragging: false,
  };
  window.addEventListener("pointermove", handleTabPointerMove, { passive: false });
  window.addEventListener("pointerup", stopTabPointerDrag, { passive: false });
  window.addEventListener("pointercancel", stopTabPointerDrag, { passive: false });
}

function handleTabPointerMove(event) {
  const drag = state.tabDrag;
  if (!drag || event.pointerId !== drag.pointerId) return;
  const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
  if (!drag.dragging && distance < 10) return;
  drag.dragging = true;
  event.preventDefault();
  reorderDraggedTab(event.clientX, event.clientY);
}

function stopTabPointerDrag(event) {
  const drag = state.tabDrag;
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (drag.dragging) state.tabDragSuppressUntil = Date.now() + 350;
  state.tabDrag = null;
  window.removeEventListener("pointermove", handleTabPointerMove);
  window.removeEventListener("pointerup", stopTabPointerDrag);
  window.removeEventListener("pointercancel", stopTabPointerDrag);
}

function reorderDraggedTab(x, y) {
  const drag = state.tabDrag;
  if (!drag) return;
  const targetEl = document.elementFromPoint(x, y)?.closest?.(".tab-item");
  if (!targetEl || targetEl.dataset.tabId === drag.tabId) return;
  const targetRect = targetEl.getBoundingClientRect();
  reorderTab(drag.tabId, targetEl.dataset.tabId, x < targetRect.left + targetRect.width / 2);
}

function reorderTab(tabId, targetId, beforeTarget) {
  const from = state.tabs.findIndex((tab) => tab.id === tabId);
  const targetIndex = state.tabs.findIndex((tab) => tab.id === targetId);
  if (from === -1 || targetIndex === -1 || from === targetIndex) return;
  const tab = state.tabs[from];
  const target = state.tabs[targetIndex];
  if (tab.pinned !== target.pinned) return;

  state.tabs.splice(from, 1);
  const adjustedTargetIndex = state.tabs.findIndex((item) => item.id === targetId);
  let insertAt = beforeTarget ? adjustedTargetIndex : adjustedTargetIndex + 1;
  if (!tab.pinned) {
    const pinnedCount = state.tabs.filter((item) => item.pinned).length;
    insertAt = Math.max(insertAt, pinnedCount);
  }
  state.tabs.splice(insertAt, 0, tab);
  if (tab.pinned) {
    savePinnedTabsLocal();
    void savePinnedTabsOrderToVault();
  }
  renderTabStrip();
}

function savePinnedTabsLocal() {
  const pinned = pinnedTabsPayload();
  try { localStorage.setItem("obsidian-web-viewer-pinned-tabs", JSON.stringify(pinned)); } catch {}
}

function pinnedTabsPayload() {
  return state.tabs.filter((t) => t.pinned && (t.path || t.view)).map(serializePinnedTab);
}

function serializePinnedTab(tab) {
  return {
    path: tab.path || "",
    title: tab.title || "",
    view: tab.view || null,
    calendarKind: tab.view === "calendar" ? (tab.calendarKind || state.calendarKind || "tasks") : null,
  };
}

async function updatePinnedTabInVault(action, tab) {
  if (!state.serverVaultWritable) return;
  if (!tab?.path && !tab?.view) return;
  const pinnedTab = serializePinnedTab(tab);
  try {
    await fetch("/api/pinned-tabs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...pinnedTab }),
      cache: "no-store",
    });
  } catch {}
}

async function savePinnedTabsOrderToVault() {
  if (!state.serverVaultWritable) return;
  const pinned = pinnedTabsPayload();
  try {
    await fetch("/api/pinned-tabs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
      cache: "no-store",
    });
  } catch {}
}

function loadPinnedTabs() {
  let pinned = null;
  try {
    const stored = localStorage.getItem("obsidian-web-viewer-pinned-tabs");
    if (stored) pinned = JSON.parse(stored);
  } catch {}
  applyPinnedTabs(pinned || [], { replace: false, render: false });
}

async function loadPinnedTabsFromVault() {
  if (!state.serverVaultWritable) return;
  if (state.suppressPinnedReload && Date.now() < state.suppressPinnedReload) return;
  try {
    const res = await fetch("/api/pinned-tabs", { cache: "no-store" });
    if (!res.ok) return;
    const pinned = await res.json();
    localStorage.setItem("obsidian-web-viewer-pinned-tabs", JSON.stringify(pinned));
    applyPinnedTabs(pinned, { replace: true, render: true });
  } catch {}
}

function applyPinnedTabs(pinned, { replace, render } = { replace: false, render: true }) {
  const normalized = normalizePinnedTabs(pinned);
  const pinnedKeys = new Set(normalized.map(pinnedTabKey));
  const before = tabStateSignature();

  if (replace) {
    for (const tab of state.tabs) {
      if (tab.pinned && !pinnedKeys.has(pinnedTabKey(tab))) tab.pinned = false;
    }
  }

  normalized.forEach((pinnedTab) => {
    let tab = state.tabs.find((item) => pinnedTabKey(item) === pinnedTabKey(pinnedTab));
    if (!tab) {
      tab = {
        id: generateTabId(),
        path: pinnedTab.path || null,
        title: pinnedTab.title || pinnedTabDefaultTitle(pinnedTab),
        pinned: true,
        scrollTop: 0,
        view: pinnedTab.view || null,
        calendarKind: pinnedTab.calendarKind || null,
      };
      state.tabs.push(tab);
    }
    if (tab) {
      tab.pinned = true;
      if (pinnedTab.title) tab.title = pinnedTab.title;
      tab.view = pinnedTab.view || null;
      tab.calendarKind = pinnedTab.calendarKind || null;
    }
  });

  orderTabsByPinnedList(normalized);
  if (!state.tabs.find((tab) => tab.id === state.activeTabId)) state.activeTabId = state.tabs[0]?.id || null;
  savePinnedTabsLocal();
  if (render && tabStateSignature() !== before) renderTabStrip();
}

function normalizePinnedTabs(pinned) {
  const seen = new Set();
  return (Array.isArray(pinned) ? pinned : [])
    .filter((tab) => tab && (typeof tab.path === "string" || tab.view === "calendar"))
    .map((tab) => ({
      path: normalizeVaultPath(tab.path || ""),
      title: tab.title || "",
      view: tab.view === "calendar" ? "calendar" : null,
      calendarKind: ["tasks", "created", "updated", "matrix"].includes(tab.calendarKind) ? tab.calendarKind : null,
    }))
    .filter((tab) => {
      const key = pinnedTabKey(tab);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function pinnedTabKey(tab) {
  if (tab?.view === "calendar") return "view:calendar";
  return tab?.path ? `path:${tab.path}` : "";
}

function pinnedTabDefaultTitle(tab) {
  if (tab?.view === "calendar") return "캘린더";
  return displayDocumentTitle(tab.path.split("/").pop() || tab.path);
}

function orderTabsByPinnedList(pinned) {
  const order = new Map(pinned.map((tab, index) => [pinnedTabKey(tab), index]));
  const pinnedTabs = [];
  const unpinnedTabs = [];
  state.tabs.forEach((tab, index) => {
    tab._tabOrder = index;
    if (tab.pinned) pinnedTabs.push(tab);
    else unpinnedTabs.push(tab);
  });
  pinnedTabs.sort((a, b) => {
    const aKey = pinnedTabKey(a);
    const bKey = pinnedTabKey(b);
    const aOrder = order.has(aKey) ? order.get(aKey) : Number.MAX_SAFE_INTEGER;
    const bOrder = order.has(bKey) ? order.get(bKey) : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder || a._tabOrder - b._tabOrder;
  });
  state.tabs = [...pinnedTabs, ...unpinnedTabs];
  state.tabs.forEach((tab) => { delete tab._tabOrder; });
}

function moveTabToPinnedTail(tab) {
  const from = state.tabs.indexOf(tab);
  if (from === -1) return;
  state.tabs.splice(from, 1);
  const insertAt = state.tabs.findLastIndex((item) => item.pinned) + 1;
  state.tabs.splice(insertAt, 0, tab);
}

function tabStateSignature() {
  return state.tabs.map((tab) => `${tab.id}:${tab.path || ""}:${tab.view || ""}:${tab.calendarKind || ""}:${tab.title || ""}:${tab.pinned ? 1 : 0}`).join("|");
}

function findTabForPath(path) {
  return state.tabs.find((tab) => tab.path === path);
}

function findReusableNewTab() {
  return state.tabs.find((tab) => tab.path === null && !tab.view);
}

async function openFileInNewTab(path) {
  const normalizedPath = normalizeVaultPath(path || "");
  if (!normalizedPath) return;

  const existingTab = findTabForPath(normalizedPath);
  if (existingTab) {
    if (existingTab.id !== state.activeTabId) await switchTab(existingTab.id);
    return;
  }

  const reusableTab = findReusableNewTab();
  if (reusableTab) {
    if (reusableTab.id !== state.activeTabId) await switchTab(reusableTab.id);
    await openFile(normalizedPath);
    return;
  }

  const id = generateTabId();
  state.tabs.push({ id, path: null, title: "새 탭", pinned: false, scrollTop: 0 });
  state.activeTabId = id;
  renderTabStrip();
  await openFile(normalizedPath);
}

function showAllTabsOverlay() {
  const existing = document.querySelector(".all-tabs-overlay");
  if (existing) { existing.remove(); return; }
  const overlay = document.createElement("div");
  overlay.className = "all-tabs-overlay";
  overlay.innerHTML = `<div class="all-tabs-panel">
    <div class="all-tabs-header"><span>열린 탭 (${state.tabs.length})</span><button class="all-tabs-close" type="button">×</button></div>
    <div class="all-tabs-list">${state.tabs.map((tab) =>
      `<button class="all-tabs-item${tab.id === state.activeTabId ? " active" : ""}" data-tab-id="${escapeAttribute(tab.id)}" type="button">
        ${tab.pinned ? "📌 " : ""}${escapeHtml(tab.title || "새 탭")}
      </button>`
    ).join("")}</div>
  </div>`;
  overlay.querySelector(".all-tabs-close")?.addEventListener("click", () => overlay.remove());
  overlay.querySelectorAll(".all-tabs-item").forEach((btn) => {
    btn.addEventListener("click", async () => {
      overlay.remove();
      await switchTab(btn.dataset.tabId);
    });
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
}

const RECENTLY_OPENED_KEY = "obsidian-web-viewer-recently-opened";
const RECENTLY_OPENED_VAULT_PATH = ".viewer-recently-opened.json";
const RECENTLY_OPENED_MAX = 5000;
const DEVICE_TABS_VAULT_PATH = ".viewer-open-tabs.json";
const DEVICE_ID_KEY = "obsidian-web-viewer-device-id";
const DEVICE_TABS_STALE_MS = 24 * 60 * 60 * 1000;
const PINNED_TABS_VAULT_PATH = ".viewer-pinned-tabs.json";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(DEVICE_ID_KEY, id); }
  return id;
}

function getDeviceName() {
  const ua = navigator.userAgent || "";
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  const browser = ua.includes("Edg/") ? "Edge" : ua.includes("Chrome/") ? "Chrome" : ua.includes("Firefox/") ? "Firefox" : ua.includes("Safari/") ? "Safari" : "Browser";
  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
  return `${platform || device} ${browser}`.trim();
}

function debouncedSaveOpenTabsToVault() {
  clearTimeout(_saveDeviceTabsTimer);
  _saveDeviceTabsTimer = setTimeout(() => void saveOpenTabsToVault(), 250);
}

async function saveOpenTabsToVault() {
  if (!state.serverVaultWritable) return;
  const deviceId = getDeviceId();
  const deviceName = getDeviceName();
  const tabs = state.tabs.filter((t) => t.path).map((t) => ({ path: t.path, title: t.title }));
  const openTabs = {
    tabs: state.tabs.map((t) => ({ id: t.id, path: t.path, title: t.title, pinned: t.pinned, scrollTop: t.scrollTop, view: t.view || null, calendarKind: t.calendarKind || null })),
    activeTabId: state.activeTabId,
  };
  try {
    await fetch("/api/device-tabs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, deviceName, tabs, openTabs }),
      cache: "no-store",
    });
  } catch {}
}

async function loadOpenTabsFromVault() {
  if (!state.serverVaultWritable) return;
  try {
    const res = await fetch("/api/device-tabs", { cache: "no-store" });
    if (!res.ok) return;
    const allDeviceTabs = await res.json();
    const deviceId = getDeviceId();
    const myEntry = allDeviceTabs[deviceId];
    if (!myEntry?.openTabs?.tabs?.length) return;
    localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(myEntry.openTabs));
    loadOpenTabs();
  } catch {}
}

function pushRecentlyOpened(path, title) {
  const entry = {
    path,
    title: title || displayDocumentTitle(path.split("/").pop() || path),
    openedAt: Date.now(),
  };
  state.recentlyOpenedPaths = [
    entry,
    ...state.recentlyOpenedPaths.filter((e) => e.path !== path),
  ].slice(0, RECENTLY_OPENED_MAX);
  try { localStorage.setItem(RECENTLY_OPENED_KEY, JSON.stringify(state.recentlyOpenedPaths)); } catch {}
  debouncedSaveRecentlyOpenedToVault();
}

function debouncedSaveRecentlyOpenedToVault() {
  clearTimeout(state.recentlyOpenedSaveTimer);
  state.recentlyOpenedSaveTimer = setTimeout(() => void saveRecentlyOpenedToVault(), 1200);
}

function loadRecentlyOpened() {
  try {
    const stored = localStorage.getItem(RECENTLY_OPENED_KEY);
    if (stored) state.recentlyOpenedPaths = normalizeRecentlyOpenedList(JSON.parse(stored));
  } catch {}
}

async function loadRecentlyOpenedFromVault() {
  if (!state.serverVaultWritable) return;
  try {
    const res = await fetch("/api/vault-file?path=" + encodeURIComponent(RECENTLY_OPENED_VAULT_PATH));
    if (!res.ok) return;
    const data = await res.json();
    const vaultList = normalizeRecentlyOpenedList(JSON.parse(data.content || "[]"));
    if (!vaultList?.length) return;
    const mergedByPath = new Map();
    for (const entry of [...state.recentlyOpenedPaths, ...vaultList]) {
      const existing = mergedByPath.get(entry.path);
      if (!existing || (entry.openedAt || 0) > (existing.openedAt || 0)) {
        mergedByPath.set(entry.path, entry);
      }
    }
    state.recentlyOpenedPaths = [...mergedByPath.values()]
      .sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0))
      .slice(0, RECENTLY_OPENED_MAX);
    try { localStorage.setItem(RECENTLY_OPENED_KEY, JSON.stringify(state.recentlyOpenedPaths)); } catch {}
    debouncedSaveRecentlyOpenedToVault();
    // Re-render new tab page if currently showing one
    if (!state.currentPath && els.newTabPage && !els.newTabPage.hidden) renderNewTabPage();
  } catch {}
}

function normalizeRecentlyOpenedList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      const path = typeof entry === "string" ? entry : entry?.path;
      if (!path) return null;
      const title = typeof entry === "object" && entry?.title ? entry.title : displayDocumentTitle(path.split("/").pop() || path);
      const openedAt = typeof entry === "object" ? Number(entry.openedAt) || 0 : 0;
      return { path, title, openedAt };
    })
    .filter(Boolean)
    .sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0))
    .slice(0, RECENTLY_OPENED_MAX);
}

async function saveRecentlyOpenedToVault() {
  if (!state.serverVaultWritable) return;
  try {
    await fetch("/api/vault-file?path=" + encodeURIComponent(RECENTLY_OPENED_VAULT_PATH), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: JSON.stringify(state.recentlyOpenedPaths, null, 2), backup: false }),
    });
  } catch {}
}

function showEmptyTab() {
  state.currentPath = null;
  state.currentContent = "";
  state.currentNode = null;
  els.markdownView.hidden = true;
  els.editorShell.hidden = true;
  if (els.calendarView) els.calendarView.hidden = true;
  if (els.noteTitleArea) els.noteTitleArea.hidden = true;
  if (els.headingControlsOverlay) els.headingControlsOverlay.hidden = true;
  if (els.viewControlsOverlay) els.viewControlsOverlay.hidden = false;
  els.noteTitle.textContent = "새 탭";
  if (els.notePath) els.notePath.textContent = "";
  updateEditButtons();
  updateHistoryButtons();
  renderNewTabPage();
  if (els.newTabPage) els.newTabPage.hidden = false;
  state.activeView = "note";
  document.documentElement.classList.remove("matrix-mode");
  updateSyncStatus?.();
}

function renderTodayFilesSection() {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();
  const files = [...state.files.values()].filter((n) => n.kind === "file" && isOpenableDocument(n.name));
  const todayCreated = files.filter((n) => n.createdAt >= todayTs).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 30);
  const todayUpdated = files.filter((n) => n.updatedAt >= todayTs && n.createdAt < todayTs).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 30);
  const renderList = (items, kind) => items.length ? `<ul class="new-tab-list">${items.map((n) => `
    <li class="new-tab-item"><button type="button" class="new-tab-file-btn" data-path="${escapeAttribute(n.path)}">
      <span class="new-tab-file-name">${escapeHtml(displayDocumentTitle(n.name))}</span>
      <span class="new-tab-file-path">${escapeHtml(n.path)}</span>
    </button></li>`).join("")}</ul>` : `<p class="new-tab-empty">오늘 ${kind} 파일 없음</p>`;
  if (!todayCreated.length && !todayUpdated.length) return "";
  return `<section class="new-tab-section new-tab-section-today">
    <h3 class="new-tab-section-title"><span aria-hidden="true">☀</span>오늘 활동</h3>
    ${todayCreated.length ? `<h4 class="new-tab-sub-title">새로 만든 파일</h4>${renderList(todayCreated, "생성한")}` : ""}
    ${todayUpdated.length ? `<h4 class="new-tab-sub-title">수정한 파일</h4>${renderList(todayUpdated, "수정한")}` : ""}
  </section>`;
}

function renderNewTabPage() {
  if (!els.newTabPage) return;
  els.newTabPage.innerHTML = `
    <div class="new-tab-content">
      <h2 class="new-tab-title">새 탭</h2>
      ${renderTodayFilesSection()}
      <section class="new-tab-section new-tab-section-device" id="deviceTabsSection">
        <h3 class="new-tab-section-title"><span aria-hidden="true">⇄</span>다른 기기에서 열려있는 탭</h3>
        <p class="new-tab-empty">불러오는 중...</p>
      </section>
    </div>
  `;
  els.newTabPage.querySelectorAll("[data-path]").forEach((btn) => {
    btn.addEventListener("click", () => void openFile(btn.dataset.path));
  });
  void loadAndRenderDeviceTabs();
}

async function loadAndRenderDeviceTabs() {
  const section = document.getElementById("deviceTabsSection");
  if (!section) return;
  const emptyEl = section.querySelector(".new-tab-empty");
  if (!state.serverVaultWritable) {
    if (emptyEl) emptyEl.textContent = "다른 기기에서 열려있는 탭이 없습니다.";
    return;
  }
  try {
    const res = await fetch("/api/device-tabs", { cache: "no-store" });
    if (!res.ok) { if (emptyEl) emptyEl.textContent = "다른 기기에서 열려있는 탭이 없습니다."; return; }
    const allDeviceTabs = await res.json();
    const deviceId = getDeviceId();
    const now = Date.now();
    const localTabPaths = new Set(state.tabs.map((tab) => tab.path).filter(Boolean));
    const otherDevices = Object.entries(allDeviceTabs)
      .filter(([id, e]) => id !== deviceId && now - e.updatedAt <= DEVICE_TABS_STALE_MS && e.tabs?.length)
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt);
    if (!otherDevices.length) {
      if (emptyEl) emptyEl.textContent = "다른 기기에서 열려있는 탭이 없습니다.";
      return;
    }
    section.innerHTML = `
      <h3 class="new-tab-section-title"><span aria-hidden="true">⇄</span>다른 기기에서 열려있는 탭</h3>
      <div class="new-tab-device-list">
        ${otherDevices.map(([id, entry], index) => `
          <section class="new-tab-device-group">
            <h4 class="new-tab-device-title">${escapeHtml(entry.deviceName || `기기 ${index + 1}`)} <span>${escapeHtml(shortDeviceId(id))}</span></h4>
            <ul class="new-tab-list">
              ${(entry.tabs || []).filter((tab) => tab?.path && !localTabPaths.has(tab.path)).map((tab) => `
                <li class="new-tab-item">
                  <button type="button" class="new-tab-file-btn" data-path="${escapeAttribute(tab.path)}">
                    <span class="new-tab-file-name">${escapeHtml(tab.title || tab.path.split("/").pop())}</span>
                    <span class="new-tab-file-path">${escapeHtml(tab.path)}</span>
                  </button>
                </li>
              `).join("")}
            </ul>
          </section>
        `).join("")}
      </div>
    `;
    section.querySelectorAll(".new-tab-file-btn").forEach((btn) => {
      btn.addEventListener("click", () => void openFile(btn.dataset.path));
    });
  } catch {
    const el = section.querySelector(".new-tab-empty");
    if (el) el.textContent = "다른 기기에서 열려있는 탭이 없습니다.";
  }
}

function shortDeviceId(id) {
  return String(id || "").slice(-6).toUpperCase();
}

async function renameCurrentFile(newTitle) {
  const node = state.currentNode;
  if (!node || !node.serverBacked) return;
  const ext = node.name.includes(".") ? node.name.substring(node.name.lastIndexOf(".")) : "";
  const newName = newTitle.replace(/[/\\:*?"<>|]/g, "").trim() + ext;
  if (!newName || newName === node.name) return;
  try {
    const res = await fetch(`/api/vault-file?path=${encodeURIComponent(node.path)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const newPath = data.path;
    state.files.delete(node.path);
    const dir = node.path.includes("/") ? node.path.substring(0, node.path.lastIndexOf("/") + 1) : "";
    node.path = newPath || dir + newName;
    node.name = newName;
    state.files.set(node.path, node);
    state.currentPath = node.path;
    if (typeof node.content === "string") node.content = state.currentContent;
    const tab = activeTab();
    if (tab) { tab.path = node.path; tab.title = displayDocumentTitle(newName); }
    if (tab?.pinned) {
      savePinnedTabsLocal();
      void savePinnedTabsOrderToVault();
    }
    els.noteTitle.textContent = displayDocumentTitle(newName);
    if (els.notePath) els.notePath.textContent = node.path;
    renderTabStrip();
    renderTree();
  } catch {}
}

// ─── Split view ───────────────────────────────────────────────────────────────

function initSplitDropZone() {
  const dropZone = document.querySelector(".split-drop-zone");
  if (!dropZone) return;
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    document.querySelector(".app-shell")?.classList.remove("dragging-tab");
    const path = e.dataTransfer.getData("text/plain");
    if (path) void openInSplitPane(path);
  });
}

async function openInSplitPane(path) {
  const node = state.files.get(path);
  if (!node) return;
  try {
    const content = await readFileNode(node);
    if (!els.splitPane || !els.splitMarkdownView) return;
    els.splitTitle.textContent = displayDocumentTitle(node.name);
    if (isMarkdownDocument(node.name)) {
      els.splitMarkdownView.innerHTML = renderMarkdown(content, { path });
      bindWikiLinks(els.splitMarkdownView);
      void hydrateVaultImages(els.splitMarkdownView);
      void hydrateEmbeddedDocuments(els.splitMarkdownView);
      arrangeImageGroups(els.splitMarkdownView);
      arrangeEmbedGroups(els.splitMarkdownView);
      bindImageLightbox(els.splitMarkdownView);
    } else {
      const pre = document.createElement("pre");
      pre.textContent = content;
      els.splitMarkdownView.replaceChildren(pre);
    }
    els.splitPane.hidden = false;
    document.querySelector(".app-shell")?.classList.add("split-view");
  } catch (err) {
    console.error("split pane open failed", err);
  }
}

function closeSplitPane() {
  if (!els.splitPane) return;
  els.splitPane.hidden = true;
  document.querySelector(".app-shell")?.classList.remove("split-view");
  els.splitMarkdownView.innerHTML = "";
}

// ── Discord Notify List ────────────────────────────────────────────────────

function renderDiscordNotifyList(kind, offsets) {
  const container = kind === "todo" ? els.discordNotifyListTodo : els.discordNotifyListEvent;
  if (!container) return;
  container.innerHTML = "";
  const arr = offsets.length ? offsets : [60];
  arr.forEach((minutes) => addDiscordNotifyRow(kind, minutes));
}

function addDiscordNotifyRow(kind, minutes = 60) {
  const container = kind === "todo" ? els.discordNotifyListTodo : els.discordNotifyListEvent;
  if (!container) return;
  const row = document.createElement("div");
  row.className = "discord-notify-row";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = "43200";
  input.step = "1";
  input.value = String(Math.max(1, Math.round(minutes)));
  input.className = "discord-notify-minutes-input";
  input.addEventListener("input", scheduleSettingsSave);
  const label = document.createElement("span");
  label.className = "discord-notify-unit";
  label.textContent = "분 전";
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "discord-notify-del-btn";
  delBtn.textContent = "×";
  delBtn.addEventListener("click", () => { row.remove(); scheduleSettingsSave(); });
  row.append(input, label, delBtn);
  container.append(row);
}

function getDiscordNotifyOffsets(kind) {
  const container = kind === "todo" ? els.discordNotifyListTodo : els.discordNotifyListEvent;
  if (!container) return [60];
  const inputs = container.querySelectorAll(".discord-notify-minutes-input");
  const result = [];
  inputs.forEach((inp) => {
    const v = Number(inp.value);
    if (Number.isFinite(v) && v > 0) result.push(Math.round(v));
  });
  return result.length ? result : [60];
}

// ── Clipper Rule List ────────────────────────────────────────────────────────

function renderClipperRuleList(rules) {
  const container = els.clipperRuleList;
  if (!container) return;
  container.innerHTML = "";
  rules.forEach(({ urlPattern, label, savePath }) => addClipperRuleRow(urlPattern, label, savePath));
}

function addClipperRuleRow(urlPattern = "", label = "", savePath = "") {
  const container = els.clipperRuleList;
  if (!container) return;
  const row = document.createElement("div");
  row.className = "clipper-rule-row";

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.placeholder = "예: github.com";
  urlInput.value = urlPattern;
  urlInput.className = "clipper-rule-url-input";
  urlInput.addEventListener("input", scheduleSettingsSave);

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.placeholder = "제목 태그";
  labelInput.value = label;
  labelInput.className = "clipper-rule-label-input";
  labelInput.addEventListener("input", scheduleSettingsSave);

  const pathInput = document.createElement("input");
  pathInput.type = "text";
  pathInput.placeholder = "저장 경로";
  pathInput.value = savePath;
  pathInput.className = "clipper-rule-path-input";
  pathInput.addEventListener("input", scheduleSettingsSave);

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "discord-notify-del-btn";
  delBtn.textContent = "×";
  delBtn.addEventListener("click", () => { row.remove(); scheduleSettingsSave(); });

  row.append(urlInput, labelInput, pathInput, delBtn);
  container.append(row);
}

function getClipperRules() {
  const container = els.clipperRuleList;
  if (!container) return [];
  const result = [];
  container.querySelectorAll(".clipper-rule-row").forEach((row) => {
    const urlPattern = row.querySelector(".clipper-rule-url-input")?.value.trim() || "";
    const label = row.querySelector(".clipper-rule-label-input")?.value.trim() || "";
    const savePath = row.querySelector(".clipper-rule-path-input")?.value.trim() || "";
    if (urlPattern) result.push({ urlPattern, label, savePath });
  });
  return result;
}

// ── Discord Fixed Time List ─────────────────────────────────────────────────

function renderDiscordFixedList(kind, times) {
  const container = kind === "todo" ? els.discordFixedListTodo : els.discordFixedListEvent;
  if (!container) return;
  container.innerHTML = "";
  times.forEach((t) => addDiscordFixedRow(kind, t));
}

function addDiscordFixedRow(kind, time = "09:00") {
  const container = kind === "todo" ? els.discordFixedListTodo : els.discordFixedListEvent;
  if (!container) return;
  const row = document.createElement("div");
  row.className = "discord-notify-row";
  const input = document.createElement("input");
  input.type = "time";
  input.value = time;
  input.className = "discord-fixed-time-input";
  input.addEventListener("input", scheduleSettingsSave);
  const label = document.createElement("span");
  label.className = "discord-notify-unit";
  label.textContent = "당일";
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "discord-notify-del-btn";
  delBtn.textContent = "×";
  delBtn.addEventListener("click", () => { row.remove(); scheduleSettingsSave(); });
  row.append(input, label, delBtn);
  container.append(row);
}

function getDiscordFixedTimes(kind) {
  const container = kind === "todo" ? els.discordFixedListTodo : els.discordFixedListEvent;
  if (!container) return [];
  const result = [];
  container.querySelectorAll(".discord-fixed-time-input").forEach((inp) => {
    const v = inp.value.trim();
    if (/^\d{2}:\d{2}$/.test(v)) result.push(v);
  });
  return result;
}

// ── Inline Clock Picker ──────────────────────────────────────────────────────

const clockPicker = {
  dialog: null,   // "create" | "edit"
  field: null,    // "start" | "due"
  mode: "hour",
  hour24: 0,
  minute: 0,
};

function getClockTargetInput() {
  if (clockPicker.dialog === "create") {
    return clockPicker.field === "start" ? els.taskStartTimeInput : els.taskDueTimeInput;
  }
  return clockPicker.field === "start" ? els.taskEditStartTimeInput : els.taskEditDueTimeInput;
}

function getClockEl(dlg) {
  return document.getElementById(dlg === "create" ? "taskClockPickerEl" : "taskEditClockPickerEl");
}

function toggleInlineClock(dlg, field) {
  const el = getClockEl(dlg);
  if (!el) return;

  // 같은 필드 다시 클릭 → 닫기
  if (clockPicker.dialog === dlg && clockPicker.field === field && !el.hidden) {
    el.hidden = true;
    clockPicker.dialog = null;
    clockPicker.field = null;
    return;
  }

  // 날짜 피커가 열려 있으면 닫기
  if (dlg === "create") {
    renderTaskDatePicker(null);
    state.taskDialogActiveField = null;
  } else {
    renderTaskEditDatePicker(null);
    state.taskEditActiveField = null;
  }

  // 다른 다이얼로그의 시계가 열려 있으면 닫기
  getClockEl(dlg === "create" ? "edit" : "create").hidden = true;

  clockPicker.dialog = dlg;
  clockPicker.field = field;
  clockPicker.mode = "hour";

  const input = getClockTargetInput();
  const val = input?.value || "";
  if (val) {
    const [h, m] = val.split(":").map(Number);
    clockPicker.hour24 = isNaN(h) ? 0 : h;
    clockPicker.minute = isNaN(m) ? 0 : Math.round(m / 5) * 5 % 60;
  } else {
    const now = new Date();
    clockPicker.hour24 = now.getHours();
    clockPicker.minute = Math.round(now.getMinutes() / 5) * 5 % 60;
  }

  renderInlineClock(el);
  el.hidden = false;
}

function clockHour12() { return clockPicker.hour24 % 12 || 12; }
function clockIsAM() { return clockPicker.hour24 < 12; }

function renderInlineClock(el) {
  const isHour = clockPicker.mode === "hour";
  const values = isHour
    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const currentVal = isHour ? clockHour12() : clockPicker.minute;
  const selIdx = values.indexOf(currentVal);
  const handAngle = selIdx >= 0 ? (selIdx / 12) * 360 - 180 : -180;

  const nums = values.map((val, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
    const r = 38;
    const x = (50 + Math.cos(angle) * r).toFixed(2);
    const y = (50 + Math.sin(angle) * r).toFixed(2);
    const label = isHour ? String(val) : val.toString().padStart(2, "0");
    const sel = val === currentVal ? " clock-num-sel" : "";
    return `<button class="clock-num${sel}" style="left:${x}%;top:${y}%" data-val="${val}">${label}</button>`;
  }).join("");

  const h12 = clockHour12();
  const mStr = clockPicker.minute.toString().padStart(2, "0");

  el.innerHTML = `
    <div class="clock-picker-header">
      <button class="clock-display-part${isHour ? " clock-part-active" : ""}" data-clock-mode="hour">${h12}</button>
      <span class="clock-sep">:</span>
      <button class="clock-display-part${!isHour ? " clock-part-active" : ""}" data-clock-mode="minute">${mStr}</button>
      <div class="clock-picker-ampm">
        <button class="ampm-btn${clockIsAM() ? " ampm-active" : ""}" data-ampm="am">AM</button>
        <button class="ampm-btn${!clockIsAM() ? " ampm-active" : ""}" data-ampm="pm">PM</button>
      </div>
    </div>
    <div class="clock-face-wrap">
      <div class="clock-face">
        <div class="clock-hand-wrap" style="transform:rotate(${handAngle}deg)"><div class="clock-hand"></div></div>
        <div class="clock-center-dot"></div>
        ${nums}
      </div>
    </div>`;

  el.querySelectorAll("[data-clock-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      clockPicker.mode = btn.dataset.clockMode;
      renderInlineClock(el);
    });
  });

  el.querySelectorAll("[data-ampm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const isAm = btn.dataset.ampm === "am";
      if (isAm && !clockIsAM()) clockPicker.hour24 -= 12;
      if (!isAm && clockIsAM()) clockPicker.hour24 += 12;
      renderInlineClock(el);
    });
  });

  el.querySelectorAll(".clock-num").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = Number(btn.dataset.val);
      if (isHour) {
        const pm = !clockIsAM();
        let h = val === 12 ? 0 : val;
        if (pm) h += 12;
        clockPicker.hour24 = h;
        clockPicker.mode = "minute";
        renderInlineClock(el);
      } else {
        clockPicker.minute = val;
        commitInlineClock(el);
      }
    });
  });
}

function commitInlineClock(el) {
  const input = getClockTargetInput();
  if (input) {
    const h = clockPicker.hour24.toString().padStart(2, "0");
    const m = clockPicker.minute.toString().padStart(2, "0");
    input.value = `${h}:${m}`;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (el) el.hidden = true;
  clockPicker.dialog = null;
  clockPicker.field = null;
}
