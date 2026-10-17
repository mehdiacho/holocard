import { handleCard } from "../src/handler.ts";

export function GET(req: Request): Promise<Response> {
  return handleCard(req);
}
