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

  return {
    canAddMindmapToCurrentDocument,
    contentForMindmapInsertion,
    appendMindmapEmbed,
  };
});
