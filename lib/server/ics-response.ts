import "server-only";

import { buildIcs, exchangeCalendar, icsFileName } from "@/lib/calendar";
import type { Exchange } from "@/lib/data/types";

/** Respuesta del .ics: adjunto, sin caché (lleva el link personal) y fuera de los buscadores. */
export function icsResponse(exchange: Exchange, url: string): Response {
  const { event } = exchangeCalendar(exchange, url);
  return new Response(buildIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFileName(exchange.inviteCode)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
