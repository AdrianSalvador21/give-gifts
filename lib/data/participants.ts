import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { AVATAR_COLORS, type ExchangeDoc, type ParticipantDoc } from "@/lib/data/types";
import { nameKey, newToken } from "@/lib/tokens";
import { db, exchangesCol, participantsCol } from "./exchanges";

export const deviceCookie = (inviteCode: string) => `gg_p_${inviteCode}`;

export type JoinError = "name" | "taken" | "closed" | "generic";

/**
 * Crea un participante con link personal (antes del sorteo). No verifica permisos:
 * quien lo llame debe hacerlo (la invitación pública o el panel del organizador).
 */
export async function insertParticipant(exchangeId: string, rawName: string, kind: "self" | "assisted"): Promise<{ token: string } | { error: JoinError }> {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) return { error: "name" };
  const key = nameKey(name);
  const exchangeRef = exchangesCol().doc(exchangeId);

  try {
    return await db().runTransaction(async (tx) => {
      const exchange = await tx.get(exchangeRef);
      if (!exchange.exists) return { error: "generic" as const };
      const data = exchange.data() as ExchangeDoc;
      if (data.status !== "open") return { error: "closed" as const };
      const dup = await tx.get(participantsCol(exchangeId).where("nameKey", "==", key).limit(1));
      if (!dup.empty) return { error: "taken" as const };

      const token = newToken();
      const ref = participantsCol(exchangeId).doc();
      const participant: Omit<ParticipantDoc, "joinedAt"> & { joinedAt: FieldValue } = {
        name,
        nameKey: key,
        color: AVATAR_COLORS[data.participantCount % AVATAR_COLORS.length],
        kind,
        token,
        wishCount: 0,
        revealed: false,
        bought: false,
        joinedAt: FieldValue.serverTimestamp(),
      };
      tx.create(ref, participant);
      tx.create(db().collection("tokens").doc(token), { exchangeId, participantId: ref.id });
      tx.update(exchangeRef, { participantCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
      return { token };
    });
  } catch {
    return { error: "generic" };
  }
}
