const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = __dirname;
const sampleRoot = path.join(root, "sample-vault");
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
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const requestPath = decodeURIComponent(url.pathname);

  if (requestPath === "/api/sample-vault") {
    sendSampleVault(res);
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

function sendSampleVault(res) {
  fs.readdir(sampleRoot, { withFileTypes: true }, (error) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Sample vault not found" }));
      return;
    }

    const files = readSampleFiles(sampleRoot, "");
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ name: "sample-vault", files }));
  });
}

function readSampleFiles(dir, prefix) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .flatMap((entry) => {
      const absolute = path.join(dir, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) return readSampleFiles(absolute, relative);
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") return [];

      const stat = fs.statSync(absolute);
      return [
        {
          path: relative,
          content: fs.readFileSync(absolute, "utf8"),
          size: stat.size,
          updatedAt: stat.mtimeMs,
          createdAt: stat.birthtimeMs,
        },
      ];
    });
}
