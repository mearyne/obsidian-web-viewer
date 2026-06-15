const state = {
  files: new Map(),
  directories: new Map(),
  root: makeDirNode("", ""),
  vaultName: "",
  rootHandle: null,
  currentPath: null,
  currentContent: "",
  currentNode: null,
  editMode: false,
  markdownEnabled: true,
  objectUrls: new Map(),
  savedVaults: [],
  tasks: [],
  calendarDate: startOfMonth(new Date()),
  calendarMode: "month",
  calendarRefreshInFlight: false,
  mobileCalendarMode: "agenda",
  dailyNotePath: "1. Daily",
  sidebarResize: null,
  lightboxImages: [],
  lightboxIndex: -1,
  treeSortMode: "created",
  treeSortDirection: "desc",
  activeView: "note",
  editorDirty: false,
  autoSaveTimer: null,
  autoSaveInFlight: false,
};

const els = {
  sidebarPanel: document.querySelector("#sidebarPanel"),
  sidebarResizeHandle: document.querySelector("#sidebarResizeHandle"),
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
  vaultStatus: document.querySelector("#vaultStatus"),
  notePath: document.querySelector("#notePath"),
  noteTitle: document.querySelector("#noteTitle"),
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

els.openVaultButton.addEventListener("click", openVault);
els.sidebarToggle.addEventListener("click", toggleSidebar);
els.searchInput.addEventListener("input", renderTree);
els.caseSearchToggle.addEventListener("change", renderTree);
els.regexSearchToggle.addEventListener("change", renderTree);
els.treeSortSelect.addEventListener("change", updateTreeSortMode);
els.treeSortDirectionButton.addEventListener("click", toggleTreeSortDirection);
els.expandTreeButton.addEventListener("click", expandAllTree);
els.revealCurrentButton.addEventListener("click", revealCurrentFileInTree);
els.collapseTreeButton.addEventListener("click", collapseAllTree);
els.folderPathInput?.addEventListener("input", renderTree);
els.dailyNotePathInput?.addEventListener("input", updateDailyNotePath);
els.viewerWrap.addEventListener("scroll", handleViewerScroll, { passive: true });
els.viewerWrap.addEventListener("click", closeSidebarFromMain);
els.markdownToggleButton.addEventListener("click", toggleMarkdownMode);
els.webEditButton.addEventListener("click", enterEditMode);
els.saveEditButton.addEventListener("click", saveCurrentEdit);
els.markdownEditor.addEventListener("keydown", handleEditorKeydown);
els.markdownEditor.addEventListener("input", handleEditorInput);
els.randomFileButton.addEventListener("click", openRandomMarkdown);
els.calendarButton.addEventListener("click", buildCalendarView);
els.optionsButton.addEventListener("click", toggleOptionsMenu);
els.optionsCloseButton.addEventListener("click", closeOptionsMenu);
els.optionsBackdrop.addEventListener("click", closeOptionsMenu);
els.imageLightbox.addEventListener("click", closeImageLightbox);
els.imageLightboxClose.addEventListener("click", closeImageLightbox);
els.editButton.addEventListener("click", openCurrentFileInObsidian);
els.themeButton.addEventListener("click", toggleTheme);
els.sidebarResizeHandle.addEventListener("pointerdown", startSidebarResize);
window.addEventListener("keydown", handleGlobalKeydown, true);

function handleGlobalKeydown(event) {
  if (isShortcut(event, "KeyE", "e")) {
    event.preventDefault();
    event.stopPropagation();
    enterEditMode();
  } else if (isShortcut(event, "KeyS", "s")) {
    event.preventDefault();
    event.stopPropagation();
    saveCurrentEdit();
  } else if (event.key === "Escape") {
    closeOptionsMenu();
    closeImageLightbox();
  } else if (event.key === "ArrowLeft") {
    showAdjacentLightboxImage(-1);
  } else if (event.key === "ArrowRight") {
    showAdjacentLightboxImage(1);
  }
}

initTheme();
initOptions();
updateMarkdownToggleButton();
updateTreeSortDirectionButton();
initSidebarWidth();
loadSavedVaults();
loadSampleVault();
setInterval(refreshCalendarIfVisible, 5000);

let lastViewerScrollTop = 0;

function handleViewerScroll() {
  const top = els.viewerWrap.scrollTop;
  const delta = top - lastViewerScrollTop;

  if (top < 12 || delta < -2) {
    document.body.classList.remove("titlebar-hidden");
  } else if (delta > 4 && top > 72) {
    document.body.classList.add("titlebar-hidden");
  }

  lastViewerScrollTop = Math.max(0, top);
}

function closeSidebarFromMain(event) {
  if (event.target.closest("button, a, input, textarea, select, summary, details, .loading-overlay")) return;
  closeSidebar();
}

function initSidebarWidth() {
  const saved = Number(localStorage.getItem("obsidian-web-viewer-sidebar-width"));
  if (Number.isFinite(saved) && saved > 0) setSidebarWidth(saved);
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
  await openFile(path);
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
    state.calendarDate = startOfMonth(new Date());
    await buildCalendarView();
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
    const response = await fetch("/api/sample-vault", { cache: "no-store" });
    if (!response.ok) throw new Error("Sample vault API failed");
    const vault = await response.json();
    hydrateSampleVault(vault.name || "sample-vault", vault.files || []);
  } catch {
    const files = Object.entries(SAMPLE_FILES).map(([path, content]) => ({ path, content }));
    hydrateSampleVault("Sample vault", files);
  }
}

