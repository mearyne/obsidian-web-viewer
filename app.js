const CALENDAR_REFRESH_INTERVAL = 5 * 60 * 1000;

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
  savedVaults: [],
  tasks: [],
  calendarDate: new Date(),
  calendarMode: "month",
  calendarRefreshInFlight: false,
  calendarRefreshTimer: null,
  calendarRefreshing: false,
  calendarCacheState: "empty",
  calendarSyncedAt: 0,
  metadataSyncedAt: 0,
  recentFiles: { updated: [], created: [] },
  calendarKind: "tasks",
  mobileCalendarMode: "agenda",
  calendarRowLimit: 5,
  dailyNotePath: "1. Daily",
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
  calendarSwipe: null,
  calendarWheelAt: 0,
  fullscreenAttempted: false,
  fullscreenFallback: false,
  fontDeviceKey: "",
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
  dailyNotePathInput: document.querySelector("#dailyNotePathInput"),
  fontSelect: document.querySelector("#fontSelect"),
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
  calendarView: document.querySelector("#calendarView"),
  loadingOverlay: document.querySelector("#loadingOverlay"),
  loadingText: document.querySelector("#loadingText"),
  markdownToggleButton: document.querySelector("#markdownToggleButton"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
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
els.dailyNotePathInput?.addEventListener("input", updateDailyNotePath);
els.fontSelect?.addEventListener("change", updateAppFont);
els.contentFontSizeInput?.addEventListener("input", updateContentFontSize);
els.calendarRowFontSizeInput?.addEventListener("input", updateCalendarRowFontSize);
els.contentAlignSelect?.addEventListener("change", updateContentAlign);
els.viewerWrap.addEventListener("click", closeSidebarFromMain);
els.calendarView.addEventListener("wheel", handleCalendarWheel, { passive: false });
els.calendarView.addEventListener("pointerdown", handleCalendarSwipeStart, true);
els.calendarView.addEventListener("pointerup", handleCalendarSwipeEnd, true);
els.calendarView.addEventListener("pointercancel", clearCalendarSwipe, true);
els.historyBackButton.addEventListener("click", navigateHistoryBack);
els.historyForwardButton.addEventListener("click", navigateHistoryForward);
els.fullscreenButton?.addEventListener("click", enterFullscreen);
els.markdownToggleButton.addEventListener("click", toggleMarkdownMode);
els.webEditButton.addEventListener("click", enterEditMode);
els.saveEditButton.addEventListener("click", saveCurrentEdit);
els.markdownEditor.addEventListener("keydown", handleEditorKeydown);
els.markdownEditor.addEventListener("input", handleEditorInput);
els.randomFileButton.addEventListener("click", openRandomMarkdown);
els.calendarButton.addEventListener("click", openNextCalendarKind);
els.optionsButton.addEventListener("click", toggleOptionsMenu);
els.optionsCloseButton.addEventListener("click", closeOptionsMenu);
els.optionsBackdrop.addEventListener("click", closeOptionsMenu);
els.imageLightbox.addEventListener("click", closeImageLightbox);
els.imageLightboxClose.addEventListener("click", closeImageLightbox);
els.editButton.addEventListener("click", openCurrentFileInObsidian);
els.themeButton.addEventListener("click", toggleTheme);
els.sidebarResizeHandle.addEventListener("pointerdown", startSidebarResize);
window.addEventListener("keydown", handleGlobalKeydown, true);
document.addEventListener("pointerdown", closeSidebarFromOutside);
document.addEventListener("pointerup", clearCalendarDragIfActive);
document.addEventListener("pointercancel", clearCalendarDragIfActive);
window.addEventListener("resize", handleCalendarResize, { passive: true });
document.addEventListener("pointerdown", requestFullscreenOnce, { once: true });
document.addEventListener("keydown", requestFullscreenOnce, { once: true });
document.addEventListener("fullscreenchange", () => setFullscreenFallback(false));
document.addEventListener("webkitfullscreenchange", () => setFullscreenFallback(false));

function handleGlobalKeydown(event) {
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

  if (!isTypingTarget(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) {
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
      openNextCalendarKind();
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
updateMarkdownToggleButton();
updateTreeSortDirectionButton();
initSidebarWidth();
initSidebarPin();
loadSavedVaults();
loadSampleVault();
setInterval(refreshCalendarIfVisible, CALENDAR_REFRESH_INTERVAL);

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
  const files = [...state.files.keys()].filter((path) => path.toLowerCase().endsWith(".md"));
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
    loadCalendarCache().finally(scheduleCalendarRefreshIfStale);
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
      const metadata = await readFileMetadata(handle);
      const fileNode = { name, path, handle, dirHandle, kind: "file", ...metadata };
      state.files.set(path, fileNode);
      getDirNode(prefix).children.set(name, fileNode);
    }
  }
}

async function readFileMetadata(handle) {
  try {
    const file = await handle.getFile();
    return {
      size: file.size || 0,
      updatedAt: file.lastModified || 0,
      createdAt: file.lastModified || 0,
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
  state.calendarDate = new Date();
  showInitialCalendarView();
  loadCalendarCache().finally(scheduleCalendarRefreshIfStale);
  loadRecentFilesCache().finally(refreshRecentFilesCache);
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
  state.calendarDate = new Date();
  state.calendarRefreshInFlight = false;
  state.calendarRefreshing = false;
  state.calendarCacheState = "empty";
  state.calendarSyncedAt = 0;
  state.metadataSyncedAt = 0;
  state.recentFiles = { updated: [], created: [] };
  state.calendarKind = "tasks";
  if (state.calendarRefreshTimer) {
    window.clearTimeout(state.calendarRefreshTimer);
    state.calendarRefreshTimer = null;
  }
  state.activeView = "note";
  clearObjectUrls();
}

function makeDirNode(name, path) {
  return { name, path, kind: "directory", children: new Map(), collapsed: Boolean(path), size: 0, updatedAt: 0, createdAt: 0 };
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
  const matcher = createSearchMatcher(els.searchInput.value, {
    regexMode: els.regexSearchToggle.checked,
    caseSensitive: els.caseSearchToggle.checked,
  });
  const folderPaths = parsePathList(els.folderPathInput?.value || "");
  const rootFragment = document.createDocumentFragment();
  renderDirChildren(state.root, rootFragment, matcher, folderPaths);
  els.fileTree.append(rootFragment);
  els.fileTree.scrollTop = Math.min(previousScrollTop, els.fileTree.scrollHeight);
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

function renderDirChildren(dir, parent, matcher, folderPaths) {
  const entries = [...dir.children.values()]
    .sort(compareTreeNodes);

  entries.forEach((node) => {
    if (folderPaths.length && !nodeInAnyPath(node, folderPaths)) return;
    if (matcher && node.kind === "file" && !matcher(node.path)) return;
    if (matcher && node.kind === "directory" && !dirHasMatch(node, matcher, folderPaths)) return;

    const group = document.createElement("div");
    group.className = "tree-group";
    if (node.kind === "directory" && node.collapsed && !matcher) group.classList.add("collapsed");

    const row = document.createElement("button");
    row.type = "button";
    row.className = "tree-row";
    if (node.kind === "file") {
      row.classList.add(`file-ext-${extensionOf(node.name) || "file"}`);
      if (!isOpenableDocument(node.name)) row.classList.add("not-openable");
    }
    if (node.path === state.currentPath) row.classList.add("active");

    const toggle = document.createElement("span");
    toggle.className = "tree-toggle";
    toggle.textContent = node.kind === "directory" ? (node.collapsed && !matcher ? "›" : "⌄") : "";

    const name = document.createElement("span");
    name.className = "tree-name";
    name.textContent = node.name;

    row.append(toggle, name);
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

    if (node.kind === "directory") {
      const children = document.createElement("div");
      children.className = "tree-children";
      renderDirChildren(node, children, matcher, folderPaths);
      group.append(children);
    }

    parent.append(group);
  });
}

function dirHasMatch(dir, matcher, folderPaths) {
  return [...dir.children.values()].some((node) => {
    if (folderPaths.length && !nodeInAnyPath(node, folderPaths)) return false;
    if (node.kind === "file") return matcher(node.path);
    return dirHasMatch(node, matcher, folderPaths);
  });
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

async function readFileNode(node) {
  if (typeof node.content === "string") return node.content;
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
  const savedDailyPath = normalizeDailyNotePath(localStorage.getItem("obsidian-web-viewer-daily-note-path") || state.dailyNotePath);
  state.dailyNotePath = savedDailyPath;
  if (els.dailyNotePathInput) els.dailyNotePathInput.value = savedDailyPath;
  const savedFont = localStorage.getItem("obsidian-web-viewer-font") || "default";
  const appliedFont = setAppFont(savedFont);
  if (els.fontSelect) els.fontSelect.value = appliedFont;
  applyDeviceDisplayOptions();
}

function updateDailyNotePath() {
  const nextPath = normalizeDailyNotePath(els.dailyNotePathInput?.value || state.dailyNotePath);
  state.dailyNotePath = nextPath;
  localStorage.setItem("obsidian-web-viewer-daily-note-path", nextPath);
}

function updateAppFont() {
  setAppFont(els.fontSelect?.value || "default");
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
  if (state.activeView !== "calendar") return;
  loadCalendarCache().finally(() => scheduleCalendarRefreshIfStale(250));
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
    els.markdownView.innerHTML = renderMarkdown(state.currentContent);
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

async function autoSaveCurrentEdit() {
  if (!state.editMode || !state.editorDirty || state.autoSaveInFlight || !canEditNode(state.currentNode)) return;
  return persistCurrentEdit({ closeEditor: false });
}

async function persistCurrentEdit({ closeEditor }) {
  if (!state.editMode || !canEditNode(state.currentNode)) return;
  if (state.autoSaveInFlight) return;
  state.autoSaveInFlight = true;
  els.saveEditButton.disabled = true;
  updateEditorStatus(closeEditor ? "저장 중" : "자동 저장 중");
  try {
    const nextContent = editorValue();
    if (nextContent === state.currentContent && !closeEditor) return;
    const metadata = await writeNodeContent(state.currentNode, nextContent, { backup: nextContent !== state.currentContent, previousContent: state.currentContent });
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
      stopAutoSave();
      renderCurrentDocument();
      showNoteView();
    } else {
      updateEditorStatus("Auto saved");
    }
  } finally {
    state.autoSaveInFlight = false;
    els.saveEditButton.disabled = false;
    updateEditButtons();
  }
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
    const date = taskDateFromText(unorderedTask[4]) || formatDate(new Date());
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
  const match = text.match(/(?:📅|⏳|✅|➕)?\s*(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
}

function markEditorDirty() {
  if (!state.editMode) return;
  resizeEditorToContent();
  state.editorDirty = editorValue() !== state.currentContent;
  updateEditorStatus();
}

function updateEditorStatus(prefix = "") {
  if (!state.editMode) return;
  const dirty = state.editorDirty ? "수정됨" : "저장됨";
  els.editorStatus.textContent = `${prefix ? `${prefix} · ` : ""}${state.currentPath} · ${dirty}`;
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
    return readFileMetadata(node.handle);
  }

  if (node.serverBacked && state.serverVaultWritable) {
    return writeServerFile(node.path, content, { backup });
  }

  throw new Error("File is not writable");
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
  els.editButton.disabled = state.activeView !== "note" || !state.vaultName || !state.currentPath;
  els.webEditButton.disabled = !canEdit || state.editMode;
  els.webEditButton.hidden = state.activeView !== "note";
  els.markdownToggleButton.disabled = state.editMode;
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

function openImageLightbox(image) {
  const images = [...els.markdownView.querySelectorAll("img")].filter((item) => imageSource(item));
  state.lightboxImages = images;
  state.lightboxIndex = Math.max(0, images.indexOf(image));
  showLightboxImage(image);
}

function showLightboxImage(image) {
  const src = imageSource(image);
  if (!src) return;
  els.imageLightboxImg.src = src;
  els.imageLightboxImg.alt = image.alt || "";
  els.imageLightbox.hidden = false;
}

function showAdjacentLightboxImage(direction) {
  if (els.imageLightbox.hidden || !state.lightboxImages.length) return;
  const count = state.lightboxImages.length;
  state.lightboxIndex = (state.lightboxIndex + direction + count) % count;
  showLightboxImage(state.lightboxImages[state.lightboxIndex]);
}

function imageSource(image) {
  return image.currentSrc || image.src || image.getAttribute("data-vault-src") || "";
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
  showCalendarView();
  renderCalendar();
  scheduleCalendarRefreshIfStale();
}

async function buildRecentCalendarView(type) {
  if (!(await confirmDiscardEdit())) return;
  closeOptionsMenu();
  closeSidebar();
  state.calendarKind = type === "created" ? "created" : "updated";
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

async function refreshCalendarIfVisible() {
  if (state.activeView !== "calendar") return;
  if (state.calendarRefreshing) return;
  scheduleCalendarRefreshIfStale();
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

function scheduleCalendarRefreshIfStale(delay = 0) {
  if (state.activeView !== "calendar" || state.calendarKind !== "tasks") return;
  if (state.calendarSyncedAt && Date.now() - state.calendarSyncedAt < CALENDAR_REFRESH_INTERVAL) {
    state.calendarCacheState = "fresh";
    renderCalendar();
    return;
  }
  scheduleCalendarRefresh(delay);
}

async function refreshCalendarTasks({ showLoading }) {
  if (state.calendarRefreshInFlight) return;
  if (state.activeView !== "calendar" || state.calendarKind !== "tasks") return;
  state.calendarRefreshInFlight = true;
  const refreshView = state.activeView;
  const refreshKind = state.calendarKind;
  state.calendarRefreshing = true;
  state.calendarCacheState = state.tasks.length ? "stale" : "refreshing";
  if (state.activeView === "calendar") renderCalendar();

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

    const parsed = [];
    for (let index = 0; index < mdFiles.length; index += 8) {
      const batch = mdFiles.slice(index, index + 8);
      await Promise.all(
        batch.map(async (node) => {
          const content = await readFileNode(node);
          parsed.push(...parseTasks(content, node.path));
        }),
      );

      if (index + 8 < mdFiles.length) {
        await waitForBrowser();
      }
    }

    if (state.activeView !== "calendar" || state.calendarKind !== "tasks") return;
    state.tasks = parsed;
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
    state.calendarSyncedAt = syncedAt;
    state.calendarCacheState = "stale";
    if (shouldRender()) renderCalendar();
  } catch {
    state.tasks = [];
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
      }),
    });
  } catch {
    // Cache is best-effort; server write failures should not block the app.
  }
}

function updateTasksForFile(path, content) {
  if (!path || !path.toLowerCase().endsWith(".md")) return;
  state.tasks = state.tasks.filter((task) => task.path !== path).concat(parseTasks(content, path));
  state.calendarSyncedAt = Date.now();
  state.calendarCacheState = "fresh";
  saveCalendarCache();
  if (state.activeView === "calendar") renderCalendar();
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
    state.recentFiles = { updated: cached.updated, created: cached.created };
    state.metadataSyncedAt = Number(cached.syncedAt || 0);
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
      createdAt: node.createdAt || node.updatedAt || 0,
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
  if (state.activeView === "calendar" && state.calendarKind === "created") {
    els.calendarButton.textContent = "✏️";
    els.calendarButton.title = "최근 수정 파일";
    els.calendarButton.setAttribute("aria-label", "최근 수정 파일 캘린더");
  } else if (state.activeView === "calendar" && state.calendarKind === "updated") {
    els.calendarButton.textContent = "📅";
    els.calendarButton.title = "Task 캘린더";
    els.calendarButton.setAttribute("aria-label", "Task 캘린더");
  } else {
    els.calendarButton.textContent = state.activeView === "calendar" ? "➕" : "📅";
    els.calendarButton.title = state.activeView === "calendar" ? "최근 생성 파일" : "Task 캘린더";
    els.calendarButton.setAttribute("aria-label", state.activeView === "calendar" ? "최근 생성 파일 캘린더" : "Task 캘린더");
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

function parseTasks(content, path) {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .flatMap((line, index) => {
      const match = line.match(/^\s*[-*]\s+\[([ xX-])\]\s+(.+)$/);
      if (!match) return [];

      const checked = match[1].toLowerCase() === "x" || match[1] === "-";
      const rawText = match[2].trim();
      const dates = extractTaskDates(rawText);
      const displayDate = dates.due || dates.end || dates.scheduled || dates.start || dates.done || dates.cancelled;
      if (!displayDate) return [];

      return [
        {
          path,
          line: index + 1,
          checked,
          text: cleanTaskText(rawText),
          rawText,
          date: displayDate,
          type: dates.due || dates.end ? "due" : dates.scheduled ? "scheduled" : dates.start ? "start" : dates.done ? "done" : "cancelled",
          dates,
        },
      ];
    });
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
  const due = findTaskDateByMarkers(text, ["\u{1F4C5}", "due", "end"]) || findBareTaskDate(text);
  const start = findTaskDateByMarkers(text, ["\u{1F6EB}", "start"]);
  return {
    due,
    end: due,
    scheduled: findTaskDateByMarkers(text, ["\u{23F3}", "scheduled"]),
    start,
    done: findTaskDateByMarkers(text, ["\u{2705}", "done"]),
    cancelled: findTaskDateByMarkers(text, ["\u{274C}", "cancelled", "canceled"]),
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
    .replace(/(?:\u{1F4C5}|\u{1F6EB}|\u{23F3}|\u{2705}|\u{274C}|due|start|end|scheduled|done|cancelled|canceled)\s*\d{4}-\d{2}-\d{2}/giu, "")
    .replace(/#[\p{L}\p{N}_/-]+/gu, "")
    .trim();
}

function renderCalendar() {
  if (state.activeView === "calendar") updateCalendarTitle();
  const showingTasks = state.calendarKind === "tasks";
  const month = startOfMonth(state.calendarDate);
  const monthKey = formatMonth(month);
  const todayKey = formatDate(new Date());
  const firstGridDate = startOfWeek(month, 0);
  const tasksByDate = groupTasksByDate(state.tasks);
  const recentField = state.calendarKind === "created" ? "createdAt" : "updatedAt";
  const recentByDate = groupRecentFilesByDate(state.recentFiles[state.calendarKind] || [], recentField);
  const rowLimit = state.calendarRowLimit || 5;
  const cells = [];
  const agendaItems = calendarAgendaDates(month).map((date) => {
    const dateKey = formatDate(date);
    return showingTasks
      ? renderAgendaDay(date, tasksByDate.get(dateKey) || [], dateKey === todayKey)
      : renderRecentAgendaDay(date, recentByDate.get(dateKey) || [], dateKey === todayKey, recentField);
  });

  for (let offset = 0; offset < 42; offset += 1) {
    const date = addDays(firstGridDate, offset);
    const dateKey = formatDate(date);
    const dayTasks = tasksByDate.get(dateKey) || [];
    const dayFiles = recentByDate.get(dateKey) || [];
    const classes = ["calendar-cell"];
    if (formatMonth(date) !== monthKey) classes.push("outside-month");
    if (dateKey === todayKey) classes.push("today");
    cells.push(`
      <div class="${classes.join(" ")}" data-calendar-date="${dateKey}">
        <div class="calendar-day">${date.getDate()}</div>
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
  updateSyncStatus();
  requestAnimationFrame(syncCalendarRowLimit);
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
  const rowHeight = window.matchMedia("(max-width: 780px)").matches ? 11 : 18;
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
  if (state.activeView !== "calendar" || state.calendarKind !== "tasks") {
    els.syncStatus.hidden = true;
    return;
  }

  els.syncStatus.hidden = false;
  els.syncStatus.className = `sync-status sync-status-bar ${state.calendarRefreshing ? "refreshing" : state.calendarCacheState}`;

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

function renderAgendaDay(date, tasks, isToday) {
  const classes = ["calendar-agenda-day"];
  if (isToday) classes.push("today");
  return `
    <section class="${classes.join(" ")}" data-calendar-date="${formatDate(date)}">
      <div class="calendar-agenda-date">
        <strong>${date.getDate()}</strong>
        <span>${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]}</span>
      </div>
      <div class="calendar-agenda-tasks">
        ${tasks.length ? tasks.map((task) => renderCalendarTask(task, formatDate(date))).join("") : '<div class="calendar-empty">No tasks</div>'}
      </div>
    </section>
  `;
}

function renderRecentAgendaDay(date, files, isToday, field) {
  const classes = ["calendar-agenda-day"];
  if (isToday) classes.push("today");
  return `
    <section class="${classes.join(" ")}" data-calendar-date="${formatDate(date)}">
      <div class="calendar-agenda-date">
        <strong>${date.getDate()}</strong>
        <span>${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]}</span>
      </div>
      <div class="calendar-agenda-tasks">
        ${files.length ? files.map((file) => renderCalendarFile(file, field)).join("") : '<div class="calendar-empty">No files</div>'}
      </div>
    </section>
  `;
}

function renderCalendarTask(task, dateKey = task.date) {
  const title = `${task.path}: ${task.text}`;
  const range = taskRangePosition(task, dateKey);
  const colorClass = range ? `range-color-${rangeColorIndex(task)}` : "";
  const icon = range && range !== "start" ? taskContinuationIcon(range) : taskTypeIcon(task.type);
  return `
    <button class="calendar-task ${task.checked ? "done" : ""} ${task.type} ${range ? `range-task ${colorClass}` : ""}" type="button" data-path="${escapeAttribute(task.path)}" data-line="${task.line}" title="${escapeAttribute(title)}">
      <span>${icon}</span>
      <span>${escapeHtml(task.text)}</span>
    </button>
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

function renderCalendarFile(file, field) {
  const title = `${file.path}: ${file[field] ? new Date(file[field]).toLocaleString() : ""}`;
  return `
    <button class="calendar-task calendar-file" type="button" data-path="${escapeAttribute(file.path)}" title="${escapeAttribute(title)}">
      <span class="${field === "createdAt" ? "calendar-file-icon created" : "calendar-file-icon"}">${field === "createdAt" ? "➕" : "✏️"}</span>
      <span>${escapeHtml(displayDocumentTitle(file.name || file.path.split("/").pop() || file.path))}</span>
    </button>
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
    });
  });

  els.calendarView.querySelectorAll("[data-calendar-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarMode = button.getAttribute("data-calendar-mode") || "month";
      renderCalendar();
    });
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
    if (button.hasAttribute("data-line")) bindTaskLongPress(button);
    button.addEventListener("click", async () => {
      if (button.dataset.longPressed === "true") {
        button.dataset.longPressed = "";
        return;
      }
      const path = button.getAttribute("data-path");
      if (path) await openFile(path);
    });
  });

  els.calendarView.querySelectorAll("[data-calendar-date]").forEach((target) => {
    bindDateClick(target);
  });
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
  state.calendarSwipe = { x: event.clientX, y: event.clientY, time: Date.now() };
}

function handleCalendarSwipeEnd(event) {
  const swipe = state.calendarSwipe;
  state.calendarSwipe = null;
  if (!swipe || state.activeView !== "calendar") return;
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
      await toggleCalendarTask(path, line, button);
    }, 650);
  });
  button.addEventListener("pointermove", (event) => {
    if (!timer) return;
    const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
    if (distance > 10) clear();
  });
  button.addEventListener("pointerup", clear);
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

  try {
    const content = await readFileNode(node);
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const index = lineNumber - 1;
    if (!lines[index] || !/^\s*[-*+]\s+\[[ xX-]\]/.test(lines[index])) return;

    const taskDate = taskDateFromText(lines[index]) || formatDate(new Date());
    const nextLine = lines[index].replace(/^(\s*[-*+]\s+\[)([ xX-])(\])(.+)$/, (_, head, checked, tail, rest) => {
      const isDone = checked.toLowerCase() === "x" || checked === "-";
      const cleanRest = rest.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/gu, "");
      return `${head}${isDone ? " " : "x"}${tail}${cleanRest}${isDone ? "" : ` ✅ ${taskDate}`}`;
    });
    lines[index] = nextLine;
    const nextContent = lines.join("\n");
    button.classList.toggle("done", /\[[xX-]\]/.test(nextLine));
    button.disabled = true;

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
  } finally {
    button.disabled = false;
  }
}

function bindDateClick(target) {
  target.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".calendar-task, .calendar-more")) return;
    event.preventDefault();
    state.calendarDragStartDate = target.getAttribute("data-calendar-date") || "";
    state.calendarDragCurrentDate = state.calendarDragStartDate;
    updateCalendarDragHighlight();
  });

  target.addEventListener("pointerenter", () => {
    if (!state.calendarDragStartDate) return;
    state.calendarDragCurrentDate = target.getAttribute("data-calendar-date") || "";
    updateCalendarDragHighlight();
  });

  target.addEventListener("pointerup", async (event) => {
    if (event.target.closest(".calendar-task, .calendar-more")) return;
    const startDate = state.calendarDragStartDate;
    const endDate = target.getAttribute("data-calendar-date") || "";
    state.calendarDragStartDate = "";
    state.calendarDragCurrentDate = "";
    clearCalendarDragHighlight();
    if (startDate && endDate && startDate !== endDate) {
      state.calendarDragHandled = true;
      await openDateEditor(startDate, endDate);
      window.setTimeout(() => {
        state.calendarDragHandled = false;
      }, 0);
    }
  });

  target.addEventListener("click", async (event) => {
    if (event.target.closest(".calendar-task, .calendar-more")) return;
    if (state.calendarDragHandled) return;
    const date = target.getAttribute("data-calendar-date");
    await openDateEditor(date);
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

  const node = await getOrCreateDailyNote(date);
  await openFile(node.path);
  if (await enterEditMode()) appendTaskTemplate(taskDueDate, taskStartDate);
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
    refreshDirectoryMetadata();
    renderTree();
    return node;
  }

  const dirHandle = await getOrCreateDirectoryHandle(dirPath);
  const handle = await dirHandle.getFileHandle(`${date}.md`, { create: true });
  const initialContent = `# ${date}\n\n`;
  await writeFileHandle(handle, initialContent);

  ensureDirectoryNodePath(dirPath);

  const metadata = await readFileMetadata(handle);
  const node = { name: `${date}.md`, path, handle, dirHandle, kind: "file", ...metadata };
  state.files.set(path, node);
  state.directories.get(dirPath).children.set(node.name, node);
  refreshDirectoryMetadata();
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

function taskCalendarDates(task) {
  const start = parseDateKey(task.dates?.start);
  const end = parseDateKey(task.dates?.end || task.dates?.due);
  if (!start || !end) return [task.date].filter(Boolean);

  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
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

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function renderMarkdown(source) {
  const { frontmatter, body } = extractFrontmatter(source);
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;
  let currentDepth = 0;
  const openHeadings = [];

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
      html.push(`<div class="callout${depthClass(currentDepth, true)}"><div class="callout-title">${escapeHtml(title.trim())}</div>${renderBlocks(bodyLines)}</div>`);
      continue;
    }

    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      html.push(`<blockquote${depthAttribute(currentDepth)}>${renderBlocks(quote)}</blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i += 1;
      }
      html.push(`<ul${depthAttribute(currentDepth)}>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      html.push(`<ol${depthAttribute(currentDepth)}>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
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

function renderBlocks(lines) {
  return renderMarkdown(lines.join("\n"));
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
    const resolvedSrc = resolveMarkdownImageSrc(src);
    return `<img src="${escapeAttribute(resolvedSrc)}" alt="${escapeAttribute(alt)}" loading="lazy">`;
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
    const cached = getFileUrl(path);
    const src = cached ? `src="${escapeAttribute(cached)}"` : `data-vault-src="${escapeAttribute(path)}"`;
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

function resolveMarkdownImageSrc(src) {
  const cleanSrc = decodeURIComponent(src.trim().replace(/^<|>$/g, "")).split("#")[0];
  if (!cleanSrc || /^(https?:|data:|blob:|\/)/i.test(cleanSrc)) return src;

  const currentDir = state.currentPath?.includes("/") ? state.currentPath.split("/").slice(0, -1).join("/") : "";
  const candidates = [cleanSrc];
  if (currentDir) candidates.unshift(`${currentDir}/${cleanSrc}`);

  for (const candidate of candidates) {
    const path = resolveVaultPath(normalizeVaultPath(candidate));
    if (!path || !isImageDocument(path)) continue;
    return getFileUrl(path) || src;
  }

  return src;
}

function renderWikiLink(rawTarget) {
  const [target, alias] = rawTarget.split("|").map((value) => value.trim());
  const path = resolveVaultPath(target);
  const label = alias || target;
  if (!path) return `<span class="wiki-link missing">${escapeHtml(label)}</span>`;
  return `<a class="wiki-link" href="#" data-wiki="${escapeAttribute(path)}">${escapeHtml(label)}</a>`;
}

function renderEmbeddedDocumentContent(path, content) {
  if (isExcalidrawDocument(path) && !EXCALIDRAW_PREVIEW_ENABLED) return renderDisabledExcalidrawEmbed(path);
  if (isExcalidrawDocument(path)) return renderExcalidrawPreview(content, path, { embedded: true });
  return renderMarkdown(content);
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
  const body = scene ? renderExcalidrawScene(scene, content) : renderMarkdown(content);
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
  await Promise.all(
    images.map(async (image) => {
      const path = image.getAttribute("data-vault-src");
      const url = await getOrCreateFileUrl(path);
      if (!url) return;
      image.src = url;
      image.removeAttribute("data-vault-src");
    }),
  );
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
