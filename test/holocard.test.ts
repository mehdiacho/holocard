import assert from "node:assert/strict";
import { test } from "node:test";
import { LoadError, isValidLogin, loadAvatar, loadProfile } from "../src/github.ts";
import { handleCard } from "../src/handler.ts";
import { escapeXml, renderCard, wrap } from "../src/render.ts";
import { buildCard, damageFor, hpFor, languageType, rankLanguages, rarityFor, resistanceOf, stageFor, weaknessOf } from "../src/stats.ts";
import { FIXTURES } from "./fixtures.ts";

const NOW = new Date("2026-10-16T00:00:00Z");

test("languages map to types, unknown ones to Normal", () => {
  assert.equal(languageType("Rust"), "Fire");
  assert.equal(languageType("TypeScript"), "Electric");
  assert.equal(languageType("Brainfuck"), "Normal");
  assert.equal(languageType(null), "Normal");
});

test("weakness and resistance are never the type itself", () => {
  for (const t of ["Fire", "Water", "Electric", "Steel", "Grass", "Prism", "Earth", "Normal"] as const) {
    assert.notEqual(weaknessOf(t), t);
    assert.notEqual(resistanceOf(t), t);
  }
});

test("stats stay in range for zero, negative and huge input", () => {
  assert.equal(hpFor(0), 40);
  assert.equal(hpFor(-5), 40);
  assert.equal(hpFor(Number.NaN), 40);
  assert.equal(hpFor(10_000_000), 340);
  assert.equal(damageFor(0), 10);
  assert.equal(damageFor(1e9), 300);
  assert.equal(rarityFor(9), "Common");
  assert.equal(rarityFor(100), "Rare");
  assert.equal(rarityFor(10_000), "Legendary");
  assert.equal(stageFor("not a date", NOW), "Basic");
  assert.equal(stageFor("2012-01-01T00:00:00Z", NOW), "Stage 2");
});

test("forks don't count towards languages, stars or attacks", () => {
  const { user, repos, avatar } = FIXTURES["ember-dev"]!;
  const card = buildCard(user, repos, avatar, NOW);
  assert.equal(card.totalStars, 2400 + 610 + 12);
  assert.ok(!card.topLanguages.includes("C"));
  assert.deepEqual(card.attacks.map((a) => a.name), ["Pdf Forge", "Tiny Raster"]);
  assert.equal(card.type, "Fire");
  assert.equal(card.rarity, "Holo Rare");
});

test("rankLanguages prefers starred work over volume", () => {
  const ranked = rankLanguages([
    { name: "a", language: "Go", stargazers_count: 0, forks_count: 0, size: 10, fork: false, description: null },
    { name: "b", language: "Go", stargazers_count: 0, forks_count: 0, size: 10, fork: false, description: null },
    { name: "c", language: "Zig", stargazers_count: 50, forks_count: 0, size: 10, fork: false, description: null },
  ]);
  assert.equal(ranked[0], "Zig");
});

test("a user with no repos still renders a complete card", () => {
  const { user, repos, avatar } = FIXTURES["empty-handed"]!;
  const svg = renderCard(buildCard(user, repos, avatar, NOW));
  assert.match(svg, /^<svg /);
  assert.match(svg, /No public repositories yet/);
  assert.match(svg, /<\/svg>$/);
});

test("user text is escaped, so a bio can't inject markup", () => {
  const { user, repos } = FIXTURES["sprout"]!;
  const evil = { ...user, name: `<script>alert(1)</script>`, bio: `"><image href="x" onerror="alert(1)"/>` };
  const svg = renderCard(buildCard(evil, repos, null, NOW));
  assert.ok(!svg.includes("<script>"));
  assert.ok(!svg.includes("onerror=\""));
  assert.equal(escapeXml("a\u0000b&"), "ab&amp;");
});

test("wrap respects line and character limits", () => {
  const lines = wrap("one two three four five six seven eight nine ten", 10, 2);
  assert.equal(lines.length, 2);
  for (const l of lines) assert.ok([...l].length <= 10, l);
  assert.ok(lines[1]!.endsWith("…"));
  assert.deepEqual(wrap("", 10, 2), []);
  assert.deepEqual(wrap("supercalifragilistic", 8, 1), ["superca…"]);
});

test("only the rarest cards animate, and animation can be turned off", () => {
  const legend = FIXTURES["volt-js"]!;
  const svg = renderCard(buildCard(legend.user, legend.repos, legend.avatar, NOW));
  assert.match(svg, /animateTransform/);
  assert.doesNotMatch(renderCard(buildCard(legend.user, legend.repos, legend.avatar, NOW), { animate: false }), /animateTransform/);
  const common = FIXTURES["sprout"]!;
  assert.doesNotMatch(renderCard(buildCard(common.user, common.repos, common.avatar, NOW)), /url\(#foil\)/);
});

test("invalid logins are rejected before any request", async () => {
  assert.equal(isValidLogin("mehdiacho"), true);
  assert.equal(isValidLogin("-bad"), false);
  assert.equal(isValidLogin("../../etc"), false);
  let called = false;
  const f = (async () => { called = true; return new Response("{}"); }) as typeof fetch;
  await assert.rejects(loadProfile("a/b", undefined, f), LoadError);
  assert.equal(called, false);
});

test("avatars only load from GitHub's avatar host and are size-capped", async () => {
  const png = new Uint8Array([137, 80, 78, 71]);
  const ok = (async () => new Response(png, { headers: { "content-type": "image/png" } })) as typeof fetch;
  assert.match((await loadAvatar("https://avatars.githubusercontent.com/u/1?v=4", ok)) ?? "", /^data:image\/png;base64,/);
  assert.equal(await loadAvatar("https://evil.example/a.png", ok), null);
  const big = (async () => new Response(new Uint8Array(500_000), { headers: { "content-type": "image/png" } })) as typeof fetch;
  assert.equal(await loadAvatar("https://avatars.githubusercontent.com/u/1", big), null);
  const svg = (async () => new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } })) as typeof fetch;
  assert.equal(await loadAvatar("https://avatars.githubusercontent.com/u/1", svg), null);
});

test("the endpoint always answers with an SVG, even on errors", async () => {
  const fx = FIXTURES["tide-pool"]!;
  const ok = await handleCard(new Request("https://x/api/card?user=tide-pool"), async () => fx);
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("content-type") ?? "", /image\/svg\+xml/);
  assert.match(await ok.text(), /Tide Pool/);

  const missing = await handleCard(new Request("https://x/api/card"));
  assert.equal(missing.status, 400);
  assert.match(await missing.text(), /<svg/);

  const notFound = await handleCard(new Request("https://x/api/card?user=ghost"), async () => {
    throw new LoadError("No GitHub user with that name.", 404);
  });
  assert.equal(notFound.status, 404);
  assert.match(await notFound.text(), /No GitHub user/);

  const boom = await handleCard(new Request("https://x/api/card?user=x"), async () => {
    throw new Error("network down");
  });
  assert.equal(boom.status, 500);
  assert.doesNotMatch(await boom.text(), /network down/);
});
