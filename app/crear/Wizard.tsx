"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createExchange, validateExchangeDraft } from "@/app/actions/exchanges";
import { signOut } from "@/app/actions/session";
import { InviteCard } from "@/components/organizer/InviteCard";
import { useBrowserValue } from "@/components/organizer/useBrowserValue";
import { Alert } from "@/components/ui/Alert";
import { DotButton, TextButton } from "@/components/ui/DotButton";
import { BackIcon } from "@/components/ui/icons";
import { Columns } from "@/components/ui/AppShell";
import { Avatar, Chip, ScreenTitle, StepBar, TextArea, TextField } from "@/components/ui/primitives";
import { PreviewPanel, StepRail } from "@/components/ui/Stepper";
import { StepTransition, useStepGo } from "@/components/ui/StepTransition";
import { GIFT_CATEGORIES, GROUP_TYPES, type GroupType } from "@/lib/data/types";
import { t, type MessageKey } from "@/lib/i18n";
import { exchangeFields, FIELD_ERROR, STEP_FIELDS } from "@/lib/validation/exchange";
import { browserTimeZone, calendarParts, eventDateFrom, formatEvent, formatMoney, formatShortDate, localToday, timeZoneName } from "@/lib/format";
import { AccountStep } from "./AccountStep";
import { clearDraft, readDraft, saveDraft, type DraftStep, type ExchangeFormState } from "./draft";

type Step = DraftStep;
type FormStep = 1 | 2 | 3 | 4;

const GROUP_DOT: Record<GroupType, string> = {
  familia: "bg-tinta",
  amigos: "bg-sol",
  oficina: "bg-cielo",
  escuela: "bg-coral",
  comunidad: "bg-lila",
  otro: "bg-arena",
};

const BUDGET_PRESETS = [300, 500, 800];

const RAIL: MessageKey[] = ["create.rail.name", "create.rail.group", "create.rail.when", "create.rail.details"];
const FORM_STEPS: FormStep[] = [1, 2, 3, 4];

type Form = ExchangeFormState;

/** Quien organiza, si ya tiene sesión. Sin sesión el asistente agrega el paso 5 «Guarda tu intercambio». */
export type WizardOrganizer = { email: string; name: string };

function initialForm(name: string, ownerName: string): Form {
  return {
    name,
    groupType: "",
    giftCategory: "todo",
    date: "",
    time: "19:00",
    place: "",
    budget: "500",
    ownerName,
    message: t("create.s4.messageDefault"),
    ownerParticipates: true,
    ownerSeesMap: false,
    mailboxEnabled: true,
  };
}

function errorText(field: string): string {
  return t((FIELD_ERROR[field] ?? "common.genericError") as MessageKey);
}

/**
 * El borrador vive en localStorage, que no existe en el servidor: el asistente se monta ya en el navegador
 * para arrancar directo con lo guardado (sin parpadeo de datos ni error de hidratación).
 */
export function Wizard(props: { initialName: string; organizer: WizardOrganizer | null }) {
  const mounted = useBrowserValue(() => true, false);
  if (!mounted) return <p className="pt-10 text-gris">{t("common.loading")}</p>;
  return <WizardSteps {...props} />;
}

