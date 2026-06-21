const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const { Readability } = require("@mozilla/readability");
const { parseHTML } = require("linkedom");

// Setup browser-like globals required by defuddle
const { window: _lwin, document: _ldoc, DOMParser: _DOMParser } = parseHTML("<html><body></body></html>");
global.window = _lwin;
global.document = _ldoc;
global.DOMParser = _DOMParser;
const { createMarkdownContent } = require("defuddle/full");

const root = __dirname;
const bundledSampleRoot = path.join(root, "sample-vault");
const configuredVaultRoot = process.env.VAULT_PATH || process.env.OBSIDIAN_VAULT_PATH || process.env.OBSIDIAN_VALUT_PATH;
const resolvedVaultRoot = configuredVaultRoot ? path.resolve(configuredVaultRoot) : "";
const vaultRoot = resolvedVaultRoot || (fs.existsSync("/vault") ? "/vault" : bundledSampleRoot);
const vaultName = process.env.VAULT_NAME || path.basename(vaultRoot) || "vault";
const readOnly = process.env.VAULT_READ_ONLY === "true";
const calendarCacheRoot = path.resolve(process.env.CALENDAR_CACHE_DIR || "/cache");
const holidayApiKey = process.env.HOLIDAY_API_KEY || "";
const port = Number(process.env.PORT || 8088);
const host = process.env.HOST || "0.0.0.0";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const sseClients = new Set();
const BUILD_ID = Date.now().toString(36);
const TEXT_FILE_CACHE_LIMIT = 512;
const TEXT_FILE_CACHE_MAX_BYTES = 1024 * 1024;
const textFileCache = new Map();
const DEVICE_TABS_VAULT_PATH = ".viewer-open-tabs.json";
const DEVICE_TABS_STALE_MS = 2 * 60 * 60 * 1000;
const PINNED_TABS_VAULT_PATH = ".viewer-pinned-tabs.json";

// Vault file list cache — avoids statSync on every browser load.
// Invalidated on any write/rename/delete via the API.
let vaultFilesCache = null;
let vaultFilesCachedAt = 0;
const VAULT_FILES_CACHE_TTL = 60_000; // re-stat after 60 s as a safety net

function invalidateVaultFilesCache() {
  vaultFilesCache = null;
}

