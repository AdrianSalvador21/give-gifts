import "server-only";

import { notFound } from "next/navigation";
import { getOrganizer, requireOrganizer } from "@/lib/auth/session";
import { getExchange } from "./exchanges";

/** Para páginas: exige sesión y que el intercambio sea suyo (si no, 404). */
export async function requireOwnedExchange(exchangeId: string, nextPath: string) {
  const organizer = await requireOrganizer(nextPath);
  const exchange = await getExchange(exchangeId);
  if (!exchange || exchange.ownerUid !== organizer.uid) notFound();
  return { organizer, exchange };
}

/** Para Server Actions: el intercambio si quien llama es el dueño; si no, null. */
export async function ownedExchange(exchangeId: string) {
  const organizer = await getOrganizer();
  if (!organizer) return null;
  const exchange = await getExchange(exchangeId);
  if (!exchange || exchange.ownerUid !== organizer.uid) return null;
  return exchange;
}
