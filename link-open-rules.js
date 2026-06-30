(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LinkOpenRules = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function resolveWikiLinkOpenMode({ forceNewTab = false, embeddedNote = false, mergedDocument = false, mindmapEmbed = false, targetMindmap = false } = {}) {
    if (mindmapEmbed || targetMindmap) return "current-tab";
    return forceNewTab || embeddedNote || mergedDocument ? "new-tab" : "current-tab";
  }

  return {
    resolveWikiLinkOpenMode,
  };
});
