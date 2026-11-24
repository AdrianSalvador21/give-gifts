"use client";

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as clientSignOut,
  type UserCredential,
} from "firebase/auth";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { createSession } from "@/app/actions/session";
import { Alert } from "@/components/ui/Alert";
import { CopyButton } from "@/components/ui/CopyButton";
import { DotButton, TextButton } from "@/components/ui/DotButton";
import { TextField } from "@/components/ui/primitives";
import { clientAuth } from "@/lib/firebase/client";
import { authErrorKey } from "@/lib/auth/errors";
import { t } from "@/lib/i18n";
import { isInAppBrowser } from "@/lib/webview";

function messageFor(err: unknown): string {
  if (!(err instanceof FirebaseError)) return t("common.genericError");
  return t(authErrorKey(err.code, isInAppBrowser(navigator.userAgent)));
}

const noopSubscribe = () => () => {};

/** ¿Navegador interno (WhatsApp, Instagram…)? Solo en cliente; en el servidor y al hidratar es false. */
function useInAppBrowser(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => isInAppBrowser(navigator.userAgent),
    () => false,
  );
}

/** URL actual para copiar y abrir en Chrome/Safari. */
function useHref(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.href,
    () => "",
  );
}

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/mis-intercambios";
}

export function LoginForm() {
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inWebview = useInAppBrowser();
  const href = useHref();

  async function finish(cred: UserCredential, displayName?: string) {
    const idToken = await cred.user.getIdToken();
    const res = await createSession(idToken, displayName);
    // La app no usa la sesión del cliente: la cookie del servidor es la fuente de verdad.
    await clientSignOut(clientAuth());
    if (!res.ok) throw new Error(res.error === "stale" ? "stale" : "session");
    // Navegación completa: la siguiente página lee la cookie nueva desde el servidor.
    window.location.assign(next);
    await new Promise(() => {}); // el botón sigue en espera hasta que cambie la página
  }

  function run(task: () => Promise<void>) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await task();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        setError(msg === "stale" ? t("auth.errors.stale") : msg === "session" ? t("auth.errors.session") : messageFor(err));
      }
    });
  }

  const onGoogle = () => run(async () => finish(await signInWithPopup(clientAuth(), new GoogleAuthProvider())));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signUp" && !name.trim()) {
      setError(t("auth.errors.nameRequired"));
      return;
    }
    run(async () => {
      if (mode === "signUp") {
        let cred: UserCredential;
        try {
          cred = await createUserWithEmailAndPassword(clientAuth(), email.trim(), password);
        } catch (err) {
          // Si la cuenta ya existe (p. ej. un segundo clic), se intenta entrar con los mismos datos.
          if (!(err instanceof FirebaseError && err.code === "auth/email-already-in-use")) throw err;
          cred = await signInWithEmailAndPassword(clientAuth(), email.trim(), password).catch(() => {
            throw err;
          });
        }
        await finish(cred, name.trim());
      } else {
        await finish(await signInWithEmailAndPassword(clientAuth(), email.trim(), password));
      }
    });
  };

  const onForgot = () =>
    run(async () => {
      await sendPasswordResetEmail(clientAuth(), email.trim());
      setNotice(t("auth.resetSent"));
    });

  const google = (
    <DotButton variant={inWebview ? "blanco" : "tinta"} ink={!inWebview} full onClick={onGoogle} disabled={pending}>
      {t("auth.google")}
    </DotButton>
  );

  return (
    <div className="mt-6 flex flex-col gap-5">
      {inWebview && (
        <Alert tone="aviso" title={t("auth.webviewTitle")}>
          <p>{t("auth.webviewText")}</p>
          <div className="mt-2.5 flex flex-wrap">
            <CopyButton text={href} label={t("auth.webviewCopy")} />
          </div>
        </Alert>
      )}

      {/* En un navegador interno Google no deja entrar: el correo va primero y Google queda abajo, sin protagonismo. */}
      {!inWebview && google}

      {!inWebview && (
        <div className="flex items-center gap-3 text-sm text-gris">
          <span className="h-px flex-1 bg-arena" />
          {t("auth.or")}
          <span className="h-px flex-1 bg-arena" />
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate>
        {mode === "signUp" && (
          <TextField id="auth-name" label={t("auth.name")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={40} required />
        )}
        <TextField id="auth-email" type="email" label={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <TextField
          id="auth-password"
          type="password"
          label={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signUp" ? "new-password" : "current-password"}
          minLength={6}
          required
        />
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="exito">{notice}</Alert>}
        <DotButton type="submit" variant={inWebview ? "tinta" : "pasto"} ink={inWebview} full disabled={pending} aria-live="polite">
          {mode === "signUp" ? (pending ? t("auth.creating") : t("auth.signUp")) : pending ? t("auth.signingIn") : t("auth.signIn")}
        </DotButton>
      </form>

      {inWebview && google}

      <div className="flex flex-col items-center text-[15px]">
        <TextButton
          onClick={() => {
            setMode(mode === "signIn" ? "signUp" : "signIn");
            setError(null);
            setNotice(null);
          }}
          className="underline"
        >
          {mode === "signIn" ? t("auth.toSignUp") : t("auth.toSignIn")}
        </TextButton>
        {mode === "signIn" && (
          <TextButton className="text-gris underline" onClick={onForgot} disabled={pending}>
            {t("auth.forgot")}
          </TextButton>
        )}
      </div>

      <p className="text-center text-[13px] leading-snug text-gris">
        {t("auth.legalBefore")}
        <Link href="/terminos" className="font-medium text-tinta underline underline-offset-2">
          {t("auth.legalTerms")}
        </Link>
        {t("auth.legalMiddle")}
        <Link href="/privacidad" className="font-medium text-tinta underline underline-offset-2">
          {t("auth.legalPrivacy")}
        </Link>
        {t("auth.legalAfter")}
      </p>
    </div>
  );
}
