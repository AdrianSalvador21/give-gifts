import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { adminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // máximo que permite Firebase

export type Organizer = { uid: string; email: string; name: string };

/** Organizador con sesión válida, o null. Se verifica una sola vez por request. */
export const getOrganizer = cache(async (): Promise<Organizer | null> => {
  await connection(); // la verificación depende del reloj: siempre en tiempo de request
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const claims = await adminAuth().verifySessionCookie(value, true);
    return {
      uid: claims.uid,
      email: claims.email ?? "",
      name: (claims.name as string | undefined) ?? claims.email?.split("@")[0] ?? "",
    };
  } catch (err) {
    // Cookie vencida o revocada es lo normal al cerrar sesión o pasar 14 días; lo demás sí se registra.
    const code = (err as { code?: string }).code ?? "";
    if (!/session-cookie-(expired|revoked)|argument-error|user-disabled|user-not-found/.test(code)) console.error("[getOrganizer]", err);
    return null;
  }
});

/** Igual que getOrganizer, pero manda a /entrar si no hay sesión. */
export async function requireOrganizer(next: string): Promise<Organizer> {
  const organizer = await getOrganizer();
  if (!organizer) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return organizer;
}

/** Solo permite rutas internas para evitar redirecciones abiertas. */
export function safeNext(next: string | null | undefined, fallback = "/mis-intercambios"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
