// Builds Vercel's Build Output API layout (.vercel/output): the landing page as
// static files and the card endpoint as one bundled Node function. Plain JS so it
// runs on any Node version without TypeScript support.

import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const out = ".vercel/output";
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/static`, { recursive: true });
cpSync("public", `${out}/static`, { recursive: true });

const fn = `${out}/functions/api/card.func`;
mkdirSync(fn, { recursive: true });
await build({
  entryPoints: ["functions/card.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: `${fn}/index.mjs`,
});
writeFileSync(
  `${fn}/.vc-config.json`,
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", supportsResponseStreaming: true }, null, 2),
);
writeFileSync(`${out}/config.json`, JSON.stringify({ version: 3 }, null, 2));
console.log("built .vercel/output");
