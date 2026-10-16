// Synthetic profiles covering every rarity tier and several types.

import type { GitHubRepo, GitHubUser } from "../src/types.ts";

export function avatarFor(hue: number, initial: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="hsl(${hue},55%,55%)"/><circle cx="80" cy="62" r="30" fill="hsl(${hue},40%,85%)"/><rect x="30" y="102" width="100" height="70" rx="40" fill="hsl(${hue},40%,85%)"/><text x="80" y="72" font-size="28" text-anchor="middle" font-family="Arial" fill="hsl(${hue},55%,30%)">${initial}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function repo(name: string, language: string | null, stars: number, extra: Partial<GitHubRepo> = {}): GitHubRepo {
  return { name, description: null, language, stargazers_count: stars, forks_count: Math.floor(stars / 8), size: 500 + stars, fork: false, ...extra };
}

function user(login: string, extra: Partial<GitHubUser>): GitHubUser {
  return {
    login, id: 92388332, name: null, bio: null, avatar_url: `https://avatars.githubusercontent.com/u/1?v=4`,
    followers: 10, following: 5, public_repos: 12, created_at: "2019-03-01T00:00:00Z", ...extra,
  };
}

export interface Fixture {
  user: GitHubUser;
  repos: GitHubRepo[];
  avatar: string | null;
}

export const FIXTURES: Record<string, Fixture> = {
  "ember-dev": {
    user: user("ember-dev", { name: "Ember Dev", id: 4021, bio: "Writes PDF engines in Rust for fun. Never panics.", followers: 230, public_repos: 41, created_at: "2016-05-02T00:00:00Z" }),
    repos: [
      repo("pdf-forge", "Rust", 2400, { description: "A clean-room PDF engine that renders, edits and saves without crashing.", forks_count: 140 }),
      repo("tiny-raster", "Rust", 610, { description: "Anti-aliased 2D rasterizer in 900 lines." }),
      repo("dotfiles", "Shell", 12),
      repo("forked-thing", "C", 9000, { fork: true }),
    ],
    avatar: avatarFor(15, "E"),
  },
  "tide-pool": {
    user: user("tide-pool", { name: "Tide Pool", id: 77812, bio: "Data person. Notebooks, pipelines and too many charts.", followers: 48, public_repos: 23, created_at: "2021-08-11T00:00:00Z" }),
    repos: [
      repo("shoreline", "Python", 180, { description: "Tidal prediction from open sensor data." }),
      repo("notebooks", "Jupyter Notebook", 22, { description: "Experiments." }),
      repo("site", "HTML", 1),
    ],
    avatar: avatarFor(205, "T"),
  },
  "volt-js": {
    user: user("volt-js", { name: "Volt", id: 1234567, followers: 41000, public_repos: 160, created_at: "2010-01-15T00:00:00Z", bio: "Maintainer of a front-end framework you have probably shipped by accident." }),
    repos: [
      repo("zap", "TypeScript", 48200, { description: "The tiny reactive UI library with a big spark.", forks_count: 3200 }),
      repo("zap-router", "TypeScript", 6100, { description: "File-based routing for zap apps." }),
    ],
    avatar: avatarFor(50, "V"),
  },
  "sprout": {
    user: user("sprout", { id: 99, followers: 2, public_repos: 3, created_at: "2026-02-01T00:00:00Z" }),
    repos: [repo("hello-world", "Ruby", 0), repo("my_first_app", "Ruby", 3, { description: "Learning Rails!" })],
    avatar: avatarFor(120, "S"),
  },
  "empty-handed": {
    user: user("empty-handed", { id: 5, followers: 0, public_repos: 0, created_at: "2024-01-01T00:00:00Z" }),
    repos: [],
    avatar: null,
  },
};
