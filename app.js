const TASKS_DIRTY_KEY = "obsidian-web-viewer-tasks-dirty";
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
  calendarRefreshing: false,
  calendarCacheState: "empty",
  calendarSyncedAt: 0,
  holidays: new Map(),
  holidayYearsLoaded: new Set(),
  holidayYearsLoading: new Set(),
  holidayRenderTimer: null,
  metadataSyncedAt: 0,
  recentFiles: { updated: [], created: [] },
  calendarKind: "tasks",
  mobileCalendarMode: "agenda",
  calendarRowLimit: 5,
  dailyNotePath: "1. Daily",
  newNotePath: "",
  imageSavePath: "",
  searchExcludePaths: [],
  contentSearchTimer: null,
  contentSearchQuery: "",
  contentSearchMatches: null,
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
  activeTabId: "main",
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
  searchExcludeInput: document.querySelector("#searchExcludeInput"),
  searchStatus: document.querySelector("#searchStatus"),
  taskCreateDialog: document.querySelector("#taskCreateDialog"),
  taskTitleInput: document.querySelector("#taskTitleInput"),
  taskStartDateBtn: document.querySelector("#taskStartDateBtn"),
  taskDueDateBtn: document.querySelector("#taskDueDateBtn"),
  taskDatePickerCal: document.querySelector("#taskDatePickerCal"),
  taskStartTimeInput: document.querySelector("#taskStartTimeInput"),
  taskDueTimeInput: document.querySelector("#taskDueTimeInput"),
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
  taskEditStartDateBtn: document.querySelector("#taskEditStartDateBtn"),
  taskEditDueDateBtn: document.querySelector("#taskEditDueDateBtn"),
  taskEditDatePickerCal: document.querySelector("#taskEditDatePickerCal"),
  taskEditStartTimeInput: document.querySelector("#taskEditStartTimeInput"),
  taskEditDueTimeInput: document.querySelector("#taskEditDueTimeInput"),
  taskEditCancelBtn: document.querySelector("#taskEditCancelBtn"),
  taskEditConfirmBtn: document.querySelector("#taskEditConfirmBtn"),
  taskEditOpenFileBtn: document.querySelector("#taskEditOpenFileBtn"),
  taskEditDeleteBtn: document.querySelector("#taskEditDeleteBtn"),
  taskEditKindChips: document.querySelector("#taskEditKindChips"),
  taskEditCategoryChips: document.querySelector("#taskEditCategoryChips"),
  taskEditPriorityChips: document.querySelector("#taskEditPriorityChips"),
  taskEditTagChips: document.querySelector("#taskEditTagChips"),
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
  vaultStatus: document.querySelector("#vaultStatus"),
  notePath: document.querySelector("#notePath"),
  noteTitle: document.querySelector("#noteTitle"),
  syncStatus: document.querySelector("#syncStatus"),
  viewerWrap: document.querySelector(".viewer-wrap"),
  markdownView: document.querySelector("#markdownView"),
  editorShell: document.querySelector("#editorShell"),
  markdownEditor: document.querySelector("#markdownEditor"),
  editorPreview: document.querySelector("#editorPreview"),
  editorStatus: document.querySelector("#editorStatus"),
  editorImageButton: document.querySelector("#editorImageButton"),
  editorImageInput: document.querySelector("#editorImageInput"),
  calendarView: document.querySelector("#calendarView"),
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
  calendarButton: document.querySelector("#calendarButton"),
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
els.editorImageButton?.addEventListener("click", () => els.editorImageInput?.click());
els.editorImageInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;
  e.target.value = "";
  await uploadImageToEditor(file, file.type);
});
els.imagePathInput?.addEventListener("input", handleImagePathInput);
els.searchExcludeInput?.addEventListener("input", handleSearchExcludeInput);
els.newNoteButton?.addEventListener("click", openNewNote);
els.randomFileButton.addEventListener("click", openRandomMarkdown);
els.calendarButton.addEventListener("click", openNextCalendarKind);
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

  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.code === "KeyN") {
    event.preventDefault();
    event.stopPropagation();
    openNewNote();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key === ",") {
    event.preventDefault();
    event.stopPropagation();
    toggleOptionsMenu();
    return;
  }

  if (isTypingTarget(event.target)) return;

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
    if (event.key.toLowerCase() === "e") {
      event.preventDefault();
      event.stopPropagation();
      enterEditMode();
      return;
    }
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      event.stopPropagation();
      openRandomMarkdown();
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
    void openRandomMarkdown();
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

initTheme();
initOptions();
loadServerSettings();
bindTaskCreateDialog();
bindTaskEditDialog();
updateMarkdownToggleButton();
updateTreeSortDirectionButton();
initSidebarWidth();
initSidebarPin();
loadSavedVaults();
loadSampleVault();
arrangeChromeControls();
updateEditButtons();
handleUrlAction();

function handleUrlAction() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get("action");
  if (action === "new-note") {
    window.history.replaceState(null, "", window.location.pathname);
    window.addEventListener("vaultReady", () => openNewNote(), { once: true });
  }
}

