"use server";

import { FieldValue } from "firebase-admin/firestore";
import { refresh } from "next/cache";
import { db, exchangesCol, participantsCol } from "@/lib/data/exchanges";
import { ownedExchange } from "@/lib/data/owner";
import type { AssignmentDoc, ExchangeDoc, ExclusionDoc, ParticipantDoc } from "@/lib/data/types";
import { draw, DrawImpossibleError } from "@/lib/draw";
import { guard } from "@/lib/server/action";
import { trackEvent } from "@/lib/server/track";

type DrawError = "min" | "impossible" | "already" | "same" | "duplicate" | "generic";
type Result = { ok: true } | { ok: false; error: DrawError };
const GENERIC = { ok: false, error: "generic" } as const;

export async function addExclusion(exchangeId: string, x: string, y: string): Promise<Result> {
  return guard<Result>("addExclusion", GENERIC, async () => {
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    if (exchange.status !== "open") return { ok: false, error: "already" };
    if (typeof x !== "string" || typeof y !== "string" || !x || !y || x === y) return { ok: false, error: "same" };
    if (!/^[A-Za-z0-9]{1,40}$/.test(x) || !/^[A-Za-z0-9]{1,40}$/.test(y)) return GENERIC;
    const [a, b] = x < y ? [x, y] : [y, x];
    const [pa, pb] = await Promise.all([participantsCol(exchange.id).doc(a).get(), participantsCol(exchange.id).doc(b).get()]);
    if (!pa.exists || !pb.exists) return GENERIC;
    try {
      // El id determinista evita exclusiones duplicadas.
      await exchangesCol().doc(exchange.id).collection("exclusions").doc(`${a}_${b}`).create({ a, b } satisfies ExclusionDoc);
    } catch (err) {
      if ((err as { code?: number }).code === 6) return { ok: false, error: "duplicate" };
      throw err;
    }
    refresh();
    return { ok: true };
  });
}

export async function removeExclusion(exchangeId: string, exclusionId: string): Promise<Result> {
  return guard<Result>("removeExclusion", GENERIC, async () => {
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    if (exchange.status !== "open") return { ok: false, error: "already" };
    if (typeof exclusionId !== "string" || !/^[A-Za-z0-9]{1,40}_[A-Za-z0-9]{1,40}$/.test(exclusionId)) return GENERIC;
    await exchangesCol().doc(exchange.id).collection("exclusions").doc(exclusionId).delete();
    refresh();
    return { ok: true };
  });
}

/**
 * Hace el sorteo en una transacción: exige estado "open" y 3+ participantes, escribe una asignación por persona
 * y un hilo de buzón por pareja, y marca el intercambio como sorteado. Un segundo intento falla.
 */
export async function runDraw(exchangeId: string): Promise<Result> {
  return guard<Result>("runDraw", GENERIC, async () => {
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    const exchangeRef = exchangesCol().doc(exchange.id);

    const error = await db().runTransaction(async (tx) => {
      const [ex, participants, exclusions] = await Promise.all([
        tx.get(exchangeRef),
        tx.get(participantsCol(exchange.id)),
        tx.get(exchangeRef.collection("exclusions")),
      ]);
      if ((ex.data() as ExchangeDoc).status !== "open") return "already" as const;
      const ids = participants.docs.map((d) => d.id);
      if (ids.length < 3) return "min" as const;

      let map: Map<string, string>;
      try {
        map = draw(
          ids,
          exclusions.docs.map((d) => d.data() as ExclusionDoc),
        );
      } catch (e) {
        if (e instanceof DrawImpossibleError) return "impossible" as const;
        throw e;
      }

      for (const [giver, receiver] of map) {
        // set (no create): si un «rehacer sorteo» dejó algo a medias, se sobrescribe.
        tx.set(exchangeRef.collection("assignments").doc(giver), { receiverId: receiver, plannedWishId: null } satisfies AssignmentDoc);
        // El hilo existe siempre; el buzón se puede activar o desactivar después del sorteo.
        tx.create(exchangeRef.collection("threads").doc(), {
          giverId: giver,
          receiverId: receiver,
          updatedAt: FieldValue.serverTimestamp(),
          unreadGiver: 0,
          unreadReceiver: 0,
        });
      }
      tx.update(exchangeRef, { status: "drawn", drawnAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      return null;
    });
    if (error) return { ok: false, error };
    trackEvent("draw_completed", { participants: exchange.participantCount });
    refresh();
    return { ok: true };
  });
}

/**
 * not-drawn: todavía no hay sorteo · confirm: alguien ya abrió su sobre y falta `confirm: true`
 * (viene `revealed` con cuántos lo abrieron) · generic: otro error.
 */
export type RedoDrawResult = { ok: true } | { ok: false; error: "not-drawn" | "confirm" | "generic"; revealed?: number };

/**
 * Rehacer el sorteo (I1): borra asignaciones, hilos y mensajes del buzón, deja a todos sin sobre abierto,
 * sin «ya compré» y sin aviso de cambio, y regresa el intercambio a "open" (se puede sumar gente y volver a sortear).
 * Las exclusiones se conservan. Si alguien ya abrió su sobre, exige `{ confirm: true }`.
 */
export async function redoDraw(exchangeId: string, opts?: { confirm?: boolean }): Promise<RedoDrawResult> {
  return guard<RedoDrawResult>("redoDraw", GENERIC, async () => {
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    if (exchange.status !== "drawn") return { ok: false, error: "not-drawn" };
    const exchangeRef = exchangesCol().doc(exchange.id);
    const participants = await participantsCol(exchange.id).get();
    const revealed = participants.docs.filter((d) => (d.data() as ParticipantDoc).revealed).length;
    if (revealed > 0 && opts?.confirm !== true) return { ok: false, error: "confirm", revealed };

    // 1) Borrar hilos (con sus mensajes) y asignaciones. No cabe en una transacción si hay muchos mensajes.
    await Promise.all([db().recursiveDelete(exchangeRef.collection("threads")), db().recursiveDelete(exchangeRef.collection("assignments"))]);

    // 2) Reabrir y limpiar el avance de cada quien.
    const batch = db().batch();
    participants.docs.forEach((d) => batch.update(d.ref, { revealed: false, bought: false, assignmentChangedAt: null }));
    batch.update(exchangeRef, { status: "open", drawnAt: null, updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();
    refresh();
    return { ok: true };
  });
}
