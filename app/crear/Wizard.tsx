"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { createExchange } from "@/app/actions/exchanges";
import { DotButton } from "@/components/ui/DotButton";
import { BackIcon } from "@/components/ui/icons";
import { Chip, ScreenTitle, StepBar, TextArea, TextField } from "@/components/ui/primitives";
import { GIFT_CATEGORIES, GROUP_TYPES, type GiftCategory, type GroupType } from "@/lib/data/types";
import { t, type MessageKey } from "@/lib/i18n";
import { exchangeFields, FIELD_ERROR, STEP_FIELDS } from "@/lib/validation/exchange";
import { eventDateFrom } from "@/lib/format";

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

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => e.filter((x) => x !== key));
  };

  function invalidFields(s: Step): string[] {
    const bad = STEP_FIELDS[s].filter((field) => !exchangeFields[field].safeParse(form[field]).success);
    if (s === 3 && !bad.includes("date") && form.date && form.time && eventDateFrom(form.date, form.time).getTime() <= Date.now()) {
      bad.push("date");
    }
    return bad;
  }

  function next() {
    const bad = invalidFields(step);
    setErrors(bad);
    if (bad.length) return;
    if (step < 4) {
      setStep((step + 1) as Step);
      window.scrollTo({ top: 0 });
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const res = await createExchange({ ...form, groupType: form.groupType as GroupType });
      // Si todo sale bien la acción redirige; aquí solo llegan errores.
      if (res && !res.ok) {
        if (res.fieldErrors?.length) {
          setErrors(res.fieldErrors);
          const first = ([1, 2, 3, 4] as Step[]).find((s) => STEP_FIELDS[s].some((f) => res.fieldErrors!.includes(f)));
          if (first) setStep(first);
        } else {
          setServerError(t("common.genericError"));
        }
      }
    });
  }

  const err = (field: string) => (errors.includes(field) ? errorText(field) : null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between pt-4">
        {step === 1 ? (
          <Link href="/" aria-label={t("create.home")} className="grid size-11 place-items-center rounded-full bg-white">
            <BackIcon />
          </Link>
        ) : (
          <button type="button" aria-label={t("create.prevStep")} onClick={() => setStep((step - 1) as Step)} className="grid size-11 place-items-center rounded-full bg-white">
            <BackIcon />
          </button>
        )}
        <span className="text-sm font-medium text-gris">{t("create.step", { n: step })}</span>
        <span className="w-11" />
      </div>
      <div className="pt-3.5">
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
        {step === 1 && (
          <div className="flex flex-col">
            <Image src="/illustrations/web/06-crear.webp" width={790} height={635} alt="" priority className="mx-auto mt-4 mb-2 h-[200px] w-auto" />
            <ScreenTitle>{t("create.s1.title")}</ScreenTitle>
            <p className="mt-2.5 text-[17px] leading-snug text-gris">{t("create.s1.subtitle")}</p>
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
                <Chip key={k} onClick={() => set("name", t(`create.s1.${k}`))} className="h-[38px] text-sm">
                  {t(`create.s1.${k}`)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col pt-6">
            <ScreenTitle>{t("create.s2.title")}</ScreenTitle>
            <p className="mt-2.5 text-[17px] leading-snug text-gris">{t("create.s2.subtitle")}</p>
            <div role="radiogroup" aria-label={t("create.s2.groupLabel")} className="mt-5 grid grid-cols-2 gap-2.5">
              {GROUP_TYPES.map((g) => {
                const selected = form.groupType === g;
                return (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set("groupType", g)}
                    className={`flex h-[76px] items-center gap-3 rounded-[18px] border-2 px-4 text-left text-[17px] font-medium ${
                      selected ? "border-tinta bg-pasto" : "border-transparent bg-white"
                    }`}
                  >
                    <span className={`size-3.5 rounded-full ${selected ? "bg-tinta" : GROUP_DOT[g]}`} />
                    {t(`create.groups.${g}`)}
                  </button>
                );
              })}
            </div>
            {err("groupType") && <p className="mt-2 text-sm text-[#B23A2A]">{err("groupType")}</p>}
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
          <div className="flex flex-col gap-3.5 pt-6">
            <ScreenTitle className="mb-1">{t("create.s3.title")}</ScreenTitle>
            <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
              <TextField id="c-date" type="date" min={today} label={t("create.s3.date")} value={form.date} onChange={(e) => set("date", e.target.value)} error={err("date")} />
              <TextField id="c-time" type="time" label={t("create.s3.time")} value={form.time} onChange={(e) => set("time", e.target.value)} />
            </div>
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
                    className="h-[54px] w-full rounded-boton border-2 border-tinta bg-white pr-4 pl-8 text-lg font-medium outline-none aria-invalid:border-coral"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {BUDGET_PRESETS.map((b) => (
                  <Chip key={b} selected={form.budget === String(b)} onClick={() => set("budget", String(b))} className="h-9 text-sm">
                    ${b}
                  </Chip>
                ))}
              </div>
              {err("budget") && <p className="text-sm text-[#B23A2A]">{err("budget")}</p>}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3.5 pt-6">
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
                <label key={key} className={`flex items-center gap-3 py-3.5 ${i < 2 ? "border-b border-arena" : ""}`}>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-base font-medium">{t(label)}</span>
                    <span className="text-[13px] text-gris">{t(hint)}</span>
                  </span>
                  <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="size-[22px] accent-tinta" />
                </label>
              ))}
            </div>
            {serverError && (
              <p role="alert" className="rounded-boton bg-white px-4 py-3 text-sm text-[#B23A2A]">
                {serverError}
              </p>
            )}
          </div>
        )}

        <div className="mt-auto pt-6">
          <DotButton type="submit" full disabled={pending} icon={step === 4 ? "check" : "arrow"}>
            {step < 4 ? t("common.continue") : pending ? t("create.s4.creating") : t("create.s4.submit")}
          </DotButton>
        </div>
      </form>
    </div>
  );
}
