(function (root, factory) {
  const rules = factory();
  if (typeof module === "object" && module.exports) module.exports = rules;
  root.FileExtensionFilterRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function normalizeExcludedExtensions(value) {
    const items = Array.isArray(value) ? value : String(value || "").split(/[\s,;]+/);
    const seen = new Set();
    return items
      .map((item) => String(item || "").trim().replace(/^\.+/, "").toLowerCase())
      .filter(Boolean)
      .filter((item) => {
        if (seen.has(item)) return false;
        seen.add(item);
        return true;
      });
  }

  function fileExtension(pathOrName) {
    const name = String(pathOrName || "").split(/[\\/]/).pop() || "";
    const match = name.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : "";
  }

  function isExcludedByExtension(pathOrName, excludedExtensions) {
    const ext = fileExtension(pathOrName);
    if (!ext) return false;
    return normalizeExcludedExtensions(excludedExtensions).includes(ext);
  }

  return {
    normalizeExcludedExtensions,
    fileExtension,
    isExcludedByExtension,
  };
});