function closeSidebarFromMain(event) {
  if (event.target.closest("button, a, input, textarea, select, summary, details, .loading-overlay")) return;
  closeSidebar();
}

function openSidebar() {
  document.body.classList.add("sidebar-open");
  els.sidebarToggle.setAttribute("aria-expanded", "true");
  els.sidebarToggle.setAttribute("aria-label", "문서 목록 닫기");
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

async function openRandomMarkdown() {
  const randomPrefixes = parsePathList(els.randomPathInput?.value || "");
  const files = [...state.files.keys()].filter((path) => {
    if (!path.toLowerCase().endsWith(".md")) return false;
    return !randomPrefixes.length || randomPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  });
  if (!files.length) return;

  const candidates = files.length > 1 && state.currentPath ? files.filter((path) => path !== state.currentPath) : files;
  const path = candidates[Math.floor(Math.random() * candidates.length)];
  if (state.activeView === "calendar") showNoteView();
  await openFile(path);
  scrollViewerTop();
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
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      hydrateUnavailableVault(payload.error || "Vault API failed");
      return;
    }
    const vault = await response.json();
    hydrateServerVault(vault.name || "vault", vault.files || [], Boolean(vault.writable));
  } catch {
    try {
      const response = await fetch("/api/sample-vault", { cache: "no-store" });
      if (!response.ok) throw new Error("Sample vault API failed");
      const vault = await response.json();
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
    showInitialCalendarView();
    connectSSE();
  }
  loadCalendarCache().finally(scheduleCalendarRefresh);
  loadRecentFilesCache().finally(refreshRecentFilesCache);
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
  els.fileTree.replaceChildren();
  const query = els.searchInput.value;
  const matcher = query.length >= 2 ? createSearchMatcher(query, {
    regexMode: els.regexSearchToggle.checked,
    caseSensitive: els.caseSearchToggle.checked,
  }) : null;
  const folderPaths = parsePathList(els.folderPathInput?.value || "");
  const excludePaths = matcher ? state.searchExcludePaths : [];
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
    state.contentSearchMatches = null;
    state.contentSearchQuery = "";
    window.clearTimeout(state.contentSearchTimer);
    return;
  }
  els.searchStatus.hidden = false;
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
  state.directories.forEach((dir, path) => {
    if (path) dir.collapsed = collapsed;
  });
  renderTree();
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
    if (node.kind === "directory" && node.collapsed && !matcher) group.classList.add("collapsed");

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

    const toggle = document.createElement("span");
    toggle.className = "tree-toggle";
    toggle.textContent = node.kind === "directory" ? (node.collapsed && !matcher ? "›" : "⌄") : "";

    const name = document.createElement("span");
    name.className = "tree-name";
    name.textContent = node.name;

    row.append(toggle, name);
    if (node.kind === "directory") {
      const count = document.createElement("span");
      count.className = "tree-count";
      count.textContent = String(node.fileCount || 0);
      row.append(count);
    }
    row.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (node.kind === "directory") {
        node.collapsed = !node.collapsed;
        renderTree();
      } else if (isOpenableDocument(node.name)) {
        await openFile(node.path);
      }
    });
    group.append(row);

    if (hasContentMatch) {
      const snippet = state.contentSearchMatches.get(node.path);
      const snippetEl = document.createElement("div");
      snippetEl.className = "tree-content-snippet";
      const escaped = state.contentSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      snippetEl.innerHTML = escapeHtml(snippet).replace(new RegExp(`(${escaped})`, "gi"), `<mark>$1</mark>`);
      snippetEl.addEventListener("click", () => openFile(node.path));
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
  if (!(await confirmDiscardEdit())) return;
  const node = state.files.get(path);
  if (!node || !isOpenableDocument(node.name)) return;

  showLoading(`문서 여는 중: ${node.name}`);
  try {
    expandPathToFile(path);
    const content = await readFileNode(node);
    state.currentPath = path;
    state.currentContent = content;
    state.currentNode = node;
    state.editMode = false;
    pushNavigationHistory({ type: "file", path });
    els.notePath.textContent = path;
    els.noteTitle.textContent = displayDocumentTitle(node.name);
    updateEditButtons();
    renderCurrentDocument();
    showNoteView();
    scrollViewerTop();
    renderTree();
  } finally {
    hideLoading();
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
  alert(`${displayDocumentTitle(state.currentNode?.name || state.currentPath)}\n${state.currentPath}`);
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
  const ok = confirm(`파일을 삭제하시겠습니까?\n${state.currentPath}`);
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
    els.notePath.textContent = "문서를 선택하세요";
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
    const response = await fetch(`/api/vault-file?path=${encodeURIComponent(node.path)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("파일을 읽지 못했습니다.");
    const content = await response.text();
    if (isTextVaultFilePath(node.path)) node.content = content;
    return content;
  }
  const file = await node.handle.getFile();
  return file.text();
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
  const savedDailyPath = normalizeDailyNotePath(localStorage.getItem("obsidian-web-viewer-daily-note-path") || state.dailyNotePath);
  state.dailyNotePath = savedDailyPath;
  if (els.dailyNotePathInput) els.dailyNotePathInput.value = savedDailyPath;
  const savedNewNotePath = localStorage.getItem("obsidian-web-viewer-new-note-path") || "";
  state.newNotePath = savedNewNotePath;
  if (els.newNotePathInput) els.newNotePathInput.value = savedNewNotePath;
  const savedImagePath = localStorage.getItem("obsidian-web-viewer-image-path") || "";
  state.imageSavePath = savedImagePath;
  if (els.imagePathInput) els.imagePathInput.value = savedImagePath;
  const savedSearchExclude = localStorage.getItem("obsidian-web-viewer-search-exclude") || "";
  state.searchExcludePaths = parsePathList(savedSearchExclude);
  if (els.searchExcludeInput) els.searchExcludeInput.value = savedSearchExclude;
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
    els.newNoteDialog.addEventListener("close", onClose, { once: true });
    els.newNoteCancelButton.addEventListener("click", onCancel, { once: true });
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
    await openFile(path);
    await enterEditMode();
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
  await openFile(path);
  await enterEditMode();
}

function handleSyncStatusClick() {
  if (state.activeView === "calendar" && state.calendarKind === "tasks") {
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
    const { path, updatedAt } = JSON.parse(e.data);
    const node = state.files.get(path);
    if (node) {
      node.content = undefined;
      node.updatedAt = updatedAt;
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
  setContentFontSize(contentSize, { persist: false });
  setCalendarRowFontSize(rowSize, { persist: false });
  setContentAlign(align, { persist: false });
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
  scheduleSettingsSave();
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

function renderCurrentDocument() {
  els.markdownView.classList.remove("empty-state", "plain-text-mode", "code-document");
  els.editorShell.hidden = true;
  els.markdownView.hidden = false;

  if (isExcalidrawDocument(state.currentPath || "")) {
    if (!EXCALIDRAW_PREVIEW_ENABLED) {
      renderPlainTextDocument(state.currentContent);
      return;
    }
    els.markdownView.innerHTML = renderExcalidrawPreview(state.currentContent, state.currentPath);
    bindWikiLinks(els.markdownView);
    hydrateVaultImages(els.markdownView);
    hydrateEmbeddedDocuments(els.markdownView);
    if (EXCALIDRAW_PREVIEW_ENABLED) hydrateExcalidrawPackagePreviews(els.markdownView);
    return;
  }

  if (state.markdownEnabled) {
    if (!isMarkdownDocument(state.currentPath || "")) {
      renderCodeDocument(state.currentContent, state.currentPath || "");
      return;
    }
    els.markdownView.innerHTML = renderMarkdown(state.currentContent, { path: state.currentPath || "" });
    bindRenderedTaskCheckboxes(els.markdownView);
    bindWikiLinks(els.markdownView);
    arrangeImageGroups(els.markdownView);
    bindImageLightbox(els.markdownView);
    hydrateVaultImages(els.markdownView);
    hydrateEmbeddedDocuments(els.markdownView);
    if (EXCALIDRAW_PREVIEW_ENABLED) hydrateExcalidrawPackagePreviews(els.markdownView);
    return;
  }

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
  requestAnimationFrame(resizeEditorToContent);
  focusEditor();
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

function handleEditorInput() {
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

async function handleEditorPaste(event) {
  if (!state.serverVaultWritable) return;
  const items = event.clipboardData?.items;
  if (!items) return;
  const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"));
  if (!imageItem) return;
  event.preventDefault();
  const blob = imageItem.getAsFile();
  if (!blob) return;
  await uploadImageToEditor(blob, imageItem.type);
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
  els.markdownEditor.style.height = "auto";
  els.markdownEditor.style.height = `${Math.max(els.markdownEditor.scrollHeight, els.viewerWrap.clientHeight - 184)}px`;
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
    const date = taskDateTokenFromText(unorderedTask[4]) || `\u{1F4C5} ${formatDate(new Date())}`;
    const prefix = `${unorderedTask[1]}${unorderedTask[2]} [ ] `;
    return { text: `${prefix}${date}`, cursorOffset: prefix.length };
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
  let changed = false;
  const nextBlock = block
    .split("\n")
    .map((line) =>
      line.replace(/^(\s*[-*+]\s+\[)([ xX])(\])/, (_, head, checked, tail) => {
        changed = true;
        return `${head}${checked.toLowerCase() === "x" ? " " : "x"}${tail}`;
      }),
    )
    .join("\n");

  if (!changed) return;
  textarea.value = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  textarea.setSelectionRange(selectionStart === selectionEnd ? selectionStart : lineStart, selectionStart === selectionEnd ? selectionStart : lineStart + nextBlock.length);
  markEditorDirty();
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
  state.editorDirty = editorValue() !== state.currentContent;
  updateEditorStatus();
}

function updateEditorStatus(prefix = "") {
  const bottomSaveStatus = document.getElementById("bottomSaveStatus");
  if (!state.editMode) {
    if (bottomSaveStatus) bottomSaveStatus.hidden = true;
    return;
  }
  const dirty = state.editorDirty ? "수정됨" : "저장됨";
  els.editorStatus.textContent = `${prefix ? `${prefix} · ` : ""}${state.currentPath} · ${dirty}`;
  if (bottomSaveStatus) {
    bottomSaveStatus.textContent = prefix || dirty;
    bottomSaveStatus.hidden = false;
    bottomSaveStatus.dataset.state = prefix ? "saving" : (state.editorDirty ? "dirty" : "saved");
  }
}

function startAutoSave() {
  stopAutoSave();
  state.autoSaveTimer = window.setInterval(autoSaveCurrentEdit, 10000);
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
  if (els.calendarButton) els.calendarButton.hidden = state.editMode;
  els.markdownToggleButton.disabled = state.editMode;
  els.markdownToggleButton.hidden = state.activeView !== "note";
  if (els.saveEditButton) els.saveEditButton.hidden = true;
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
  const editorToolbar = document.querySelector(".editor-toolbar");
  if (sidebarOptions && els.fullscreenButton && els.fullscreenButton.parentElement !== sidebarOptions) {
    sidebarOptions.insertBefore(els.fullscreenButton, sidebarOptions.querySelector("#themeButton") || sidebarOptions.firstChild);
  }
  if (editorToolbar && els.editorStatus && els.editorStatus.parentElement !== editorToolbar) {
    editorToolbar.insertBefore(els.editorStatus, editorToolbar.firstChild);
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
    statusBar.append(els.notePath, saveStatusEl, els.syncStatus);
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
  if (els.syncStatus && els.syncStatus.parentElement !== statusBar) statusBar.append(els.syncStatus);
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
}

function closeSidebar() {
  if (state.sidebarPinned) return;
  document.body.classList.remove("sidebar-open");
  els.sidebarToggle.setAttribute("aria-expanded", "false");
  els.sidebarToggle.setAttribute("aria-label", "문서 목록 열기");
}

function toggleOptionsMenu(event) {
  event.stopPropagation();
  const open = els.optionsMenu.hidden;
  els.optionsMenu.hidden = !open;
  els.optionsBackdrop.hidden = !open;
  els.optionsButton.setAttribute("aria-expanded", String(open));
}

function closeOptionsMenu() {
  els.optionsMenu.hidden = true;
  els.optionsBackdrop.hidden = true;
  els.optionsButton.setAttribute("aria-expanded", "false");
}

async function confirmDiscardEdit() {
  if (!state.editMode) return true;
  const ok = confirm("저장하지 않은 편집을 저장하고 이동할까요?");
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

function scheduleCalendarRefresh(delay = 0) {
  if (state.calendarRefreshTimer || state.calendarRefreshInFlight) return;
  state.calendarRefreshTimer = window.setTimeout(() => {
    state.calendarRefreshTimer = null;
    refreshCalendarTasks({ showLoading: false });
  }, delay);
}

async function refreshCalendarTasks({ showLoading }) {
  if (state.calendarRefreshInFlight) return;
  if (state.activeView !== "calendar" || state.calendarKind !== "tasks") return;
  state.calendarRefreshInFlight = true;
  const refreshView = state.activeView;
  const refreshKind = state.calendarKind;
  state.calendarRefreshing = true;
  state.calendarCacheState = state.tasks.length ? "stale" : "refreshing";
  updateSyncStatus();

  try {
    const pathPrefixes = parsePathList(els.calendarPathInput.value);
    if (refreshView !== "calendar" || refreshKind !== "tasks" || state.activeView !== "calendar" || state.calendarKind !== "tasks") return;
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

    if (state.activeView !== "calendar" || state.calendarKind !== "tasks") return;
    state.tasks = parsed;
    state.calendarTaskFiles = buildCalendarTaskFileMap(mdFiles);
    state.calendarSyncedAt = Date.now();
    state.calendarCacheState = "fresh";
    saveCalendarCache();
  } finally {
    state.calendarRefreshInFlight = false;
    state.calendarRefreshing = false;
    if (state.activeView === "calendar" && state.calendarKind === "tasks") renderCalendar();
    if (showLoading) hideLoading();
  }
}

function calendarCacheKey() {
  const filter = parsePathList(els.calendarPathInput.value).join(",");
  return `obsidian-web-viewer-calendar:${state.vaultName || "vault"}:${filter || "all"}`;
}

async function loadCalendarCache() {
  const shouldRender = () => state.activeView === "calendar" && state.calendarKind === "tasks";
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
    if (state.activeView === "calendar" && state.calendarKind !== "tasks") renderCalendar();
  } catch {
    // Metadata cache is best-effort.
  }
}

async function refreshRecentFilesCache() {
  state.recentFiles = buildRecentFiles();
  state.metadataSyncedAt = Date.now();
  if (state.activeView === "calendar" && state.calendarKind !== "tasks") renderCalendar();
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
  els.markdownView.hidden = false;
  els.editorShell.hidden = true;
  els.calendarView.hidden = true;
  els.calendarButton.classList.remove("active");
  updateCalendarKindButton();
  updateSyncStatus();
  updateEditButtons();
}

function showCalendarView() {
  state.activeView = "calendar";
  updateCalendarTitle();
  els.markdownView.hidden = true;
  els.editorShell.hidden = true;
  els.calendarView.hidden = false;
  els.calendarButton.classList.add("active");
  updateCalendarKindButton();
  els.editButton.disabled = true;
  updateEditButtons();
}

function updateCalendarKindButton() {
  if (!els.calendarButton) return;
  if (state.activeView !== "calendar" || state.calendarKind === "tasks") {
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
  if (state.calendarKind === "tasks") {
    els.notePath.textContent = pathPrefixes.length ? `calendar: ${pathPrefixes.join(", ")}` : "calendar: vault";
    els.noteTitle.textContent = "Tasks Calendar";
  } else {
    els.notePath.textContent = `calendar: ${calendarTitle()}`;
    els.noteTitle.textContent = state.calendarKind === "created" ? "최근 생성 파일" : "최근 수정 파일";
  }
  updateSyncStatus();
}

function normalizeLineIndent(line) {
  return (line.match(/^(\s*)/)?.[1] || "").replace(/\t/g, "  ");
}

function parseTasks(content, path) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  return lines.flatMap((line, index) => {
      const taskIndentLen = normalizeLineIndent(line).length;
      const match = line.match(/^\s*[-*+]\s+\[([ xX-])\]\s*(.*)$/);
      if (!match) return [];

      const checked = match[1].toLowerCase() === "x" || match[1] === "-";
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
      for (let i = index + 1; i < lines.length; i++) {
        const subLine = lines[i];
        if (subLine.trim() === "") break;
        const subIndent = normalizeLineIndent(subLine).length;
        if (subIndent <= taskIndentLen) break;
        subItems.push(subLine.trim());
      }

      const meta = extractTaskMeta(rawText);
      const dueTime = findTaskTime(rawText, "📅");
      const startTime = findTaskTime(rawText, "🛫");
      return [
        {
          path,
          line: index + 1,
          checked,
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
    .replace(/#[\p{L}\p{N}_/-]+/gu, "")
    .trim();
}

function findTaskTime(text, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}\\s*\\d{4}-\\d{2}-\\d{2}\\s+(\\d{2}:\\d{2})`, "u"));
  return match ? match[1] : null;
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
  const activeCount = types.length + categories.length + tags.length + priorities.length;
  const hasActive = activeCount > 0;
  const isOpen = state.calendarFilterOpen;
  const groupsHtml = groups.map((g, i) =>
    `${i > 0 ? '<span class="filter-group-sep" aria-hidden="true"></span>' : ""}<div class="filter-group"><span class="filter-label">${g.label}</span><div class="filter-chips">${g.chips}</div></div>`
  ).join("");
  return `<div class="calendar-filter-bar${isOpen ? " open" : ""}">
    <button class="filter-bar-toggle" type="button" data-filter-toggle>
      <span>필터</span>${hasActive ? `<span class="filter-active-badge">${activeCount}</span>` : ""}<span class="filter-toggle-arrow">${isOpen ? "▲" : "▼"}</span>
    </button>
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
        <div class="calendar-month-nav">
          <button type="button" data-calendar-action="prev">&lt;</button>
          <strong>${calendarTitle()}</strong>
          <button type="button" data-calendar-action="next">&gt;</button>
        </div>
        <button class="calendar-today-button" type="button" data-calendar-action="today">Today</button>
        <div class="calendar-mode-switch" aria-label="Calendar view">
          <button type="button" data-calendar-mode="month" class="${state.calendarMode === "month" ? "active" : ""}">30d</button>
          <button type="button" data-calendar-mode="week" class="${state.calendarMode === "week" ? "active" : ""}">7d</button>
          <button type="button" data-calendar-mode="day" class="${state.calendarMode === "day" ? "active" : ""}">1d</button>
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

function scrollAgendaToToday() {
  const todayEl = els.calendarView.querySelector(".calendar-agenda-day.today");
  if (todayEl) todayEl.scrollIntoView({ behavior: "instant", block: "start" });
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
  const cell = els.calendarView.querySelector(".calendar-cell");
  const day = els.calendarView.querySelector(".calendar-day");
  const tasks = els.calendarView.querySelector(".calendar-tasks");
  if (!cell || !day || !tasks) return;
  const styles = getComputedStyle(cell);
  const tasksStyles = getComputedStyle(tasks);
  const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  const dayHeight = day.offsetHeight + parseFloat(getComputedStyle(day).marginBottom || 0);
  const available = Math.max(0, cell.clientHeight - verticalPadding - dayHeight);
  const gap = parseFloat(tasksStyles.rowGap || tasksStyles.gap || 0);
  const rowHeight = window.matchMedia("(max-width: 780px)").matches ? 13 : 21;
  const nextLimit = Math.max(1, Math.min(5, Math.floor((available + gap) / (rowHeight + gap))));
  if (nextLimit !== state.calendarRowLimit) {
    state.calendarRowLimit = nextLimit;
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

  if (state.activeView !== "calendar" || state.calendarKind !== "tasks") {
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
  const wikiEmbed = content.match(/^!\[\[([^\]]+)\]\]$/);
  if (wikiEmbed) {
    const target = wikiEmbed[1].split("|")[0].trim();
    const filePath = resolveVaultPath(target);
    if (filePath && isImageDocument(filePath)) {
      const src = `/api/vault-image-thumb?path=${encodeURIComponent(filePath)}&width=240`;
      return `<img class="task-sub-img" src="${escapeAttribute(src)}" alt="${escapeAttribute(target)}" loading="lazy">`;
    }
    return `<span>${escapeHtml(content)}</span>`;
  }
  const mdImg = content.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (mdImg) {
    return `<img class="task-sub-img" src="${escapeAttribute(mdImg[2])}" alt="${escapeAttribute(mdImg[1])}" loading="lazy">`;
  }
  return `<span>${escapeHtml(content)}</span>`;
}

function renderSubItemsHtml(subItems) {
  if (!subItems || !subItems.length) return "";
  return subItems.map((item) => {
    const listItem = item.match(/^[-*+]\s+(.*)$/);
    if (listItem) {
      const content = listItem[1].trim();
      const rendered = renderSubItemContent(content);
      if (rendered.startsWith("<img")) return rendered;
      return `<div class="task-sub-bullet"><span>•</span>${rendered}</div>`;
    }
    const rendered = renderSubItemContent(item);
    if (rendered.startsWith("<img")) return rendered;
    return `<div class="task-sub-text">${rendered}</div>`;
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
      <button class="calendar-task ${task.checked ? "done" : ""} ${task.type} ${range ? `range-task ${colorClass}` : ""} ${task.draggingPreview ? "drag-preview" : ""}" type="button" data-path="${escapeAttribute(task.path)}" data-line="${task.line}" data-date="${escapeAttribute(dateKey)}" title="${escapeAttribute(title)}">
        <span>${icon}</span>
        <span>${escapeHtml(task.text)}${task.dueTime ? `<span class="task-time-badge">${escapeHtml(task.dueTime)}</span>` : task.startTime ? `<span class="task-time-badge">${escapeHtml(task.startTime)}</span>` : ""}</span>
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
      if (action === "today") state.calendarDate = new Date();
      renderCalendar();
      if (action === "today") requestAnimationFrame(scrollAgendaToToday);
    });
  });

  els.calendarView.querySelectorAll("[data-calendar-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarMode = button.getAttribute("data-calendar-mode") || "month";
      renderCalendar();
    });
  });

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

  els.calendarView.querySelector("[data-filter-toggle]")?.addEventListener("click", () => {
    state.calendarFilterOpen = !state.calendarFilterOpen;
    const bar = els.calendarView.querySelector(".calendar-filter-bar");
    const arrow = els.calendarView.querySelector(".filter-toggle-arrow");
    if (bar) bar.classList.toggle("open", state.calendarFilterOpen);
    if (arrow) arrow.textContent = state.calendarFilterOpen ? "▲" : "▼";
  });

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
        else await openFile(path);
      } else if (path) {
        await openFile(path);
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
      if (!confirm(`"${filePath.split("/").pop()}" 파일을 삭제할까요?`)) return;
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
    lines.splice(idx, 1);
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
    if (state.currentPath === filePath) {
      state.currentPath = "";
      state.currentContent = "";
      state.currentNode = null;
      els.markdownView.innerHTML = "<h3>파일이 삭제됐습니다.</h3>";
    }
    renderTree();
    renderCalendar();
  } catch {
    alert("삭제에 실패했습니다.");
  }
}

function shiftCalendarDate(direction) {
  if (state.calendarMode === "day") return addDays(state.calendarDate, direction);
  if (state.calendarMode === "week") return addDays(state.calendarDate, direction * 7);
  return addMonths(state.calendarDate, direction);
}

function moveCalendarByScroll(direction) {
  state.calendarDate = shiftCalendarDate(direction);
  renderCalendar();
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
    } else if (state.activeView === "calendar" && state.calendarKind === "tasks") {
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
    if (state.activeView === "calendar" && state.calendarKind === "tasks") renderCalendar();
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
  } else if (state.activeView === "calendar" && state.calendarKind === "tasks") {
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
  if (state.activeView === "calendar" && state.calendarKind === "tasks") renderCalendar();
}

function updateCalendarTaskDragPreview(x, y) {
  const drag = state.calendarTaskDrag;
  if (!drag) return;
  const date = calendarDateFromPoint(x, y);
  if (date === drag.previewDate) return;
  drag.previewDate = date;
  if (state.activeView === "calendar" && state.calendarKind === "tasks") renderCalendar();
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
  if (state.activeView === "calendar" && state.calendarKind === "tasks") renderCalendar();

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
  if (!lines[index] || !/^\s*[-*+]\s+\[[ xX-]\]/.test(lines[index])) return;

  const taskDate = formatDate(new Date());
  const nextLine = lines[index].replace(/^(\s*[-*+]\s+\[)([ xX-])(\])(.*)$/, (_, head, currentChecked, tail, rest) => {
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
    } else {
      renderCurrentDocument();
    }
  }

  if (state.activeView === "calendar" && state.calendarKind === "tasks") renderCalendar();
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
    } else {
      renderCurrentDocument();
    }
  }

  if (state.activeView === "calendar" && state.calendarKind === "tasks") renderCalendar();
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
  if (!startKey || !endKey || !sourceDate || startKey === endKey) return "single";
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
    if (state.calendarDragPointer?.agenda) {
      const dx = event.clientX - state.calendarDragPointer.x;
      const dy = event.clientY - state.calendarDragPointer.y;
      if (Math.abs(dy) > CALENDAR_DRAG_DISTANCE && Math.abs(dy) > Math.abs(dx)) {
        clearCalendarDragState();
        return;
      }
    }
    event.preventDefault();
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-calendar-date]");
    const date = cell?.getAttribute("data-calendar-date") || "";
    if (!date || date === state.calendarDragCurrentDate) return;
    state.calendarDragCurrentDate = date;
    updateCalendarDragHighlight();
  });

  target.addEventListener("pointerup", async (event) => {
    if (event.target.closest(".calendar-task, .calendar-more, .agenda-delete-btn")) return;
    target.releasePointerCapture?.(event.pointerId);
    clearLongPress();
    const startDate = state.calendarDragStartDate;
    const endDate = state.calendarDragCurrentDate || target.getAttribute("data-calendar-date") || "";
    state.calendarDragPointer = null;
    state.calendarDragStartDate = "";
    state.calendarDragCurrentDate = "";
    clearCalendarDragHighlight();
    if (startDate && endDate && startDate !== endDate) {
      state.calendarDragHandled = true;
      await openDateEditor(startDate, endDate);
      window.setTimeout(() => {
        state.calendarDragHandled = false;
      }, 0);
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

async function showTaskCreateDialog(dueDate, startDate = "") {
  if (!els.taskCreateDialog) return;

  // reset state
  state.taskDialogActiveField = null;
  state.taskDialogMeta = { kind: "할일", category: null, priority: null, tags: [] };
  if (els.taskTitleInput) els.taskTitleInput.value = "";
  if (els.taskStartTimeInput) els.taskStartTimeInput.value = "";
  if (els.taskDueTimeInput) els.taskDueTimeInput.value = "";
  setTaskDialogDate("due", dueDate);
  setTaskDialogDate("start", startDate);
  renderTaskDatePicker(null);
  renderDialogTagChips();
  updateTaskDialogMetaUI();

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
  if (!btn) return;
  btn.dataset.date = value || "";
  btn.textContent = value ? formatDateKorean(value) : (field === "start" ? "날짜 없음" : "날짜 선택");
  btn.classList.toggle("has-date", Boolean(value));
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

  els.taskDueDateBtn?.addEventListener("click", () => {
    const field = "due";
    if (state.taskDialogActiveField === field) {
      renderTaskDatePicker(null);
      state.taskDialogActiveField = null;
    } else {
      renderTaskDatePicker(field);
    }
  });

  els.taskCreateCancelBtn?.addEventListener("click", () => {
    els.taskCreateDialog.close("cancel");
  });

  els.taskTitleInput?.addEventListener("keydown", (e) => {
    handleTaskTitleEnter(e, els.taskCreateConfirmBtn);
  });

  els.taskCreateConfirmBtn?.addEventListener("click", async () => {
    const title = els.taskTitleInput?.value.trim() || "";
    const dueDate = els.taskDueDateBtn?.dataset.date || "";
    const startDate = els.taskStartDateBtn?.dataset.date || "";

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
    const taskLine = `${prefix}- [ ] ${title}${metaStr}${startPart}${duePart}`;
    const nextContent = content + taskLine + "\n";
    await writeNodeContent(node, nextContent, { backup: false, previousContent: content });
    if (typeof node.content === "string") node.content = nextContent;
    if (state.currentPath === node.path) {
      state.currentContent = nextContent;
      if (!state.editMode) renderCurrentDocument();
    }
    updateTasksForFile(node.path, nextContent);
    refreshRecentFilesCache();
    if (state.activeView === "calendar" && state.calendarKind === "tasks") renderCalendar();
    else setTasksDirty();
  });

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

  els.taskEditDueDateBtn?.addEventListener("click", () => {
    const field = "due";
    state.taskEditActiveField = state.taskEditActiveField === field ? null : field;
    renderTaskEditDatePicker(state.taskEditActiveField);
  });

  els.taskEditCancelBtn?.addEventListener("click", () => {
    els.taskEditDialog.close("cancel");
  });

  els.taskEditDeleteBtn?.addEventListener("click", async () => {
    const task = state.taskEditTask;
    if (!task) return;
    if (!confirm("태스크를 삭제할까요?")) return;
    els.taskEditDialog.close("cancel");
    await deleteCalendarTaskLine(task.path, task.line);
  });

  els.taskEditOpenFileBtn?.addEventListener("click", async () => {
    const task = state.taskEditTask;
    els.taskEditDialog.close("open");
    if (task?.path) await openFile(task.path);
  });

  els.taskEditTitleInput?.addEventListener("keydown", (e) => {
    handleTaskTitleEnter(e, els.taskEditConfirmBtn);
  });

  els.taskEditConfirmBtn?.addEventListener("click", async () => {
    const title = els.taskEditTitleInput?.value.trim() || "";
    const dueDate = els.taskEditDueDateBtn?.dataset.date || "";
    const startDate = els.taskEditStartDateBtn?.dataset.date || "";
    const dueTime = normalizeTaskTimeInput(els.taskEditDueTimeInput);
    const startTime = normalizeTaskTimeInput(els.taskEditStartTimeInput);
    const checked = els.taskEditChecked?.checked || false;
    if (!dueDate) { els.taskEditDueDateBtn?.focus(); return; }
    const task = state.taskEditTask;
    if (!task) return;
    els.taskEditDialog.close("confirm");
    await saveTaskEdit(task, title, state.taskEditMeta, dueDate, startDate, checked, dueTime, startTime);
  });

  els.taskEditDialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); els.taskEditDialog.close("cancel"); }
    if (e.key === "Enter" && e.target === els.taskEditTitleInput) { e.preventDefault(); els.taskEditConfirmBtn?.click(); }
  });
}

function handleTaskTitleEnter(event, confirmButton) {
  if (event.key !== "Enter" && event.key !== "NumpadEnter") return;
  if (event.isComposing || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  event.stopPropagation();
  confirmButton?.click();
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
  if (!btn) return;
  btn.dataset.date = value || "";
  btn.textContent = value ? formatDateKorean(value) : (field === "start" ? "날짜 없음" : "날짜 선택");
  btn.classList.toggle("has-date", Boolean(value));
}

function renderTaskEditDatePicker(field) {
  if (!els.taskEditDatePickerCal) return;
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
  if (els.taskEditChecked) els.taskEditChecked.checked = task.checked || false;
  if (els.taskEditStartTimeInput) els.taskEditStartTimeInput.value = task.startTime || "";
  if (els.taskEditDueTimeInput) els.taskEditDueTimeInput.value = task.dueTime || "";
  setTaskEditDate("start", task.dates?.start || "");
  setTaskEditDate("due", task.dates?.due || task.dates?.end || task.date || "");
  renderEditTagChips();
  updateTaskEditMetaUI();
  renderTaskEditDatePicker(null);
  els.taskEditDialog.showModal();
  positionTaskEditDialog();
  const vvEdit = window.visualViewport;
  if (vvEdit) vvEdit.addEventListener("resize", positionTaskEditDialog);
  els.taskEditTitleInput?.focus();
  els.taskEditTitleInput?.select();
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

async function saveTaskEdit(task, title, meta, dueDate, startDate, checked, dueTime = "", startTime = "") {
  try {
    const node = state.files.get(task.path);
    if (!node) { alert("파일을 찾을 수 없습니다."); return; }
    const content = await readFileNode(node);
    const lines = content.split("\n");
    const idx = task.line - 1;
    if (idx < 0 || idx >= lines.length) { alert("태스크 줄을 찾을 수 없습니다."); return; }
    const indentStr = (lines[idx].match(/^(\s*)/)?.[1]) || "";
    const { kind, category, priority, tags } = meta;
    const hashParts = [kind, category, priority, ...tags].filter(Boolean).map((v) => `#${v}`);
    const metaStr = hashParts.length ? ` ${hashParts.join(" ")}` : "";
    const startPart = startDate ? ` 🛫 ${startDate}${startTime ? " " + startTime : ""}` : "";
    const duePart = ` 📅 ${dueDate}${dueTime ? " " + dueTime : ""}`;
    lines[idx] = `${indentStr}- [${checked ? "x" : " "}] ${title}${metaStr}${startPart}${duePart}`;
    const newContent = lines.join("\n");
    await writeNodeContent(node, newContent, { backup: false, previousContent: content });
    if (typeof node.content === "string") node.content = newContent;
    if (state.currentPath === node.path) {
      state.currentContent = newContent;
      if (!state.editMode) renderCurrentDocument();
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
      if (state.activeView === "calendar" && state.calendarKind === "tasks") renderCalendar();
    });
    checkbox.addEventListener("change", async () => {
      const path = checkbox.getAttribute("data-task-path");
      const line = Number(checkbox.getAttribute("data-task-line"));
      await toggleCalendarTask(path, line, checkbox);
    });
  });
}

function renderCodeBlock(code, language, depth) {
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
