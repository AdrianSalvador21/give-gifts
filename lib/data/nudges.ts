import "server-only";

import type { DocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { exchangesCol } from "./exchanges";
import type { AssignmentDoc, Exchange, Participant } from "./types";

/** Cada aviso («Pedirle ideas», «Recordar») se puede mandar una vez cada 24 h. */
export const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type Nudges = {
  /** A mí (como quien recibe) me pidieron ideas y no lo he atendido ni cerrado. */
  ideasPending: boolean;
  /** Mi persona (yo regalo) actualizó su lista y no lo he visto ni cerrado. */
  listNudgePending: boolean;
  /** «Pedirle ideas»: si se puede ahora y, si no, desde cuándo (ISO). */
  canAsk: { ok: boolean; nextAt: string | null };
  /** «Recordar»: `unchanged` = la lista no cambió desde el último aviso (o el sorteo); `cooldown` = ya avisó hoy. */
  canNudge: { ok: boolean; reason: "unchanged" | "cooldown" | null; nextAt: string | null; first: boolean };
  /** Hay alguien que me regala (después del sorteo siempre, salvo datos rotos). */
  hasGiver: boolean;
  /** Última vez que abrí «Tu persona» (ISO): con esto se marcan «Nuevo» y «Cambió». */
  giverSeenListAt: string | null;
};

const EMPTY: Nudges = {
  ideasPending: false,
  listNudgePending: false,
  canAsk: { ok: false, nextAt: null },
  canNudge: { ok: false, reason: null, nextAt: null, first: true },
  hasGiver: false,
  giverSeenListAt: null,
};

const ms = (ts: Timestamp | null | undefined) => (ts ? ts.toMillis() : null);
const iso = (n: number | null) => (n == null ? null : new Date(n).toISOString());

/** La asignación donde yo recibo (quien me regala). Nunca sale de aquí el id de quien regala. */
export async function receivingAssignment(exchangeId: string, meId: string): Promise<DocumentSnapshot | null> {
  const snap = await exchangesCol().doc(exchangeId).collection("assignments").where("receiverId", "==", meId).limit(1).get();
  return snap.empty ? null : snap.docs[0];
}

/** Siguiente momento permitido según el último aviso (null = ya se puede). */
export function cooldownUntil(lastMs: number | null, now: number): number | null {
  if (lastMs == null) return null;
  const next = lastMs + NUDGE_COOLDOWN_MS;
  return next > now ? next : null;
}

/**
 * Estado de los avisos de un participante. Dos lecturas: mi asignación como quien regala (doc con mi id)
 * y la asignación donde recibo. Antes del sorteo o después de la fecha del intercambio no hay avisos.
 */
export async function getNudges(exchange: Exchange, me: Participant): Promise<Nudges> {
  await connection();
  if (exchange.status !== "drawn") return EMPTY;
  const now = Date.now();
  const past = new Date(exchange.eventAt).getTime() < now;
  const [giving, receiving] = await Promise.all([exchangesCol().doc(exchange.id).collection("assignments").doc(me.id).get(), receivingAssignment(exchange.id, me.id)]);
  const g = giving.exists ? (giving.data() as AssignmentDoc) : null;
  const r = receiving ? (receiving.data() as AssignmentDoc) : null;

  const askWait = cooldownUntil(ms(g?.ideasAskedAt), now);
  const nudgedAt = ms(r?.listNudgedAt);
  const since = nudgedAt ?? (exchange.drawnAt ? new Date(exchange.drawnAt).getTime() : 0);
  const changed = me.listUpdatedAt != null && new Date(me.listUpdatedAt).getTime() > since;
  const nudgeWait = cooldownUntil(nudgedAt, now);

  return {
    ideasPending: !past && Boolean(r?.ideasPending),
    listNudgePending: !past && Boolean(g?.listNudgePending),
    // Pasada la fecha no se ofrece nada, ni siquiera «podrás pedir otra vez…».
    canAsk: { ok: Boolean(g) && me.revealed && !past && askWait == null, nextAt: past ? null : iso(askWait) },
    canNudge: {
      ok: Boolean(r) && !past && changed && nudgeWait == null,
      reason: nudgeWait != null ? "cooldown" : changed ? null : "unchanged",
      nextAt: iso(nudgeWait),
      first: nudgedAt == null,
    },
    hasGiver: Boolean(r) && !past,
    giverSeenListAt: g?.giverSeenListAt ? g.giverSeenListAt.toDate().toISOString() : null,
  };
}

/** «Nuevo» si se agregó después de la última visita; «Cambió» si se editó después. Sin visita previa no se marca nada. */
export function wishTag(wish: { createdAt: string; updatedAt: string | null }, seenAt: string | null): "new" | "changed" | null {
  if (!seenAt) return null;
  const seen = new Date(seenAt).getTime();
  if (wish.createdAt && new Date(wish.createdAt).getTime() > seen) return "new";
  if (wish.updatedAt && new Date(wish.updatedAt).getTime() > seen) return "changed";
  return null;
}
