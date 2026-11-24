import "server-only";

import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { connection } from "next/server";
import { exchangesCol, participantsCol, toParticipant } from "./exchanges";
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

/** Mensajes del otro lado que llegaron después de la última vez que `role` abrió el hilo (máx. 50). */
export async function unreadCount(thread: DocumentReference, role: MailboxRole): Promise<number> {
  const snap = await thread.get();
  if (!snap.exists) return 0;
  const readAt = (snap.data() as ThreadDoc)[role === "giver" ? "giverReadAt" : "receiverReadAt"];
  let query = thread.collection("messages").orderBy("createdAt", "desc").limit(MAX_MESSAGES);
  if (readAt) query = query.where("createdAt", ">", readAt);
  const messages = await query.get();
  return messages.docs.filter((d) => (d.data() as MessageDoc).from !== role).length;
}

/** Marca el hilo como leído por `role` (al verlo en el buzón). */
export async function markRead(thread: DocumentReference, role: MailboxRole): Promise<void> {
  await thread.update({ [role === "giver" ? "giverReadAt" : "receiverReadAt"]: FieldValue.serverTimestamp() });
}

/**
 * Nuevos por pestaña. La de «Tu persona» (giver) solo cuenta si ya abrió su sobre: antes no puede verla.
 */
export async function getUnread(exchangeId: string, meId: string, revealed: boolean): Promise<Unread> {
  const [giverThread, receiverThread] = await Promise.all([
    revealed ? getThreadRef(exchangeId, meId, "giver") : null,
    getThreadRef(exchangeId, meId, "receiver"),
  ]);
  const [giver, receiver] = await Promise.all([
    giverThread ? unreadCount(giverThread, "giver") : 0,
    receiverThread ? unreadCount(receiverThread, "receiver") : 0,
  ]);
  return { giver, receiver };
}