function hydrateSampleVault(vaultName, files) {
  resetVault();
  state.root = makeDirNode(vaultName, "");
  state.directories.set("", state.root);

  files.forEach((file) => {
    const normalizedPath = normalizeVaultPath(file.path);
    if (!normalizedPath || !normalizedPath.toLowerCase().endsWith(".md")) return;

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
      content: file.content || "",
      kind: "file",
      size: file.size || (file.content || "").length,
      updatedAt: file.updatedAt || file.modifiedAt || 0,
      createdAt: file.createdAt || file.birthtime || file.updatedAt || file.modifiedAt || 0,
    };
    state.files.set(normalizedPath, fileNode);
    dir.children.set(fileName, fileNode);
  });

  refreshDirectoryMetadata();
  els.vaultStatus.textContent = vaultName;
  renderTree();
  state.calendarDate = startOfMonth(new Date());
  buildCalendarView();
}

function resetVault() {
  state.files.clear();
  state.directories.clear();
  state.vaultName = "";
  state.rootHandle = null;
  state.currentPath = null;
  state.currentContent = "";
  state.currentNode = null;
  state.editMode = false;
  state.tasks = [];
  state.calendarDate = startOfMonth(new Date());
  state.calendarRefreshInFlight = false;
  state.activeView = "note";
  clearObjectUrls();
}

function makeDirNode(name, path) {
  return { name, path, kind: "directory", children: new Map(), collapsed: Boolean(path), size: 0, updatedAt: 0, createdAt: 0 };
}

