function normalizeMindmapTopic(value, fallback = "Untitled") {
  const text = String(value || "")
    .replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => alt || src)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*>\s?/, "")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")
    .replace(/^\s*\[[ xX]\]\s+/, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
}

function stripMarkdownFrontmatter(markdown) {
  return String(markdown || "").replace(/^\s*---\n[\s\S]*?\n---\s*(?:\n|$)/, "");
}

function makeMindmapNode(topic) {
  return { topic: normalizeMindmapTopic(topic), children: [] };
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
  const lines = stripMarkdownFrontmatter(markdown).replace(/\r\n/g, "\n").split("\n");
  let rootTopic = "";
  const headingStack = [];
  const listStack = [];
  const root = { topic: "Mindmap", children: [] };
  let inFence = false;

  for (const raw of lines) {
    const fence = raw.match(/^\s*```/);
    if (fence) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = raw.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const topic = heading[2].trim();
      listStack.length = 0;
      if (!rootTopic) {
        rootTopic = topic;
        root.topic = normalizeMindmapTopic(rootTopic, "Mindmap");
        headingStack.length = 0;
        headingStack.push({ level, node: root });
        continue;
      }
      const node = makeMindmapNode(topic);
      while (headingStack.length && headingStack[headingStack.length - 1].level >= level) headingStack.pop();
      const parent = headingStack[headingStack.length - 1]?.node || root;
      parent.children.push(node);
      headingStack.push({ level, node });
      continue;
    }

    const bullet = raw.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.+?)\s*$/);
    if (bullet) {
      const depth = Math.floor(bullet[1].replace(/\t/g, "  ").length / 2);
      const node = makeMindmapNode(bullet[2]);
      const section = headingStack[headingStack.length - 1]?.node || root;
      const parent = depth === 0 ? section : (listStack[depth - 1] || section);
      parent.children.push(node);
      listStack[depth] = node;
      listStack.length = depth + 1;
      continue;
    }

    const paragraph = normalizeMindmapTopic(raw, "");
    if (!paragraph || /^[-:|]+$/.test(paragraph)) continue;
    listStack.length = 0;
    const parent = headingStack[headingStack.length - 1]?.node || root;
    parent.children.push(makeMindmapNode(paragraph));
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
