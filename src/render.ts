// Draws a Card as a self-contained SVG. No external fonts or images, so it
// survives GitHub's image proxy when embedded in a README.

import { languageType } from "./stats.ts";
import type { Card, ElementType, Rarity } from "./types.ts";

export const WIDTH = 400;
export const HEIGHT = 560;

interface Palette {
  frame: string;
  bg1: string;
  bg2: string;
  panel: string;
  accent: string;
  ink: string;
}

const PALETTES: Record<ElementType, Palette> = {
  Fire: { frame: "#e9b949", bg1: "#ff9a5a", bg2: "#d9412b", panel: "#fff3e8", accent: "#e2562f", ink: "#2b1208" },
  Water: { frame: "#e9b949", bg1: "#7cc7ff", bg2: "#2c6fd1", panel: "#eef7ff", accent: "#2f7de1", ink: "#0b1d36" },
  Electric: { frame: "#e9b949", bg1: "#fff27a", bg2: "#f2b705", panel: "#fffbe6", accent: "#d69a00", ink: "#2a2100" },
  Steel: { frame: "#e9b949", bg1: "#d7dee6", bg2: "#7d8a99", panel: "#f4f6f8", accent: "#5b6878", ink: "#151b22" },
  Grass: { frame: "#e9b949", bg1: "#a8e6a1", bg2: "#3f9b4b", panel: "#f0fbef", accent: "#2f8a3d", ink: "#0d2410" },
  Prism: { frame: "#e9b949", bg1: "#ffb8e6", bg2: "#8a5cf6", panel: "#fbf2ff", accent: "#9b4fd8", ink: "#24102e" },
  Earth: { frame: "#e9b949", bg1: "#e6c79a", bg2: "#9a6a3a", panel: "#fbf4ea", accent: "#8a5a2b", ink: "#2a1a0b" },
  Normal: { frame: "#e9b949", bg1: "#f1efe9", bg2: "#b9b3a6", panel: "#fbfaf7", accent: "#8a8475", ink: "#22201b" },
};

// 20x20 glyphs drawn around (10,10).
const GLYPHS: Record<ElementType, string> = {
  Fire: "M10 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 1 2 2 3 0-3 0-5 1-7z",
  Water: "M10 2c3 5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6 6-11z",
  Electric: "M11 1 4 11h5l-1 8 7-10h-5l1-8z",
  Steel: "M10 2l7 4v8l-7 4-7-4V6l7-4zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  Grass: "M16 3C7 3 3 8 3 13c0 2 1 4 1 4l1-1c1-4 4-7 8-9-3 3-5 6-6 10 7 0 10-6 9-14z",
  Prism: "M10 1l7 9-7 9-7-9 7-9z",
  Earth: "M1 17 7 6l3 5 2-3 7 9H1z",
  Normal: "M10 2l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L10 14.4 5 17.2l1.2-5.6L2 7.8l5.6-.6L10 2z",
};

const RARITY_MARK: Record<Rarity, string> = {
  Common: "●",
  Uncommon: "◆",
  Rare: "★",
  "Holo Rare": "✦",
  Legendary: "★★",
};

export function escapeXml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Splits text into at most `maxLines` lines of about `maxChars` characters, ending in an ellipsis if cut. */
export function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const chars = Math.max(4, maxChars);
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let cut = false;
  for (const raw of words) {
    const word = [...raw].length > chars ? [...raw].slice(0, chars - 1).join("") + "…" : raw;
    const next = line ? `${line} ${word}` : word;
    if ([...next].length <= chars) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) {
      cut = true;
      break;
    }
  }
  if (!cut && line) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  if (cut && lines.length > 0) {
    const last = [...(lines[lines.length - 1] ?? "")];
    while (last.length > chars - 1) last.pop();
    lines[lines.length - 1] = last.join("").replace(/[\s.,;:]+$/, "") + "…";
  }
  return lines;
}

function truncate(text: string, maxChars: number): string {
  const c = [...text];
  return c.length <= maxChars ? text : c.slice(0, Math.max(1, maxChars - 1)).join("") + "…";
}

function energy(type: ElementType, x: number, y: number, r: number): string {
  const p = PALETTES[type];
  const s = (r * 2) / 20;
  return `<g transform="translate(${x - r} ${y - r})"><circle cx="${r}" cy="${r}" r="${r}" fill="url(#e-${type})" stroke="#00000033"/><path d="${GLYPHS[type]}" transform="translate(${r * 0.25} ${r * 0.25}) scale(${s * 0.75})" fill="#fff" stroke="${p.accent}" stroke-width="0.6"/></g>`;
}

function shortCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export interface RenderOptions {
  /** Animate the holo foil on Rare cards and above. */
  animate?: boolean;
}

