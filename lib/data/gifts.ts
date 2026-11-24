import "server-only";

import { FieldValue, type DocumentReference, type DocumentSnapshot } from "firebase-admin/firestore";
import { connection } from "next/server";
import { db, exchangesCol, participantsCol, toParticipant } from "./exchanges";
import type { AssignmentDoc, MessageDoc, Participant, ThreadDoc } from "./types";

export type MailboxRole = "giver" | "receiver";
export type MailboxMessage = { id: string; mine: boolean; text: string; at: string };

export const MAX_MESSAGES = 50;

/** La asignación de quien regala y el participante que le tocó. Solo para el propio giver. */
export async function getMyAssignment(exchangeId: string, giverId: string): Promise<{ assignment: AssignmentDoc; receiver: Participant } | null> {
  await connection();
  const snap = await exchangesCol().doc(exchangeId).collection("assignments").doc(giverId).get();
  if (!snap.exists) return null;
  const assignment = snap.data() as AssignmentDoc;
  const receiver = await participantsCol(exchangeId).doc(assignment.receiverId).get();
  if (!receiver.exists) return null;
  return { assignment, receiver: toParticipant(receiver) };
}

/**
 * El hilo del buzón según el papel de quien pregunta: como "giver" es el hilo con su persona;
 * como "receiver" es el hilo con su amigo secreto. El id de quien regala nunca sale de aquí.
 */
export async function getThreadRef(exchangeId: string, meId: string, role: MailboxRole): Promise<DocumentReference | null> {
  await connection();
  const field: keyof ThreadDoc = role === "giver" ? "giverId" : "receiverId";
  const snap = await exchangesCol().doc(exchangeId).collection("threads").where(field, "==", meId).limit(1).get();
  return snap.empty ? null : snap.docs[0].ref;
}

/** Igual que getThreadRef pero devuelve el snapshot (1 lectura): el polling lo usa para no leer mensajes. */
export async function getThreadSnap(exchangeId: string, meId: string, role: MailboxRole): Promise<DocumentSnapshot | null> {
  const field: keyof ThreadDoc = role === "giver" ? "giverId" : "receiverId";
  const snap = await exchangesCol().doc(exchangeId).collection("threads").where(field, "==", meId).limit(1).get();
  return snap.empty ? null : snap.docs[0];
}

export async function readMessages(thread: DocumentReference, role: MailboxRole): Promise<MailboxMessage[]> {
  const snap = await thread.collection("messages").orderBy("createdAt", "desc").limit(MAX_MESSAGES).get();
  return snap.docs
    .map((d) => {
      const m = d.data() as MessageDoc;
      return { id: d.id, mine: m.from === role, text: m.text, at: m.createdAt?.toDate().toISOString() ?? new Date().toISOString() };
    })
    .reverse();
}

export type Unread = Record<MailboxRole, number>;

const unreadField = (role: MailboxRole) => (role === "giver" ? "unreadGiver" : "unreadReceiver");
const readAtField = (role: MailboxRole) => (role === "giver" ? "giverReadAt" : "receiverReadAt");

/** ISO del último mensaje del hilo (cursor del polling), o null si no hay mensajes. */
export function threadCursor(snap: DocumentSnapshot | null): string | null {
  const at = (snap?.data() as ThreadDoc | undefined)?.lastMessageAt;
  return at ? at.toDate().toISOString() : null;
}

/** Hilos creados antes de los contadores: se cuentan a la antigua (consulta de mensajes). */
async function legacyUnread(snap: DocumentSnapshot, role: MailboxRole): Promise<number> {
  const readAt = (snap.data() as ThreadDoc)[readAtField(role)];
  let query = snap.ref.collection("messages").orderBy("createdAt", "desc").limit(MAX_MESSAGES);
  if (readAt) query = query.where("createdAt", ">", readAt);
  const messages = await query.get();
  return messages.docs.filter((d) => (d.data() as MessageDoc).from !== role).length;
}

/** Mensajes del otro lado que `role` no ha leído. Con contadores: 0 lecturas extra. */
export async function unreadFromSnap(snap: DocumentSnapshot | null, role: MailboxRole): Promise<number> {
  if (!snap?.exists) return 0;
  const data = snap.data() as ThreadDoc;
  const counter = data[unreadField(role)];
  return typeof counter === "number" ? Math.max(0, counter) : legacyUnread(snap, role);
}

/** Mensajes del otro lado que llegaron después de la última vez que `role` abrió el hilo. */
export async function unreadCount(thread: DocumentReference, role: MailboxRole): Promise<number> {
  return unreadFromSnap(await thread.get(), role);
}

/**
 * Marca el hilo como leído por `role`, pero solo escribe si hay algo sin leer (antes era 1 escritura por poll).
 * Si ya se tiene el snapshot, pásalo para ahorrar la lectura.
 */
export async function markRead(thread: DocumentReference, role: MailboxRole, known?: DocumentSnapshot | null): Promise<void> {
  const snap = known ?? (await thread.get());
  if (!snap.exists) return;
  // 0 = nada nuevo. Un hilo viejo sin contador se escribe una vez y ya queda con contador.
  if ((snap.data() as ThreadDoc)[unreadField(role)] === 0) return;
  await thread.update({ [readAtField(role)]: FieldValue.serverTimestamp(), [unreadField(role)]: 0 });
}

/**
 * Nuevos por pestaña. La de «Tu persona» (giver) solo cuenta si ya abrió su sobre: antes no puede verla.
 */
export async function getUnread(exchangeId: string, meId: string, revealed: boolean): Promise<Unread> {
  const [giverThread, receiverThread] = await Promise.all([
    revealed ? getThreadSnap(exchangeId, meId, "giver") : null,
    getThreadSnap(exchangeId, meId, "receiver"),
  ]);
  const [giver, receiver] = await Promise.all([unreadFromSnap(giverThread, "giver"), unreadFromSnap(receiverThread, "receiver")]);
  return { giver, receiver };
}

/** «YYYY-MM-DD» en UTC: llave del tope diario de mensajes por hilo. */
const dayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Agrega un mensaje en una transacción: respeta el tope diario del hilo, sube el contador de no leídos
 * del otro lado, deja en 0 el propio (quien escribe está viendo el hilo) y mueve `lastMessageAt`.
 * Devuelve false si se llegó al tope del día.
 */
export async function appendMessage(thread: DocumentReference, role: MailboxRole, text: string, maxPerDay: number): Promise<boolean> {
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(thread);
    if (!snap.exists) throw new Error("thread-missing");
    const data = snap.data() as ThreadDoc;
    const today = dayKey();
    const count = data.dayKey === today ? (data.dayCount ?? 0) : 0;
    if (count >= maxPerDay) return false;
    const other: MailboxRole = role === "giver" ? "receiver" : "giver";
    const now = FieldValue.serverTimestamp();
    tx.create(thread.collection("messages").doc(), { from: role, text, createdAt: now });
    tx.update(thread, {
      updatedAt: now,
      lastMessageAt: now,
      [unreadField(other)]: typeof data[unreadField(other)] === "number" ? FieldValue.increment(1) : 1,
      [unreadField(role)]: 0,
      [readAtField(role)]: now,
      dayKey: today,
      dayCount: count + 1,
    });
    return true;
  });
}
