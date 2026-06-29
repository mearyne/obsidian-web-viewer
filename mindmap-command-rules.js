(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MindmapCommandRules = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function canAddMindmapToCurrentDocument({
    activeView,
    currentPath,
    currentContent,
    canEdit,
    isMindmap,
  } = {}) {
    return activeView === "note"
      && Boolean(currentPath)
      && /\.md$/i.test(String(currentPath))
      && !isMindmap
      && Boolean(canEdit)
      && typeof currentContent === "string";
  }

  function contentForMindmapInsertion({ currentContent = "", editorContent = "", editMode = false } = {}) {
    return editMode ? String(editorContent || "") : String(currentContent || "");
  }

  function appendMindmapEmbed(content, path) {
    return `${String(content || "").replace(/\s*$/u, "")}\n\n![[${path}]]\n`;
  }

  function resolveSaveShortcutTarget({
    activeView,
    activeTabPath,
    currentPath,
    editMode,
    canEdit,
    isMindmap,
    hasMindmapInstance,
    targetInMindmap = false,
    activeInMindmap = false,
    keyCaptureActive = false,
  } = {}) {
    if (!(editMode && canEdit)) return "none";
    if (!isMindmap) return "editor";
    const activeTabMatchesCurrent = !activeTabPath || !currentPath || activeTabPath === currentPath;
    if (activeView === "note" && activeTabMatchesCurrent && hasMindmapInstance) return "mindmap";
    if (hasMindmapInstance && (targetInMindmap || activeInMindmap || keyCaptureActive)) return "mindmap";
    return "none";
  }

  return {
    canAddMindmapToCurrentDocument,
    contentForMindmapInsertion,
    appendMindmapEmbed,
    resolveSaveShortcutTarget,
  };
});
