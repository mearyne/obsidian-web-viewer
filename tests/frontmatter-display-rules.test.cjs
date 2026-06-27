const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeHideFrontmatter, shouldRenderFrontmatter } = require("../frontmatter-display-rules.js");

test("frontmatter is visible by default", () => {
  assert.equal(normalizeHideFrontmatter(undefined), false);
  assert.equal(shouldRenderFrontmatter("title: Note", false), true);
});

test("frontmatter is hidden when the option is enabled", () => {
  assert.equal(normalizeHideFrontmatter(true), true);
  assert.equal(normalizeHideFrontmatter("1"), true);
  assert.equal(shouldRenderFrontmatter("title: Note", true), false);
});

test("empty frontmatter is not rendered", () => {
  assert.equal(shouldRenderFrontmatter("", false), false);
  assert.equal(shouldRenderFrontmatter(null, false), false);
});
