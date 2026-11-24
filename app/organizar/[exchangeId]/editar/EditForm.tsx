"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateExchange } from "@/app/actions/organizer";
import { DeleteExchange } from "@/components/organizer/DeleteExchange";
import { useBrowserValue } from "@/components/organizer/useBrowserValue";
import { Alert } from "@/components/ui/Alert";
import { Columns, StickyBar, StickyPanel } from "@/components/ui/AppShell";
import { DotButton } from "@/components/ui/DotButton";
import { Card, Chip, Eyebrow, Pill, TextArea, TextField } from "@/components/ui/primitives";
import { GIFT_CATEGORIES, GROUP_TYPES, type GiftCategory, type GroupType } from "@/lib/data/types";
import { eventDateFrom, formatEvent, formatMoney, localToday } from "@/lib/format";
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

/**
 * Edición del intercambio: campos a la izquierda y resumen fijo a la derecha (lg); guardar en barra pegajosa.
 * Después del sorteo los campos que afectan el sorteo quedan bloqueados. La fecha solo tiene que ser futura
 * si cambió (M13): con el evento ya pasado se puede seguir cambiando el mensaje o el buzón.
 */
export function EditForm({
  exchangeId,
  exchangeName,
  initial,
  drawn,
  timeZone,
  zoneName,
  initialWhen,
  past,
}: {
  exchangeId: string;
  exchangeName: string;
  initial: EditValues;
  drawn: boolean;
  /** Zona IANA del intercambio: se conserva al guardar. */
  timeZone: string;
  /** «hora estándar del centro», calculado en el servidor. */
  zoneName: string;
  /** Fecha formateada en el servidor (evita diferencias de Intl al hidratar). */
  initialWhen: string;
  /** El evento ya pasó. */
  past: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<{ tone: "exito" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const today = useBrowserValue(() => localToday(timeZone), "");

  const set = <K extends keyof EditValues>(key: K, value: EditValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => e.filter((x) => x !== key && !(key === "time" && x === "date")));
    setStatus(null);
  };
  const err = (field: string) => (errors.includes(field) ? t((FIELD_ERROR[field] ?? "common.genericError") as MessageKey) : null);
  const dateUnchanged = form.date === initial.date && form.time === initial.time;

  // Resumen en vivo. Mientras la fecha no cambie se usa la que formateó el servidor.
  const eventAt = dateUnchanged ? null : eventDateFrom(form.date, form.time, timeZone);
  const when = dateUnchanged ? initialWhen : eventAt && !Number.isNaN(eventAt.getTime()) ? formatEvent(eventAt.toISOString(), timeZone) : t("create.previewTbd");
  const budget = Number(form.budget);

  return (
    <Columns layout="resumen" className="flex-1">
      <form
        noValidate
        className="flex min-w-0 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          setStatus(null);
          start(async () => {
            const res = await updateExchange(exchangeId, { ...form, budget: Number(form.budget), timeZone });
            if (res.ok) {
              setErrors([]);
              setStatus({ tone: "exito", text: t("edit.saved") });
              router.push(`/organizar/${exchangeId}`, { transitionTypes: ["nav-back"] });
            } else if (res.error === "fields") {
              setErrors(res.fields ?? []);
            } else {
              setStatus({ tone: "error", text: res.error === "locked" ? t("edit.lockedAfterDraw") : t("common.genericError") });
            }
          });
        }}
      >
        <input type="hidden" name="timeZone" value={timeZone} />
        <div className="flex flex-col gap-3.5">
          {drawn && <Alert tone="info">{t("edit.lockedAfterDraw")}</Alert>}
          {past && <Alert tone="info">{t("edit.pastHint")}</Alert>}
        </div>

        <Columns layout="campos" className="mt-4">
          <TextField
            id="e-name"
            label={t("create.s1.label")}
            value={form.name}
            maxLength={60}
            disabled={drawn}
            onChange={(e) => set("name", e.target.value)}
            error={err("name")}
            className={`md:col-span-2 ${drawn ? "opacity-60" : ""}`}
          />

          <fieldset disabled={drawn} className={`flex flex-col gap-2 md:col-span-2 ${drawn ? "opacity-60" : ""}`}>
            <legend className="mb-1.5 text-sm font-medium">{t("create.s2.groupLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              {GROUP_TYPES.map((g) => (
                <Chip key={g} selected={form.groupType === g} onClick={() => set("groupType", g)}>
                  {t(`create.groups.${g}`)}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={drawn} className={`flex flex-col gap-2 md:col-span-2 ${drawn ? "opacity-60" : ""}`}>
            <legend className="mb-1.5 text-sm font-medium">{t("create.s2.giftsTitle")}</legend>
            <div className="flex flex-wrap gap-2">
              {GIFT_CATEGORIES.map((c) => (
                <Chip key={c} selected={form.giftCategory === c} onClick={() => set("giftCategory", c)}>
                  {t(`create.gifts.${c}`)}
                </Chip>
              ))}
            </div>
          </fieldset>

          <TextField
            id="e-date"
            type="date"
            // M13: si el evento ya pasó y no se mueve la fecha, no se le exige ser futura.
            min={past && form.date === initial.date ? undefined : today || undefined}
            label={t("create.s3.date")}
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            error={err("date")}
          />
          <TextField id="e-time" type="time" label={t("create.s3.time")} hint={t("edit.timeZone", { zone: zoneName })} value={form.time} onChange={(e) => set("time", e.target.value)} />
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
          <TextArea
            id="e-message"
            label={t("create.s4.message")}
            rows={3}
            maxLength={500}
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            error={err("message")}
            className="md:col-span-2"
          />

          <div className="rounded-[18px] bg-white px-4 py-1 md:col-span-2">
            <label className={`flex items-center gap-3 border-b border-arena py-3.5 ${drawn ? "opacity-60" : "cursor-pointer"}`}>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-base font-medium">{t("create.s4.seesMap")}</span>
                <span className="text-[13px] leading-snug text-gris">{t("create.s4.seesMapHint")}</span>
              </span>
              <input type="checkbox" disabled={drawn} checked={form.ownerSeesMap} onChange={(e) => set("ownerSeesMap", e.target.checked)} className="size-[22px] shrink-0 accent-tinta" />
            </label>
            <label className="flex cursor-pointer items-center gap-3 py-3.5">
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-base font-medium">{t("create.s4.mailbox")}</span>
                <span className="text-[13px] leading-snug text-gris">{t("create.s4.mailboxHint")}</span>
              </span>
              <input type="checkbox" checked={form.mailboxEnabled} onChange={(e) => set("mailboxEnabled", e.target.checked)} className="size-[22px] shrink-0 accent-tinta" />
            </label>
          </div>
        </Columns>

        <StickyBar className="lg:mx-0 lg:px-0">
          {status && (
            <Alert tone={status.tone} className="lg:mr-auto">
              {status.text}
            </Alert>
          )}
          <DotButton type="submit" ink full="mobile" disabled={pending} icon="check">
            {pending ? t("edit.saving") : t("edit.save")}
          </DotButton>
        </StickyBar>
      </form>

      <StickyPanel as="aside" className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <Eyebrow as="h2">{t("edit.summary")}</Eyebrow>
          <p className="text-[26px] leading-[1.05] font-medium tracking-[-0.04em] break-words">{form.name.trim() || exchangeName}</p>
          <dl className="flex flex-col gap-2 text-[15px]">
            {(
              [
                [t("join.when"), when],
                [t("create.s3.place"), form.place.trim() || "—"],
                [t("join.gift"), budget > 0 ? t("panel.budget", { budget: formatMoney(budget) }) : t("create.previewTbd")],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-arena pb-2 last:border-b-0">
                <dt className="text-gris">{label}</dt>
                <dd className="min-w-0 text-right font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-1.5">
            <Pill tone={form.mailboxEnabled ? "pasto-50" : "arena"}>{form.mailboxEnabled ? t("panel.rulesMailboxOn") : t("panel.rulesMailboxOff")}</Pill>
            <Pill tone="cielo-50">{form.ownerSeesMap ? t("panel.rulesSeesMapOn") : t("panel.rulesSeesMapOff")}</Pill>
          </div>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-sm leading-snug text-gris">{t("panel.deleteText")}</p>
          <DeleteExchange exchangeId={exchangeId} exchangeName={exchangeName} />
        </Card>
      </StickyPanel>
    </Columns>
  );
}
