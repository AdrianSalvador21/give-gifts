"use server";

import { FieldValue } from "firebase-admin/firestore";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, getByToken, MAX_WISHES, participantsCol, wishesCol } from "@/lib/data/exchanges";
import type { ParticipantDoc, WishDoc } from "@/lib/data/types";
import { fetchLinkMetadata } from "@/lib/metadata";

type WishError = "empty" | "title" | "note" | "price" | "full" | "generic";
type Result = { ok: true } | { ok: false; error: WishError };

function looksLikeUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i.test(text);
}

/** Agrega un deseo: si es un link, lee título/imagen/precio de la tienda; si no, es una idea en texto. */
export async function addWish(inviteCode: string, token: string, rawInput: string): Promise<Result> {
  const found = await getByToken(inviteCode, token);
  if (!found) return { ok: false, error: "generic" };
  const input = rawInput.trim();
  if (!input) return { ok: false, error: "empty" };

  let wish: Omit<WishDoc, "createdAt">;
  if (looksLikeUrl(input)) {
    const meta = await fetchLinkMetadata(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!meta) return { ok: false, error: "empty" };
    wish = { title: meta.title, url: meta.url, imageUrl: meta.imageUrl, store: meta.store, price: meta.price, note: null, favorite: false };
  } else {
    if (input.length > 120) return { ok: false, error: "title" };
    wish = { title: input, url: null, imageUrl: null, store: null, price: null, note: null, favorite: false };
  }

  const { exchange, me } = found;
  const meRef = participantsCol(exchange.id).doc(me.id);
  try {
    const full = await db().runTransaction(async (tx) => {
      const snap = await tx.get(meRef);
      if ((snap.data() as ParticipantDoc).wishCount >= MAX_WISHES) return true;
      tx.create(wishesCol(exchange.id, me.id).doc(), { ...wish, createdAt: FieldValue.serverTimestamp() });
      tx.update(meRef, { wishCount: FieldValue.increment(1) });
      return false;
    });
    if (full) return { ok: false, error: "full" };
  } catch {
    return { ok: false, error: "generic" };
  }
  refresh();
  return { ok: true };
}

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  note: z.string().trim().max(200).nullable().optional(),
  price: z.number().positive().max(1_000_000).nullable().optional(),
  favorite: z.boolean().optional(),
});

export async function updateWish(inviteCode: string, token: string, wishId: string, changes: z.input<typeof updateSchema>): Promise<Result> {
  const found = await getByToken(inviteCode, token);
  if (!found) return { ok: false, error: "generic" };
  const parsed = updateSchema.safeParse(changes);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { ok: false, error: field === "title" || field === "note" || field === "price" ? field : "generic" };
  }
  const data = { ...parsed.data, ...(parsed.data.note === "" ? { note: null } : {}) };
  const ref = wishesCol(found.exchange.id, found.me.id).doc(wishId);
  try {
    await ref.update(data);
  } catch {
    return { ok: false, error: "generic" };
  }
  refresh();
  return { ok: true };
}

export async function deleteWish(inviteCode: string, token: string, wishId: string): Promise<Result> {
  const found = await getByToken(inviteCode, token);
  if (!found) return { ok: false, error: "generic" };
  const { exchange, me } = found;
  const ref = wishesCol(exchange.id, me.id).doc(wishId);
  const meRef = participantsCol(exchange.id).doc(me.id);
  try {
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      tx.delete(ref);
      tx.update(meRef, { wishCount: FieldValue.increment(-1) });
    });
  } catch {
    return { ok: false, error: "generic" };
  }
  refresh();
  return { ok: true };
}
