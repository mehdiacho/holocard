// The card endpoint as a standard Request -> Response function, so it runs on
// Vercel, Cloudflare Workers, Deno or a plain Node server unchanged.

import { LoadError, loadProfile } from "./github.ts";
import { renderCard, renderError } from "./render.ts";
import { buildCard } from "./stats.ts";

const SVG_HEADERS = { "Content-Type": "image/svg+xml; charset=utf-8" };

export async function handleCard(req: Request, load = loadProfile): Promise<Response> {
  const url = new URL(req.url);
  const login = (url.searchParams.get("user") ?? url.searchParams.get("username") ?? "").trim();
  const animate = url.searchParams.get("animate") !== "0";

  if (!login) {
    return new Response(renderError("Add ?user=your-github-name to the URL."), {
      status: 400,
      headers: { ...SVG_HEADERS, "Cache-Control": "no-store" },
    });
  }

  try {
    const { user, repos, avatar } = await load(login);
    const svg = renderCard(buildCard(user, repos, avatar), { animate });
    return new Response(svg, {
      status: 200,
      headers: { ...SVG_HEADERS, "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    const status = e instanceof LoadError ? e.status : 500;
    const message = e instanceof LoadError ? e.message : "Something went wrong drawing this card.";
    // Errors still return an image so a README embed never shows a broken icon.
    return new Response(renderError(message), {
      status,
      headers: { ...SVG_HEADERS, "Cache-Control": "public, max-age=300" },
    });
  }
}