function broadcastVaultEvent(event, data) {
  if (event === "file-changed" || event === "file-renamed" || event === "file-deleted") {
    invalidateVaultFilesCache();
  }
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch {}
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const requestPath = decodeURIComponent(url.pathname);

  if (requestPath === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`event: build-id\ndata: ${JSON.stringify({ id: BUILD_ID })}\n\n`);
    sseClients.add(res);
    const keepAlive = setInterval(() => { try { res.write(":\n\n"); } catch {} }, 25000);
    req.on("close", () => { sseClients.delete(res); clearInterval(keepAlive); });
    return;
  }

  if (requestPath === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (requestPath === "/api/device-tabs") {
    if (req.method === "PUT") {
      receiveBody(req, (error, body) => {
        if (error) {
          sendJson(res, 400, { error: "Invalid request body" });
          return;
        }
        updateDeviceTabs(body, res);
      });
      return;
    }

    sendDeviceTabs(res);
    return;
  }

  if (requestPath === "/api/pinned-tabs") {
    if (req.method === "PUT") {
      receiveBody(req, (error, body) => {
        if (error) {
          sendJson(res, 400, { error: "Invalid request body" });
          return;
        }
        updatePinnedTabs(body, res);
      });
      return;
    }

    sendPinnedTabs(res);
    return;
  }

  if (requestPath === "/api/vault") {
    sendVault(res, vaultRoot, vaultName);
    return;
  }

  if (requestPath === "/api/sample-vault") {
    sendVault(res, bundledSampleRoot, "sample-vault");
    return;
  }

  if (requestPath === "/api/vault-file") {
    if (req.method === "DELETE") {
      deleteVaultFile(url.searchParams.get("path"), res);
      return;
    }

    if (req.method === "PATCH") {
      receiveBody(req, (error, body) => {
        if (error) { sendJson(res, 400, { error: "Invalid request body" }); return; }
        renameVaultFile(url.searchParams.get("path"), body, res);
      });
      return;
    }

    if (req.method === "PUT") {
      receiveBody(req, (error, body) => {
        if (error) {
          sendJson(res, 400, { error: "Invalid request body" });
          return;
        }
        writeVaultFile(url.searchParams.get("path"), body, res);
      });
      return;
    }

    sendVaultFile(url.searchParams.get("path"), res);
    return;
  }

  if (requestPath === "/api/vault-binary-file") {
    if (req.method === "PUT") {
      const contentType = req.headers["content-type"] || "";
      if (contentType.startsWith("application/json")) {
        receiveBody(req, (error, body) => {
          if (error) { sendJson(res, 400, { error: "Invalid request body" }); return; }
          writeBinaryVaultFile(url.searchParams.get("path"), body, res);
        });
      } else {
        receiveBinaryBody(req, (error, buffer) => {
          if (error) { sendJson(res, 400, { error: "Invalid request body" }); return; }
          writeBinaryVaultFileDirect(url.searchParams.get("path"), buffer, res);
        });
      }
      return;
    }
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (requestPath === "/api/vault-image-thumb") {
    sendVaultImageThumbnail(url.searchParams.get("path"), url.searchParams.get("width"), res);
    return;
  }

  if (requestPath === "/api/calendar-cache") {
    if (req.method === "PUT") {
      receiveBody(req, (error, body) => {
        if (error) {
          sendJson(res, 400, { error: "Invalid request body" });
          return;
        }
        writeCalendarCache(url.searchParams.get("key"), body, res);
      });
      return;
    }

    sendCalendarCache(url.searchParams.get("key"), res);
    return;
  }

  if (requestPath === "/api/settings") {
    if (req.method === "PUT") {
      receiveBody(req, (error, body) => {
        if (error) {
          sendJson(res, 400, { error: "Invalid request body" });
          return;
        }
        writeSettings(body, res);
      });
      return;
    }

    sendSettings(res);
    return;
  }

  if (requestPath === "/api/holidays") {
    sendHolidays(url.searchParams.get("year"), res);
    return;
  }

  if (requestPath === "/api/search") {
    searchVaultContent(url.searchParams.get("q") || "", url.searchParams.get("limit"), res);
    return;
  }

  if (requestPath === "/api/fetch-clip") {
    const targetUrl = url.searchParams.get("url") || "";
    fetchAndParseUrl(targetUrl, res);
    return;
  }

  if (requestPath === "/api/clip-bookmarklet") {
    sendClipBookmarklet(url.searchParams.get("folder") || "Clippings", req, res);
    return;
  }

  if (requestPath === "/api/clip") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    if (req.method !== "POST") { sendJsonCors(res, 405, { error: "Method not allowed" }); return; }
    receiveBody(req, (error, body) => {
      if (error) { sendJsonCors(res, 400, { error: "Invalid request body" }); return; }
      clipWebPage(body, res);
    });
    return;
  }

  const filePath = path.normalize(path.join(root, requestPath === "/" ? "index.html" : requestPath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Local:   http://127.0.0.1:${port}/`);
  getLanAddresses().forEach((address) => {
    console.log(`Network: http://${address}:${port}/`);
  });
});

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => item.address);
}

function sendVault(res, sourceRoot, name) {
  const now = Date.now();
  if (vaultFilesCache && now - vaultFilesCachedAt < VAULT_FILES_CACHE_TTL) {
    sendJson(res, 200, { name, writable: !readOnly, files: vaultFilesCache });
    return;
  }

  fs.readdir(sourceRoot, { withFileTypes: true }, (error) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Vault not found" }));
      return;
    }

    const createdTimes = readCreatedTimes();
    vaultFilesCache = readVaultFiles(sourceRoot, "", createdTimes);
    vaultFilesCachedAt = Date.now();
    writeCreatedTimes(createdTimes);
    sendJson(res, 200, { name, writable: !readOnly, files: vaultFilesCache });
  });
}

function readVaultFiles(dir, prefix, createdTimes) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith(".") || entry.name === ".attachments")
    .flatMap((entry) => {
      const absolute = path.join(dir, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) return readVaultFiles(absolute, relative, createdTimes);
      if (!entry.isFile() || !isIndexedFile(entry.name)) return [];

      const stat = fs.statSync(absolute);
      const item = {
        path: relative,
        size: stat.size,
        updatedAt: stat.mtimeMs,
        createdAt: stableCreatedAt(relative, stat, createdTimes),
      };

      if (!isTextVaultFile(entry.name)) {
        item.url = `/api/vault-file?path=${encodeURIComponent(relative)}`;
      }

      return [item];
    });
}

function stableCreatedAt(relativePath, stat, createdTimes) {
  const previous = Number(createdTimes[relativePath]);
  if (Number.isFinite(previous) && previous > 0) return previous;
  const createdAt = createdAtFromStat(stat);
  createdTimes[relativePath] = createdAt;
  return createdAt;
}

function createdAtFromStat(stat) {
  const birth = Number(stat.birthtimeMs);
  const changed = Number(stat.ctimeMs);
  const modified = Number(stat.mtimeMs);
  if (Number.isFinite(birth) && birth > 0) {
    const birthLooksLikeModified = Number.isFinite(modified) && Math.abs(birth - modified) < 2;
    const changedLooksUseful = Number.isFinite(changed) && changed > 0 && Math.abs(changed - modified) >= 2;
    return birthLooksLikeModified && changedLooksUseful ? changed : birth;
  }
  if (Number.isFinite(changed) && changed > 0) return changed;
  return Number.isFinite(modified) ? modified : 0;
}

