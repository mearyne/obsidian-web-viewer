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

function mindmapMarkdownImageUrl(target) {
  const value = String(target || "").trim();
  if (!value) return "";
  if (/^(?:https?:|data:|blob:|\/api\/)/i.test(value)) return value;
  return `/api/vault-file?path=${encodeURIComponent(value)}`;
}

function extractMindmapMarkdownImage(value) {
  const source = String(value || "").trim();
  const wiki = source.match(/^!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*(.*)$/);
  if (wiki) {
    const path = wiki[1].trim();
    return {
      path,
      label: normalizeMindmapTopic(wiki[2] || wiki[3], ""),
      fallbackLabel: normalizeMindmapTopic(path, ""),
    };
  }
  const markdown = source.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*(.*)$/);
  if (!markdown) return null;
  const path = markdown[2].trim();
  return {
    path,
    label: normalizeMindmapTopic(markdown[1] || markdown[3], ""),
    fallbackLabel: normalizeMindmapTopic(markdown[1] || path, ""),
  };
}

function makeMindmapNode(topic) {
  const image = extractMindmapMarkdownImage(topic);
  if (!image) return { topic: normalizeMindmapTopic(topic), children: [] };
  const url = mindmapMarkdownImageUrl(image.path);
  return {
    topic: image.label || image.fallbackLabel || "Image",
    image: url,
    fullImage: url,
    _imageTopicFallback: !image.label,
    children: [],
  };
}

function cleanupMindmapNode(node) {
  if (!node || typeof node !== "object") return node;
  delete node._imageTopicFallback;
  if (Array.isArray(node.children)) node.children.forEach(cleanupMindmapNode);
  return node;
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

    const continuation = raw.match(/^(\s+)(\S.*?)\s*$/);
    if (continuation && listStack.length) {
      const depth = Math.max(0, Math.floor(continuation[1].replace(/\t/g, "  ").length / 2) - 1);
      const target = listStack[depth] || listStack[listStack.length - 1];
      const text = normalizeMindmapTopic(continuation[2], "");
      if (target && text) {
        if (target._imageTopicFallback) {
          target.topic = text;
          delete target._imageTopicFallback;
        } else {
          target.topic = [target.topic, text].filter(Boolean).join(" ");
        }
      }
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
    Object.assign(root, only);
    root.children = only.children || [];
  }

  return {
    meta: { name: root.topic, author: "obsidian-web-viewer", version: "1.0" },
    format: "node_tree",
    data: cleanupMindmapNode(root),
  };
}

const MindmapMarkdownRules = { mindmapDataToMarkdown, markdownToMindmapData };

module.exports = { MindmapMarkdownRules };
