const assert = require("node:assert/strict");
const test = require("node:test");

const {
  normalizeExcludedExtensions,
  isExcludedByExtension,
} = require("../file-extension-filter-rules.js");

test("normalizes excluded extensions from commas, spaces, semicolons, and dots", () => {
  assert.deepEqual(normalizeExcludedExtensions(".png, JPG gif\nwebp; .png"), ["png", "jpg", "gif", "webp"]);
});

test("matches file extensions case-insensitively", () => {
  assert.equal(isExcludedByExtension("Assets/Image.PNG", ["png"]), true);
  assert.equal(isExcludedByExtension("Notes/Entry.md", ["png"]), false);
});