function sendVaultFile(requestedPath, res) {
  const safePath = normalizeVaultPath(requestedPath || "");
  const filePath = resolveVaultFilePath(requestedPath);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const cacheKey = `${safePath}:${stat.mtimeMs}:${stat.size}`;
  const contentType = types[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const cached = textFileCache.get(cacheKey);
  if (cached) {
    textFileCache.delete(cacheKey);
    textFileCache.set(cacheKey, cached);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
      "X-OWV-File-Cache": "hit",
    });
    res.end(cached);
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    if (isTextVaultFile(safePath) && data.length <= TEXT_FILE_CACHE_MAX_BYTES) {
      rememberTextFileCache(cacheKey, data);
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
      "X-OWV-File-Cache": "miss",
    });
    res.end(data);
  });
}

function rememberTextFileCache(cacheKey, data) {
  textFileCache.set(cacheKey, data);
  while (textFileCache.size > TEXT_FILE_CACHE_LIMIT) {
    const firstKey = textFileCache.keys().next().value;
    if (!firstKey) break;
    textFileCache.delete(firstKey);
  }
}

function forgetTextFileCache(safePath) {
  const prefix = `${safePath}:`;
  for (const key of textFileCache.keys()) {
    if (key.startsWith(prefix)) textFileCache.delete(key);
  }
}

function sendDeviceTabs(res) {
  sendJsonNoStore(res, 200, pruneDeviceTabs(readDeviceTabs()));
}

