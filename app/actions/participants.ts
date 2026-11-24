"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getExchangeByInvite, getOwnerName } from "@/lib/data/exchanges";
import { deviceCookie, insertParticipant, type JoinError } from "@/lib/data/participants";
import { guard } from "@/lib/server/action";
import { clientIp, hitRateLimit } from "@/lib/server/rate-limit";
import { trackEvent } from "@/lib/server/track";

/**
 * Error al apuntarse. Con "taken" (alguien ya usa ese nombre: quizá es la misma persona en otro navegador)
 * y con "closed"/"paused"/"full", `owner` trae el nombre de quien organiza para «¿Eres tú? Pídele tu link a {owner}».
 */
export type JoinResult = { error: JoinError; owner?: string };

/** Apuntarse desde el link de invitación: crea el participante, recuerda el dispositivo y lleva a su página personal. */
export async function joinExchange(inviteCode: string, name: string): Promise<JoinResult> {
  let token: string | null = null;
  const res = await guard<JoinResult | null>("joinExchange", { error: "generic" }, async () => {
    if (typeof inviteCode !== "string" || typeof name !== "string") return { error: "generic" };
    if (await hitRateLimit("join", await clientIp())) return { error: "rate" };
    const exchange = await getExchangeByInvite(inviteCode);
    if (!exchange) return { error: "generic" };
    const inserted = await insertParticipant(exchange.id, name, "self");
    if ("error" in inserted) {
      const withOwner = inserted.error === "taken" || inserted.error === "closed" || inserted.error === "paused" || inserted.error === "full";
      return withOwner ? { error: inserted.error, owner: (await getOwnerName(exchange)) || undefined } : { error: inserted.error };
    }

    (await cookies()).set(deviceCookie(inviteCode), inserted.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
    trackEvent("participant_joined");
    token = inserted.token;
    return null;
  });
  if (res) return res;
  // redirect() va fuera del try: es una excepción de control que Next debe recibir.
  redirect(`/i/${inviteCode}/p/${token}?nuevo=1`);
}
