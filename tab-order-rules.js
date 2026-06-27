(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TabOrderRules = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function isEmptyNewTab(tab) {
    return Boolean(tab && tab.path === null && !tab.view);
  }

  function moveEmptyTabsToEnd(tabs) {
    if (!Array.isArray(tabs)) return tabs;
    const nonEmptyTabs = tabs.filter((tab) => !isEmptyNewTab(tab));
    const emptyTabs = tabs.filter(isEmptyNewTab);
    tabs.splice(0, tabs.length, ...nonEmptyTabs, ...emptyTabs);
    return tabs;
  }

  function normalizeTabsAfterChange(tabs) {
    return moveEmptyTabsToEnd(tabs);
  }

  function restoredTabKey(tab, index = 0) {
    if (!tab) return `missing:${index}`;
    if (tab.view === "calendar") return "view:calendar";
    if (tab.view === "merged" && tab.mergedRange?.start && tab.mergedRange?.end) {
      return `view:merged:${tab.mergedRange.start}:${tab.mergedRange.end}`;
    }
    if (tab.path) return `path:${tab.path}`;
    return `empty:${tab.id || index}`;
  }

  return {
    isEmptyNewTab,
    moveEmptyTabsToEnd,
    normalizeTabsAfterChange,
    restoredTabKey,
  };
});
