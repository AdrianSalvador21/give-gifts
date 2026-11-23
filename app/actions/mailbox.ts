"use server";

import { FieldValue } from "firebase-admin/firestore";
import { getByToken } from "@/lib/data/exchanges";
import { getThreadRef, readMessages, type MailboxMessage, type MailboxRole } from "@/lib/data/gifts";
import type { MessageDoc } from "@/lib/data/types";

type Fail = { ok: false; error: "not-found" | "closed" | "empty" | "long" | "generic" };

const isRole = (r: unknown): r is MailboxRole => r === "giver" || r === "receiver";

/** Resuelve el hilo en el servidor a partir del link personal; nunca expone giverId. */
async function thread(inviteCode: string, token: string, role: MailboxRole) {
  const found = await getByToken(inviteCode, token);
  if (!found) return { ref: null, error: "not-found" as const };
  const { exchange, me } = found;
  if (exchange.status !== "drawn" || !exchange.rules.mailboxEnabled) return { ref: null, error: "closed" as const };
  const ref = await getThreadRef(exchange.id, me.id, role);
  return ref ? { ref, error: undefined } : { ref: null, error: "generic" as const };
}

export async function listMessages(inviteCode: string, token: string, role: MailboxRole): Promise<{ ok: true; messages: MailboxMessage[] } | Fail> {
  if (!isRole(role)) return { ok: false, error: "generic" };
  const res = await thread(inviteCode, token, role);
  if (!res.ref) return { ok: false, error: res.error ?? "generic" };
  return { ok: true, messages: await readMessages(res.ref, role) };
}

export async function sendMessage(inviteCode: string, token: string, role: MailboxRole, text: string): Promise<{ ok: true; messages: MailboxMessage[] } | Fail> {
  if (!isRole(role) || typeof text !== "string") return { ok: false, error: "generic" };
  const body = text.trim();
  if (!body) return { ok: false, error: "empty" };
  if (body.length > 500) return { ok: false, error: "long" };
  const res = await thread(inviteCode, token, role);
  if (!res.ref) return { ok: false, error: res.error ?? "generic" };
  await res.ref.collection("messages").add({ from: role, text: body, createdAt: FieldValue.serverTimestamp() } as unknown as MessageDoc);
  await res.ref.update({ updatedAt: FieldValue.serverTimestamp() });
  return { ok: true, messages: await readMessages(res.ref, role) };
}