function updateDeviceTabs(body, res) {
  if (readOnly) {
    sendJson(res, 403, { error: "Vault is read-only" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }

  const deviceId = typeof payload.deviceId === "string" ? payload.deviceId.slice(0, 120) : "";
  if (!deviceId) {
    sendJson(res, 400, { error: "deviceId required" });
    return;
  }

  const tabs = Array.isArray(payload.tabs)
    ? payload.tabs
        .filter((tab) => tab && typeof tab.path === "string")
        .slice(0, 100)
        .map((tab) => ({
          path: normalizeVaultPath(tab.path).slice(0, 1024),
          title: typeof tab.title === "string" ? tab.title.slice(0, 300) : "",
        }))
        .filter((tab) => tab.path)
    : [];

  const allDeviceTabs = pruneDeviceTabs(readDeviceTabs());
  const now = Date.now();
  const deviceName = typeof payload.deviceName === "string" ? payload.deviceName.slice(0, 120) : "";
  allDeviceTabs[deviceId] = { tabs, updatedAt: now, deviceName };

  try {
    const filePath = resolveVaultFilePath(DEVICE_TABS_VAULT_PATH);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(allDeviceTabs, null, 2), "utf8");
    forgetTextFileCache(DEVICE_TABS_VAULT_PATH);
    sendJsonNoStore(res, 200, allDeviceTabs);
    broadcastVaultEvent("device-tabs-changed", { updatedAt: now });
    broadcastVaultEvent("file-changed", { path: DEVICE_TABS_VAULT_PATH, updatedAt: now });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Device tabs write failed" });
  }
}

function readDeviceTabs() {
  try {
    const filePath = resolveVaultFilePath(DEVICE_TABS_VAULT_PATH);
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function pruneDeviceTabs(allDeviceTabs) {
  const now = Date.now();
  const pruned = {};
  for (const [id, entry] of Object.entries(allDeviceTabs || {})) {
    const updatedAt = Number(entry?.updatedAt || 0);
    if (!id || !Number.isFinite(updatedAt) || now - updatedAt > DEVICE_TABS_STALE_MS) continue;
    pruned[id] = {
      tabs: Array.isArray(entry?.tabs) ? entry.tabs : [],
      updatedAt,
      deviceName: typeof entry?.deviceName === "string" ? entry.deviceName : "",
    };
  }
  return pruned;
}

function sendPinnedTabs(res) {
  sendJsonNoStore(res, 200, readPinnedTabs());
}

function updatePinnedTabs(body, res) {
  if (readOnly) {
    sendJson(res, 403, { error: "Vault is read-only" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }

  let pinned = readPinnedTabs();
  if (Array.isArray(payload.pinned)) {
    pinned = normalizePinnedTabs(payload.pinned);
  } else {
    const pinnedTab = normalizePinnedTabs([payload])[0];
    if (!pinnedTab) {
      sendJson(res, 400, { error: "pinned tab required" });
      return;
    }
    const key = pinnedTabKey(pinnedTab);
    pinned = pinned.filter((tab) => pinnedTabKey(tab) !== key);
    if (payload.action !== "unpin") {
      pinned.push(pinnedTab);
    }
  }

  try {
    const filePath = resolveVaultFilePath(PINNED_TABS_VAULT_PATH);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(pinned, null, 2), "utf8");
    forgetTextFileCache(PINNED_TABS_VAULT_PATH);
    sendJsonNoStore(res, 200, pinned);
    const updatedAt = Date.now();
    broadcastVaultEvent("pinned-tabs-changed", { updatedAt });
    broadcastVaultEvent("file-changed", { path: PINNED_TABS_VAULT_PATH, updatedAt });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Pinned tabs write failed" });
  }
}

function readPinnedTabs() {
  try {
    const filePath = resolveVaultFilePath(PINNED_TABS_VAULT_PATH);
    return normalizePinnedTabs(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch {
    return [];
  }
}

function normalizePinnedTabs(value) {
  const seen = new Set();
  const items = Array.isArray(value) ? value : [];
  return items
    .filter((tab) => tab && (typeof tab.path === "string" || tab.view === "calendar"))
    .map((tab) => ({
      path: normalizeVaultPath(tab.path || "").slice(0, 1024),
      title: typeof tab.title === "string" ? tab.title.slice(0, 300) : "",
      view: tab.view === "calendar" ? "calendar" : null,
      calendarKind: ["tasks", "created", "updated", "matrix"].includes(tab.calendarKind) ? tab.calendarKind : null,
    }))
    .filter((tab) => {
      const key = pinnedTabKey(tab);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 100);
}

function pinnedTabKey(tab) {
  if (tab?.view === "calendar") return "view:calendar";
  return tab?.path ? `path:${tab.path}` : "";
}

function writeVaultFile(requestedPath, body, res) {
  if (readOnly) {
    sendJson(res, 403, { error: "Vault is read-only" });
    return;
  }

  const safePath = normalizeVaultPath(requestedPath || "");
  const filePath = resolveVaultFilePath(safePath);
  if (!filePath || !isTextVaultFile(safePath)) {
    sendJson(res, 403, { error: "Invalid vault file path" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }

  if (typeof payload.content !== "string") {
    sendJson(res, 400, { error: "Missing content" });
    return;
  }

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const createdTimes = readCreatedTimes();
    const existingStat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    const previousCreatedAt = Number(createdTimes[safePath]) || (existingStat ? createdAtFromStat(existingStat) : 0);
    if (fs.existsSync(filePath) && payload.backup !== false) {
      fs.copyFileSync(filePath, `${filePath}.bak`);
    }
    fs.writeFileSync(filePath, payload.content, "utf8");
    forgetTextFileCache(safePath);
    const stat = fs.statSync(filePath);
    createdTimes[safePath] = previousCreatedAt || createdAtFromStat(stat);
    writeCreatedTimes(createdTimes);
    const result = {
      path: safePath,
      size: stat.size,
      updatedAt: stat.mtimeMs,
      createdAt: previousCreatedAt || createdAtFromStat(stat),
    };
    sendJson(res, 200, result);
    broadcastVaultEvent("file-changed", { path: safePath, updatedAt: stat.mtimeMs });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Write failed" });
  }
}

function sendCalendarCache(key, res) {
  const filePath = calendarCacheFilePath(key);
  if (!filePath) {
    sendJson(res, 400, { error: "Invalid cache key" });
    return;
  }

  fs.readFile(filePath, "utf8", (error, data) => {
    if (error) {
      sendJson(res, 404, { error: "Calendar cache not found" });
      return;
    }

    try {
      const cached = JSON.parse(data);
      sendJson(res, 200, cached);
    } catch {
      sendJson(res, 500, { error: "Calendar cache is corrupted" });
    }
  });
}

function searchVaultContent(query, limitStr, res) {
  if (!vaultRoot || !query || query.length < 2) {
    sendJson(res, 200, []);
    return;
  }

  const limit = Math.min(parseInt(limitStr, 10) || 30, 100);
  const lowerQuery = query.toLowerCase();
  const results = [];

  function walkDir(dir) {
    if (results.length >= limit) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (results.length >= limit) break;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".")) walkDir(fullPath);
        continue;
      }
      if (!/\.md$/i.test(entry.name)) continue;
      let content;
      try { content = fs.readFileSync(fullPath, "utf8"); } catch { continue; }
      const lower = content.toLowerCase();
      const idx = lower.indexOf(lowerQuery);
      if (idx === -1) continue;
      const start = Math.max(0, idx - 40);
      const end = Math.min(content.length, idx + query.length + 80);
      const snippet = (start > 0 ? "…" : "") + content.slice(start, end).replace(/\n/g, " ").trim() + (end < content.length ? "…" : "");
      const relativePath = path.relative(vaultRoot, fullPath).replace(/\\/g, "/");
      results.push({ path: relativePath, snippet });
    }
  }

  walkDir(vaultRoot);
  sendJson(res, 200, results);
}

function writeBinaryVaultFile(requestedPath, body, res) {
  if (readOnly) {
    sendJson(res, 403, { error: "Vault is read-only" });
    return;
  }

  const safePath = normalizeVaultPath(requestedPath || "");
  if (!safePath || !/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(safePath)) {
    sendJson(res, 403, { error: "Invalid image file path" });
    return;
  }

  const filePath = resolveVaultFilePath(safePath);
  if (!filePath) {
    sendJson(res, 403, { error: "Forbidden path" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }

  if (typeof payload.base64 !== "string") {
    sendJson(res, 400, { error: "Missing base64" });
    return;
  }

  try {
    const buffer = Buffer.from(payload.base64, "base64");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    const stat = fs.statSync(filePath);
    sendJson(res, 200, { path: safePath, size: stat.size });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Write failed" });
  }
}

function writeCalendarCache(key, body, res) {
  const filePath = calendarCacheFilePath(key);
  if (!filePath) {
    sendJson(res, 400, { error: "Invalid cache key" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }

  if (!Array.isArray(payload.tasks)) {
    sendJson(res, 400, { error: "Missing tasks" });
    return;
  }

  const cached = {
    version: 1,
    key,
    syncedAt: Number(payload.syncedAt || Date.now()),
    tasks: payload.tasks,
  };
  if (Array.isArray(payload.updated)) cached.updated = payload.updated;
  if (Array.isArray(payload.created)) cached.created = payload.created;
  if (Array.isArray(payload.files)) cached.files = normalizeCalendarCacheFiles(payload.files);

  try {
    fs.mkdirSync(calendarCacheRoot, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(cached), "utf8");
    sendJson(res, 200, { ok: true, syncedAt: cached.syncedAt });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Calendar cache write failed" });
  }
}

function renameVaultFile(requestedPath, body, res) {
  if (readOnly) { sendJson(res, 403, { error: "Vault is read-only" }); return; }
  let parsed;
  try { parsed = JSON.parse(body || "{}"); } catch { sendJson(res, 400, { error: "Invalid JSON" }); return; }
  const newName = (parsed.newName || "").replace(/[/\\:*?"<>|]/g, "").trim();
  if (!newName) { sendJson(res, 400, { error: "newName required" }); return; }
  const safePath = normalizeVaultPath(requestedPath || "");
  const oldFull = resolveVaultFilePath(safePath);
  if (!oldFull || !isIndexedFile(safePath)) { sendJson(res, 403, { error: "Invalid vault file path" }); return; }
  const dir = path.dirname(oldFull);
  const newFull = path.resolve(dir, newName);
  if (!newFull.startsWith(vaultRoot + path.sep) && newFull !== vaultRoot) { sendJson(res, 403, { error: "Invalid target path" }); return; }
  const newSafePath = normalizeVaultPath(path.relative(vaultRoot, newFull));
  try {
    fs.renameSync(oldFull, newFull);
    forgetTextFileCache(safePath);
    const createdTimes = readCreatedTimes();
    if (createdTimes[safePath]) { createdTimes[newSafePath] = createdTimes[safePath]; delete createdTimes[safePath]; }
    writeCreatedTimes(createdTimes);
    sendJson(res, 200, { ok: true, path: newSafePath });
    broadcastVaultEvent("file-renamed", { oldPath: safePath, path: newSafePath });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Rename failed" });
  }
}

function deleteVaultFile(requestedPath, res) {
  if (readOnly) {
    sendJson(res, 403, { error: "Vault is read-only" });
    return;
  }

  const safePath = normalizeVaultPath(requestedPath || "");
  const filePath = resolveVaultFilePath(safePath);
  if (!filePath || !isIndexedFile(safePath)) {
    sendJson(res, 403, { error: "Invalid vault file path" });
    return;
  }

  try {
    fs.unlinkSync(filePath);
    forgetTextFileCache(safePath);
    const createdTimes = readCreatedTimes();
    delete createdTimes[safePath];
    writeCreatedTimes(createdTimes);
    sendJson(res, 200, { ok: true, path: safePath });
    broadcastVaultEvent("file-deleted", { path: safePath });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Delete failed" });
  }
}

function normalizeCalendarCacheFiles(files) {
  return files
    .filter((file) => file && typeof file.path === "string")
    .slice(0, 20000)
    .map((file) => ({
      path: normalizeVaultPath(file.path).slice(0, 1024),
      updatedAt: Number(file.updatedAt || 0),
      size: Number(file.size || 0),
    }))
    .filter((file) => file.path);
}

function sendSettings(res) {
  fs.readFile(settingsFilePath(), "utf8", (error, data) => {
    if (error) {
      sendJson(res, 200, normalizeSettings({}));
      return;
    }

    try {
      const settings = JSON.parse(data);
      sendJson(res, 200, normalizeSettings(settings));
    } catch {
      sendJson(res, 200, normalizeSettings({}));
    }
  });
}

async function sendVaultImageThumbnail(requestedPath, widthValue, res) {
  const safePath = normalizeVaultPath(requestedPath || "");
  const filePath = resolveVaultFilePath(safePath);
  if (!filePath || !isRasterThumbnailFile(safePath)) {
    sendJson(res, 403, { error: "Invalid image path" });
    return;
  }

  const width = Math.max(80, Math.min(640, Number(widthValue) || 320));
  try {
    const stat = fs.statSync(filePath);
    const cachePath = thumbnailCacheFilePath(safePath, stat, width);
    if (!fs.existsSync(cachePath)) {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      await sharp(filePath)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 32, effort: 4 })
        .toFile(cachePath);
    }

    res.writeHead(200, {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
    });
    fs.createReadStream(cachePath).pipe(res);
  } catch (error) {
    sendVaultFile(safePath, res);
  }
}

function writeSettings(body, res) {
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }

  const settings = normalizeSettings(payload);
  try {
    fs.mkdirSync(calendarCacheRoot, { recursive: true });
    fs.writeFileSync(settingsFilePath(), JSON.stringify(settings), "utf8");
    sendJson(res, 200, settings);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Settings write failed" });
  }
}

function normalizeSettings(settings) {
  return {
    version: 1,
    calendarPaths: typeof settings?.calendarPaths === "string" ? settings.calendarPaths.slice(0, 4096) : "",
    randomPaths: typeof settings?.randomPaths === "string" ? settings.randomPaths.slice(0, 4096) : "",
    dailyNotePath: typeof settings?.dailyNotePath === "string" ? settings.dailyNotePath.slice(0, 512) : "",
    newNotePath: typeof settings?.newNotePath === "string" ? settings.newNotePath.slice(0, 512) : "",
    imagePath: typeof settings?.imagePath === "string" ? settings.imagePath.slice(0, 512) : "",
    searchExclude: typeof settings?.searchExclude === "string" ? settings.searchExclude.slice(0, 4096) : "",
  };
}

function settingsFilePath() {
  return path.join(calendarCacheRoot, "settings.json");
}

function readCreatedTimes() {
  try {
    const value = JSON.parse(fs.readFileSync(createdTimesFilePath(), "utf8"));
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeCreatedTimes(createdTimes) {
  try {
    fs.mkdirSync(calendarCacheRoot, { recursive: true });
    fs.writeFileSync(createdTimesFilePath(), JSON.stringify(createdTimes), "utf8");
  } catch {
    // Creation-time metadata is best-effort.
  }
}

function createdTimesFilePath() {
  return path.join(calendarCacheRoot, "created-times.json");
}

async function sendHolidays(yearValue, res) {
  const year = Number(yearValue);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    sendJson(res, 400, { error: "Invalid year" });
    return;
  }

  const cached = readHolidayCache(year);
  if (!holidayApiKey) {
    sendJson(res, 200, { year, holidays: cached?.holidays || [], disabled: true, cached: Boolean(cached) });
    return;
  }

  try {
    const holidays = await fetchKoreanHolidays(year);
    writeHolidayCache(year, holidays);
    sendJson(res, 200, { year, holidays, syncedAt: Date.now(), cached: false });
  } catch (error) {
    if (cached) {
      sendJson(res, 200, { year, holidays: cached.holidays, syncedAt: cached.syncedAt, cached: true, error: error.message || "Holiday API failed" });
      return;
    }
    sendJson(res, 502, { year, holidays: [], error: error.message || "Holiday API failed" });
  }
}

async function fetchKoreanHolidays(year) {
  const url = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo?ServiceKey=${serviceKeyQueryValue(holidayApiKey)}&solYear=${year}&numOfRows=100&pageNo=1`;
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok) throw new Error(`Holiday API HTTP ${response.status}`);
  const resultCode = xmlValue(body, "resultCode");
  if (resultCode && resultCode !== "00") throw new Error(xmlValue(body, "resultMsg") || `Holiday API result ${resultCode}`);
  return parseHolidayItems(body);
}

function serviceKeyQueryValue(key) {
  return /%[0-9a-f]{2}/i.test(key) ? key : encodeURIComponent(key);
}

function parseHolidayItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((match) => ({
      date: formatHolidayDate(xmlValue(match[1], "locdate")),
      name: xmlValue(match[1], "dateName"),
      isHoliday: xmlValue(match[1], "isHoliday") === "Y",
    }))
    .filter((item) => item.date && item.name && item.isHoliday);
}

function xmlValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`));
  return match ? decodeXml(match[1].trim()) : "";
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function formatHolidayDate(value) {
  const text = String(value || "");
  if (!/^\d{8}$/.test(text)) return "";
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function readHolidayCache(year) {
  const filePath = holidayCacheFilePath(year);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeHolidayCache(year, holidays) {
  const filePath = holidayCacheFilePath(year);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ version: 1, year, syncedAt: Date.now(), holidays }), "utf8");
}

function holidayCacheFilePath(year) {
  return path.join(calendarCacheRoot, `holidays-${year}.json`);
}

function thumbnailCacheFilePath(relativePath, stat, width) {
  const key = `${relativePath}:${stat.mtimeMs}:${stat.size}:${width}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return path.join(calendarCacheRoot, "thumbnails", `${hash}.webp`);
}

function calendarCacheFilePath(key) {
  if (!key || typeof key !== "string" || key.length > 512) return "";
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return path.join(calendarCacheRoot, `${hash}.json`);
}

function receiveBody(req, callback) {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 25 * 1024 * 1024) {
      req.destroy();
      callback(new Error("Body too large"));
    }
  });
  req.on("end", () => callback(null, body));
  req.on("error", callback);
}

function receiveBinaryBody(req, callback) {
  const chunks = [];
  let total = 0;
  req.on("data", (chunk) => {
    total += chunk.length;
    if (total > 25 * 1024 * 1024) { req.destroy(); callback(new Error("Body too large")); return; }
    chunks.push(chunk);
  });
  req.on("end", () => callback(null, Buffer.concat(chunks)));
  req.on("error", callback);
}

function writeBinaryVaultFileDirect(requestedPath, buffer, res) {
  if (readOnly) { sendJson(res, 403, { error: "Vault is read-only" }); return; }
  const safePath = normalizeVaultPath(requestedPath || "");
  if (!safePath || !/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(safePath)) {
    sendJson(res, 403, { error: "Invalid image file path" }); return;
  }
  const filePath = resolveVaultFilePath(safePath);
  if (!filePath) { sendJson(res, 403, { error: "Forbidden path" }); return; }
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    const stat = fs.statSync(filePath);
    sendJson(res, 200, { path: safePath, size: stat.size });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Write failed" });
  }
}

function resolveVaultFilePath(requestedPath) {
  const safePath = normalizeVaultPath(requestedPath || "");
  const filePath = path.resolve(vaultRoot, safePath);
  if (!safePath || !(filePath === vaultRoot || filePath.startsWith(`${vaultRoot}${path.sep}`))) return "";
  return filePath;
}

function normalizeVaultPath(value) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").split("/").filter((part) => part && part !== "." && part !== "..").join("/");
}

function isIndexedFile(name) {
  return /\.(md|excalidraw|txt|py|bat|cmd|sh|js|ts|json|yaml|yml|css|html|xml|csv|log|ahk|java|png|jpe?g|gif|webp|svg|bmp|pdf|zip)$/i.test(name);
}

function isTextVaultFile(name) {
  return /\.(md|excalidraw|txt|py|bat|cmd|sh|js|ts|json|yaml|yml|css|html|xml|csv|log|ahk|java)$/i.test(name);
}

function isRasterThumbnailFile(name) {
  return /\.(png|jpe?g|webp|bmp)$/i.test(name);
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function sendJsonNoStore(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}

async function fetchAndParseUrl(targetUrl, res) {
  if (!targetUrl) { sendJsonCors(res, 400, { error: "url parameter required" }); return; }

  let parsed;
  try { parsed = new URL(targetUrl); } catch {
    sendJsonCors(res, 400, { error: "Invalid URL" }); return;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    sendJsonCors(res, 400, { error: "Only http/https URLs are supported" }); return;
  }

  let html;
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) { sendJsonCors(res, 502, { error: `HTTP ${response.status} from target` }); return; }
    html = await response.text();
  } catch (e) {
    sendJsonCors(res, 502, { error: "Failed to fetch URL: " + (e.message || String(e)) }); return;
  }

  let article;
  try {
    let parseDoc = parseHTML(html).document;
    // linkedom occasionally returns a document with null documentElement on unusual HTML;
    // fall back to injecting into a clean skeleton
    if (!parseDoc.documentElement) {
      parseDoc = parseHTML("<!DOCTYPE html><html><head></head><body></body></html>").document;
      try { parseDoc.body.innerHTML = html; } catch {}
    }
    article = new Readability(parseDoc).parse();
  } catch (e) {
    console.error("[clip] Readability failed:", e);
    sendJsonCors(res, 500, { error: "Readability failed: " + (e.message || String(e)) }); return;
  }
  if (!article) { sendJsonCors(res, 422, { error: "Could not extract article content" }); return; }

  let markdown;
  try {
    // Re-init linkedom globals fresh each request so prior parses can't corrupt state
    const { window: fw, document: fd, DOMParser: fDP } = parseHTML("<html><body></body></html>");
    global.window = fw;
    global.document = fd;
    global.DOMParser = fDP;
    markdown = createMarkdownContent(article.content || "", targetUrl);
  } catch (e) {
    console.error("[clip] defuddle failed:", e);
    sendJsonCors(res, 500, { error: "Defuddle failed: " + (e.message || String(e)) }); return;
  }

  sendJsonCors(res, 200, {
    title: article.title || "",
    markdown,
    excerpt: article.excerpt || "",
    url: targetUrl,
  });
}

function sendClipBookmarklet(folder, req, res) {
  const readabilityPath = path.join(root, "node_modules/@mozilla/readability/Readability.js");
  const clipperPath = path.join(root, "clipper-inline.js");
  const origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;

  try {
    const readabilityCode = fs.readFileSync(readabilityPath, "utf8");
    const clipperTemplate = fs.readFileSync(clipperPath, "utf8");
    const clipperCode = clipperTemplate
      .replace("'__SERVER__'", JSON.stringify(origin))
      .replace("'__FOLDER__'", JSON.stringify(folder));
    const combined = readabilityCode + "\n;\n" + clipperCode;
    const bookmarklet = "javascript:" + encodeURIComponent("(function(){" + combined + "})();");
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    });
    res.end(bookmarklet);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Bookmarklet build failed" });
  }
}

function sendJsonCors(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(value));
}

function clipWebPage(body, res) {
  if (readOnly) { sendJsonCors(res, 403, { error: "Vault is read-only" }); return; }

  let payload;
  try { payload = JSON.parse(body || "{}"); } catch { sendJsonCors(res, 400, { error: "Invalid JSON" }); return; }

  const requestedPath = typeof payload.path === "string" ? payload.path : "";
  const safePath = normalizeVaultPath(requestedPath);
  if (!safePath || !safePath.endsWith(".md")) {
    sendJsonCors(res, 400, { error: "Invalid path: must be a .md file" });
    return;
  }

  let content;
  if (typeof payload.html === "string" && payload.html) {
    const today = new Date().toISOString().slice(0, 10);
    const title = typeof payload.title === "string" ? payload.title : "";
    const pageUrl = typeof payload.url === "string" ? payload.url : "";
    let md;
    try {
      const { window: fw, document: fd, DOMParser: fDP } = parseHTML("<html><body></body></html>");
      global.window = fw;
      global.document = fd;
      global.DOMParser = fDP;
      md = createMarkdownContent(payload.html, pageUrl);
    } catch (e) {
      console.error("[clip] defuddle failed:", e);
      sendJsonCors(res, 500, { error: "Defuddle failed: " + (e.message || String(e)) }); return;
    }
    content = `---\ntitle: "${title.replace(/"/g, '\\"')}"\nurl: ${pageUrl}\ndate: ${today}\n---\n\n${md}`;
  } else {
    content = typeof payload.content === "string" ? payload.content : "";
  }
  if (!content) { sendJsonCors(res, 400, { error: "Missing content or html" }); return; }

  let finalSafePath = safePath;
  let finalFilePath = resolveVaultFilePath(safePath);
  if (!finalFilePath) { sendJsonCors(res, 403, { error: "Forbidden path" }); return; }

  // Avoid overwriting: append suffix if file exists
  let suffix = 0;
  while (fs.existsSync(finalFilePath) && suffix < 99) {
    suffix++;
    finalSafePath = safePath.replace(/\.md$/, "") + " " + suffix + ".md";
    finalFilePath = resolveVaultFilePath(finalSafePath) || "";
  }
  if (!finalFilePath) { sendJsonCors(res, 403, { error: "Forbidden path" }); return; }

  try {
    fs.mkdirSync(path.dirname(finalFilePath), { recursive: true });
    fs.writeFileSync(finalFilePath, content, "utf8");
    forgetTextFileCache(finalSafePath);
    const stat = fs.statSync(finalFilePath);
    const createdTimes = readCreatedTimes();
    createdTimes[finalSafePath] = createdAtFromStat(stat);
    writeCreatedTimes(createdTimes);
    sendJsonCors(res, 200, { path: finalSafePath, size: stat.size });
    broadcastVaultEvent("file-changed", { path: finalSafePath, updatedAt: stat.mtimeMs });
  } catch (error) {
    sendJsonCors(res, 500, { error: error.message || "Write failed" });
  }
}
