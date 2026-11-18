import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { workspace } from "./workspace.mjs";
const db = new DatabaseSync(process.env.HURAI_DB || "hurai.sqlite");
db.exec("PRAGMA journal_mode=WAL");
if (!db.prepare("SELECT name FROM sqlite_master WHERE name='workspaces'").get())
  db.exec(
    readFileSync(
      new URL("../drizzle/0000_workspaces.sql", import.meta.url),
      "utf8",
    ),
  );
const adapter = {
  prepare(sql) {
    const stmt = db.prepare(sql);
    return {
      bind(...args) {
        return {
          first: () => stmt.get(...args),
          run: () => ({ meta: stmt.run(...args) }),
        };
      },
    };
  },
};
const types = {
  "index.html": "text/html",
  "style.css": "text/css",
  "app.js": "text/javascript",
  "engine.js": "text/javascript",
  "sync.js": "text/javascript",
  "solver/worker.mjs": "text/javascript",
  "solver/cpsat.wasm": "application/wasm",
};
const port = Number(process.env.PORT || 8080);
http
  .createServer(async (req, res) => {
    try {
      const origin = "http://127.0.0.1:" + port;
      const url = new URL(req.url, origin);
      if (req.headers.host !== new URL(origin).host) {
        res.writeHead(403).end();
        return;
      }
      if (url.pathname === "/api/workspace") {
        const request = new Request(url, {
          method: req.method,
          headers: req.headers,
          ...(["GET", "HEAD"].includes(req.method)
            ? {}
            : { body: req, duplex: "half" }),
        });
        const response = await workspace(request, adapter);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      const file = url.pathname.slice(1) || "index.html";
      if (!Object.hasOwn(types, file)) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[file],
        "X-Content-Type-Options": "nosniff",
      });
      res.end(readFileSync(new URL("../" + file, import.meta.url)));
    } catch {
      res.writeHead(500).end();
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log("HURAI http://127.0.0.1:" + port),
  );
