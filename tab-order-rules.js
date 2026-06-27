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

  function selectOpenTabsForRestore(allDeviceTabs, deviceId) {
    const entries = Object.entries(allDeviceTabs || {})
      .filter(([, entry]) => Array.isArray(entry?.openTabs?.tabs) && entry.openTabs.tabs.length);
    const ownEntry = allDeviceTabs?.[deviceId];
    if (Array.isArray(ownEntry?.openTabs?.tabs) && ownEntry.openTabs.tabs.length) return ownEntry.openTabs;
    entries.sort(([, a], [, b]) => (Number(b?.updatedAt) || 0) - (Number(a?.updatedAt) || 0));
    return entries[0]?.[1]?.openTabs || null;
  }

  return {
    isEmptyNewTab,
    moveEmptyTabsToEnd,
    normalizeTabsAfterChange,
    restoredTabKey,
    selectOpenTabsForRestore,
  };
});
