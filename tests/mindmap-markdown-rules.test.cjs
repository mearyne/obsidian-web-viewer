const test = require("node:test");
const assert = require("node:assert/strict");

const { MindmapMarkdownRules } = require("../app-rules.cjs");

test("exports mindmap tree to markdown bullets", () => {
  const data = {
    data: {
      topic: "Root",
      children: [
        { topic: "Child A", children: [{ topic: "Grandchild", children: [] }] },
        { topic: "Child B", children: [] },
      ],
    },
  };

  assert.equal(
    MindmapMarkdownRules.mindmapDataToMarkdown(data),
    "# Root\n\n- Child A\n  - Grandchild\n- Child B\n",
  );
});

test("imports markdown bullets to mindmap data", () => {
  const data = MindmapMarkdownRules.markdownToMindmapData("# Root\n\n- Child A\n  - Grandchild\n- Child B\n");

  assert.equal(data.data.topic, "Root");
  assert.deepEqual(data.data.children.map((node) => node.topic), ["Child A", "Child B"]);
  assert.equal(data.data.children[0].children[0].topic, "Grandchild");
});
