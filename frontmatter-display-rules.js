(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.FrontmatterDisplayRules = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function normalizeHideFrontmatter(value, fallback = false) {
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return Boolean(fallback);
  }

  function shouldRenderFrontmatter(frontmatter, hideFrontmatter = false) {
    return Boolean(String(frontmatter || "").trim()) && !normalizeHideFrontmatter(hideFrontmatter);
  }

  return {
    normalizeHideFrontmatter,
    shouldRenderFrontmatter,
  };
});
