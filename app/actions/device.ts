"use server";

import { getByToken } from "@/lib/data/exchanges";
import type { ExchangeSummary } from "@/lib/data/types";
import { guard } from "@/lib/server/action";

/**
 * Resuelve los links personales guardados en este navegador (gg:mis-intercambios:v1).
 * Los que ya no existen (p. ej. a quien quitaron) simplemente no vuelven.
 */
export async function deviceExchanges(entries: { inviteCode: string; token: string }[]): Promise<ExchangeSummary[]> {
  return guard<ExchangeSummary[]>("deviceExchanges", [], () => resolve(entries));
}

async function resolve(entries: { inviteCode: string; token: string }[]): Promise<ExchangeSummary[]> {
  if (!Array.isArray(entries)) return [];
  const list = entries.slice(0, 30).filter((e) => typeof e?.inviteCode === "string" && typeof e?.token === "string");
  const found = await Promise.all(list.map((e) => getByToken(e.inviteCode, e.token)));
  return found.flatMap((f, i) => {
    if (!f) return [];
    const { exchange, me } = f;
    return [
      {
        key: `p:${list[i].token}`,
        exchangeId: exchange.id,
        name: exchange.name,
        eventAt: exchange.eventAt,
        timeZone: exchange.timeZone,
        status: exchange.status,
        participantCount: exchange.participantCount,
        role: me.kind === "owner" ? ("owner" as const) : ("participant" as const),
        href: `/i/${list[i].inviteCode}/p/${list[i].token}`,
        revealed: me.revealed,
        bought: me.bought,
        wishCount: me.wishCount,
        listHref: `/i/${list[i].inviteCode}/p/${list[i].token}/lista`,
      },
    ];
  });
}
