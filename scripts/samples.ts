// Renders every fixture to samples/<login>.svg plus a contact sheet,
// so card changes can be eyeballed without calling GitHub.

import { mkdirSync, writeFileSync } from "node:fs";
import { renderCard } from "../src/render.ts";
import { buildCard } from "../src/stats.ts";
import { FIXTURES } from "../test/fixtures.ts";

const now = new Date("2026-10-16T00:00:00Z");
mkdirSync("samples", { recursive: true });
const imgs: string[] = [];
for (const [login, fx] of Object.entries(FIXTURES)) {
  writeFileSync(`samples/${login}.svg`, renderCard(buildCard(fx.user, fx.repos, fx.avatar, now), { animate: false }));
  imgs.push(`<img src="${login}.svg" width="400" height="560">`);
}
writeFileSync(
  "samples/index.html",
  `<!doctype html><body style="margin:0;padding:24px;background:#16181d;display:flex;flex-wrap:wrap;gap:24px">${imgs.join("")}</body>`,
);
console.log(`wrote ${imgs.length} samples`);
