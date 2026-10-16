// Shapes of the GitHub REST data we use, and the card derived from it.

export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  size: number;
  fork: boolean;
  archived?: boolean;
  pushed_at?: string;
}

export type ElementType =
  | "Fire"
  | "Water"
  | "Electric"
  | "Steel"
  | "Grass"
  | "Prism"
  | "Earth"
  | "Normal";

export type Rarity = "Common" | "Uncommon" | "Rare" | "Holo Rare" | "Legendary";

export interface Attack {
  name: string;
  text: string;
  damage: number;
  cost: number;
  language: string | null;
}

export interface Card {
  login: string;
  displayName: string;
  number: number;
  avatar: string | null;
  type: ElementType;
  topLanguages: string[];
  hp: number;
  stage: "Basic" | "Stage 1" | "Stage 2";
  sinceYear: number;
  attacks: Attack[];
  weakness: ElementType;
  resistance: ElementType;
  retreat: number;
  rarity: Rarity;
  totalStars: number;
  flavor: string;
  repoCount: number;
  followers: number;
}
