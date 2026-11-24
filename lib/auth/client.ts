// Autenticación en el navegador (solo cliente): /entrar y el paso 5 de /crear usan estas funciones.
// Todas terminan en createSession (cookie httpOnly del servidor) y cierran la sesión del SDK del cliente:
// la cookie es la única fuente de verdad. Los errores se devuelven como clave de texto, nunca se lanzan.

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as clientSignOut,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { useSyncExternalStore } from "react";
import { createSession } from "@/app/actions/session";
import { authErrorKey } from "@/lib/auth/errors";
import { clientAuth } from "@/lib/firebase/client";
import type { MessageKey } from "@/lib/i18n";
import { inAppBrowser, type InAppBrowser } from "@/lib/webview";

export type AuthErrorKey = MessageKey;

function errorKey(err: unknown): AuthErrorKey {
  if (!(err instanceof FirebaseError)) return "common.genericError";
  return authErrorKey(err.code, inAppBrowser(navigator.userAgent) !== null);
}

/** Cambia la credencial por la cookie de sesión y cierra la sesión del cliente. */
async function finish(cred: UserCredential, displayName?: string, forceRefresh = false): Promise<"ok" | AuthErrorKey> {
  const idToken = await cred.user.getIdToken(forceRefresh);
  const res = await createSession(idToken, displayName);
  await clientSignOut(clientAuth());
  if (!res.ok) return res.error === "stale" ? "auth.errors.stale" : "auth.errors.session";
  return "ok";
}

async function attempt<T extends string>(task: () => Promise<T | AuthErrorKey>): Promise<T | AuthErrorKey> {
  try {
    return await task();
  } catch (err) {
    return errorKey(err);
  }
}

/**
 * Crea la cuenta con correo y contraseña. Si el correo ya tiene cuenta, intenta entrar con la misma
 * contraseña (p. ej. un segundo clic); si eso tampoco funciona devuelve "exists".
 */
export function signUpOrSignIn(email: string, password: string, displayName: string): Promise<"ok" | "exists" | AuthErrorKey> {
  return attempt<"ok" | "exists">(async () => {
    let cred: UserCredential;
    try {
      cred = await createUserWithEmailAndPassword(clientAuth(), email.trim(), password);
      // El nombre va en el perfil antes de pedir el token: así la sesión ya lo trae (y no el inicio del correo).
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
        return finish(cred, displayName.trim(), true);
      }
    } catch (err) {
      if (!(err instanceof FirebaseError && err.code === "auth/email-already-in-use")) throw err;
      try {
        cred = await signInWithEmailAndPassword(clientAuth(), email.trim(), password);
      } catch {
        return "exists";
      }
    }
    return finish(cred, displayName.trim());
  });
}

export function signInEmail(email: string, password: string): Promise<"ok" | AuthErrorKey> {
  return attempt(async () => finish(await signInWithEmailAndPassword(clientAuth(), email.trim(), password)));
}

/** Entra con Google (popup). `displayName` solo se usa si la cuenta todavía no tiene nombre. */
export function signInGoogle(displayName?: string): Promise<"ok" | AuthErrorKey> {
  return attempt(async () => finish(await signInWithPopup(clientAuth(), new GoogleAuthProvider()), displayName?.trim() || undefined));
}

export function sendReset(email: string): Promise<"ok" | AuthErrorKey> {
  return attempt(async () => {
    await sendPasswordResetEmail(clientAuth(), email.trim());
    return "ok" as const;
  });
}

const noopSubscribe = () => () => {};

/** ¿Navegador interno (WhatsApp, Instagram…)? Solo en cliente; en el servidor y al hidratar es null. */
export function useInAppBrowser(): InAppBrowser | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => inAppBrowser(navigator.userAgent),
    () => null,
  );
}

/** URL actual para copiar y abrir en Chrome/Safari. */
export function useHref(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.href,
    () => "",
  );
}
