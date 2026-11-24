"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, exchangesCol, participantsCol, personalPath, wishesCol } from "@/lib/data/exchanges";
import { ownedExchange } from "@/lib/data/owner";
import { insertParticipant, type JoinError } from "@/lib/data/participants";
import type { AssignmentDoc, ExchangeDoc, ParticipantDoc, ThreadDoc } from "@/lib/data/types";
import { appUrl, eventDateFrom } from "@/lib/format";
import { guard } from "@/lib/server/action";
import { purgeExchange } from "@/lib/server/cleanup";
import { newToken } from "@/lib/tokens";
import { exchangeFields } from "@/lib/validation/exchange";

type Fail = { ok: false; error: string };
const GENERIC = { ok: false, error: "generic" } as const;
const ID = /^[A-Za-z0-9]{1,40}$/;

/** Agrega un participante asistido (sin celular). Devuelve su token para copiar su link. */
export async function addAssisted(exchangeId: string, name: string): Promise<{ ok: true; token: string } | { ok: false; error: JoinError }> {
  return guard<{ ok: true; token: string } | { ok: false; error: JoinError }>("addAssisted", GENERIC, async () => {
    if (typeof name !== "string") return GENERIC;
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    const res = await insertParticipant(exchange.id, name, "assisted");
    if ("error" in res) return { ok: false, error: res.error };
    refresh();
    return { ok: true, token: res.token };
  });
}

/** Quita a un participante antes del sorteo: su doc, sus deseos, su token y sus exclusiones. closed = ya se sorteó (usa removeParticipantAfterDraw). */
export async function removeParticipant(exchangeId: string, participantId: string): Promise<{ ok: true } | Fail> {
  return guard<{ ok: true } | Fail>("removeParticipant", GENERIC, async () => {
    if (typeof participantId !== "string" || !ID.test(participantId)) return GENERIC;
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    const exchangeRef = exchangesCol().doc(exchange.id);
    const pRef = participantsCol(exchange.id).doc(participantId);
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
    refresh();
    return { ok: true };
  });
}

/**
 * not-drawn: todavía no hay sorteo (usa removeParticipant) · owner: no te puedes quitar a ti ·
 * min: quedarían menos de 2 personas en el ciclo · exclusion: reconectar rompería una exclusión (rehaz el sorteo) ·
 * generic: otro error.
 */
export type RemoveAfterDrawResult = { ok: true } | { ok: false; error: "not-drawn" | "owner" | "min" | "exclusion" | "generic" };

/**
 * Quita a alguien después del sorteo (I1). En el ciclo A→X→B basta con reconectar A→B: solo cambia la persona de A,
 * que queda marcada con `assignmentChangedAt` para que su inicio le avise. B conserva a su amigo secreto… que ahora es A.
 * Se borran los deseos, el token, las exclusiones y los hilos del buzón de X (A→X y X→B); se crea el hilo A→B.
 * Para no delatar a A ante quien organiza, no se tocan `revealed` ni `bought` de A (el aviso se lo explica a A).
 */
