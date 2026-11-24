"use server";

import { FieldValue } from "firebase-admin/firestore";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { exchangesCol, getByToken, participantsCol, wishesCol } from "@/lib/data/exchanges";
import { getMyAssignment } from "@/lib/data/gifts";
import { parseDesde, withDesde } from "@/lib/nav";
import { guard } from "@/lib/server/action";
import { trackEvent } from "@/lib/server/track";

type Fail = { ok: false; error: "not-found" | "not-drawn" | "generic" };
const GENERIC: Fail = { ok: false, error: "generic" };

/**
 * Abre el sobre: es la única forma de que el nombre de quien recibes llegue al navegador.
 * Marca al participante como «revealed» la primera vez.
 */
export async function revealAssignment(inviteCode: string, token: string): Promise<{ ok: true; name: string; wishCount: number } | Fail> {
  return guard<{ ok: true; name: string; wishCount: number } | Fail>("revealAssignment", GENERIC, async () => {
    const found = await getByToken(inviteCode, token);
    if (!found) return { ok: false, error: "not-found" };
    const { exchange, me } = found;
    if (exchange.status !== "drawn") return { ok: false, error: "not-drawn" };
    const mine = await getMyAssignment(exchange.id, me.id);
    if (!mine) return GENERIC;
    if (!me.revealed) {
      await participantsCol(exchange.id).doc(me.id).update({ revealed: true });
      trackEvent("envelope_opened");
    }
    return { ok: true, name: mine.receiver.name, wishCount: mine.receiver.wishCount };
  });
}

/** «Lo voy a regalar»: guarda el deseo elegido en la asignación (null lo quita). Quien recibe nunca lo ve. */
export async function planGift(inviteCode: string, token: string, wishId: string | null): Promise<{ ok: true } | Fail> {
  return guard<{ ok: true } | Fail>("planGift", GENERIC, async () => {
    const found = await getByToken(inviteCode, token);
    if (!found) return { ok: false, error: "not-found" };
    const { exchange, me } = found;
    if (exchange.status !== "drawn") return { ok: false, error: "not-drawn" };
    const mine = await getMyAssignment(exchange.id, me.id);
    if (!mine) return GENERIC;
    if (wishId) {
      if (typeof wishId !== "string" || !/^[A-Za-z0-9]{1,40}$/.test(wishId)) return GENERIC;
      const wish = await wishesCol(exchange.id, mine.receiver.id).doc(wishId).get();
      if (!wish.exists) return GENERIC;
    }
    await exchangesCol().doc(exchange.id).collection("assignments").doc(me.id).update({ plannedWishId: wishId || null });
    refresh();
    return { ok: true };
  });
}

/** «Ya compré su regalo». Si sale bien redirige a /compre (conservando `?desde=` para el «atrás»). */
export async function markBought(inviteCode: string, token: string, desde?: unknown): Promise<Fail> {
  const fail = await guard<Fail | null>("markBought", GENERIC, async () => {
    const found = await getByToken(inviteCode, token);
    if (!found) return { ok: false, error: "not-found" };
    const { exchange, me } = found;
    if (exchange.status !== "drawn") return { ok: false, error: "not-drawn" };
    if (!me.bought) {
      await participantsCol(exchange.id).doc(me.id).update({ bought: true, revealed: true });
      await exchangesCol().doc(exchange.id).update({ updatedAt: FieldValue.serverTimestamp() });
      trackEvent("gift_bought");
    }
    return null;
  });
  if (fail) return fail;
  redirect(withDesde(`/i/${inviteCode}/p/${token}/compre`, parseDesde(desde)));
}
