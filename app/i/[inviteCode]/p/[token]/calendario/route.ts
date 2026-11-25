import type { NextRequest } from "next/server";
import { getByToken, personalPath } from "@/lib/data/exchanges";
import { appUrl } from "@/lib/format";
import { icsResponse } from "@/lib/server/ics-response";

/** Evento del intercambio (.ics) con el link personal para volver. El token es la llave, igual que en la página. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/i/[inviteCode]/p/[token]/calendario">) {
  const { inviteCode, token } = await ctx.params;
  const found = await getByToken(inviteCode, token);
  if (!found) return new Response("No encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });
  return icsResponse(found.exchange, appUrl(personalPath(inviteCode, token)));
}
