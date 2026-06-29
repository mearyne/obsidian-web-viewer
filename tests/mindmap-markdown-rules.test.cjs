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

test("imports document headings, lists, and paragraphs to mindmap data", () => {
  const data = MindmapMarkdownRules.markdownToMindmapData(`---
title: Ignored
---

# Project Plan

Intro paragraph with [[Wiki Link]].

## Goals

- Ship viewer
  - Keep original document
- [ ] Test task

## Notes

![[diagram.png]]
Plain note line.
`);

  assert.equal(data.data.topic, "Project Plan");
  assert.deepEqual(data.data.children.map((node) => node.topic), ["Intro paragraph with Wiki Link.", "Goals", "Notes"]);
  assert.deepEqual(data.data.children[1].children.map((node) => node.topic), ["Ship viewer", "Test task"]);
  assert.equal(data.data.children[1].children[0].children[0].topic, "Keep original document");
  assert.deepEqual(data.data.children[2].children.map((node) => node.topic), ["diagram.png", "Plain note line."]);
});
