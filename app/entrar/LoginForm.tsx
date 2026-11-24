"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/Alert";
import { CopyButton } from "@/components/ui/CopyButton";
import { DotButton, TextButton } from "@/components/ui/DotButton";
import { TextField } from "@/components/ui/primitives";
import { sendReset, signInEmail, signInGoogle, signUpOrSignIn, useHref, useInAppBrowser, type AuthErrorKey } from "@/lib/auth/client";
import { t } from "@/lib/i18n";

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
  const inWebview = useInAppBrowser() !== null;
  const href = useHref();

  function run(task: () => Promise<"ok" | AuthErrorKey>, onOk: () => void | Promise<void>) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await task();
      if (res !== "ok") {
        setError(t(res));
        return;
      }
      await onOk();
    });
  }

  // Navegación completa: la siguiente página lee la cookie nueva desde el servidor.
  const goNext = async () => {
    window.location.assign(next);
    await new Promise(() => {}); // el botón sigue en espera hasta que cambie la página
  };

  const onGoogle = () => run(() => signInGoogle(), goNext);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signUp" && !name.trim()) {
      setError(t("auth.errors.nameRequired"));
      return;
    }
    if (mode === "signUp") {
      // Si la cuenta ya existe y la contraseña no coincide, el mismo aviso de siempre: «Ese correo ya tiene cuenta».
      run(async () => {
        const res = await signUpOrSignIn(email, password, name);
        return res === "exists" ? "auth.errors.emailInUse" : res;
      }, goNext);
    } else {
      run(() => signInEmail(email, password), goNext);
    }
  };

  const onForgot = () => run(() => sendReset(email), () => setNotice(t("auth.resetSent")));

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
