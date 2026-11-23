"use server";

import { FieldValue } from "firebase-admin/firestore";
import { refresh } from "next/cache";
import { db, exchangesCol, participantsCol } from "@/lib/data/exchanges";
import { ownedExchange } from "@/lib/data/owner";
import type { AssignmentDoc, ExchangeDoc, ExclusionDoc } from "@/lib/data/types";
import { draw, DrawImpossibleError } from "@/lib/draw";

type DrawError = "min" | "impossible" | "already" | "same" | "duplicate" | "generic";
type Result = { ok: true } | { ok: false; error: DrawError };

export async function addExclusion(exchangeId: string, x: string, y: string): Promise<Result> {
  const exchange = await ownedExchange(exchangeId);
  if (!exchange) return { ok: false, error: "generic" };
  if (exchange.status !== "open") return { ok: false, error: "already" };
  if (!x || !y || x === y) return { ok: false, error: "same" };
  const [a, b] = x < y ? [x, y] : [y, x];
  const [pa, pb] = await Promise.all([participantsCol(exchange.id).doc(a).get(), participantsCol(exchange.id).doc(b).get()]);
  if (!pa.exists || !pb.exists) return { ok: false, error: "generic" };
  try {
    // El id determinista evita exclusiones duplicadas.
    await exchangesCol().doc(exchange.id).collection("exclusions").doc(`${a}_${b}`).create({ a, b } satisfies ExclusionDoc);
  } catch (err) {
    return { ok: false, error: (err as { code?: number }).code === 6 ? "duplicate" : "generic" };
  }
  refresh();
  return { ok: true };
}

export async function removeExclusion(exchangeId: string, exclusionId: string): Promise<Result> {
  const exchange = await ownedExchange(exchangeId);
  if (!exchange) return { ok: false, error: "generic" };
  if (exchange.status !== "open") return { ok: false, error: "already" };
  await exchangesCol().doc(exchange.id).collection("exclusions").doc(exclusionId).delete();
  refresh();
  return { ok: true };
}

/**
 * Hace el sorteo en una transacción: exige estado "open" y 3+ participantes, escribe una asignación por persona
 * y un hilo de buzón por pareja, y marca el intercambio como sorteado. Un segundo intento falla.
 */
export async function runDraw(exchangeId: string): Promise<Result> {
  const exchange = await ownedExchange(exchangeId);
  if (!exchange) return { ok: false, error: "generic" };
  const exchangeRef = exchangesCol().doc(exchange.id);

  try {
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
        tx.create(exchangeRef.collection("assignments").doc(giver), { receiverId: receiver, plannedWishId: null } satisfies AssignmentDoc);
        // El hilo existe siempre; el buzón se puede activar o desactivar después del sorteo.
        tx.create(exchangeRef.collection("threads").doc(), { giverId: giver, receiverId: receiver, updatedAt: FieldValue.serverTimestamp() });
      }
      tx.update(exchangeRef, { status: "drawn", drawnAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      return null;
    });
    if (error) return { ok: false, error };
  } catch {
    return { ok: false, error: "generic" };
  }
  refresh();
  return { ok: true };
}
