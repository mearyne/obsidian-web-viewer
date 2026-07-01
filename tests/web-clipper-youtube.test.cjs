const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const server = fs.readFileSync("server.cjs", "utf8");

test("web clipper resolves YouTube desktop and mobile pages through oEmbed", () => {
  const providerMatch = server.match(/\{\s*pattern:\s*(\/\^.*youtube.*?\/),\s*endpoint:\s*"https:\/\/www\.youtube\.com\/oembed"/);
  assert.ok(providerMatch, "Missing YouTube oEmbed provider");

  const pattern = eval(providerMatch[1]);
  assert.equal(pattern.test("www.youtube.com"), true);
  assert.equal(pattern.test("youtube.com"), true);
  assert.equal(pattern.test("youtu.be"), true);
  assert.equal(pattern.test("m.youtube.com"), true);
});
