const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const requestPath = decodeURIComponent(url.pathname);

  if (requestPath === "/api/vault") {
    sendVault(res, vaultRoot, vaultName);
    return;
  }

  if (requestPath === "/api/sample-vault") {
    sendVault(res, bundledSampleRoot, "sample-vault");
    return;
  }

  if (requestPath === "/api/vault-file") {
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
  fs.readdir(sourceRoot, { withFileTypes: true }, (error) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Vault not found" }));
      return;
    }

    const files = readVaultFiles(sourceRoot, "");
    sendJson(res, 200, { name, writable: !readOnly, files });
  });
}

function readVaultFiles(dir, prefix) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith(".") || entry.name === ".attachments")
    .flatMap((entry) => {
      const absolute = path.join(dir, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) return readVaultFiles(absolute, relative);
      if (!entry.isFile() || !isIndexedFile(entry.name)) return [];

      const stat = fs.statSync(absolute);
      const item = {
        path: relative,
        size: stat.size,
        updatedAt: stat.mtimeMs,
        createdAt: createdAtFromStat(stat),
      };

      if (!isTextVaultFile(entry.name)) {
        item.url = `/api/vault-file?path=${encodeURIComponent(relative)}`;
      }

      return [item];
    });
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
  const filePath = resolveVaultFilePath(requestedPath);
  if (!filePath) {
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
      "Cache-Control": "private, max-age=300",
    });
    res.end(data);
  });
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
    const previousCreatedAt = fs.existsSync(filePath) ? createdAtFromStat(fs.statSync(filePath)) : 0;
    if (fs.existsSync(filePath) && payload.backup !== false) {
      fs.copyFileSync(filePath, `${filePath}.bak`);
    }
    fs.writeFileSync(filePath, payload.content, "utf8");
    const stat = fs.statSync(filePath);
    sendJson(res, 200, {
      path: safePath,
      size: stat.size,
      updatedAt: stat.mtimeMs,
      createdAt: previousCreatedAt || createdAtFromStat(stat),
    });
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
      sendJson(res, 200, { version: 1, calendarPaths: "" });
      return;
    }

    try {
      const settings = JSON.parse(data);
      sendJson(res, 200, normalizeSettings(settings));
    } catch {
      sendJson(res, 200, { version: 1, calendarPaths: "" });
    }
  });
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
  };
}

function settingsFilePath() {
  return path.join(calendarCacheRoot, "settings.json");
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

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}
