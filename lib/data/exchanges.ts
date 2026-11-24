import "server-only";

import type { DocumentSnapshot } from "firebase-admin/firestore";
import { connection } from "next/server";
import { cache } from "react";
import { adminDb } from "@/lib/firebase/admin";
import { isValidInviteCode, isValidToken } from "@/lib/tokens";
import type { AssignmentDoc, Exchange, ExchangeDoc, ExclusionDoc, InviteDoc, Participant, ParticipantDoc, TokenDoc, Wish, WishDoc } from "./types";

export const db = () => adminDb();

export const MAX_WISHES = 20;

/** Firestore usa valores aleatorios internamente: toda lectura ocurre en tiempo de request, nunca en prerender. */
const live = () => connection();
export const exchangesCol = () => db().collection("exchanges");
export const participantsCol = (exchangeId: string) => exchangesCol().doc(exchangeId).collection("participants");
export const wishesCol = (exchangeId: string, participantId: string) => participantsCol(exchangeId).doc(participantId).collection("wishes");

export function toExchange(snap: DocumentSnapshot): Exchange {
  // createdAt/updatedAt se descartan: los Timestamp de Firestore no se pueden pasar a componentes cliente.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt, updatedAt, eventAt, drawnAt, ...rest } = snap.data() as ExchangeDoc;
  return {
    ...rest,
    id: snap.id,
    eventAt: eventAt.toDate().toISOString(),
    drawnAt: drawnAt ? drawnAt.toDate().toISOString() : null,
  };
}

export function toParticipant(snap: DocumentSnapshot): Participant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { joinedAt, nameKey, ...rest } = snap.data() as ParticipantDoc;
  return { ...rest, id: snap.id, joinedAt: joinedAt?.toDate().toISOString() ?? "" };
}

export function toWish(snap: DocumentSnapshot): Wish {
  const d = snap.data() as WishDoc;
  return { ...d, id: snap.id, createdAt: d.createdAt?.toDate().toISOString() ?? "" };
}

export const getExchange = cache(async (exchangeId: string): Promise<Exchange | null> => {
  await live();
  if (!/^[A-Za-z0-9]{1,40}$/.test(exchangeId)) return null;
  const snap = await exchangesCol().doc(exchangeId).get();
  return snap.exists ? toExchange(snap) : null;
});

export const getExchangeByInvite = cache(async (inviteCode: string): Promise<Exchange | null> => {
  await live();
  if (!isValidInviteCode(inviteCode)) return null;
  const invite = await db().collection("invites").doc(inviteCode).get();
  if (!invite.exists) return null;
  return getExchange((invite.data() as InviteDoc).exchangeId);
});

export const getParticipants = cache(async (exchangeId: string): Promise<Participant[]> => {
  await live();
  const snap = await participantsCol(exchangeId).orderBy("joinedAt", "asc").get();
  return snap.docs.map(toParticipant);
});

/** Resuelve un link personal. Devuelve null si el token no existe o no pertenece a ese código de invitación. */
export const getByToken = cache(async (inviteCode: string, token: string): Promise<{ exchange: Exchange; me: Participant } | null> => {
  await live();
  if (!isValidToken(token)) return null;
  const tokenSnap = await db().collection("tokens").doc(token).get();
  if (!tokenSnap.exists) return null;
  const { exchangeId, participantId } = tokenSnap.data() as TokenDoc;
  const [exchange, meSnap] = await Promise.all([getExchange(exchangeId), participantsCol(exchangeId).doc(participantId).get()]);
  if (!exchange || !meSnap.exists || exchange.inviteCode !== inviteCode) return null;
  return { exchange, me: toParticipant(meSnap) };
});

export async function getOwnedExchanges(ownerUid: string): Promise<Exchange[]> {
  await live();
  // Sin orderBy: así no hace falta un índice compuesto. Un organizador tiene pocos intercambios.
  const snap = await exchangesCol().where("ownerUid", "==", ownerUid).limit(100).get();
  return snap.docs.map(toExchange).sort((x, y) => y.eventAt.localeCompare(x.eventAt));
}

/** Nombre de quien organiza: su participante "owner", o su perfil si no participa. */
export const getOwnerName = cache(async (exchange: Exchange): Promise<string> => {
  await live();
  const owner = await participantsCol(exchange.id).where("kind", "==", "owner").limit(1).get();
  if (!owner.empty) return (owner.docs[0].data() as ParticipantDoc).name;
  const user = await db().collection("users").doc(exchange.ownerUid).get();
  return (user.data()?.displayName as string | undefined) ?? "";
});

/**
 * Deseos de un participante, del más nuevo al más viejo. Con `favoritesFirst` (lo que ve quien regala)
 * los marcados «La quiero más» van arriba.
 */
export const getWishes = cache(async (exchangeId: string, participantId: string, favoritesFirst = false): Promise<Wish[]> => {
  await live();
  const snap = await wishesCol(exchangeId, participantId).orderBy("createdAt", "desc").limit(MAX_WISHES).get();
  const wishes = snap.docs.map(toWish);
  return favoritesFirst ? [...wishes.filter((w) => w.favorite), ...wishes.filter((w) => !w.favorite)] : wishes;
});

/** Asignaciones del sorteo. Solo se llama cuando quien ve tiene derecho (p. ej. ownerSeesMap). */
export async function getAssignments(exchangeId: string): Promise<Map<string, AssignmentDoc>> {
  await live();
  const snap = await exchangesCol().doc(exchangeId).collection("assignments").get();
  return new Map(snap.docs.map((d) => [d.id, d.data() as AssignmentDoc]));
}

export async function getExclusions(exchangeId: string): Promise<{ id: string; a: string; b: string }[]> {
  await live();
  const snap = await exchangesCol().doc(exchangeId).collection("exclusions").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ExclusionDoc) }));
}
