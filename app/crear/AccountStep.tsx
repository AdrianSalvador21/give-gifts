"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/Alert";
import { CopyButton } from "@/components/ui/CopyButton";
import { DotButton, TextButton } from "@/components/ui/DotButton";
import { CheckIcon } from "@/components/ui/icons";
import { Card, DateTile, Eyebrow, HandNote, ScreenTitle, TextField } from "@/components/ui/primitives";
import { sendReset, signInEmail, signInGoogle, signUpOrSignIn, useHref, useInAppBrowser, type AuthErrorKey } from "@/lib/auth/client";
import { t } from "@/lib/i18n";
import type { InAppBrowser } from "@/lib/webview";

/** Nombre del navegador interno para el aviso «Estás en el navegador de WhatsApp». */
const APP_NAME: Record<InAppBrowser, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  messenger: "Messenger",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  line: "LINE",
  wechat: "WeChat",
  linkedin: "LinkedIn",
  twitter: "X",
  webview: "",
};

export type AccountSummary = {
  name: string;
  owner: string;
  /** Mosaico de calendario («DIC / 19»). */
  month: string;
  day: string;
  /** «sáb 19 dic · 19:00» */
  when: string;
  time: string;
  budget: string;
};

function InviteesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-px shrink-0 text-noche">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2A5 5 0 0 1 21 19" />
    </svg>
  );
}

/**
 * Paso 5 del asistente sin sesión: «Guarda tu intercambio». Resumen (arriba en móvil, invitación a la izquierda
 * en escritorio con Regalito encima), Google (oculto en navegadores internos), correo y contraseña, y el modo
 * «ya tienes cuenta» si el correo existe. Al autenticarse llama `onAuthenticated`; el asistente crea el intercambio.
 */
