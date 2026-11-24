import "server-only";

import { track } from "@vercel/analytics/server";
import { after } from "next/server";

export type FunnelEvent = "exchange_created" | "participant_joined" | "draw_completed" | "envelope_opened" | "gift_bought";

/**
 * Evento del embudo (Vercel Web Analytics, eventos personalizados: requieren plan Pro).
 * Corre después de responder (`after`) y nunca lanza. Fuera de Vercel no hace nada.
 * No mandar tokens, nombres ni nada personal en `props`.
 */
export function trackEvent(name: FunnelEvent, props?: Record<string, string | number | boolean | null>): void {
  if (!process.env.VERCEL) return;
  try {
    after(async () => {
      try {
        await track(name, props);
      } catch (err) {
        console.error("[track]", name, err);
      }
    });
  } catch (err) {
    console.error("[track]", name, err);
  }
}
