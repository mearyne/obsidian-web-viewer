const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const server = fs.readFileSync("server.cjs", "utf8");
const clipperInline = fs.readFileSync("clipper-inline.js", "utf8");

test("web clipper resolves YouTube desktop and mobile pages through oEmbed", () => {
  const providerMatch = server.match(/\{\s*pattern:\s*(\/\^.*youtube.*?\/),\s*endpoint:\s*"https:\/\/www\.youtube\.com\/oembed"/);
  assert.ok(providerMatch, "Missing YouTube oEmbed provider");

  const pattern = eval(providerMatch[1]);
  assert.equal(pattern.test("www.youtube.com"), true);
  assert.equal(pattern.test("youtube.com"), true);
  assert.equal(pattern.test("youtu.be"), true);
  assert.equal(pattern.test("m.youtube.com"), true);
});

test("bookmarklet falls back to navigation save when browser blocks fetch", () => {
  assert.match(clipperInline, /function fallbackSaveByNavigation/);
  assert.match(clipperInline, /\/api\/clip-url\?/);
  assert.match(clipperInline, /fallbackSaveByNavigation\(savePath,\s*displayTitle,\s*pageUrl\)/);
});

test("server exposes a GET clip endpoint for bookmarklet navigation fallback", () => {
  assert.match(server, /requestPath === "\/api\/clip-url"/);
  assert.match(server, /clipUrlFromBookmarklet\(url\.searchParams,\s*res\)/);
  assert.match(server, /function clipUrlFromBookmarklet/);
});

test("bookmarklet navigation fallback enriches saved embeds on the server", () => {
  assert.match(server, /await fetchMetaWithOEmbed\(pageUrl\)/);
  assert.match(server, /title: "\$\{esc\(meta\?\.title \|\| title\)\}"/);
  assert.match(server, /description: "\$\{esc\(meta\?\.description \|\| ""\)\}"/);
});
