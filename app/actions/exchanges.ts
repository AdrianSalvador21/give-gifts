"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/auth/session";
import { db, exchangesCol, participantsCol } from "@/lib/data/exchanges";
import type { ExchangeDoc, ParticipantDoc } from "@/lib/data/types";
import { eventDateFrom } from "@/lib/format";
import { nameKey, newInviteCode, newToken } from "@/lib/tokens";
import { exchangeInput, type ExchangeInput } from "@/lib/validation/exchange";

export type ActionResult = { ok: false; fieldErrors?: string[]; error?: string } | { ok: true };

/** Crea el intercambio, su invitación y (si participa) al organizador como primer participante. */
export async function createExchange(input: ExchangeInput): Promise<ActionResult> {
  const organizer = await requireOrganizer("/crear");
  const parsed = exchangeInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  }
  const v = parsed.data;
  const now = FieldValue.serverTimestamp();

  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = newInviteCode(v.name);
    const exchangeRef = exchangesCol().doc();
    const batch = db().batch();

    const exchange: Omit<ExchangeDoc, "createdAt" | "updatedAt"> & { createdAt: FieldValue; updatedAt: FieldValue } = {
      name: v.name,
      groupType: v.groupType,
      giftCategory: v.giftCategory,
      eventAt: Timestamp.fromDate(eventDateFrom(v.date, v.time)),
      place: v.place || null,
      budget: { amount: v.budget, currency: "MXN" },
      message: v.message,
      ownerUid: organizer.uid,
      rules: { ownerParticipates: v.ownerParticipates, ownerSeesMap: v.ownerSeesMap, mailboxEnabled: v.mailboxEnabled },
      inviteCode,
      status: "open",
      drawnAt: null,
      participantCount: v.ownerParticipates ? 1 : 0,
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
      return { ok: false, error: "create" };
    }
    redirect(`/crear/listo/${exchangeRef.id}`);
  }
  return { ok: false, error: "create" };
}
