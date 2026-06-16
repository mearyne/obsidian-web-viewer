(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CalendarGestureRules = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const thresholds = {
    dragDistance: 10,
    longPressMs: 650,
  };

  function resolveTaskGesture({ movedPx = 0, durationMs = 0 } = {}) {
    if (movedPx >= thresholds.dragDistance) return "drag";
    if (durationMs >= thresholds.longPressMs) return "toggle";
    return "open";
  }

  function resolveDateGesture({ movedPx = 0, durationMs = 0 } = {}) {
    if (movedPx >= thresholds.dragDistance) return "range";
    if (durationMs >= thresholds.longPressMs) return "create";
    return "open";
  }

  return {
    thresholds,
    resolveTaskGesture,
    resolveDateGesture,
  };
});
