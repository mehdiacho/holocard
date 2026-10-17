// Local server: serves public/ and the card endpoint on http://localhost:3000.
// HOLOCARD_FIXTURES=1 serves the synthetic test profiles instead of calling GitHub.

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { LoadError, loadProfile } from "../src/github.ts";
import { handleCard } from "../src/handler.ts";
import { FIXTURES } from "../test/fixtures.ts";

const PORT = Number(process.env.PORT) || 3000;
const ROOT = resolve("public");
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const fixtureLoad: typeof loadProfile = async (login) => {
  const fx = FIXTURES[login.toLowerCase()];
  if (!fx) throw new LoadError(`Fixture mode: try ${Object.keys(FIXTURES).join(", ")}.`, 404);
  return fx;
};
const load = process.env.HOLOCARD_FIXTURES === "1" ? fixtureLoad : loadProfile;

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (url.pathname === "/api/card") {
      const out = await handleCard(new Request(url), load);
      res.writeHead(out.status, Object.fromEntries(out.headers));
      res.end(await out.text());
      return;
    }
    const rel = normalize(url.pathname === "/" ? "index.html" : url.pathname.slice(1));
    const file = join(ROOT, rel);
    if (!file.startsWith(ROOT + sep)) {
      res.writeHead(403).end();
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
}).listen(PORT, () => {
  console.log(`holocard on http://localhost:${PORT}${load === fixtureLoad ? " (fixtures)" : ""}`);
});
