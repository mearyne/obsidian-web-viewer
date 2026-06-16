const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveTaskGesture, resolveDateGesture, thresholds } = require("../calendar-gesture-rules.js");

test("calendar task gestures", () => {
  assert.equal(resolveTaskGesture({ movedPx: 0, durationMs: 100 }), "open");
  assert.equal(resolveTaskGesture({ movedPx: thresholds.dragDistance - 1, durationMs: thresholds.longPressMs - 1 }), "open");
  assert.equal(resolveTaskGesture({ movedPx: 0, durationMs: thresholds.longPressMs }), "toggle");
  assert.equal(resolveTaskGesture({ movedPx: thresholds.dragDistance, durationMs: 100 }), "drag");
});

test("calendar date gestures", () => {
  assert.equal(resolveDateGesture({ movedPx: 0, durationMs: 100 }), "open");
  assert.equal(resolveDateGesture({ movedPx: thresholds.dragDistance - 1, durationMs: thresholds.longPressMs - 1 }), "open");
  assert.equal(resolveDateGesture({ movedPx: 0, durationMs: thresholds.longPressMs }), "create");
  assert.equal(resolveDateGesture({ movedPx: thresholds.dragDistance, durationMs: 100 }), "range");
});
