import type { MessageKey } from "@/lib/i18n";

// Códigos de Firebase Auth (cliente) → texto en es-MX. Lo que no esté aquí cae en common.genericError.
const AUTH_ERRORS: Record<string, MessageKey> = {
  "auth/invalid-credential": "auth.errors.invalid",
  "auth/invalid-login-credentials": "auth.errors.invalid",
  "auth/wrong-password": "auth.errors.invalid",
  "auth/user-not-found": "auth.errors.invalid",
  "auth/email-already-in-use": "auth.errors.emailInUse",
  "auth/weak-password": "auth.errors.weakPassword",
  "auth/invalid-email": "auth.errors.invalidEmail",
  "auth/missing-email": "auth.errors.invalidEmail",
  "auth/missing-password": "auth.errors.missingPassword",
  "auth/popup-closed-by-user": "auth.errors.popupClosed",
  "auth/cancelled-popup-request": "auth.errors.popupClosed",
  "auth/user-cancelled": "auth.errors.popupClosed",
  "auth/popup-blocked": "auth.errors.popupBlocked",
  "auth/operation-not-supported-in-this-environment": "auth.errors.unsupportedBrowser",
  "auth/web-storage-unsupported": "auth.errors.unsupportedBrowser",
  "auth/network-request-failed": "auth.errors.network",
  "auth/timeout": "auth.errors.network",
  "auth/too-many-requests": "auth.errors.tooMany",
  "auth/user-disabled": "auth.errors.disabled",
  "auth/account-exists-with-different-credential": "auth.errors.otherProvider",
  "auth/unauthorized-domain": "auth.errors.config",
  "auth/operation-not-allowed": "auth.errors.config",
  "auth/invalid-api-key": "auth.errors.config",
  "auth/internal-error": "auth.errors.network",
};

/** Errores que en un navegador interno (WhatsApp, Instagram…) significan «ábrelo en Chrome/Safari». */
const WEBVIEW_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
  "auth/popup-closed-by-user",
  "auth/internal-error",
]);

/** Clave de texto para un código de error de Firebase Auth. Con `inWebview`, los de popup sugieren abrir el navegador. */
export function authErrorKey(code: string | null | undefined, inWebview = false): MessageKey {
  if (code && inWebview && WEBVIEW_CODES.has(code)) return "auth.errors.webview";
  return (code && AUTH_ERRORS[code]) || "common.genericError";
}