function WizardSteps({ initialName, organizer }: { initialName: string; organizer: WizardOrganizer | null }) {
  const router = useRouter();
  // Si hay borrador gana sobre ?nombre= de la landing; el aviso ofrece «Empezar de nuevo».
  const [draft] = useState(readDraft);
  const [form, setForm] = useState<Form>(() => draft?.form ?? initialForm(initialName, organizer?.name.slice(0, 40) ?? ""));
  const [step, setStep] = useState<Step>(() => (draft ? (draft.step === 5 && organizer ? 4 : draft.step) : 1));
  const [resumed, setResumed] = useState(draft !== null);
  // Solo se guarda después de que la persona cambia algo: abrir /crear no deja un borrador vacío.
  const [touched, setTouched] = useState(false);
  // «¿No eres tú?» o sesión vencida: sin esperar al refresco del servidor, el asistente sigue sin sesión.
  const [signedOut, setSignedOut] = useState(false);
  // Ya se autenticó en el paso 5 pero crear falló: «Reintentar» crea directo, sin pedir la cuenta otra vez.
  const [sessionReady, setSessionReady] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const go = useStepGo();
  // Zona y fecha del navegador de quien organiza (I9, M3).
  const timeZone = useBrowserValue(browserTimeZone, "");
  const today = useBrowserValue(() => localToday(), "");
  const account = signedOut ? null : organizer;
  const total = account ? 4 : 5;

  useEffect(() => {
    if (touched) saveDraft(step, form);
  }, [touched, step, form]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => e.filter((x) => x !== key));
    setTouched(true);
  };

  function invalidFields(s: FormStep): string[] {
    const bad = STEP_FIELDS[s].filter((field) => !exchangeFields[field].safeParse(form[field]).success);
    if (s === 3 && !bad.includes("date") && form.date && form.time && eventDateFrom(form.date, form.time, timeZone || undefined).getTime() <= Date.now()) {
      bad.push("date");
    }
    return bad;
  }

  function goTo(target: Step) {
    setServerError(null);
    setTouched(true);
    go(target > step ? "adelante" : "atras", () => setStep(target));
    window.scrollTo({ top: 0 });
  }

  const input = () => ({ ...form, groupType: form.groupType as GroupType, timeZone: timeZone || undefined });

  /** Marca los campos con error y lleva al primer paso que tenga uno. */
  function showFieldErrors(fields: string[]) {
    setErrors(fields);
    const first = FORM_STEPS.find((s) => STEP_FIELDS[s].some((f) => fields.includes(f)));
    if (first && first !== step) goTo(first);
    else if (!first) setServerError(t("common.genericError"));
  }

  /** Hacia el paso 5 sin sesión: el servidor valida el borrador antes de pedir la cuenta (no crea nada). */
  async function toAccount(message: string | null = null) {
    const res = await validateExchangeDraft(input());
    if (!res.ok) {
      showFieldErrors(res.fieldErrors);
      return;
    }
    if (step !== 5) goTo(5);
    setServerError(message);
  }

  function create() {
    setServerError(null);
    startTransition(async () => {
      clearDraft();
      const res = await createExchange(input());
      // Si todo sale bien la acción redirige; aquí solo llegan errores, y el borrador vuelve a guardarse.
      if (!res || res.ok) return;
      saveDraft(step, form);
      if (res.error === "auth") {
        // Sesión vencida (o cerrada en otra pestaña): de vuelta al paso 5 para entrar de nuevo, sin perder nada.
        setSignedOut(true);
        setSessionReady(false);
        router.refresh();
        await toAccount(t("create.s5.sessionExpired"));
      } else if (res.fieldErrors?.length) {
        showFieldErrors(res.fieldErrors);
      } else {
        setServerError(t(step === 5 ? "create.s5.createFailed" : "common.genericError"));
      }
    });
  }

  function next() {
    if (step === 5) return;
    const bad = invalidFields(step);
    setErrors(bad);
    if (bad.length) return;
    if (step < 4) {
      goTo((step + 1) as Step);
      return;
    }
    if (!account) {
      setServerError(null);
      startTransition(() => toAccount());
      return;
    }
    create();
  }

  /** «¿No eres tú?»: cierra la sesión, conserva lo llenado y sigue al paso 5 para guardarlo en otra cuenta. */
  function notYou() {
    setServerError(null);
    startTransition(async () => {
      saveDraft(step, form);
      await signOut();
      setSignedOut(true);
      router.refresh();
      const bad = invalidFields(4);
      setErrors(bad);
      if (!bad.length) await toAccount();
    });
  }

  function startOver() {
    clearDraft();
    setForm(initialForm(initialName, account?.name.slice(0, 40) ?? ""));
    setErrors([]);
    setResumed(false);
    goTo(1);
    setTouched(false);
  }

  const err = (field: string) => (errors.includes(field) ? errorText(field) : null);

  // Vista previa en vivo (xl): lo que lleva el formulario, o «Por definir».
  const budget = Number(form.budget);
  const eventDate = form.date && form.time ? eventDateFrom(form.date, form.time, timeZone || undefined) : null;
  const eventIso = eventDate && !Number.isNaN(eventDate.getTime()) ? eventDate.toISOString() : null;
  const previewWhen = eventIso ? formatShortDate(eventIso, timeZone || undefined) : t("create.previewTbd");
  const previewGift = budget > 0 ? formatMoney(budget) : t("create.previewTbd");
  const ownerLabel = form.ownerName.trim() || account?.name || t("create.previewOwner");

  const banner = resumed && (
    <Alert
      tone="info"
      className="mb-4 items-center lg:mb-6"
      action={
        <TextButton onClick={startOver} className="-my-2 shrink-0 px-2 font-semibold underline">
          {t("create.draft.startOver")}
        </TextButton>
      }
    >
      {t("create.draft.resumed")}
    </Alert>
  );

  const mobileHeader = (
    <>
      <div className="flex items-center justify-between pt-1 lg:hidden">
        {step === 1 ? (
          <Link href="/" aria-label={t("create.home")} className="grid size-11 place-items-center rounded-full bg-white transition-transform active:scale-90">
            <BackIcon />
          </Link>
        ) : (
          <button
            type="button"
            aria-label={t("create.prevStep")}
            onClick={() => goTo((step - 1) as Step)}
            className="grid size-11 place-items-center rounded-full bg-white transition-transform active:scale-90"
          >
            <BackIcon />
          </button>
        )}
        <span className="text-sm font-medium text-gris" aria-live="polite">
          {t(step === 5 ? "create.stepLast" : "create.step", { n: step, total })}
        </span>
        <span className="w-11" />
      </div>
      <div className="pt-3.5 lg:hidden">
        <StepBar step={step} total={total} />
      </div>
    </>
  );

  if (step === 5) {
    const cal = eventIso ? calendarParts(eventIso, timeZone || undefined) : { month: "", day: "?" };
    return (
      <div className="flex flex-1 flex-col pb-2 lg:pt-6">
        {banner}
        {mobileHeader}
        <StepTransition stepKey={step}>
          <div>
            <AccountStep
              summary={{
                name: form.name.trim(),
                owner: ownerLabel,
                month: cal.month,
                day: cal.day,
                when: eventIso ? formatEvent(eventIso, timeZone || undefined) : t("create.previewTbd"),
                time: form.time,
                budget: previewGift,
              }}
              displayName={form.ownerName}
              steps={RAIL.map((k) => t(k))}
              onSelectStep={(i) => goTo((i + 1) as Step)}
              onEdit={() => goTo(4)}
              onAuthenticated={() => {
                setSessionReady(true);
                create();
              }}
              onRetry={create}
              busy={pending}
              sessionReady={sessionReady}
              error={serverError}
            />
          </div>
        </StepTransition>
      </div>
    );
  }

  return (
    <Columns layout="wizard" className="flex-1 pb-2 lg:pt-6">
      <StepRail
        steps={(total === 5 ? [...RAIL, "create.rail.save" as const] : RAIL).map((k) => t(k))}
        current={step - 1}
        onSelect={(i) => goTo((i + 1) as Step)}
        art={<Image src="/illustrations/web/06-crear.webp" width={790} height={635} alt="" loading="eager" className="h-auto w-full max-w-[220px]" />}
        className="lg:sticky lg:top-6 lg:self-start"
      />

      <div className="flex min-w-0 flex-1 flex-col lg:max-w-[600px]">
        {banner}
        {mobileHeader}

        <form
          className="flex flex-1 flex-col"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <input type="hidden" name="timeZone" value={timeZone} />
          <StepTransition stepKey={step}>
            <div>
              {step === 1 && (
                <div className="flex flex-col">
                  <Image src="/illustrations/web/06-crear.webp" width={790} height={635} alt="" priority className="mx-auto mt-4 mb-2 h-[200px] w-auto lg:hidden" />
                  <ScreenTitle>{t("create.s1.title")}</ScreenTitle>
                  <p className="mt-2.5 text-[17px] leading-snug text-gris lg:text-lg">{t("create.s1.subtitle")}</p>
                  <TextField
                    id="c-name"
                    className="mt-5"
                    label={t("create.s1.label")}
                    placeholder={t("create.s1.placeholder")}
                    value={form.name}
                    maxLength={60}
                    onChange={(e) => set("name", e.target.value)}
                    error={err("name")}
                    autoFocus
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["suggest1", "suggest2", "suggest3"] as const).map((k) => (
                      <Chip key={k} onClick={() => set("name", t(`create.s1.${k}`))} className="text-sm">
                        {t(`create.s1.${k}`)}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col pt-6 lg:pt-0">
                  <ScreenTitle>{t("create.s2.title")}</ScreenTitle>
                  <p className="mt-2.5 text-[17px] leading-snug text-gris lg:text-lg">{t("create.s2.subtitle")}</p>
                  <div
                    role="radiogroup"
                    aria-label={t("create.s2.groupLabel")}
                    aria-describedby={err("groupType") ? "c-group-error" : undefined}
                    className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-2"
                  >
                    {GROUP_TYPES.map((g) => {
                      const selected = form.groupType === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => set("groupType", g)}
                          className={`flex h-[76px] items-center gap-3 rounded-[18px] border-2 px-4 text-left text-[17px] font-medium transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] ${
                            selected ? "border-tinta bg-pasto" : "border-transparent bg-white hover:border-arena"
                          }`}
                        >
                          <span className={`size-3.5 shrink-0 rounded-full ${selected ? "bg-tinta" : GROUP_DOT[g]}`} />
                          {t(`create.groups.${g}`)}
                        </button>
                      );
                    })}
                  </div>
                  {err("groupType") && (
                    <p id="c-group-error" className="mt-2 text-sm text-coral-700">
                      {err("groupType")}
                    </p>
                  )}
                  <h2 className="mt-7 text-[22px] font-medium tracking-[-0.03em]">{t("create.s2.giftsTitle")}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {GIFT_CATEGORIES.map((c) => (
                      <Chip key={c} selected={form.giftCategory === c} onClick={() => set("giftCategory", c)}>
                        {t(`create.gifts.${c}`)}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-3.5 pt-6 lg:pt-0">
                  <ScreenTitle className="mb-1">{t("create.s3.title")}</ScreenTitle>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1.4fr_1fr] sm:gap-2.5">
                    <TextField
                      id="c-date"
                      type="date"
                      min={today || undefined}
                      label={t("create.s3.date")}
                      value={form.date}
                      onChange={(e) => set("date", e.target.value)}
                      error={err("date")}
                    />
                    <TextField id="c-time" type="time" label={t("create.s3.time")} value={form.time} onChange={(e) => set("time", e.target.value)} />
                  </div>
                  {timeZone && <p className="-mt-1.5 text-[13px] text-gris">{t("create.s3.timeZone", { zone: timeZoneName(new Date().toISOString(), timeZone) })}</p>}
                  <TextField
                    id="c-place"
                    label={
                      <>
                        {t("create.s3.place")} <span className="font-normal text-gris">{t("common.optional")}</span>
                      </>
                    }
                    placeholder={t("create.s3.placePlaceholder")}
                    value={form.place}
                    maxLength={80}
                    onChange={(e) => set("place", e.target.value)}
                    error={err("place")}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="c-budget" className="text-sm font-medium">
                      {t("create.s3.budget")}
                    </label>
                    <div className="flex gap-2">
                      <span aria-label={t("create.s3.currency")} className="grid h-[54px] place-items-center rounded-boton bg-white px-4 font-medium">
                        MXN
                      </span>
                      <div className="relative min-w-0 flex-1">
                        <span aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2 text-lg font-medium">
                          $
                        </span>
                        <input
                          id="c-budget"
                          inputMode="numeric"
                          value={form.budget}
                          onChange={(e) => set("budget", e.target.value.replace(/[^\d.]/g, ""))}
                          aria-invalid={err("budget") ? true : undefined}
                          aria-describedby={err("budget") ? "c-budget-error" : undefined}
                          className="cifra h-[54px] w-full rounded-boton border-2 border-tinta bg-white pr-4 pl-8 text-lg outline-none aria-invalid:border-coral"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {BUDGET_PRESETS.map((b) => (
                        <Chip key={b} selected={form.budget === String(b)} onClick={() => set("budget", String(b))} className="text-sm">
                          ${b}
                        </Chip>
                      ))}
                    </div>
                    {err("budget") && (
                      <p id="c-budget-error" className="text-sm text-coral-700">
                        {err("budget")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col gap-3.5 pt-6 lg:pt-0">
                  <ScreenTitle className="mb-1">{t("create.s4.title")}</ScreenTitle>
                  <TextField
                    id="c-owner"
                    label={t("create.s4.ownerName")}
                    hint={t(account ? "create.s4.ownerNameHint" : "create.s4.ownerNameHintAccount")}
                    value={form.ownerName}
                    maxLength={40}
                    onChange={(e) => set("ownerName", e.target.value)}
                    error={err("ownerName")}
                  />
                  <TextArea id="c-message" label={t("create.s4.message")} rows={3} maxLength={500} value={form.message} onChange={(e) => set("message", e.target.value)} error={err("message")} />
                  <div className="rounded-[18px] bg-white px-4 py-1">
                    {(
                      [
                        ["ownerParticipates", "create.s4.participates", "create.s4.participatesHint"],
                        ["ownerSeesMap", "create.s4.seesMap", "create.s4.seesMapHint"],
                        ["mailboxEnabled", "create.s4.mailbox", "create.s4.mailboxHint"],
                      ] as const
                    ).map(([key, label, hint], i) => (
                      <label key={key} className={`flex cursor-pointer items-center gap-3 py-3.5 ${i < 2 ? "border-b border-arena" : ""}`}>
                        <span className="flex flex-1 flex-col gap-0.5">
                          <span className="text-base font-medium">{t(label)}</span>
                          <span className="text-[13px] leading-snug text-gris">{t(key === "ownerParticipates" && form.ownerParticipates ? "create.s4.participatesOnHint" : hint)}</span>
                        </span>
                        <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="size-[22px] shrink-0 accent-tinta" />
                      </label>
                    ))}
                  </div>
                  {serverError && <Alert tone="error">{serverError}</Alert>}
                </div>
              )}
            </div>
          </StepTransition>

          <div className="mt-auto flex flex-col gap-3 pt-6 lg:mt-8">
            {step === 4 && account && (
              <div className="flex items-center gap-3 rounded-tarjeta bg-pasto-50 px-3.5 py-3">
                <Avatar name={account.name || account.email} color="pasto" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] text-noche">{t("create.s4.savedTo")}</span>
                  <strong className="truncate text-[15px] font-semibold">{account.email}</strong>
                </div>
                <TextButton onClick={notYou} disabled={pending} className="shrink-0 px-1 text-sm font-semibold underline">
                  {t("create.s4.notYou")}
                </TextButton>
              </div>
            )}
            <div className="flex items-center gap-4">
              <DotButton type="submit" ink full="mobile" disabled={pending} icon={step === 4 && account ? "check" : "arrow"}>
                {step < 4 || !account ? t("common.continue") : pending ? t("create.s4.creating") : t("create.s4.submit")}
              </DotButton>
              <span aria-hidden className="hidden text-sm text-gris lg:inline">
                {t("create.enterHint")}
              </span>
            </div>
            {step === 4 && !account && <p className="text-center text-[13px] text-gris lg:text-left">{t("create.s4.lastStepHint")}</p>}
          </div>
        </form>
      </div>

      <PreviewPanel label={t("create.previewLabel")}>
        <InviteCard owner={ownerLabel} name={form.name.trim() || t("create.previewName")} message={form.message.trim()} when={previewWhen} gift={previewGift} />
      </PreviewPanel>
    </Columns>
  );
}
