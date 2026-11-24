"use server";

import { FieldValue } from "firebase-admin/firestore";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, exchangesCol, getByToken, MAX_WISHES, participantsCol, wishesCol } from "@/lib/data/exchanges";
import type { ParticipantDoc, WishDoc } from "@/lib/data/types";
import { fetchLinkMetadata } from "@/lib/metadata";
import { guard } from "@/lib/server/action";
import { hitRateLimit } from "@/lib/server/rate-limit";

/** rate: demasiados links leídos en poco tiempo desde este link personal. */
type WishError = "empty" | "title" | "note" | "price" | "url" | "full" | "rate" | "generic";
type Result = { ok: true } | { ok: false; error: WishError };
const GENERIC: Result = { ok: false, error: "generic" };

const WISH_ID = /^[A-Za-z0-9]{1,40}$/;

function looksLikeUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i.test(text);
}

/** Agrega un deseo: si es un link, lee título/imagen/precio de la tienda; si no, es una idea en texto. */
export async function addWish(inviteCode: string, token: string, rawInput: string): Promise<Result> {
  return guard("addWish", GENERIC, async (): Promise<Result> => {
    if (typeof rawInput !== "string") return GENERIC;
    const found = await getByToken(inviteCode, token);
    if (!found) return GENERIC;
    const input = rawInput.trim();
    if (!input) return { ok: false, error: "empty" };
    if (input.length > 2000) return { ok: false, error: "url" };

    const { exchange, me } = found;
    if (me.wishCount >= MAX_WISHES) return { ok: false, error: "full" };

    let wish: Omit<WishDoc, "createdAt">;
    if (looksLikeUrl(input)) {
      // Leer una tienda es lo caro (y lo que se podría abusar como proxy): se limita por link personal.
      if (await hitRateLimit("wish", token)) return { ok: false, error: "rate" };
      const meta = await fetchLinkMetadata(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      if (!meta) return { ok: false, error: "empty" };
      wish = { title: meta.title, url: meta.url, imageUrl: meta.imageUrl, store: meta.store, price: meta.price, note: null, favorite: false };
    } else {
      if (input.length > 120) return { ok: false, error: "title" };
      wish = { title: input, url: null, imageUrl: null, store: null, price: null, note: null, favorite: false };
    }

    const meRef = participantsCol(exchange.id).doc(me.id);
    const full = await db().runTransaction(async (tx) => {
      const snap = await tx.get(meRef);
      if ((snap.data() as ParticipantDoc).wishCount >= MAX_WISHES) return true;
      tx.create(wishesCol(exchange.id, me.id).doc(), { ...wish, createdAt: FieldValue.serverTimestamp() });
      tx.update(meRef, { wishCount: FieldValue.increment(1) });
      return false;
    });
    if (full) return { ok: false, error: "full" };
    refresh();
    return { ok: true };
  });
}

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  note: z.string().trim().max(200).nullable().optional(),
  price: z.number().positive().max(1_000_000).nullable().optional(),
  favorite: z.boolean().optional(),
  // "" o null quita el link; un texto nuevo se normaliza y se valida abajo.
  url: z.string().trim().max(2000).nullable().optional(),
});

export async function updateWish(inviteCode: string, token: string, wishId: string, changes: z.input<typeof updateSchema>): Promise<Result> {
  return guard("updateWish", GENERIC, async (): Promise<Result> => {
    if (typeof wishId !== "string" || !WISH_ID.test(wishId)) return GENERIC;
    const found = await getByToken(inviteCode, token);
    if (!found) return GENERIC;
    const parsed = updateSchema.safeParse(changes);
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? "");
      return { ok: false, error: field === "title" || field === "note" || field === "price" || field === "url" ? field : "generic" };
    }
    const { url: rawUrl, ...rest } = parsed.data;
    const data: Partial<WishDoc> = { ...rest, ...(rest.note === "" ? { note: null } : {}) };
    const ref = wishesCol(found.exchange.id, found.me.id).doc(wishId);

    const current = await ref.get();
    if (!current.exists) return GENERIC;
    if (rawUrl !== undefined) {
      const before = current.data() as WishDoc;
      if (!rawUrl) {
        // Sin link ya no hay tienda ni foto de esa tienda.
        Object.assign(data, { url: null, store: null, imageUrl: null });
      } else {
        if (!looksLikeUrl(rawUrl)) return { ok: false, error: "url" };
        const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
        if (normalized !== before.url) {
          if (await hitRateLimit("wish", token)) return { ok: false, error: "rate" };
          const meta = await fetchLinkMetadata(normalized);
          if (!meta) return { ok: false, error: "url" };
          // Solo si el link cambió: el título que escribió la persona se respeta; foto y tienda vienen del link.
          if (meta.url !== before.url) {
            Object.assign(data, { url: meta.url, store: meta.store, imageUrl: meta.imageUrl });
            if (data.price === undefined && before.price == null && meta.price != null) data.price = meta.price;
          }
        }
      }
    }

    await ref.update(data);
    refresh();
    return { ok: true };
  });
}

/** Borra un deseo. Si quien regala ya lo había apartado («Lo voy a regalar»), se le quita el apartado (M4). */
export async function deleteWish(inviteCode: string, token: string, wishId: string): Promise<Result> {
  return guard("deleteWish", GENERIC, async (): Promise<Result> => {
    if (typeof wishId !== "string" || !WISH_ID.test(wishId)) return GENERIC;
    const found = await getByToken(inviteCode, token);
    if (!found) return GENERIC;
    const { exchange, me } = found;
    const ref = wishesCol(exchange.id, me.id).doc(wishId);
    const meRef = participantsCol(exchange.id).doc(me.id);
    const planned = exchangesCol().doc(exchange.id).collection("assignments").where("plannedWishId", "==", wishId).limit(5);
    await db().runTransaction(async (tx) => {
      const [snap, assignments] = await Promise.all([tx.get(ref), tx.get(planned)]);
      if (!snap.exists) return;
      tx.delete(ref);
      tx.update(meRef, { wishCount: FieldValue.increment(-1) });
      assignments.docs.filter((a) => a.data().receiverId === me.id).forEach((a) => tx.update(a.ref, { plannedWishId: null }));
    });
    refresh();
    return { ok: true };
  });
}
