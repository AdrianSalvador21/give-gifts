"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { createExchange } from "@/app/actions/exchanges";
import { InviteCard } from "@/components/organizer/InviteCard";
import { useBrowserValue } from "@/components/organizer/useBrowserValue";
import { Alert } from "@/components/ui/Alert";
import { DotButton } from "@/components/ui/DotButton";
import { BackIcon } from "@/components/ui/icons";
import { Columns } from "@/components/ui/AppShell";
import { Chip, ScreenTitle, StepBar, TextArea, TextField } from "@/components/ui/primitives";
import { PreviewPanel, StepRail } from "@/components/ui/Stepper";
import { StepTransition, useStepGo } from "@/components/ui/StepTransition";
import { GIFT_CATEGORIES, GROUP_TYPES, type GiftCategory, type GroupType } from "@/lib/data/types";
import { t, type MessageKey } from "@/lib/i18n";
import { exchangeFields, FIELD_ERROR, STEP_FIELDS } from "@/lib/validation/exchange";
import { browserTimeZone, eventDateFrom, formatMoney, formatShortDate, localToday, timeZoneName } from "@/lib/format";

type Step = 1 | 2 | 3 | 4;

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

type Form = {
  name: string;
  groupType: GroupType | "";
  giftCategory: GiftCategory;
  date: string;
  time: string;
  place: string;
  budget: string;
  ownerName: string;
  message: string;
  ownerParticipates: boolean;
  ownerSeesMap: boolean;
  mailboxEnabled: boolean;
};

function errorText(field: string): string {
  return t((FIELD_ERROR[field] ?? "common.genericError") as MessageKey);
}

export function Wizard({ initialName, ownerName }: { initialName: string; ownerName: string }) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<Form>({
    name: initialName,
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
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const go = useStepGo();
  // Zona y fecha del navegador de quien organiza (I9, M3). En el servidor quedan vacías para no romper la hidratación.
  const timeZone = useBrowserValue(browserTimeZone, "");
  const today = useBrowserValue(() => localToday(), "");

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => e.filter((x) => x !== key));
  };

  function invalidFields(s: Step): string[] {
    const bad = STEP_FIELDS[s].filter((field) => !exchangeFields[field].safeParse(form[field]).success);
    if (s === 3 && !bad.includes("date") && form.date && form.time && eventDateFrom(form.date, form.time, timeZone || undefined).getTime() <= Date.now()) {
      bad.push("date");
    }
    return bad;
  }

  function goTo(target: Step) {
    go(target > step ? "adelante" : "atras", () => setStep(target));
    window.scrollTo({ top: 0 });
  }

  function next() {
    const bad = invalidFields(step);
    setErrors(bad);
    if (bad.length) return;
    if (step < 4) {
      goTo((step + 1) as Step);
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const res = await createExchange({ ...form, groupType: form.groupType as GroupType, timeZone: timeZone || undefined });
      // Si todo sale bien la acción redirige; aquí solo llegan errores.
      if (res && !res.ok) {
        if (res.fieldErrors?.length) {
          setErrors(res.fieldErrors);
          const first = ([1, 2, 3, 4] as Step[]).find((s) => STEP_FIELDS[s].some((f) => res.fieldErrors!.includes(f)));
          if (first && first !== step) goTo(first);
          else if (!first) setServerError(t("common.genericError"));
        } else {
          setServerError(t("common.genericError"));
        }
      }
    });
  }

  const err = (field: string) => (errors.includes(field) ? errorText(field) : null);

  // Vista previa en vivo (xl): lo que lleva el formulario, o «Por definir».
  const budget = Number(form.budget);
  const previewWhen =
    form.date && form.time && !Number.isNaN(eventDateFrom(form.date, form.time, timeZone || undefined).getTime())
      ? formatShortDate(eventDateFrom(form.date, form.time, timeZone || undefined).toISOString(), timeZone || undefined)
      : t("create.previewTbd");
  const previewGift = budget > 0 ? formatMoney(budget) : t("create.previewTbd");

  return (
    <Columns layout="wizard" className="flex-1 pb-2 lg:pt-6">
      <StepRail
        steps={RAIL.map((k) => t(k))}
        current={step - 1}
        onSelect={(i) => goTo((i + 1) as Step)}
        art={<Image src="/illustrations/web/06-crear.webp" width={790} height={635} alt="" loading="eager" className="h-auto w-full max-w-[220px]" />}
        className="lg:sticky lg:top-6 lg:self-start"
      />

      <div className="flex min-w-0 flex-1 flex-col lg:max-w-[600px]">
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
            {t("create.step", { n: step })}
          </span>
          <span className="w-11" />
        </div>
        <div className="pt-3.5 lg:hidden">
          <StepBar step={step} total={4} />
        </div>

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
                    hint={t("create.s4.ownerNameHint")}
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

          <div className="mt-auto flex items-center gap-4 pt-6 lg:mt-8">
            <DotButton type="submit" ink full="mobile" disabled={pending} icon={step === 4 ? "check" : "arrow"}>
              {step < 4 ? t("common.continue") : pending ? t("create.s4.creating") : t("create.s4.submit")}
            </DotButton>
            <span aria-hidden className="hidden text-sm text-gris lg:inline">
              {t("create.enterHint")}
            </span>
          </div>
        </form>
      </div>

      <PreviewPanel label={t("create.previewLabel")}>
        <InviteCard
          owner={form.ownerName.trim() || ownerName}
          name={form.name.trim() || t("create.previewName")}
          message={form.message.trim()}
          when={previewWhen}
          gift={previewGift}
        />
      </PreviewPanel>
    </Columns>
  );
}
