import "server-only";

import type { DocumentSnapshot } from "firebase-admin/firestore";
import { connection } from "next/server";
import { cache } from "react";
import { adminDb } from "@/lib/firebase/admin";
import { appUrl } from "@/lib/format";
import { isValidInviteCode, isValidToken } from "@/lib/tokens";
import {
  DEFAULT_TIME_ZONE,
  MAX_PARTICIPANTS,
  type AssignmentDoc,
  type Exchange,
  type ExchangeDoc,
  type ExclusionDoc,
  type InviteDoc,
  type PanelParticipant,
  type Participant,
  type ParticipantDoc,
  type TokenDoc,
  type Wish,
  type WishDoc,
} from "./types";

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
  const { createdAt, updatedAt, eventAt, drawnAt, timeZone, registrationOpen, announcedAt, ...rest } = snap.data() as ExchangeDoc;
  return {
    ...rest,
    id: snap.id,
    eventAt: eventAt.toDate().toISOString(),
    drawnAt: drawnAt ? drawnAt.toDate().toISOString() : null,
    announcedAt: announcedAt ? announcedAt.toDate().toISOString() : null,
    timeZone: timeZone || DEFAULT_TIME_ZONE,
    registrationOpen: registrationOpen !== false,
  };
}

/** Sin token: el link personal nunca viaja en los datos de las páginas (ver toPanelParticipant). */
export function toParticipant(snap: DocumentSnapshot): Participant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { joinedAt, nameKey, token, linkResetAt, linkResets, assignmentChangedAt, ...rest } = snap.data() as ParticipantDoc;
  return {
    ...rest,
    id: snap.id,
    joinedAt: joinedAt?.toDate().toISOString() ?? "",
    linkResetAt: linkResetAt ? linkResetAt.toDate().toISOString() : null,
    linkResets: linkResets ?? 0,
    assignmentChangedAt: assignmentChangedAt ? assignmentChangedAt.toDate().toISOString() : null,
  };
}

/** Ruta del link personal: solo para quien tiene derecho a ella (el propio participante, o el organizador para owner/assisted). */
export const personalPath = (inviteCode: string, token: string) => `/i/${inviteCode}/p/${token}`;

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

/** Primeros `n` participantes, para la prueba social de la invitación (una lectura por doc mostrado). */
export const getParticipantPreview = cache(async (exchangeId: string, n = 4): Promise<Participant[]> => {
  await live();
  const snap = await participantsCol(exchangeId).orderBy("joinedAt", "asc").limit(n).get();
  return snap.docs.map(toParticipant);
});

/**
 * Participantes para el panel del organizador. Solo el owner y los asistidos traen `path`/`link`:
 * de quienes se apuntaron solos, quien organiza no recibe el link (R1). Para reenviarlo debe generar
 * uno nuevo con regenerateParticipantLink, y el participante lo verá.
 */
export const getPanelParticipants = cache(async (exchange: Exchange): Promise<PanelParticipant[]> => {
  await live();
  const snap = await participantsCol(exchange.id).orderBy("joinedAt", "asc").get();
  return snap.docs.map((d) => {
    const { kind, token } = d.data() as ParticipantDoc;
    const path = kind === "owner" || kind === "assisted" ? personalPath(exchange.inviteCode, token) : null;
    return { ...toParticipant(d), path, link: path ? appUrl(path) : null };
  });
});

/**
 * El participante de quien organiza (con su `path` personal), o null si no participa. Una lectura:
 * lo usan ¡Listo! y Mis intercambios para «Llena tu lista» y el siguiente paso.
 */
export const getOwnerParticipant = cache(async (exchange: Exchange): Promise<PanelParticipant | null> => {
  await live();
  if (!exchange.rules.ownerParticipates) return null;
  const snap = await participantsCol(exchange.id).where("kind", "==", "owner").limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  const path = personalPath(exchange.inviteCode, (d.data() as ParticipantDoc).token);
  return { ...toParticipant(d), path, link: appUrl(path) };
});

/** Por qué ya no se puede uno apuntar desde la invitación (null = sí se puede). */
export type JoinBlock = "drawn" | "paused" | "full" | null;

export function joinBlock(exchange: Exchange): JoinBlock {
  if (exchange.status !== "open") return "drawn";
  if (!exchange.registrationOpen) return "paused";
  if (exchange.participantCount >= MAX_PARTICIPANTS) return "full";
  return null;
}

/**
 * Datos de la página de invitación /i/[code]: el intercambio, el nombre de quien organiza (también después
 * del sorteo, para «pídele tu link a {owner}») y si todavía se puede entrar.
 */
export const getInviteView = cache(async (inviteCode: string): Promise<{ exchange: Exchange; ownerName: string; block: JoinBlock } | null> => {
  const exchange = await getExchangeByInvite(inviteCode);
  if (!exchange) return null;
  return { exchange, ownerName: await getOwnerName(exchange), block: joinBlock(exchange) };
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