function isIndexedFile(name) {
  return /\.(md|excalidraw|png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

function isMarkdownDocument(name) {
  return /\.md$/i.test(name);
}

function isExcalidrawDocument(name) {
  return /\.excalidraw(\.md)?$/i.test(name);
}

function isOpenableDocument(name) {
  return isMarkdownDocument(name) || isExcalidrawDocument(name);
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
    .filter((node) => node.kind === "directory" || isOpenableDocument(node.name))
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
      } else {
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
    els.notePath.textContent = path;
    els.noteTitle.textContent = displayDocumentTitle(node.name);
    updateEditButtons();
    renderCurrentDocument();
    showNoteView();
    renderTree();
  } finally {
    hideLoading();
  }
}

async function readFileNode(node) {
  if (typeof node.content === "string") return node.content;
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
  els.themeButton.textContent = theme === "dark" ? "Light" : "Dark";
}

function initOptions() {
  const savedDailyPath = normalizeDailyNotePath(localStorage.getItem("obsidian-web-viewer-daily-note-path") || state.dailyNotePath);
  state.dailyNotePath = savedDailyPath;
  if (els.dailyNotePathInput) els.dailyNotePathInput.value = savedDailyPath;
}

function updateDailyNotePath() {
  const nextPath = normalizeDailyNotePath(els.dailyNotePathInput?.value || state.dailyNotePath);
  state.dailyNotePath = nextPath;
  localStorage.setItem("obsidian-web-viewer-daily-note-path", nextPath);
}

function toggleMarkdownMode() {
  state.markdownEnabled = !state.markdownEnabled;
  updateMarkdownToggleButton();
  if (state.activeView === "note" && state.currentPath) renderCurrentDocument();
}

function updateMarkdownToggleButton() {
  const label = state.markdownEnabled ? "Markdown 렌더링 켜짐" : "순수 텍스트 보기";
  els.markdownToggleButton.classList.toggle("active", state.markdownEnabled);
  els.markdownToggleButton.setAttribute("aria-pressed", String(state.markdownEnabled));
  els.markdownToggleButton.setAttribute("aria-label", label);
  els.markdownToggleButton.title = label;
}

function renderCurrentDocument() {
  els.markdownView.classList.remove("empty-state", "plain-text-mode");
  els.editorShell.hidden = true;
  els.markdownView.hidden = false;

  if (isExcalidrawDocument(state.currentPath || "")) {
    els.markdownView.innerHTML = renderExcalidrawPreview(state.currentContent, state.currentPath);
    bindWikiLinks(els.markdownView);
    hydrateVaultImages(els.markdownView);
    hydrateEmbeddedDocuments(els.markdownView);
    return;
  }

  if (state.markdownEnabled) {
    els.markdownView.innerHTML = renderMarkdown(state.currentContent);
    bindWikiLinks(els.markdownView);
    arrangeImageGroups(els.markdownView);
    bindImageLightbox(els.markdownView);
    hydrateVaultImages(els.markdownView);
    hydrateEmbeddedDocuments(els.markdownView);
    return;
  }

  els.markdownView.classList.add("plain-text-mode");
  const pre = document.createElement("pre");
  pre.textContent = state.currentContent;
  els.markdownView.replaceChildren(pre);
}

async function enterEditMode() {
  if (!state.currentNode?.handle) return false;
  if (state.editMode) {
    focusEditor();
    return true;
  }

  const granted = await ensureWritePermission(state.currentNode.handle);
  if (!granted) {
    alert("파일 편집 권한이 필요합니다.");
    return false;
  }

  state.editMode = true;
  state.editorDirty = false;
  setEditorValue(state.currentContent);
  renderEditorPreview();
  els.markdownView.hidden = true;
  els.calendarView.hidden = true;
  els.editorShell.hidden = false;
  focusEditor();
  startAutoSave();
  updateEditorStatus();
  updateEditButtons();
  return true;
}

async function saveCurrentEdit() {
  if (!state.editMode || !state.currentNode?.handle) return;
  return persistCurrentEdit({ closeEditor: true });
}

async function autoSaveCurrentEdit() {
  if (!state.editMode || !state.editorDirty || state.autoSaveInFlight || !state.currentNode?.handle) return;
  return persistCurrentEdit({ closeEditor: false });
}

async function persistCurrentEdit({ closeEditor }) {
  if (!state.editMode || !state.currentNode?.handle) return;
  if (state.autoSaveInFlight) return;
  state.autoSaveInFlight = true;
  els.saveEditButton.disabled = true;
  updateEditorStatus(closeEditor ? "저장 중" : "자동 저장 중");
  try {
    const nextContent = editorValue();
    if (nextContent === state.currentContent && !closeEditor) return;
    if (nextContent !== state.currentContent) await writeBackupFile(state.currentNode, state.currentContent);
    await writeFileHandle(state.currentNode.handle, nextContent);
    const metadata = await readFileMetadata(state.currentNode.handle);
    Object.assign(state.currentNode, metadata);
    refreshDirectoryMetadata();
    state.currentContent = nextContent;
    state.editorDirty = false;
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
  markEditorDirty();
  renderEditorPreview();
}

function editorValue() {
  return els.markdownEditor.value;
}

function setEditorValue(value) {
  els.markdownEditor.value = value;
  renderEditorPreview();
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

function updateEditButtons() {
  const canEdit = Boolean(state.currentNode?.handle) && state.activeView === "note";
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
  els.sidebarToggle.setAttribute("aria-expanded", String(open));
  els.sidebarToggle.setAttribute("aria-label", open ? "문서 목록 닫기" : "문서 목록 열기");
}

function closeSidebar() {
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

function showTitlebar() {
  document.body.classList.remove("titlebar-hidden");
  lastViewerScrollTop = els.viewerWrap.scrollTop;
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
  if (state.calendarMode === "week" || state.calendarMode === "day") state.calendarDate = new Date();
  showCalendarView();
  await refreshCalendarTasks({ showLoading: true });
}

async function refreshCalendarIfVisible() {
  if (state.activeView !== "calendar") return;
  await refreshCalendarTasks({ showLoading: false });
}

async function refreshCalendarTasks({ showLoading }) {
  if (state.calendarRefreshInFlight) return;
  state.calendarRefreshInFlight = true;

  try {
    const pathPrefixes = parsePathList(els.calendarPathInput.value);
    els.notePath.textContent = pathPrefixes.length ? `calendar: ${pathPrefixes.join(", ")}` : "calendar: vault";
    els.noteTitle.textContent = "Tasks Calendar";
    if (showLoading) {
      showLoadingOverlay("캘린더 불러오는 중...");
      els.calendarView.innerHTML = '<div class="calendar-loading">Loading tasks...</div>';
    }

    const mdFiles = [...state.files.values()].filter((node) => {
      if (!node.name.toLowerCase().endsWith(".md")) return false;
      return !pathPrefixes.length || pathPrefixes.some((prefix) => node.path === prefix || node.path.startsWith(`${prefix}/`));
    });

    const parsed = [];
    await Promise.all(
      mdFiles.map(async (node) => {
        const content = await readFileNode(node);
        parsed.push(...parseTasks(content, node.path));
      }),
    );

    state.tasks = parsed;
    renderCalendar();
  } finally {
    state.calendarRefreshInFlight = false;
    if (showLoading) hideLoading();
  }
}

function showNoteView() {
  state.activeView = "note";
  showTitlebar();
  els.markdownView.hidden = false;
  els.editorShell.hidden = true;
  els.calendarView.hidden = true;
  els.calendarButton.classList.remove("active");
  updateEditButtons();
}

function showCalendarView() {
  state.activeView = "calendar";
  showTitlebar();
  els.markdownView.hidden = true;
  els.editorShell.hidden = true;
  els.calendarView.hidden = false;
  els.calendarButton.classList.add("active");
  els.editButton.disabled = true;
  updateEditButtons();
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
      const displayDate = dates.due || dates.scheduled || dates.start || dates.done || dates.cancelled;
      if (!displayDate) return [];

      return [
        {
          path,
          line: index + 1,
          checked,
          text: cleanTaskText(rawText),
          rawText,
          date: displayDate,
          type: dates.due ? "due" : dates.scheduled ? "scheduled" : dates.start ? "start" : dates.done ? "done" : "cancelled",
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

function renderCalendar() {
  const month = startOfMonth(state.calendarDate);
  const monthKey = formatMonth(month);
  const todayKey = formatDate(new Date());
  const firstGridDate = startOfWeek(month, 0);
  const tasksByDate = groupTasksByDate(state.tasks);
  const cells = [];
  const agendaItems = calendarAgendaDates(month).map((date) => {
    const dateKey = formatDate(date);
    return renderAgendaDay(date, tasksByDate.get(dateKey) || [], dateKey === todayKey);
  });

  for (let offset = 0; offset < 42; offset += 1) {
    const date = addDays(firstGridDate, offset);
    const dateKey = formatDate(date);
    const dayTasks = tasksByDate.get(dateKey) || [];
    const classes = ["calendar-cell"];
    if (formatMonth(date) !== monthKey) classes.push("outside-month");
    if (dateKey === todayKey) classes.push("today");

    cells.push(`
      <div class="${classes.join(" ")}" data-calendar-date="${dateKey}">
        <div class="calendar-day">${date.getDate()}</div>
        <div class="calendar-tasks">
          ${dayTasks.slice(0, 5).map(renderCalendarTask).join("")}
          ${dayTasks.length > 5 ? `<div class="calendar-more">+${dayTasks.length - 5}</div>` : ""}
        </div>
      </div>
    `);

  }

  els.calendarView.innerHTML = `
    <div class="calendar-shell calendar-mode-${state.calendarMode} mobile-${state.mobileCalendarMode}">
      <div class="calendar-toolbar">
        <button type="button" data-calendar-action="prev">&lt;</button>
        <strong>${calendarTitle()}</strong>
        <button type="button" data-calendar-action="next">&gt;</button>
        <button type="button" data-calendar-action="today">Today</button>
        <div class="calendar-mode-switch" aria-label="Calendar view">
          <button type="button" data-calendar-mode="month" class="${state.calendarMode === "month" ? "active" : ""}">캘린더</button>
          <button type="button" data-calendar-mode="week" class="${state.calendarMode === "week" ? "active" : ""}">주간</button>
          <button type="button" data-calendar-mode="day" class="${state.calendarMode === "day" ? "active" : ""}">일일</button>
        </div>
        <button class="calendar-mobile-mode" type="button" data-calendar-action="toggle-mobile-mode">
          ${state.mobileCalendarMode === "agenda" ? "Month" : "Agenda"}
        </button>
        <span>${state.tasks.length} tasks</span>
      </div>
      <div class="calendar-weekdays">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<div>${day}</div>`).join("")}
      </div>
      <div class="calendar-grid">${cells.join("")}</div>
      <div class="calendar-agenda">
        ${agendaItems.length ? agendaItems.join("") : '<div class="calendar-empty">No tasks this month</div>'}
      </div>
    </div>
  `;

  bindCalendarEvents();
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
    const end = addDays(state.calendarDate, 6);
    return `${formatDate(start)} - ${formatDate(end)}`;
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
        ${tasks.length ? tasks.map(renderCalendarTask).join("") : '<div class="calendar-empty">No tasks</div>'}
      </div>
    </section>
  `;
}

function renderCalendarTask(task) {
  const title = `${task.path}: ${task.text}`;
  return `
    <button class="calendar-task ${task.checked ? "done" : ""} ${task.type}" type="button" data-path="${escapeAttribute(task.path)}" data-line="${task.line}" title="${escapeAttribute(title)}">
      <span>${taskTypeIcon(task.type)}</span>
      <span>${escapeHtml(task.text)}</span>
    </button>
  `;
}

function bindCalendarEvents() {
  els.calendarView.querySelectorAll("[data-calendar-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-calendar-action");
      if (action === "prev") state.calendarDate = shiftCalendarDate(-1);
      if (action === "next") state.calendarDate = shiftCalendarDate(1);
      if (action === "today") state.calendarDate = state.calendarMode === "month" ? startOfMonth(new Date()) : new Date();
      if (action === "toggle-mobile-mode") state.mobileCalendarMode = state.mobileCalendarMode === "agenda" ? "month" : "agenda";
      renderCalendar();
    });
  });

  els.calendarView.querySelectorAll("[data-calendar-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarMode = button.getAttribute("data-calendar-mode") || "month";
      if (state.calendarMode === "month") state.calendarDate = startOfMonth(state.calendarDate);
      if (state.calendarMode === "week" || state.calendarMode === "day") state.calendarDate = new Date();
      renderCalendar();
    });
  });

  els.calendarView.querySelectorAll(".calendar-task").forEach((button) => {
    bindTaskLongPress(button);
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

function bindTaskLongPress(button) {
  let timer = null;
  const clear = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };

  button.addEventListener("pointerdown", () => {
    const path = button.getAttribute("data-path");
    const line = Number(button.getAttribute("data-line"));
    timer = window.setTimeout(async () => {
      timer = null;
      button.dataset.longPressed = "true";
      await toggleCalendarTask(path, line, button);
    }, 650);
  });
  button.addEventListener("pointerup", clear);
  button.addEventListener("pointerleave", clear);
  button.addEventListener("pointercancel", clear);
}

async function toggleCalendarTask(path, lineNumber, button) {
  const node = state.files.get(path);
  if (!node?.handle || !Number.isInteger(lineNumber) || lineNumber < 1) {
    alert("실제 vault 파일에서만 완료 상태를 바꿀 수 있습니다.");
    return;
  }

  const granted = await ensureWritePermission(node.handle);
  if (!granted) {
    alert("파일 편집 권한이 필요합니다.");
    return;
  }

  showLoading("작업 상태 변경 중...");
  try {
    const content = await readFileNode(node);
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const index = lineNumber - 1;
    if (!lines[index] || !/^\s*[-*+]\s+\[[ xX-]\]/.test(lines[index])) return;

    const nextLine = lines[index].replace(/^(\s*[-*+]\s+\[)([ xX-])(\])/, (_, head, checked, tail) => {
      return `${head}${checked.toLowerCase() === "x" || checked === "-" ? " " : "x"}${tail}`;
    });
    lines[index] = nextLine;
    const nextContent = lines.join("\n");

    await writeBackupFile(node, content);
    await writeFileHandle(node.handle, nextContent);
    const metadata = await readFileMetadata(node.handle);
    Object.assign(node, metadata);
    refreshDirectoryMetadata();

    if (state.currentPath === path) {
      state.currentContent = nextContent;
      if (state.editMode) {
        setEditorValue(nextContent);
        markEditorDirty();
      } else {
        renderCurrentDocument();
      }
    }

    button.classList.toggle("done", /\[[xX-]\]/.test(nextLine));
    await refreshCalendarTasks({ showLoading: false });
  } finally {
    hideLoading();
  }
}

function bindDateClick(target) {
  target.addEventListener("click", async (event) => {
    if (event.target.closest(".calendar-task")) return;
    const date = target.getAttribute("data-calendar-date");
    await openDateEditor(date);
  });
}

async function openDateEditor(date) {
  if (!date || !state.rootHandle) {
    alert("실제 vault를 먼저 열어야 날짜 편집을 시작할 수 있습니다.");
    return;
  }

  const node = await getOrCreateDailyNote(date);
  await openFile(node.path);
  if (await enterEditMode()) appendTaskTemplate(date);
}

async function getOrCreateDailyNote(date) {
  const dirPath = normalizeDailyNotePath(els.dailyNotePathInput?.value || state.dailyNotePath);
  state.dailyNotePath = dirPath;
  localStorage.setItem("obsidian-web-viewer-daily-note-path", dirPath);
  const path = `${dirPath}/${date}.md`;
  const existing = state.files.get(path);
  if (existing) return existing;

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

function appendTaskTemplate(date) {
  const prefix = els.markdownEditor.value.endsWith("\n") ? "" : "\n";
  const taskLine = `${prefix}- [ ]  📅 ${date}`;
  const start = els.markdownEditor.value.length + prefix.length + "- [ ] ".length;
  els.markdownEditor.value += taskLine;
  els.markdownEditor.focus();
  els.markdownEditor.setSelectionRange(start, start);
}

function appendTaskTemplate(date) {
  const prefix = els.markdownEditor.value.endsWith("\n") ? "" : "\n";
  const taskLine = `${prefix}- [ ] ${date}`;
  const start = els.markdownEditor.value.length + prefix.length + "- [ ] ".length;
  els.markdownEditor.value += taskLine;
  els.markdownEditor.focus();
  els.markdownEditor.setSelectionRange(start, start);
  markEditorDirty();
}

function appendTaskTemplate(date) {
  const value = editorValue();
  const prefix = value.endsWith("\n") ? "" : "\n";
  const taskLine = `${prefix}- [ ] ${date}`;
  const start = value.length + prefix.length + "- [ ] ".length;
  setEditorValue(value + taskLine);
  focusEditor();
  setEditorCursorIndex(start);
  markEditorDirty();
}

function groupTasksByDate(tasks) {
  const map = new Map();
  tasks.forEach((task) => {
    if (!map.has(task.date)) map.set(task.date, []);
    map.get(task.date).push(task);
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

  if (frontmatter) html.push(renderFrontmatter(frontmatter));

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      html.push(`<pre${depthAttribute(currentDepth)}><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level} class="heading-level heading-level-${level}">${renderInline(heading[2])}</h${level}>`);
      currentDepth = level;
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

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("```") &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    html.push(`<p${depthAttribute(currentDepth)}>${renderInline(paragraph.join(" "))}</p>`);
  }

  return html.join("\n");
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
  return `<div class="frontmatter">${rows.join("")}</div>`;
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
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy">`);
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

function renderWikiLink(rawTarget) {
  const [target, alias] = rawTarget.split("|").map((value) => value.trim());
  const path = resolveVaultPath(target);
  const label = alias || target;
  if (!path) return `<span class="wiki-link missing">${escapeHtml(label)}</span>`;
  return `<a class="wiki-link" href="#" data-wiki="${escapeAttribute(path)}">${escapeHtml(label)}</a>`;
}

function renderEmbeddedDocumentContent(path, content) {
  if (isExcalidrawDocument(path)) return renderExcalidrawPreview(content, path, { embedded: true });
  return renderMarkdown(content);
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
      <div class="excalidraw-preview-body">${body}</div>
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
  const cached = state.objectUrls.get(path);
  if (cached) return cached;
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
