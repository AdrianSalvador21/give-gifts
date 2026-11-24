"use server";

import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/session";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

/**
 * Cambia el ID token recién emitido por Firebase Auth (cliente) por una session cookie httpOnly.
 * También crea users/{uid} la primera vez. `displayName` llega al registrarse con correo.
 */
export async function createSession(idToken: string, displayName?: string): Promise<{ ok: boolean; error?: "stale" | "generic" }> {
  try {
    if (typeof idToken !== "string" || !idToken) return { ok: false, error: "generic" };
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    // Solo tokens recientes: evita reutilizar un token viejo robado. Si falla aquí suele ser el reloj del celular.
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      console.warn("[action:createSession] auth_time viejo (¿reloj desfasado?)", { skewSec: Math.round(Date.now() / 1000 - decoded.auth_time) });
      return { ok: false, error: "stale" };
    }

    const name = displayName?.trim() || (decoded.name as string | undefined) || decoded.email?.split("@")[0] || "";
    if (displayName?.trim() && !decoded.name) {
      await adminAuth().updateUser(decoded.uid, { displayName: name });
    }

    const userRef = adminDb().collection("users").doc(decoded.uid);
    const user = await userRef.get();
    if (!user.exists) {
      await userRef.set({ displayName: name, email: decoded.email ?? "", createdAt: FieldValue.serverTimestamp() });
    }

    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    (await cookies()).set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return { ok: true };
  } catch (err) {
    console.error("[action:createSession]", err);
    return { ok: false, error: "generic" };
  }
}

/**
 * Borra la cookie y revoca los refresh tokens de la cuenta (M9): una cookie robada deja de servir.
 * Ojo: revocar cierra la sesión de esa cuenta en todos sus dispositivos.
 */
export async function signOut(): Promise<void> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);
  if (!value) return;
  try {
    const { uid } = await adminAuth().verifySessionCookie(value, false);
    await adminAuth().revokeRefreshTokens(uid);
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    if (!/session-cookie-(expired|revoked)|argument-error/.test(code)) console.error("[action:signOut]", err);
  }
}
