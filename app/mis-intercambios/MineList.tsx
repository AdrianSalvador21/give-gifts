"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deviceExchanges } from "@/app/actions/device";
import { readDeviceEntries } from "@/components/participant/RememberDevice";
import { Columns } from "@/components/ui/AppShell";
import { DotButton } from "@/components/ui/DotButton";
import { ArrowIcon } from "@/components/ui/icons";
import { Card, CardLink, DateTile, Pill, ScreenTitle, type Tone } from "@/components/ui/primitives";
import type { ExchangeSummary } from "@/lib/data/types";
import { calendarParts } from "@/lib/format";
import { t } from "@/lib/i18n";
import { withDesde } from "@/lib/nav";
import { LIST_GOAL } from "@/lib/ownerSteps";

function status(x: ExchangeSummary): string {
  if (x.role === "owner" && x.href.startsWith("/organizar")) {
    return [x.status === "drawn" ? t("mine.drawn") : t("mine.waiting"), x.participantCount === 1 ? t("mine.peopleOne") : t("mine.people", { n: x.participantCount })].join(" · ");
  }
  return t("mine.participant");
}

/** Etiqueta de estado (tintes -50) de cada tarjeta. */
function badge(x: ExchangeSummary): { label: string; tone: Tone } {
  if (x.role === "owner") return { label: t("mine.owner"), tone: "pasto-50" };
  if (x.status !== "drawn") return { label: t("mine.waiting"), tone: "cielo-50" };
  if (!x.revealed) return { label: t("mine.openEnvelope"), tone: "coral-50" };
  return x.bought ? { label: t("mine.boughtDone"), tone: "pasto-50" } : { label: t("mine.toBuy"), tone: "sol-50" };
}

/** «Siguiente paso» de un intercambio que organizas (misma lógica que «Tus pendientes» del panel). */
function nextLabel(x: ExchangeSummary): string {
  const n = x.participantCount;
  switch (x.nextStep) {
    case "list":
      return t("panel.steps.list.next", { n: Math.min(x.wishCount ?? 0, LIST_GOAL) });
    case "invite":
      return t("panel.steps.invite.next", { n });
    case "draw":
      return t("panel.steps.draw.next", { n });
    case "gift":
      return x.revealed ? t("panel.steps.gift.nextBuy") : t("panel.steps.gift.nextEnvelope");
    case "announce":
      return t("panel.steps.announce.next");
    default:
      return t("panel.steps.allDone.next");
  }
}

/** Link de invitación o personal pegado → solo la ruta (/i/{code} o /i/{code}/p/{token}); nunca otra web. */
function invitePath(text: string): string | null {
  const m = text.trim().match(/\/i\/([A-Za-z0-9-]{3,80})(\/p\/([A-Za-z0-9_-]{6,80}))?/);
  return m ? m[0] : null;
}

function PasteLink() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const path = invitePath(value);
        if (!path) return setError(true);
        router.push(path, { transitionTypes: ["nav-forward"] });
      }}
    >
      <label htmlFor="mine-paste" className="text-sm font-medium">
        {t("mine.pasteLabel")}
      </label>
      <div className="flex gap-2">
        <input
          id="mine-paste"
          value={value}
          inputMode="url"
          autoComplete="off"
          placeholder={t("mine.pastePlaceholder")}
          aria-invalid={error || undefined}
          aria-describedby={error ? "mine-paste-error" : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          className="h-12 min-w-0 flex-1 rounded-boton border-2 border-transparent bg-crema px-4 text-base outline-none focus:border-tinta aria-invalid:border-coral"
        />
        <button type="submit" disabled={!value.trim()} className="h-12 shrink-0 rounded-boton bg-tinta px-5 font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-40">
          {t("mine.pasteGo")}
        </button>
      </div>
      {error && (
        <p id="mine-paste-error" role="alert" className="text-sm text-coral-700">
          {t("mine.pasteError")}
        </p>
      )}
    </form>
  );
}