export function AccountStep({
  summary,
  displayName,
  steps,
  onSelectStep,
  onEdit,
  onAuthenticated,
  onRetry,
  busy,
  sessionReady,
  error,
}: {
  summary: AccountSummary;
  /** «Tu nombre» del paso 4: el nombre de la cuenta nueva. */
  displayName: string;
  /** Títulos de los pasos 1–4 (pastillas de escritorio). */
  steps: string[];
  onSelectStep: (index: number) => void;
  onEdit: () => void;
  onAuthenticated: () => void;
  onRetry: () => void;
  /** Creando el intercambio (después de autenticarse). */
  busy: boolean;
  /** Ya hay sesión (se autenticó aquí y falló la creación): solo queda reintentar. */
  sessionReady: boolean;
  /** Error al crear (o aviso de sesión vencida) que viene del asistente. */
  error: string | null;
}) {
  const [mode, setMode] = useState<"nueva" | "existe">("nueva");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const passwordRef = useRef<HTMLInputElement>(null);
  const app = useInAppBrowser();
  const href = useHref();
  const disabled = pending || busy;
  const existing = mode === "existe";

  function run(task: () => Promise<"ok" | "exists" | AuthErrorKey>) {
    setAuthError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await task();
      if (res === "ok") {
        onAuthenticated();
      } else if (res === "exists") {
        // El correo ya tiene cuenta: mismo formulario, ahora pide su contraseña. Lo llenado no se pierde.
        setMode("existe");
        setPassword("");
        passwordRef.current?.focus();
      } else {
        setAuthError(t(res));
      }
    });
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => (existing ? signInEmail(email, password) : signUpOrSignIn(email, password, displayName)));
  };

  const onForgot = () => {
    setAuthError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await sendReset(email);
      if (res === "ok") setNotice(t("auth.resetSent"));
      else setAuthError(t(res));
    });
  };

  const editButton = (label: string, className = "") => (
    <TextButton onClick={onEdit} className={`shrink-0 px-1 underline ${className}`}>
      {label}
    </TextButton>
  );

  return (
    <div className="flex flex-col gap-4 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start lg:gap-10 lg:pt-0">
      <div className="flex min-w-0 flex-col gap-4 lg:gap-7">
        <ol aria-label={t("create.s5.steps")} className="hidden flex-wrap gap-2 lg:flex">
          {steps.map((title, i) => (
            <li key={title}>
              <button
                type="button"
                onClick={() => onSelectStep(i)}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-pasto-50 px-3.5 text-sm font-medium transition-colors hover:bg-pasto"
              >
                <CheckIcon size={13} />
                {title}
                <span className="sr-only"> ({t("ui.stepDone")})</span>
              </button>
            </li>
          ))}
          <li aria-current="step" className="inline-flex min-h-10 items-center rounded-full bg-tinta px-3.5 text-sm font-medium text-white">
            {t("create.s5.stepCurrent", { n: steps.length + 1 })}
          </li>
        </ol>

        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:gap-2.5">
            <Eyebrow className="hidden text-gris lg:block">{t("create.s5.eyebrow")}</Eyebrow>
            <ScreenTitle>{t("create.s5.title")}</ScreenTitle>
            <p className="text-[15px] leading-snug text-gris lg:max-w-[460px] lg:text-lg">{t("create.s5.subtitle")}</p>
          </div>
          <Image src="/illustrations/web/14-regalito-solo.webp" width={320} height={489} alt="" className="h-auto w-[58px] shrink-0 lg:hidden" />
        </div>

        {/* Móvil: resumen compacto arriba. */}
        <div className="flex items-center gap-3 rounded-tarjeta bg-white px-3.5 py-3 lg:hidden">
          <DateTile month={summary.month} day={summary.day} />
          <div className="flex min-w-0 flex-1 flex-col">
            <strong className="truncate text-[15px] font-semibold">{summary.name}</strong>
            <span className="text-[13px] leading-snug text-gris">{t("create.s5.summaryMeta", { time: summary.time, budget: summary.budget, owner: summary.owner })}</span>
          </div>
          {editButton(t("create.s5.edit"), "text-sm")}
        </div>

        {/* Escritorio: la invitación con Regalito parado encima. */}
        <div className="hidden max-w-[520px] flex-col lg:flex">
          <div className="relative z-10 -mb-2 flex items-end gap-3.5 pl-9">
            <Image src="/illustrations/web/14-regalito-solo.webp" width={320} height={489} alt={t("create.s5.regalitoAlt")} className="h-[159px] w-auto" />
            <HandNote className="mb-[70px] rounded-[14px] border-[1.5px] border-tinta bg-hueso px-3 py-2 text-[18px]">{t("create.s5.regalitoNote")}</HandNote>
          </div>
          <div className="liston flex flex-col gap-3.5 rounded-panel bg-pasto p-[26px] [--liston-x:56px]">
            <Eyebrow className="text-noche">{t("create.s5.previewLabel")}</Eyebrow>
            <strong className="pr-20 text-[32px] leading-[1.05] font-semibold tracking-[-0.03em] break-words">{summary.name}</strong>
            <div className="flex flex-wrap gap-2 pr-20">
              {[summary.when, t("create.s5.budgetPill", { budget: summary.budget }), t("create.s5.ownerPill", { owner: summary.owner })].map((p) => (
                <span key={p} className="rounded-full bg-hueso px-3 py-1.5 text-[13px] font-semibold">
                  {p}
                </span>
              ))}
            </div>
            {editButton(t("create.s5.editLong"), "self-start font-semibold")}
          </div>
        </div>
      </div>

      <section aria-label={t("create.s5.account")} className="flex min-w-0 flex-col gap-4">
        <Card variant="protagonista" tone="crema" className="flex flex-col gap-3 lg:gap-3.5 lg:p-7 lg:shadow-tinta-lg">
          {sessionReady ? (
            <>
              {error && <Alert tone="error">{error}</Alert>}
              <DotButton ink full icon="check" onClick={onRetry} disabled={busy}>
                {busy ? t("create.s5.creating") : t("create.s5.retry")}
              </DotButton>
            </>
          ) : (
            <>
              {error && <Alert tone="aviso">{error}</Alert>}

              {app === null && (
                <>
                  <DotButton variant="blanco" full className="border-2 border-tinta" onClick={() => run(() => signInGoogle(displayName))} disabled={disabled}>
                    {t("create.s5.google")}
                  </DotButton>
                  <div aria-hidden className="flex items-center gap-3 text-[13px] text-gris">
                    <span className="h-px flex-1 bg-linea" />
                    {t("create.s5.or")}
                    <span className="h-px flex-1 bg-linea" />
                  </div>
                </>
              )}

              {app !== null && (
                <Alert tone="aviso">
                  <p>{t("create.s5.webview", { app: APP_NAME[app] || t("create.s5.webviewApp") })}</p>
                  <div className="mt-2 flex flex-wrap">
                    <CopyButton text={href} label={t("auth.webviewCopy")} />
                  </div>
                </Alert>
              )}

              {existing && (
                <Alert tone="info">
                  <strong className="font-semibold">{t("create.s5.existsTitle")}</strong> {t("create.s5.existsText")}
                </Alert>
              )}

              <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
                <TextField
                  id="s5-email"
                  type="email"
                  label={t("create.s5.email")}
                  placeholder={t("create.s5.emailPlaceholder")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Otro correo: vuelve a «crear cuenta».
                    if (existing) setMode("nueva");
                  }}
                  autoComplete="email"
                  required
                />
                <div className="flex flex-col">
                  <TextField
                    id="s5-password"
                    ref={passwordRef}
                    type="password"
                    label={existing ? t("create.s5.passwordExisting") : t("create.s5.passwordNew")}
                    placeholder={existing ? undefined : t("create.s5.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={existing ? "current-password" : "new-password"}
                    minLength={6}
                    required
                  />
                  {existing && (
                    <TextButton className="self-start px-0! text-sm font-semibold underline" onClick={onForgot} disabled={disabled}>
                      {t("create.s5.forgot")}
                    </TextButton>
                  )}
                </div>
                {authError && <Alert tone="error">{authError}</Alert>}
                {notice && <Alert tone="exito">{notice}</Alert>}
                <DotButton type="submit" ink full icon="check" disabled={disabled} aria-live="polite" className="mt-1">
                  {busy ? t("create.s5.creating") : pending ? t("create.s5.saving") : existing ? t("create.s5.submitExisting") : t("create.s5.submit")}
                </DotButton>
              </form>
            </>
          )}
        </Card>

        <div className="flex items-start gap-3 px-1 lg:rounded-tarjeta lg:bg-pasto-50 lg:p-3.5">
          <InviteesIcon />
          <p className="text-sm leading-snug">
            <strong className="font-semibold">{t("create.s5.inviteesTitle")}</strong> {t("create.s5.inviteesText")}
          </p>
        </div>

        <p className="text-center text-xs leading-snug text-gris">
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
      </section>
    </div>
  );
}
