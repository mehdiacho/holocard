// Loads a profile from the GitHub REST API. Set GITHUB_TOKEN to raise the
// rate limit from 60 to 5,000 requests an hour.

import type { GitHubRepo, GitHubUser } from "./types.ts";

export class LoadError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const MAX_AVATAR_BYTES = 400_000;

export function isValidLogin(login: string): boolean {
  return LOGIN.test(login);
}

type Fetch = typeof fetch;

function headers(token: string | undefined): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "holocard",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function getJson<T>(url: string, token: string | undefined, f: Fetch): Promise<T> {
  const res = await f(url, { headers: headers(token) });
  if (res.status === 404) throw new LoadError("No GitHub user with that name.", 404);
  if (res.status === 403 || res.status === 429) {
    throw new LoadError("GitHub rate limit reached. Try again in a few minutes.", 503);
  }
  if (!res.ok) throw new LoadError(`GitHub answered ${res.status}.`, 502);
  return (await res.json()) as T;
}

/** Fetches the avatar and inlines it, because README images can't load external URLs from inside an SVG. */
export async function loadAvatar(url: string, f: Fetch = fetch): Promise<string | null> {
  try {
    const u = new URL(url);
    if (u.hostname !== "avatars.githubusercontent.com") return null;
    u.searchParams.set("s", "320");
    const res = await f(u.toString());
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    if (!/^image\/(png|jpeg|gif|webp)$/.test(type)) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_AVATAR_BYTES) return null;
    return `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function loadProfile(
  login: string,
  token: string | undefined = process.env.GITHUB_TOKEN,
  f: Fetch = fetch,
): Promise<{ user: GitHubUser; repos: GitHubRepo[]; avatar: string | null }> {
  if (!isValidLogin(login)) throw new LoadError("That isn't a valid GitHub username.", 400);
  const base = "https://api.github.com";
  const [user, repos] = await Promise.all([
    getJson<GitHubUser>(`${base}/users/${login}`, token, f),
    getJson<GitHubRepo[]>(`${base}/users/${login}/repos?per_page=100&type=owner&sort=pushed`, token, f),
  ]);
  const avatar = await loadAvatar(user.avatar_url, f);
  return { user, repos: Array.isArray(repos) ? repos : [], avatar };
}
