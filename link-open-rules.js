(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LinkOpenRules = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function resolveWikiLinkOpenMode({ forceNewTab = false, embeddedNote = false } = {}) {
    return forceNewTab || embeddedNote ? "new-tab" : "current-tab";
  }

  return {
    resolveWikiLinkOpenMode,
  };
});