/** Une los intercambios del organizador (servidor) con los links personales guardados en este navegador. */
export function MineList({ owned }: { owned: ExchangeSummary[] }) {
  const [device, setDevice] = useState<ExchangeSummary[] | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const entries = readDeviceEntries().map(({ inviteCode, token }) => ({ inviteCode, token }));
    (entries.length ? deviceExchanges(entries) : Promise.resolve([]))
      .then(setDevice)
      .catch(() => setDevice([]));
  }, []);

  const ownedIds = new Set(owned.map((o) => o.exchangeId));
  // Si organizas y también participas, se muestra una sola tarjeta (la del panel).
  const all = [...owned, ...(device ?? []).filter((d) => !ownedIds.has(d.exchangeId))];
  const upcoming = all.filter((x) => new Date(x.eventAt).getTime() >= now).sort((a, b) => a.eventAt.localeCompare(b.eventAt));
  const past = all.filter((x) => new Date(x.eventAt).getTime() < now).sort((a, b) => b.eventAt.localeCompare(a.eventAt));
  const shown = tab === "upcoming" ? upcoming : past;
  // Las listas de los intercambios que organizas ya salen en su tarjeta («Mi lista»): no se repiten.
  const lists = (device ?? []).filter((d) => d.listHref && !ownedIds.has(d.exchangeId));
  const loading = device === null && owned.length === 0;
  const empty = !loading && device !== null && all.length === 0;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 pt-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-6 lg:pt-8">
        <ScreenTitle>{t("mine.title")}</ScreenTitle>
        {!empty && (
          <div role="tablist" aria-label={t("mine.title")} className="flex gap-2">
            {(["upcoming", "past"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`h-11 rounded-full px-4 text-[15px] font-medium transition-[background-color,transform] active:scale-95 ${tab === k ? "bg-tinta text-white" : "bg-white hover:bg-arena"}`}
              >
                {k === "upcoming" ? t("mine.upcoming") : t("mine.past")}
                <span className="cifra ml-1.5 opacity-60">{(k === "upcoming" ? upcoming : past).length}</span>
              </button>
            ))}
          </div>
        )}
        {!empty && (
          <span className="hidden lg:ml-auto lg:block">
            <DotButton href="/crear" variant="pasto" ink icon="plus" size="sm">
              {t("mine.create")}
            </DotButton>
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-gris">{t("common.loading")}</p>
      ) : empty ? (
        <Card className="flex flex-col items-center gap-6 p-6 text-center md:flex-row md:p-8 md:text-left">
          <Image src="/illustrations/web/08-esperando.webp" width={845} height={385} alt={t("mine.alt")} className="h-auto w-full max-w-[240px] shrink-0" />
          <div className="flex w-full flex-col gap-4">
            <div>
              <p className="text-[24px] leading-tight font-medium tracking-[-0.03em]">{t("mine.emptyAllTitle")}</p>
              <p className="mt-1.5 text-[15px] leading-snug text-gris">{t("mine.emptyAllText")}</p>
            </div>
            <DotButton href="/crear" variant="pasto" ink icon="plus" full="mobile" className="md:self-start">
              {t("mine.create")}
            </DotButton>
            <PasteLink />
          </div>
        </Card>
      ) : shown.length === 0 ? (
        <Card variant="punteada" className="flex flex-col items-center gap-2 p-6 text-center">
          <Image src="/illustrations/web/08-esperando.webp" width={845} height={385} alt="" className="h-[96px] w-auto" />
          <p className="text-lg font-medium">{tab === "upcoming" ? t("mine.emptyUpcoming") : t("mine.emptyPast")}</p>
          <p className="text-sm text-gris">{t("mine.emptyText")}</p>
        </Card>
      ) : (
        <Columns layout="intercambios" as="ul" className="escalonado">
          {shown.map((x, i) => {
            const cal = calendarParts(x.eventAt, x.timeZone);
            const b = badge(x);
            const variant = tab === "upcoming" && i === 0 ? "protagonista" : "base";
            if (x.nextStep !== undefined) {
              // Organizas: una tarjeta por evento con el siguiente paso y dos acciones (no es un solo link).
              return (
                <li key={x.key}>
                  <Card variant={variant} className="flex h-full flex-col gap-4">
                    <span className="flex items-start gap-3">
                      <DateTile month={cal.month} day={cal.day} tone="pasto" />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-[20px] leading-tight font-medium tracking-[-0.03em] break-words">{x.name}</span>
                        <span className="text-[13px] text-gris">{status(x)}</span>
                      </span>
                      <Pill tone={b.tone} className="shrink-0">
                        {b.label}
                      </Pill>
                    </span>
                    <span className="flex flex-col gap-2 rounded-2xl bg-sol-50 p-3.5">
                      <span className="etiqueta text-gris">{t("mine.nextStep")}</span>
                      <span className="text-base font-medium">{nextLabel(x)}</span>
                      {x.stepsTotal ? (
                        <span
                          role="img"
                          aria-label={t("mine.stepsProgress", { n: x.stepsDone ?? 0, total: x.stepsTotal })}
                          className="grid gap-1"
                          style={{ gridTemplateColumns: `repeat(${x.stepsTotal}, minmax(0, 1fr))` }}
                        >
                          {Array.from({ length: x.stepsTotal }, (_, k) => (
                            <span key={k} className={`h-1.5 rounded-full ${k < (x.stepsDone ?? 0) ? "bg-pasto" : k === (x.stepsDone ?? 0) && x.nextStep ? "bg-tinta" : "bg-tinta/15"}`} />
                          ))}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-auto flex flex-wrap gap-2">
                      <Link
                        href={x.href}
                        transitionTypes={["nav-forward"]}
                        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-boton bg-tinta px-4 text-[15px] font-medium text-white no-underline transition-transform active:scale-[0.98]"
                      >
                        {t("mine.openPanel")}
                      </Link>
                      {x.listHref && (
                        <Link
                          href={withDesde(x.listHref, "mis")}
                          transitionTypes={["nav-forward"]}
                          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-boton border-2 border-tinta bg-hueso px-4 text-[15px] font-medium no-underline transition-transform active:scale-[0.98]"
                        >
                          {t("mine.myList")}
                        </Link>
                      )}
                    </span>
                  </Card>
                </li>
              );
            }
            return (
              <li key={x.key}>
                <CardLink
                  href={x.href}
                  variant={variant}
                  transitionTypes={["nav-forward"]}
                  className="flex h-full flex-col gap-4"
                >
                  <span className="flex items-start justify-between gap-3">
                    <DateTile month={cal.month} day={cal.day} tone={x.role === "owner" ? "pasto" : "sol"} />
                    <Pill tone={b.tone}>{b.label}</Pill>
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[20px] leading-tight font-medium tracking-[-0.03em] break-words">{x.name}</span>
                    <span className="text-[13px] text-gris">{status(x)}</span>
                  </span>
                  <span aria-hidden className="mt-auto flex justify-end">
                    <span className="grid size-9 place-items-center rounded-full bg-crema">
                      <ArrowIcon size={14} />
                    </span>
                  </span>
                </CardLink>
              </li>
            );
          })}
        </Columns>
      )}

      {lists.length > 0 && (
        <details className="rounded-tarjeta bg-white p-4 lg:max-w-[560px]">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between text-base font-medium">
            {t("mine.lists")}
            <span className="text-sm text-gris">{lists.length === 1 ? t("mine.listsCountOne") : t("mine.listsCount", { n: lists.length })}</span>
          </summary>
          <ul className="mt-2 flex flex-col">
            {lists.map((l) => (
              <li key={l.key} className="border-t border-arena">
                <Link href={withDesde(l.listHref!, "mis")} transitionTypes={["nav-forward"]} className="flex min-h-11 items-center justify-between py-2 text-[15px]">
                  <span className="truncate font-medium">{l.name}</span>
                  <span className="cifra shrink-0 text-gris">{l.wishCount ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      {!empty && <p className="text-[13px] leading-snug text-gris">{t("mine.device")}</p>}

      {!empty && (
        <div className="mt-auto pt-2 lg:hidden">
          <DotButton href="/crear" variant="pasto" ink full icon="plus">
            {t("mine.create")}
          </DotButton>
        </div>
      )}
    </div>
  );
}