export function renderCard(card: Card, opts: RenderOptions = {}): string {
  const animate = opts.animate ?? true;
  const p = PALETTES[card.type];
  const foil = card.rarity === "Rare" || card.rarity === "Holo Rare" || card.rarity === "Legendary";
  const rainbow = card.rarity === "Legendary";
  const font = `font-family="'Segoe UI',Ubuntu,'Helvetica Neue',Arial,sans-serif"`;

  const name = escapeXml(truncate(card.displayName, 20));
  const art = { x: 28, y: 64, w: 344, h: 200 };

  const avatar = card.avatar
    ? `<image href="${escapeXml(card.avatar)}" x="${art.x + art.w / 2 - 80}" y="${art.y + 20}" width="160" height="160" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<g transform="translate(${art.x + art.w / 2 - 50} ${art.y + 50}) scale(5)" opacity="0.5"><path d="${GLYPHS[card.type]}" fill="${p.accent}"/></g>`;

  const foilLayer = foil
    ? `<rect x="${art.x}" y="${art.y}" width="${art.w}" height="${art.h}" fill="url(#foil)" style="mix-blend-mode:overlay" opacity="${rainbow ? 0.75 : 0.55}"/>`
    : "";

  const foilStops = rainbow
    ? `<stop offset="0" stop-color="#ff5f6d" stop-opacity="0"/><stop offset="0.3" stop-color="#ffc371"/><stop offset="0.45" stop-color="#7cf7c3"/><stop offset="0.6" stop-color="#6aa8ff"/><stop offset="0.75" stop-color="#d36bff"/><stop offset="1" stop-color="#ff5f6d" stop-opacity="0"/>`
    : `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.15"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>`;

  const foilAnim = animate
    ? `<animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0;-1 0" dur="${rainbow ? 5 : 4}s" repeatCount="indefinite"/>`
    : "";

  // Attacks
  let y = 330;
  const attackRows: string[] = [];
  card.attacks.forEach((a, i) => {
    const t = a.language ? languageType(a.language) : card.type;
    const dots = Array.from({ length: a.cost }, (_, k) => energy(t, 44 + k * 22, y, 9)).join("");
    const nameX = 44 + Math.max(1, a.cost) * 22 + 4;
    const lines = wrap(a.text, 54, 2)
      .map((l, k) => `<text x="36" y="${y + 22 + k * 14}" font-size="11" fill="${p.ink}" opacity="0.85">${escapeXml(l)}</text>`)
      .join("");
    attackRows.push(
      `<g>${dots}<text x="${nameX}" y="${y + 5}" font-size="17" font-weight="700" fill="${p.ink}">${escapeXml(truncate(a.name, 22))}</text>` +
        `<text x="364" y="${y + 6}" font-size="20" font-weight="700" text-anchor="end" fill="${p.ink}">${a.damage}</text>${lines}</g>`,
    );
    if (i === 0 && card.attacks.length > 1) {
      attackRows.push(`<line x1="36" x2="364" y1="${y + 50}" y2="${y + 50}" stroke="${p.ink}" stroke-opacity="0.15"/>`);
    }
    y += 64;
  });
  if (card.attacks.length === 0) {
    attackRows.push(
      `<text x="200" y="${y + 20}" font-size="14" font-style="italic" text-anchor="middle" fill="${p.ink}" opacity="0.7">No public repositories yet. Charging up…</text>`,
    );
  }

  const flavor = wrap(card.flavor, 62, 2)
    .map((l, k) => `<text x="200" y="${484 + k * 13}" font-size="10.5" font-style="italic" text-anchor="middle" fill="${p.ink}" opacity="0.8">${escapeXml(l)}</text>`)
    .join("");

  const langs = card.topLanguages.length ? card.topLanguages.join(" · ") : "No languages yet";
  const retreatDots = Array.from({ length: card.retreat }, (_, k) => energy("Normal", 316 + k * 15, 450, 6)).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(`${card.displayName} holocard: ${card.type} type, HP ${card.hp}, ${card.rarity}`)}" ${font}>
