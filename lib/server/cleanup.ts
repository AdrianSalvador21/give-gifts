import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import type { ParticipantDoc } from "@/lib/data/types";

const db = () => adminDb();

/**
 * Borra un intercambio por completo y es idempotente (se puede repetir si algo falló a medias):
 * 1) tokens/ de sus participantes (los links personales mueren al instante) y la invitación invites/{code};
 * 2) el intercambio con todas sus subcolecciones (participantes, deseos, exclusiones, asignaciones, hilos, mensajes).
 */
export async function purgeExchange(exchangeId: string, inviteCode: string | null): Promise<void> {
  const exchangeRef = db().collection("exchanges").doc(exchangeId);
  const [participants, strayTokens] = await Promise.all([
    exchangeRef.collection("participants").get(),
    db().collection("tokens").where("exchangeId", "==", exchangeId).get(),
  ]);
  const tokenIds = new Set([...participants.docs.map((d) => (d.data() as ParticipantDoc).token).filter(Boolean), ...strayTokens.docs.map((d) => d.id)]);
  const writer = db().bulkWriter();
  tokenIds.forEach((t) => void writer.delete(db().collection("tokens").doc(t)));
  if (inviteCode) void writer.delete(db().collection("invites").doc(inviteCode));
  await writer.close();
  await db().recursiveDelete(exchangeRef);
}
