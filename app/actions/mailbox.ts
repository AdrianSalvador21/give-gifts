"use server";

import { db, getByToken } from "@/lib/data/exchanges";
import { appendMessage, getThreadSnap, getUnread, markRead, readMessages, threadCursor, unreadFromSnap, type MailboxMessage, type MailboxRole, type Unread } from "@/lib/data/gifts";
import type { TokenDoc } from "@/lib/data/types";
import { isValidToken } from "@/lib/tokens";
import { guard } from "@/lib/server/action";
import { hitRateLimit, MAX_MESSAGES_PER_THREAD_PER_DAY } from "@/lib/server/rate-limit";

/** limit: tope diario del hilo · rate: demasiados mensajes seguidos desde este link. */
type Fail = { ok: false; error: "not-found" | "closed" | "empty" | "long" | "limit" | "rate" | "generic" };
/** `cursor`: ISO del último mensaje del hilo abierto; se manda tal cual a pollMailbox como `since`. */
type Ok = { ok: true; messages: MailboxMessage[]; unread: Unread; cursor: string | null };
const GENERIC: Fail = { ok: false, error: "generic" };

const isRole = (r: unknown): r is MailboxRole => r === "giver" || r === "receiver";

/** Resuelve el hilo en el servidor a partir del link personal; nunca expone giverId. */
async function thread(inviteCode: string, token: string, role: MailboxRole) {
  const found = await getByToken(inviteCode, token);
  if (!found) return { snap: null, error: "not-found" as const };
  const { exchange, me } = found;
  if (exchange.status !== "drawn" || !exchange.rules.mailboxEnabled) return { snap: null, error: "closed" as const };
  // «Tu persona» se abre hasta que la persona abre su sobre.
  if (role === "giver" && !me.revealed) return { snap: null, error: "closed" as const };
  const snap = await getThreadSnap(exchange.id, me.id, role);
  return snap ? { snap, error: undefined, exchangeId: exchange.id, meId: me.id, revealed: me.revealed } : { snap: null, error: "generic" as const };
}

/** Mensajes del hilo; verlos lo marca como leído (solo escribe si había no leídos) y devuelve los nuevos de cada pestaña. */
export async function listMessages(inviteCode: string, token: string, role: MailboxRole): Promise<Ok | Fail> {
  return guard<Ok | Fail>("listMessages", GENERIC, async () => {
    if (!isRole(role)) return GENERIC;
    const res = await thread(inviteCode, token, role);
    if (!res.snap) return { ok: false, error: res.error ?? "generic" };
    await markRead(res.snap.ref, role, res.snap);
    const [messages, unread] = await Promise.all([readMessages(res.snap.ref, role), getUnread(res.exchangeId, res.meId, res.revealed)]);
    unread[role] = 0;
    return { ok: true, messages, unread, cursor: threadCursor(res.snap) };
  });
}

/**
 * Polling barato (I4): ¿hay algo nuevo en el hilo `role` desde `since`?
 * Lee el doc del token y los dos docs de hilo (3 lecturas, sin leer mensajes ni escribir).
 * Si `changed` es true, el cliente llama listMessages para traer los mensajes.
 * `unread` trae los no leídos de cada pestaña para los globitos.
 */
export async function pollMailbox(
  inviteCode: string,
  token: string,
  role: MailboxRole,
  since: string | null,
): Promise<{ ok: true; changed: boolean; unread: Unread } | { ok: false; error: "not-found" | "generic" }> {
  return guard<{ ok: true; changed: boolean; unread: Unread } | { ok: false; error: "not-found" | "generic" }>("pollMailbox", { ok: false, error: "generic" }, async () => {
    if (!isRole(role) || typeof token !== "string" || !isValidToken(token)) return { ok: false, error: "not-found" };
    const tokenSnap = await db().collection("tokens").doc(token).get();
    if (!tokenSnap.exists) return { ok: false, error: "not-found" };
    const { exchangeId, participantId } = tokenSnap.data() as TokenDoc;
    const [giver, receiver] = await Promise.all([getThreadSnap(exchangeId, participantId, "giver"), getThreadSnap(exchangeId, participantId, "receiver")]);
    const current = role === "giver" ? giver : receiver;
    const cursor = threadCursor(current);
    const changed = cursor !== (typeof since === "string" ? since : null) && cursor !== null;
    const [g, r] = await Promise.all([unreadFromSnap(giver, "giver"), unreadFromSnap(receiver, "receiver")]);
    return { ok: true, changed, unread: { giver: g, receiver: r } };
  });
}

export async function sendMessage(inviteCode: string, token: string, role: MailboxRole, text: string): Promise<Ok | Fail> {
  return guard<Ok | Fail>("sendMessage", GENERIC, async () => {
    if (!isRole(role) || typeof text !== "string") return GENERIC;
    const body = text.trim();
    if (!body) return { ok: false, error: "empty" };
    if (body.length > 500) return { ok: false, error: "long" };
    const res = await thread(inviteCode, token, role);
    if (!res.snap) return { ok: false, error: res.error ?? "generic" };
    if (await hitRateLimit("message", token)) return { ok: false, error: "rate" };
    const sent = await appendMessage(res.snap.ref, role, body, MAX_MESSAGES_PER_THREAD_PER_DAY);
    if (!sent) return { ok: false, error: "limit" };
    const [messages, unread, fresh] = await Promise.all([readMessages(res.snap.ref, role), getUnread(res.exchangeId, res.meId, res.revealed), res.snap.ref.get()]);
    unread[role] = 0;
    return { ok: true, messages, unread, cursor: threadCursor(fresh) };
  });
}