export async function removeParticipantAfterDraw(exchangeId: string, participantId: string): Promise<RemoveAfterDrawResult> {
  return guard<RemoveAfterDrawResult>("removeParticipantAfterDraw", GENERIC, async () => {
    if (typeof participantId !== "string" || !ID.test(participantId)) return GENERIC;
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    if (exchange.status !== "drawn") return { ok: false, error: "not-drawn" };
    const exchangeRef = exchangesCol().doc(exchange.id);
    const assignmentsCol = exchangeRef.collection("assignments");
    const threadsCol = exchangeRef.collection("threads");
    const xRef = participantsCol(exchange.id).doc(participantId);

    const [wishes, exclusions, oldThreads] = await Promise.all([
      wishesCol(exchange.id, participantId).listDocuments(),
      exchangeRef.collection("exclusions").get(),
      Promise.all([threadsCol.where("giverId", "==", participantId).get(), threadsCol.where("receiverId", "==", participantId).get()]),
    ]);

    const error = await db().runTransaction(async (tx) => {
      const [ex, x, xAssignment, giverOfX] = await Promise.all([
        tx.get(exchangeRef),
        tx.get(xRef),
        tx.get(assignmentsCol.doc(participantId)),
        tx.get(assignmentsCol.where("receiverId", "==", participantId).limit(1)),
      ]);
      if ((ex.data() as ExchangeDoc).status !== "drawn") return "not-drawn" as const;
      if (!x.exists) return null; // ya no estaba
      const xData = x.data() as ParticipantDoc;
      if (xData.kind === "owner") return "owner" as const;
      if (!xAssignment.exists || giverOfX.empty) return "generic" as const;
      const a = giverOfX.docs[0].id;
      const b = (xAssignment.data() as AssignmentDoc).receiverId;
      if (a === b || a === participantId || b === participantId) return "min" as const;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      if (exclusions.docs.some((e) => e.id === `${lo}_${hi}`)) return "exclusion" as const;

      tx.set(assignmentsCol.doc(a), { receiverId: b, plannedWishId: null } satisfies AssignmentDoc);
      tx.delete(assignmentsCol.doc(participantId));
      tx.update(participantsCol(exchange.id).doc(a), { assignmentChangedAt: FieldValue.serverTimestamp() });
      tx.create(threadsCol.doc(), {
        giverId: a,
        receiverId: b,
        updatedAt: FieldValue.serverTimestamp(),
        unreadGiver: 0,
        unreadReceiver: 0,
      } satisfies Omit<ThreadDoc, "updatedAt"> & { updatedAt: FieldValue });

      wishes.forEach((w) => tx.delete(w));
      exclusions.docs.filter((e) => e.data().a === participantId || e.data().b === participantId).forEach((e) => tx.delete(e.ref));
      tx.delete(db().collection("tokens").doc(xData.token));
      tx.delete(xRef);
      tx.update(exchangeRef, { participantCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
      return null;
    });
    if (error) return { ok: false, error };

    // Los hilos viejos (con sus mensajes) se borran fuera de la transacción.
    await Promise.all(oldThreads.flatMap((q) => q.docs).map((d) => db().recursiveDelete(d.ref)));
    refresh();
    return { ok: true };
  });
}

/**
 * Genera un link personal nuevo para un participante (R1): el anterior deja de servir, se guarda `linkResetAt`
 * y sube `linkResets`; el participante verá «Tu organizador generó un link nuevo para ti el {fecha}».
 * El link nuevo se devuelve UNA sola vez (el panel no lo vuelve a mostrar para quienes se apuntaron solos).
 */
export async function regenerateParticipantLink(exchangeId: string, participantId: string): Promise<{ ok: true; link: string } | { ok: false; error: "not-found" | "generic" }> {
  return guard<{ ok: true; link: string } | { ok: false; error: "not-found" | "generic" }>("regenerateParticipantLink", GENERIC, async () => {
    if (typeof participantId !== "string" || !ID.test(participantId)) return { ok: false, error: "not-found" };
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    const pRef = participantsCol(exchange.id).doc(participantId);
    const tokens = db().collection("tokens");
    const token = await db().runTransaction(async (tx) => {
      const p = await tx.get(pRef);
      if (!p.exists) return null;
      const old = (p.data() as ParticipantDoc).token;
      const next = newToken();
      tx.delete(tokens.doc(old));
      tx.create(tokens.doc(next), { exchangeId: exchange.id, participantId });
      tx.update(pRef, { token: next, linkResetAt: FieldValue.serverTimestamp(), linkResets: FieldValue.increment(1) });
      return next;
    });
    if (!token) return { ok: false, error: "not-found" };
    refresh();
    return { ok: true, link: appUrl(personalPath(exchange.inviteCode, token)) };
  });
}

/** «Cerrar inscripciones» (I6): con `open=false` la invitación ya no acepta gente nueva (el organizador sí puede agregar asistidos). */
export async function setRegistrationOpen(exchangeId: string, open: boolean): Promise<{ ok: true } | { ok: false; error: "closed" | "generic" }> {
  return guard<{ ok: true } | { ok: false; error: "closed" | "generic" }>("setRegistrationOpen", GENERIC, async () => {
    if (typeof open !== "boolean") return GENERIC;
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    if (exchange.status !== "open") return { ok: false, error: "closed" };
    await exchangesCol().doc(exchange.id).update({ registrationOpen: open, updatedAt: FieldValue.serverTimestamp() });
    refresh();
    return { ok: true };
  });
}

/**
 * Borra el intercambio para siempre (I1): primero los tokens (los links personales dejan de servir al instante)
 * y la invitación; luego el intercambio con todas sus subcolecciones. Si sale bien redirige a /mis-intercambios.
 */
export async function deleteExchange(exchangeId: string): Promise<{ ok: false; error: "generic" }> {
  const fail = await guard<{ ok: false; error: "generic" } | null>("deleteExchange", GENERIC, async () => {
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    await purgeExchange(exchange.id, exchange.inviteCode);
    return null;
  });
  if (fail) return fail;
  redirect("/mis-intercambios");
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
  timeZone: exchangeFields.timeZone,
});
export type EditInput = z.input<typeof editSchema>;

/**
 * Edita el intercambio. Después del sorteo solo cambian fecha/hora, zona horaria, lugar, mensaje y buzón;
 * cualquier otro cambio se rechaza aquí, no solo en la interfaz.
 * La fecha solo tiene que ser futura si cambió (M13): después del evento se puede seguir editando el mensaje o el buzón.
 */
export async function updateExchange(exchangeId: string, input: EditInput): Promise<{ ok: true } | { ok: false; error: string; fields?: string[] }> {
  return guard<{ ok: true } | { ok: false; error: string; fields?: string[] }>("updateExchange", GENERIC, async () => {
    const exchange = await ownedExchange(exchangeId);
    if (!exchange) return GENERIC;
    const parsed = editSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "fields", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
    const v = parsed.data;
    const timeZone = v.timeZone || exchange.timeZone;
    const eventAt = eventDateFrom(v.date, v.time, timeZone);
    if (Number.isNaN(eventAt.getTime())) return { ok: false, error: "fields", fields: ["date"] };
    const dateChanged = eventAt.getTime() !== new Date(exchange.eventAt).getTime();
    if (dateChanged && eventAt.getTime() <= Date.now()) return { ok: false, error: "fields", fields: ["date"] };

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
      timeZone,
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
    await exchangesCol().doc(exchange.id).update(update);
    refresh();
    return { ok: true };
  });
}
