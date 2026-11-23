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
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createSession } from "@/app/actions/session";
import { DotButton } from "@/components/ui/DotButton";
import { TextField } from "@/components/ui/primitives";
import { clientAuth } from "@/lib/firebase/client";
import { t, type MessageKey } from "@/lib/i18n";

const ERRORS: Record<string, MessageKey> = {
  "auth/invalid-credential": "auth.errors.invalid",
  "auth/wrong-password": "auth.errors.invalid",
  "auth/user-not-found": "auth.errors.invalid",
  "auth/email-already-in-use": "auth.errors.emailInUse",
  "auth/weak-password": "auth.errors.weakPassword",
  "auth/invalid-email": "auth.errors.invalidEmail",
  "auth/missing-email": "auth.errors.invalidEmail",
  "auth/popup-closed-by-user": "auth.errors.popupClosed",
  "auth/cancelled-popup-request": "auth.errors.popupClosed",
  "auth/too-many-requests": "auth.errors.tooMany",
};

function messageFor(err: unknown): string {
  if (err instanceof FirebaseError && ERRORS[err.code]) return t(ERRORS[err.code]);
  return t("common.genericError");
}

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/mis-intercambios";
}

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function finish(cred: UserCredential, displayName?: string) {
    const idToken = await cred.user.getIdToken();
    const res = await createSession(idToken, displayName);
    // La app no usa la sesión del cliente: la cookie del servidor es la fuente de verdad.
    await clientSignOut(clientAuth());
    if (!res.ok) throw new Error("session");
    router.replace(next);
    router.refresh();
  }

  function run(task: () => Promise<void>) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await task();
      } catch (err) {
        setError(err instanceof Error && err.message === "session" ? t("auth.errors.session") : messageFor(err));
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
        await finish(await createUserWithEmailAndPassword(clientAuth(), email.trim(), password), name.trim());
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

  return (
    <div className="flex flex-col gap-5">
      <DotButton variant="tinta" full onClick={onGoogle} disabled={pending}>
        {t("auth.google")}
      </DotButton>

      <div className="flex items-center gap-3 text-sm text-gris">
        <span className="h-px flex-1 bg-arena" />
        {t("auth.or")}
        <span className="h-px flex-1 bg-arena" />
      </div>

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
        {error && (
          <p role="alert" className="rounded-boton bg-white px-4 py-3 text-sm text-[#B23A2A]">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-boton bg-white px-4 py-3 text-sm">
            {notice}
          </p>
        )}
        <DotButton type="submit" variant="pasto" full disabled={pending}>
          {mode === "signUp" ? t("auth.signUp") : t("auth.signIn")}
        </DotButton>
      </form>

      <div className="flex flex-col items-center gap-2 text-[15px] font-medium">
        <button type="button" className="underline underline-offset-4" onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
          {mode === "signIn" ? t("auth.toSignUp") : t("auth.toSignIn")}
        </button>
        {mode === "signIn" && (
          <button type="button" className="text-gris underline underline-offset-4" onClick={onForgot} disabled={pending}>
            {t("auth.forgot")}
          </button>
        )}
      </div>
    </div>
  );
}
