"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { getOrganizer } from "@/lib/auth/session";
import { db, exchangesCol, participantsCol } from "@/lib/data/exchanges";
import { DEFAULT_TIME_ZONE, type ExchangeDoc, type ParticipantDoc } from "@/lib/data/types";
import { eventDateFrom } from "@/lib/format";
import { logError } from "@/lib/server/action";
import { trackEvent } from "@/lib/server/track";
import { nameKey, newInviteCode, newToken } from "@/lib/tokens";
import { exchangeInput, type ExchangeInput } from "@/lib/validation/exchange";

export type ActionResult = { ok: false; fieldErrors?: string[]; error?: string } | { ok: true };

function fieldErrorsOf(issues: { path: PropertyKey[] }[]): string[] {
  return [...new Set(issues.map((i) => String(i.path[0])))];
}

/**
 * Valida el borrador del asistente antes del paso 5 «Guarda tu intercambio», sin sesión y sin tocar Firestore:
 * así nadie crea una cuenta para luego descubrir que un campo estaba mal.
 */
export async function validateExchangeDraft(input: ExchangeInput): Promise<{ ok: true } | { ok: false; fieldErrors: string[] }> {
  const parsed = exchangeInput.safeParse(input);
  return parsed.success ? { ok: true } : { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues) };
}

/**
 * Crea el intercambio, su invitación y (si participa) al organizador como primer participante.
 * `input.timeZone` (IANA del navegador) es opcional; sin ella se usa America/Mexico_City.
 * Sin sesión (o con la sesión vencida) no escribe nada y devuelve `error: "auth"`: el asistente pide la cuenta en el paso 5.
 * Si sale bien redirige a /crear/listo/{id}.
 */
export async function createExchange(input: ExchangeInput): Promise<ActionResult> {
  const organizer = await getOrganizer();
  if (!organizer) return { ok: false, error: "auth" };
  const parsed = exchangeInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const v = parsed.data;
  const timeZone = v.timeZone || DEFAULT_TIME_ZONE;
  const now = FieldValue.serverTimestamp();

  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = newInviteCode(v.name);
    const exchangeRef = exchangesCol().doc();
    const batch = db().batch();

    const exchange: Omit<ExchangeDoc, "createdAt" | "updatedAt"> & { createdAt: FieldValue; updatedAt: FieldValue } = {
      name: v.name,
      groupType: v.groupType,
      giftCategory: v.giftCategory,
      eventAt: Timestamp.fromDate(eventDateFrom(v.date, v.time, timeZone)),
      place: v.place || null,
      budget: { amount: v.budget, currency: "MXN" },
      message: v.message,
      ownerUid: organizer.uid,
      rules: { ownerParticipates: v.ownerParticipates, ownerSeesMap: v.ownerSeesMap, mailboxEnabled: v.mailboxEnabled },
      inviteCode,
      status: "open",
      drawnAt: null,
      participantCount: v.ownerParticipates ? 1 : 0,
      timeZone,
      registrationOpen: true,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(exchangeRef, exchange);
    // create() falla si el código ya existe: así garantizamos que sea único.
    batch.create(db().collection("invites").doc(inviteCode), { exchangeId: exchangeRef.id });

    if (v.ownerParticipates) {
      const token = newToken();
      const ownerRef = participantsCol(exchangeRef.id).doc();
      const owner: Omit<ParticipantDoc, "joinedAt"> & { joinedAt: FieldValue } = {
        name: v.ownerName,
        nameKey: nameKey(v.ownerName),
        color: "pasto",
        kind: "owner",
        token,
        wishCount: 0,
        revealed: false,
        bought: false,
        joinedAt: now,
      };
      batch.set(ownerRef, owner);
      batch.create(db().collection("tokens").doc(token), { exchangeId: exchangeRef.id, participantId: ownerRef.id });
    }

    try {
      await batch.commit();
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 6 /* ALREADY_EXISTS */) continue;
      logError("action:createExchange", err);
      return { ok: false, error: "create" };
    }
    trackEvent("exchange_created", { groupType: v.groupType, ownerParticipates: v.ownerParticipates });
    redirect(`/crear/listo/${exchangeRef.id}`);
  }
  return { ok: false, error: "create" };
}
