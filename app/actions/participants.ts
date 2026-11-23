"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getExchangeByInvite } from "@/lib/data/exchanges";
import { deviceCookie, insertParticipant, type JoinError } from "@/lib/data/participants";

/** Apuntarse desde el link de invitación: crea el participante, recuerda el dispositivo y lleva a su página personal. */
export async function joinExchange(inviteCode: string, name: string): Promise<{ error: JoinError }> {
  const exchange = await getExchangeByInvite(inviteCode);
  if (!exchange) return { error: "generic" };
  const res = await insertParticipant(exchange.id, name, "self");
  if ("error" in res) return res;

  (await cookies()).set(deviceCookie(inviteCode), res.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  redirect(`/i/${inviteCode}/p/${res.token}?nuevo=1`);
}