<title>${escapeXml(`${card.displayName} (@${card.login})`)}</title>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/></linearGradient>
<linearGradient id="frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe58a"/><stop offset="0.5" stop-color="${p.frame}"/><stop offset="1" stop-color="#b9862a"/></linearGradient>
<linearGradient id="artbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.panel}"/></linearGradient>
${energyGradients()}
<linearGradient id="foil" x1="0" y1="0" x2="1" y2="0.6" gradientUnits="objectBoundingBox">${foilStops}${foilAnim}</linearGradient>
<clipPath id="artClip"><rect x="${art.x}" y="${art.y}" width="${art.w}" height="${art.h}" rx="4"/></clipPath>
<clipPath id="avatarClip"><circle cx="${art.x + art.w / 2}" cy="${art.y + 100}" r="80"/></clipPath>
</defs>
<rect x="2" y="2" width="396" height="556" rx="22" fill="url(#frame)" stroke="#8a6418" stroke-width="2"/>
<rect x="14" y="14" width="372" height="532" rx="12" fill="url(#bg)"/>
<text x="26" y="34" font-size="10" font-weight="700" fill="${p.ink}" opacity="0.75" letter-spacing="0.5">${escapeXml(card.stage.toUpperCase())}</text>
<text x="26" y="54" font-size="21" font-weight="800" fill="${p.ink}">${name}</text>
<text x="${346 - String(card.hp).length * 15 - 4}" y="52" font-size="11" font-weight="700" text-anchor="end" fill="${p.ink}">HP</text>
<text x="346" y="54" font-size="24" font-weight="800" text-anchor="end" fill="${p.ink}">${card.hp}</text>
${energy(card.type, 364, 46, 12)}
<g clip-path="url(#artClip)">
<rect x="${art.x}" y="${art.y}" width="${art.w}" height="${art.h}" fill="url(#artbg)"/>
<circle cx="${art.x + art.w / 2}" cy="${art.y + 100}" r="92" fill="${p.panel}" opacity="0.55"/>
${avatar}
${foilLayer}
</g>
<rect x="${art.x}" y="${art.y}" width="${art.w}" height="${art.h}" rx="4" fill="none" stroke="url(#frame)" stroke-width="4"/>
<rect x="40" y="270" width="320" height="18" rx="9" fill="url(#frame)"/>
<text x="200" y="283" font-size="10.5" font-weight="600" font-style="italic" text-anchor="middle" fill="#3b2a07">${escapeXml(truncate(`@${card.login} · ${langs} · since ${card.sinceYear}`, 60))}</text>
<rect x="24" y="298" width="352" height="134" rx="8" fill="${p.panel}" opacity="0.92"/>
${attackRows.join("\n")}
<line x1="24" x2="376" y1="438" y2="438" stroke="${p.ink}" stroke-opacity="0.25"/>
<text x="34" y="454" font-size="10" fill="${p.ink}">weakness</text>
${energy(card.weakness, 94, 450, 6)}
<text x="104" y="454" font-size="10" font-weight="700" fill="${p.ink}">×2</text>
<text x="150" y="454" font-size="10" fill="${p.ink}">resistance</text>
${energy(card.resistance, 214, 450, 6)}
<text x="224" y="454" font-size="10" font-weight="700" fill="${p.ink}">−30</text>
<text x="268" y="454" font-size="10" fill="${p.ink}">retreat</text>
${retreatDots}
<rect x="24" y="466" width="352" height="38" rx="6" fill="${p.panel}" opacity="0.7" stroke="url(#frame)"/>
${flavor}
<text x="26" y="528" font-size="10" font-weight="700" fill="${p.ink}">${escapeXml(RARITY_MARK[card.rarity])} ${escapeXml(card.rarity)}</text>
<text x="200" y="528" font-size="10" text-anchor="middle" fill="${p.ink}" opacity="0.8">★ ${shortCount(card.totalStars)} · ${shortCount(card.followers)} followers · ${shortCount(card.repoCount)} repos</text>
<text x="374" y="528" font-size="9" text-anchor="end" fill="${p.ink}" opacity="0.7">#${card.number}</text>
<text x="200" y="541" font-size="8" text-anchor="middle" fill="${p.ink}" opacity="0.55" letter-spacing="1">HOLOCARD</text>
</svg>`;
}

function energyGradients(): string {
  return (Object.keys(PALETTES) as ElementType[])
    .map((t) => `<radialGradient id="e-${t}"><stop offset="0" stop-color="${PALETTES[t].bg1}"/><stop offset="1" stop-color="${PALETTES[t].bg2}"/></radialGradient>`)
    .join("");
}

/** A small card shown when a user can't be loaded, so a broken embed still looks intentional. */
export function renderError(message: string): string {
  const lines = wrap(message, 40, 3)
    .map((l, k) => `<text x="200" y="${300 + k * 18}" font-size="14" text-anchor="middle" fill="#3b2a07">${escapeXml(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="'Segoe UI',Ubuntu,Arial,sans-serif">
<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3f5c"/><stop offset="1" stop-color="#1c1f33"/></linearGradient></defs>
<rect x="2" y="2" width="396" height="556" rx="22" fill="url(#b)" stroke="#e9b949" stroke-width="6"/>
<text x="200" y="250" font-size="40" text-anchor="middle" fill="#e9b949">?</text>
<rect x="60" y="275" width="280" height="80" rx="10" fill="#fbe58a"/>
${lines}
<text x="200" y="520" font-size="9" text-anchor="middle" fill="#e9b949" letter-spacing="1">HOLOCARD</text>
</svg>`;
}
