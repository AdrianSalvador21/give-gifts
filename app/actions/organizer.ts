"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, exchangesCol, participantsCol, wishesCol } from "@/lib/data/exchanges";
import { ownedExchange } from "@/lib/data/owner";
import { insertParticipant, type JoinError } from "@/lib/data/participants";
import type { ExchangeDoc, ParticipantDoc } from "@/lib/data/types";
import { eventDateFrom } from "@/lib/format";
import { exchangeFields } from "@/lib/validation/exchange";

type Fail = { ok: false; error: string };

/** Agrega un participante asistido (sin celular). Devuelve su token para copiar su link. */
export async function addAssisted(exchangeId: string, name: string): Promise<{ ok: true; token: string } | { ok: false; error: JoinError }> {
  const exchange = await ownedExchange(exchangeId);
  if (!exchange) return { ok: false, error: "generic" };
  const res = await insertParticipant(exchange.id, name, "assisted");
  if ("error" in res) return { ok: false, error: res.error };
  refresh();
  return { ok: true, token: res.token };
}

/** Quita a un participante antes del sorteo: su doc, sus deseos, su token y sus exclusiones. */
export async function removeParticipant(exchangeId: string, participantId: string): Promise<{ ok: true } | Fail> {
  const exchange = await ownedExchange(exchangeId);
  if (!exchange) return { ok: false, error: "generic" };
  const exchangeRef = exchangesCol().doc(exchange.id);
  const pRef = participantsCol(exchange.id).doc(participantId);
  try {
    const wishes = await wishesCol(exchange.id, participantId).listDocuments();
    const exclusions = await exchangeRef.collection("exclusions").get();
    const error = await db().runTransaction(async (tx) => {
      const [ex, p] = await Promise.all([tx.get(exchangeRef), tx.get(pRef)]);
      if ((ex.data() as ExchangeDoc).status !== "open") return "closed";
      if (!p.exists) return null;
      const data = p.data() as ParticipantDoc;
      if (data.kind === "owner") return "owner";
      wishes.forEach((w) => tx.delete(w));
      exclusions.docs.filter((e) => e.data().a === participantId || e.data().b === participantId).forEach((e) => tx.delete(e.ref));
      tx.delete(db().collection("tokens").doc(data.token));
      tx.delete(pRef);
      tx.update(exchangeRef, { participantCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
      return null;
    });
    if (error) return { ok: false, error };
  } catch {
    return { ok: false, error: "generic" };
  }
  refresh();
  return { ok: true };
}

const editSchema = z.object({
  name: exchangeFields.name,
  groupType: exchangeFields.groupType,
  giftCategory: exchangeFields.giftCategory,
  date: exchangeFields.date,
  time: exchangeFields.time,
  place: exchangeFields.place,
  budget: exchangeFields.budget,
  message: exchangeFields.message,
  ownerSeesMap: exchangeFields.ownerSeesMap,
  mailboxEnabled: exchangeFields.mailboxEnabled,
});
export type EditInput = z.input<typeof editSchema>;

/**
 * Edita el intercambio. Después del sorteo solo cambian fecha/hora, lugar, mensaje y buzón;
 * cualquier otro cambio se rechaza aquí, no solo en la interfaz.
 */
export async function updateExchange(exchangeId: string, input: EditInput): Promise<{ ok: true } | { ok: false; error: string; fields?: string[] }> {
  const exchange = await ownedExchange(exchangeId);
  if (!exchange) return { ok: false, error: "generic" };
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "fields", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  const v = parsed.data;
  const eventAt = eventDateFrom(v.date, v.time);
  if (eventAt.getTime() <= Date.now()) return { ok: false, error: "fields", fields: ["date"] };

  const drawn = exchange.status === "drawn";
  if (drawn) {
    const locked =
      v.name !== exchange.name ||
      v.groupType !== exchange.groupType ||
      v.giftCategory !== exchange.giftCategory ||
      v.budget !== exchange.budget.amount ||
      v.ownerSeesMap !== exchange.rules.ownerSeesMap;
    if (locked) return { ok: false, error: "locked" };
  }

  const update: Record<string, unknown> = {
    eventAt: Timestamp.fromDate(eventAt),
    place: v.place || null,
    message: v.message,
    "rules.mailboxEnabled": v.mailboxEnabled,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!drawn) {
    Object.assign(update, {
      name: v.name,
      groupType: v.groupType,
      giftCategory: v.giftCategory,
      "budget.amount": v.budget,
      "rules.ownerSeesMap": v.ownerSeesMap,
    });
  }
  try {
    await exchangesCol().doc(exchange.id).update(update);
  } catch {
    return { ok: false, error: "generic" };
  }
  refresh();
  return { ok: true };
}
