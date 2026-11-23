"use server";

import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/session";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

/**
 * Cambia el ID token recién emitido por Firebase Auth (cliente) por una session cookie httpOnly.
 * También crea users/{uid} la primera vez. `displayName` llega al registrarse con correo.
 */
export async function createSession(idToken: string, displayName?: string): Promise<{ ok: boolean }> {
  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    // Solo tokens recientes: evita reutilizar un token viejo robado.
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) return { ok: false };

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
  } catch {
    return { ok: false };
  }
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
