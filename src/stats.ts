// Turns a GitHub profile and its repositories into card stats.
// Everything here is pure so it can be tested without the network.

import type { Attack, Card, ElementType, GitHubRepo, GitHubUser, Rarity } from "./types.ts";

const LANGUAGE_TYPES: Record<string, ElementType> = {
  Rust: "Fire", C: "Fire", "C++": "Fire", Assembly: "Fire", Zig: "Fire", Cuda: "Fire",
  Python: "Water", "Jupyter Notebook": "Water", R: "Water", Julia: "Water", MATLAB: "Water",
  JavaScript: "Electric", TypeScript: "Electric", CoffeeScript: "Electric", PHP: "Electric",
  Java: "Steel", Kotlin: "Steel", Scala: "Steel", "C#": "Steel", Go: "Steel", "F#": "Steel",
  Ruby: "Grass", Elixir: "Grass", Erlang: "Grass", Clojure: "Grass", Haskell: "Grass",
  OCaml: "Grass", Lua: "Grass", Perl: "Grass", Nim: "Grass",
  HTML: "Prism", CSS: "Prism", SCSS: "Prism", Vue: "Prism", Svelte: "Prism", Swift: "Prism",
  Dart: "Prism", Astro: "Prism", MDX: "Prism",
  Shell: "Earth", PowerShell: "Earth", Dockerfile: "Earth", Nix: "Earth", HCL: "Earth",
  Makefile: "Earth", Batchfile: "Earth", "Vim Script": "Earth",
};

// Each type is weak to the next one in this ring and resists the one before it.
const RING: ElementType[] = ["Fire", "Water", "Electric", "Steel", "Grass", "Prism", "Earth", "Normal"];

export function languageType(language: string | null | undefined): ElementType {
  if (!language) return "Normal";
  return LANGUAGE_TYPES[language] ?? "Normal";
}

function ringNeighbour(type: ElementType, step: number): ElementType {
  const i = RING.indexOf(type);
  const n = RING.length;
  return RING[(((i + step) % n) + n) % n] ?? "Normal";
}

export function weaknessOf(type: ElementType): ElementType {
  return ringNeighbour(type, 1);
}

export function resistanceOf(type: ElementType): ElementType {
  return ringNeighbour(type, -1);
}

const safe = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);

/** Languages ranked by how much they matter on this profile: stars count most, size breaks ties. */
export function rankLanguages(repos: GitHubRepo[]): string[] {
  const score = new Map<string, number>();
  for (const r of repos) {
    if (r.fork || !r.language) continue;
    const w = 1 + safe(r.stargazers_count) * 2 + Math.log10(1 + safe(r.size));
    score.set(r.language, (score.get(r.language) ?? 0) + w);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([l]) => l);
}

export function hpFor(followers: number): number {
  const hp = 40 + 20 * Math.floor(Math.log2(safe(followers) + 1));
  return Math.min(340, hp);
}

export function rarityFor(totalStars: number): Rarity {
  const s = safe(totalStars);
  if (s >= 10000) return "Legendary";
  if (s >= 1000) return "Holo Rare";
  if (s >= 100) return "Rare";
  if (s >= 10) return "Uncommon";
  return "Common";
}

export function stageFor(createdAt: string, now: Date): Card["stage"] {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return "Basic";
  const years = (now.getTime() - created) / (365.25 * 24 * 3600 * 1000);
  if (years >= 6) return "Stage 2";
  if (years >= 2) return "Stage 1";
  return "Basic";
}

export function damageFor(stars: number): number {
  const d = 10 + 10 * Math.round(Math.log2(safe(stars) + 1) * 1.5);
  return Math.min(300, d);
}

/** Repo names become move names: "my-cool_repo" -> "My Cool Repo". */
export function moveName(repo: string): string {
  return repo
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || repo;
}

const SHORTCODES: Record<string, string> = {
  zap: "⚡", fire: "🔥", rocket: "🚀", sparkles: "✨", star: "⭐", heart: "❤️", tada: "🎉",
  ghost: "👻", wave: "👋", computer: "💻", books: "📚", art: "🎨", bug: "🐛", package: "📦",
  wrench: "🔧", sunglasses: "😎", seedling: "🌱", coffee: "☕", memo: "📝", eyes: "👀",
};

/** GitHub renders `:zap:` style shortcodes on the site; an SVG can't, so map the common ones and drop the rest. */
export function emojify(text: string): string {
  return text
    .replace(/(^|\s):([a-z][a-z0-9_+-]*):(?=\s|$)/g, (_, pre: string, code: string) => pre + (SHORTCODES[code] ?? ""))
    .replace(/\s{2,}/g, " ")
    .trim();
}

function attackFrom(r: GitHubRepo): Attack {
  return {
    name: moveName(r.name),
    text: emojify(r.description ?? "") || `${r.language ?? "Code"} project with ${safe(r.stargazers_count)} ${safe(r.stargazers_count) === 1 ? "star" : "stars"}.`,
    damage: damageFor(r.stargazers_count),
    cost: Math.min(3, 1 + Math.floor(Math.log10(safe(r.forks_count) + 1))),
    language: r.language,
  };
}

export function buildCard(user: GitHubUser, repos: GitHubRepo[], avatar: string | null, now = new Date()): Card {
  const own = repos.filter((r) => !r.fork);
  const totalStars = own.reduce((s, r) => s + safe(r.stargazers_count), 0);
  const topLanguages = rankLanguages(own).slice(0, 3);
  const type = languageType(topLanguages[0]);
  const best = [...own]
    .sort((a, b) => safe(b.stargazers_count) - safe(a.stargazers_count) || safe(b.size) - safe(a.size))
    .slice(0, 2);
  const created = Date.parse(user.created_at);
  const repoCount = safe(user.public_repos);

  return {
    login: user.login,
    displayName: (user.name ?? "").trim() || user.login,
    number: safe(user.id),
    avatar,
    type,
    topLanguages,
    hp: hpFor(user.followers),
    stage: stageFor(user.created_at, now),
    sinceYear: Number.isFinite(created) ? new Date(created).getUTCFullYear() : now.getUTCFullYear(),
    attacks: best.map(attackFrom),
    weakness: weaknessOf(type),
    resistance: resistanceOf(type),
    retreat: Math.min(4, Math.max(1, Math.ceil(repoCount / 25))),
    rarity: rarityFor(totalStars),
    totalStars,
    flavor: emojify(user.bio ?? "") || `A wild developer with ${repoCount} public repositories.`,
    repoCount,
    followers: safe(user.followers),
  };
}
