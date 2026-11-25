import type { NextRequest } from "next/server";
import { ownedExchange } from "@/lib/data/owner";
import { appUrl } from "@/lib/format";
import { icsResponse } from "@/lib/server/ics-response";

/** Evento del intercambio (.ics) para quien organiza, con el link del panel. Solo el dueño (si no, 404). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/organizar/[exchangeId]/calendario">) {
  const { exchangeId } = await ctx.params;
  const exchange = await ownedExchange(exchangeId);
  if (!exchange) return new Response("No encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });
  return icsResponse(exchange, appUrl(`/organizar/${exchange.id}`));
}
