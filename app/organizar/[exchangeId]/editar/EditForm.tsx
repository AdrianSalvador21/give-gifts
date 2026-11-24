"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateExchange } from "@/app/actions/organizer";
import { DotButton } from "@/components/ui/DotButton";
import { Chip, TextArea, TextField } from "@/components/ui/primitives";
import { GIFT_CATEGORIES, GROUP_TYPES, type GiftCategory, type GroupType } from "@/lib/data/types";
import { t, type MessageKey } from "@/lib/i18n";
import { FIELD_ERROR } from "@/lib/validation/exchange";

export type EditValues = {
  name: string;
  groupType: GroupType;
  giftCategory: GiftCategory;
  date: string;
  time: string;
  place: string;
  budget: string;
  message: string;
  ownerSeesMap: boolean;
  mailboxEnabled: boolean;
};

/** Edición del intercambio. Después del sorteo los campos que afectan el sorteo quedan bloqueados. */
export function EditForm({ exchangeId, initial, drawn }: { exchangeId: string; initial: EditValues; drawn: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof EditValues>(key: K, value: EditValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => e.filter((x) => x !== key && !(key === "time" && x === "date")));
    setStatus(null);
  };
  const err = (field: string) => (errors.includes(field) ? t((FIELD_ERROR[field] ?? "common.genericError") as MessageKey) : null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      noValidate
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        setStatus(null);
        start(async () => {
          const res = await updateExchange(exchangeId, { ...form, budget: Number(form.budget) });
          if (res.ok) {
            setErrors([]);
            setStatus({ tone: "ok", text: t("edit.saved") });
            router.push(`/organizar/${exchangeId}`);
          } else if (res.error === "fields") {
            setErrors(res.fields ?? []);
          } else {
            setStatus({ tone: "error", text: res.error === "locked" ? t("edit.lockedAfterDraw") : t("common.genericError") });
          }
        });
      }}
    >
      {drawn && <p className="rounded-boton border border-dashed border-gris px-4 py-3 text-sm leading-snug text-gris">{t("edit.lockedAfterDraw")}</p>}

      <TextField
        id="e-name"
        label={t("create.s1.label")}
        value={form.name}
        maxLength={60}
        disabled={drawn}
        onChange={(e) => set("name", e.target.value)}
        error={err("name")}
        className={drawn ? "opacity-60" : ""}
      />

      <fieldset disabled={drawn} className={`flex flex-col gap-2 ${drawn ? "opacity-60" : ""}`}>
        <legend className="mb-1.5 text-sm font-medium">{t("create.s2.groupLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {GROUP_TYPES.map((g) => (
            <Chip key={g} selected={form.groupType === g} onClick={() => set("groupType", g)}>
              {t(`create.groups.${g}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={drawn} className={`flex flex-col gap-2 ${drawn ? "opacity-60" : ""}`}>
        <legend className="mb-1.5 text-sm font-medium">{t("create.s2.giftsTitle")}</legend>
        <div className="flex flex-wrap gap-2">
          {GIFT_CATEGORIES.map((c) => (
            <Chip key={c} selected={form.giftCategory === c} onClick={() => set("giftCategory", c)}>
              {t(`create.gifts.${c}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1.4fr_1fr] sm:gap-2.5">
        <TextField id="e-date" type="date" min={today} label={t("create.s3.date")} value={form.date} onChange={(e) => set("date", e.target.value)} error={err("date")} />
        <TextField id="e-time" type="time" label={t("create.s3.time")} value={form.time} onChange={(e) => set("time", e.target.value)} />
      </div>
      <TextField
        id="e-place"
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
      <TextField
        id="e-budget"
        inputMode="numeric"
        label={`${t("create.s3.budget")} (MXN)`}
        value={form.budget}
        disabled={drawn}
        onChange={(e) => set("budget", e.target.value.replace(/[^\d.]/g, ""))}
        error={err("budget")}
        className={drawn ? "opacity-60" : ""}
      />
      <TextArea id="e-message" label={t("create.s4.message")} rows={3} maxLength={500} value={form.message} onChange={(e) => set("message", e.target.value)} error={err("message")} />

      <div className="rounded-[18px] bg-white px-4 py-1">
        <label className={`flex items-center gap-3 border-b border-arena py-3.5 ${drawn ? "opacity-60" : ""}`}>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-base font-medium">{t("create.s4.seesMap")}</span>
            <span className="text-[13px] text-gris">{t("create.s4.seesMapHint")}</span>
          </span>
          <input type="checkbox" disabled={drawn} checked={form.ownerSeesMap} onChange={(e) => set("ownerSeesMap", e.target.checked)} className="size-[22px] accent-tinta" />
        </label>
        <label className="flex items-center gap-3 py-3.5">
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-base font-medium">{t("create.s4.mailbox")}</span>
            <span className="text-[13px] text-gris">{t("create.s4.mailboxHint")}</span>
          </span>
          <input type="checkbox" checked={form.mailboxEnabled} onChange={(e) => set("mailboxEnabled", e.target.checked)} className="size-[22px] accent-tinta" />
        </label>
      </div>

      {status && (
        <p role={status.tone === "error" ? "alert" : "status"} className={`rounded-boton bg-white px-4 py-3 text-sm ${status.tone === "error" ? "text-[#B23A2A]" : ""}`}>
          {status.text}
        </p>
      )}

      <DotButton type="submit" full disabled={pending} icon="check" className="mt-2">
        {pending ? t("edit.saving") : t("edit.save")}
      </DotButton>
    </form>
  );
}
