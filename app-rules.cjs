function normalizeMindmapTopic(value, fallback = "Untitled") {
  const text = String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
}

function mindmapDataToMarkdown(data) {
  const root = data?.data || data;
  const title = normalizeMindmapTopic(root?.topic || root?.text, "Mindmap");
  const lines = [`# ${title}`, ""];

  const visit = (node, depth) => {
    const indent = "  ".repeat(depth);
    lines.push(`${indent}- ${normalizeMindmapTopic(node?.topic || node?.text)}`);
    (node?.children || []).forEach((child) => visit(child, depth + 1));
  };

  (root?.children || []).forEach((child) => visit(child, 0));
  return `${lines.join("\n").replace(/\s+$/u, "")}\n`;
}

function markdownToMindmapData(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  let rootTopic = "";
  const stack = [];
  const root = { topic: "Mindmap", children: [] };

  for (const raw of lines) {
    const heading = raw.match(/^\s*#\s+(.+?)\s*$/);
    if (heading && !rootTopic) {
      rootTopic = heading[1].trim();
      root.topic = normalizeMindmapTopic(rootTopic, "Mindmap");
      continue;
    }

    const bullet = raw.match(/^(\s*)[-*+]\s+(.+?)\s*$/);
    if (!bullet) continue;

    const depth = Math.floor(bullet[1].replace(/\t/g, "  ").length / 2);
    const node = { topic: normalizeMindmapTopic(bullet[2]), children: [] };
    if (depth === 0 || !stack[depth - 1]) {
      root.children.push(node);
    } else {
      stack[depth - 1].children.push(node);
    }
    stack[depth] = node;
    stack.length = depth + 1;
  }

  if (!rootTopic && root.children.length === 1) {
    const only = root.children[0];
    root.topic = only.topic;
    root.children = only.children || [];
  }

  return {
    meta: { name: root.topic, author: "obsidian-web-viewer", version: "1.0" },
    format: "node_tree",
    data: root,
  };
}

const MindmapMarkdownRules = { mindmapDataToMarkdown, markdownToMindmapData };

module.exports = { MindmapMarkdownRules };
