"use server";

import { Timestamp } from "firebase-admin/firestore";
import { refresh } from "next/cache";
import { db, exchangesCol, getByToken, participantsCol } from "@/lib/data/exchanges";
import { cooldownUntil, NUDGE_COOLDOWN_MS, receivingAssignment } from "@/lib/data/nudges";
import type { AssignmentDoc, ParticipantDoc } from "@/lib/data/types";
import { guard } from "@/lib/server/action";
import { trackEvent } from "@/lib/server/track";

// Avisos secretos entre quien regala y quien recibe (SPEC 03). Son fijos, sin texto libre, y no dependen del buzón.
// Quien recibe nunca recibe el id ni el nombre de quien regala: el servidor busca la asignación por receiverId.

type AskError = "not-found" | "not-drawn" | "not-revealed" | "cooldown" | "past" | "generic";
type NudgeError = "not-found" | "not-drawn" | "unchanged" | "cooldown" | "past" | "generic";
type Sent = { ok: true; nextAt: string };
type Failed<E> = { ok: false; error: E; nextAt?: string };

const isPast = (eventAt: string) => new Date(eventAt).getTime() < Date.now();
const tsMs = (ts: Timestamp | null | undefined) => (ts ? ts.toMillis() : null);

/** «Pedirle ideas en secreto»: marca la petición en mi asignación (yo regalo). Una vez cada 24 h. */
export async function askForIdeas(inviteCode: string, token: string): Promise<Sent | Failed<AskError>> {
  return guard<Sent | Failed<AskError>>("askForIdeas", { ok: false, error: "generic" }, async () => {
    const found = await getByToken(inviteCode, token);
    if (!found) return { ok: false, error: "not-found" };
    const { exchange, me } = found;
    if (exchange.status !== "drawn") return { ok: false, error: "not-drawn" };
    if (!me.revealed) return { ok: false, error: "not-revealed" };
    if (isPast(exchange.eventAt)) return { ok: false, error: "past" };

    const ref = exchangesCol().doc(exchange.id).collection("assignments").doc(me.id);
    const result = await db().runTransaction(async (tx): Promise<Sent | Failed<AskError>> => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { ok: false, error: "generic" };
      const now = Timestamp.now();
      const wait = cooldownUntil(tsMs((snap.data() as AssignmentDoc).ideasAskedAt), now.toMillis());
      if (wait != null) return { ok: false, error: "cooldown", nextAt: new Date(wait).toISOString() };
      tx.update(ref, { ideasAskedAt: now, ideasPending: true } satisfies Partial<AssignmentDoc>);
      return { ok: true, nextAt: new Date(now.toMillis() + NUDGE_COOLDOWN_MS).toISOString() };
    });
    if (!result.ok) return result;
    trackEvent("ideas_requested");
    refresh();
    return result;
  });
}

/**
 * «Avisarle que ya está» (yo recibo): marca el aviso en la asignación de quien me regala.
 * Solo si mi lista cambió después del último aviso (o del sorteo) y una vez cada 24 h. Atiende la petición de ideas.
 */
export async function nudgeGiver(inviteCode: string, token: string): Promise<Sent | Failed<NudgeError>> {
  return guard<Sent | Failed<NudgeError>>("nudgeGiver", { ok: false, error: "generic" }, async () => {
    const found = await getByToken(inviteCode, token);
    if (!found) return { ok: false, error: "not-found" };
    const { exchange, me } = found;
    if (exchange.status !== "drawn") return { ok: false, error: "not-drawn" };
    if (isPast(exchange.eventAt)) return { ok: false, error: "past" };

    const receiving = await receivingAssignment(exchange.id, me.id);
    if (!receiving) return { ok: false, error: "generic" };
    const meRef = participantsCol(exchange.id).doc(me.id);
    const drawnMs = exchange.drawnAt ? new Date(exchange.drawnAt).getTime() : 0;

    const result = await db().runTransaction(async (tx): Promise<Sent | Failed<NudgeError>> => {
      const [snap, meSnap] = await Promise.all([tx.get(receiving.ref), tx.get(meRef)]);
      if (!snap.exists || !meSnap.exists) return { ok: false, error: "generic" };
      const assignment = snap.data() as AssignmentDoc;
      // La pareja pudo cambiar (rehacer sorteo) entre la consulta y la transacción.
      if (assignment.receiverId !== me.id) return { ok: false, error: "generic" };
      const now = Timestamp.now();
      const last = tsMs(assignment.listNudgedAt);
      const wait = cooldownUntil(last, now.toMillis());
      if (wait != null) return { ok: false, error: "cooldown", nextAt: new Date(wait).toISOString() };
      const updated = tsMs((meSnap.data() as ParticipantDoc).listUpdatedAt);
      if (updated == null || updated <= (last ?? drawnMs)) return { ok: false, error: "unchanged" };
      tx.update(receiving.ref, { listNudgedAt: now, listNudgePending: true, ideasPending: false } satisfies Partial<AssignmentDoc>);
      return { ok: true, nextAt: new Date(now.toMillis() + NUDGE_COOLDOWN_MS).toISOString() };
    });
    if (!result.ok) return result;
    trackEvent("list_nudged");
    refresh();
    return result;
  });
}

/** Cierra la tarjeta: «ideas» (me pidieron ideas) o «list» (mi persona actualizó su lista). */
export async function dismissNudge(inviteCode: string, token: string, kind: "ideas" | "list"): Promise<{ ok: true } | { ok: false; error: "generic" }> {
  return guard<{ ok: true } | { ok: false; error: "generic" }>("dismissNudge", { ok: false, error: "generic" }, async () => {
    if (kind !== "ideas" && kind !== "list") return { ok: false, error: "generic" };
    const found = await getByToken(inviteCode, token);
    if (!found || found.exchange.status !== "drawn") return { ok: false, error: "generic" };
    const { exchange, me } = found;
    if (kind === "ideas") {
      const receiving = await receivingAssignment(exchange.id, me.id);
      if (receiving) await receiving.ref.update({ ideasPending: false } satisfies Partial<AssignmentDoc>);
    } else {
      const ref = exchangesCol().doc(exchange.id).collection("assignments").doc(me.id);
      const snap = await ref.get();
      if (snap.exists) await ref.update({ listNudgePending: false } satisfies Partial<AssignmentDoc>);
    }
    refresh();
    return { ok: true };
  });
}

/**
 * «Tu persona» se abrió: guarda la hora (la próxima visita marca «Nuevo»/«Cambió» desde aquí) y quita el aviso.
 * Sin refresh(): las etiquetas de esta visita se quedan hasta recargar.
 */
export async function markListSeen(inviteCode: string, token: string): Promise<void> {
  await guard<void>("markListSeen", undefined, async () => {
    const found = await getByToken(inviteCode, token);
    if (!found || found.exchange.status !== "drawn" || !found.me.revealed) return;
    const ref = exchangesCol().doc(found.exchange.id).collection("assignments").doc(found.me.id);
    const snap = await ref.get();
    if (!snap.exists) return;
    await ref.update({ giverSeenListAt: Timestamp.now(), listNudgePending: false } satisfies Partial<AssignmentDoc>);
  });
}
