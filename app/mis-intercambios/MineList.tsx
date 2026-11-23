"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deviceExchanges } from "@/app/actions/device";
import { readDeviceEntries } from "@/components/participant/RememberDevice";
import { DotButton } from "@/components/ui/DotButton";
import { ArrowIcon } from "@/components/ui/icons";
import type { ExchangeSummary } from "@/lib/data/types";
import { calendarParts } from "@/lib/format";
import { t } from "@/lib/i18n";

function status(x: ExchangeSummary): string {
  const role = x.role === "owner" ? t("mine.owner") : t("mine.participant");
  if (x.role === "owner" && x.href.startsWith("/organizar")) {
    return [role, x.status === "drawn" ? t("mine.drawn") : t("mine.waiting"), t("mine.people", { n: x.participantCount })].join(" · ");
  }
  if (x.status !== "drawn") return `${role} · ${t("mine.waiting")}`;
  if (!x.revealed) return `${role} · ${t("mine.openEnvelope")}`;
  return `${role} · ${x.bought ? t("mine.boughtDone") : t("mine.toBuy")}`;
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
  // Si organizas y también participas, se muestra una sola fila (la del panel).
  const all = [...owned, ...(device ?? []).filter((d) => !ownedIds.has(d.exchangeId))];
  const upcoming = all.filter((x) => new Date(x.eventAt).getTime() >= now).sort((a, b) => a.eventAt.localeCompare(b.eventAt));
  const past = all.filter((x) => new Date(x.eventAt).getTime() < now).sort((a, b) => b.eventAt.localeCompare(a.eventAt));
  const shown = tab === "upcoming" ? upcoming : past;
  const lists = (device ?? []).filter((d) => d.listHref);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div role="tablist" aria-label={t("mine.title")} className="flex gap-2">
        {(["upcoming", "past"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`h-10 rounded-full px-4 text-[15px] font-medium ${tab === k ? "bg-tinta text-white" : "bg-white"}`}
          >
            {k === "upcoming" ? t("mine.upcoming") : t("mine.past")}
            <span className="ml-1.5 opacity-60">{(k === "upcoming" ? upcoming : past).length}</span>
          </button>
        ))}
      </div>

      {device === null && owned.length === 0 ? (
        <p className="text-gris">{t("common.loading")}</p>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-tarjeta bg-white p-6 text-center">
          <Image src="/illustrations/web/08-esperando.webp" width={845} height={385} alt={t("mine.alt")} className="h-[110px] w-auto" />
          <p className="mt-3 text-lg font-medium">{tab === "upcoming" ? t("mine.emptyUpcoming") : t("mine.emptyPast")}</p>
          <p className="mt-1 text-sm text-gris">{t("mine.emptyText")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((x) => {
            const cal = calendarParts(x.eventAt);
            const tone = x.role === "owner" ? "bg-pasto" : x.status === "drawn" && !x.revealed ? "bg-coral" : "bg-sol";
            return (
              <li key={x.key}>
                <Link href={x.href} className="flex items-center gap-3.5 rounded-[20px] bg-white p-3.5">
                  <span className={`flex size-[58px] shrink-0 flex-col items-center justify-center rounded-[14px] leading-none ${tone}`}>
                    <span className="text-[11px] font-medium">{cal.month}</span>
                    <span className="text-2xl font-medium">{cal.day}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-base font-medium">{x.name}</span>
                    <span className="text-[13px] text-gris">{status(x)}</span>
                  </span>
                  <ArrowIcon size={14} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {lists.length > 0 && (
        <details className="rounded-[20px] bg-white p-4">
          <summary className="flex cursor-pointer items-center justify-between text-base font-medium">
            {t("mine.lists")}
            <span className="text-sm text-gris">{lists.length === 1 ? t("mine.listsCountOne") : t("mine.listsCount", { n: lists.length })}</span>
          </summary>
          <ul className="mt-3 flex flex-col">
            {lists.map((l) => (
              <li key={l.key} className="border-t border-arena">
                <Link href={l.listHref!} className="flex justify-between py-3 text-[15px]">
                  <span className="truncate font-medium">{l.name}</span>
                  <span className="shrink-0 text-gris">{l.wishCount ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-[13px] leading-snug text-gris">{t("mine.device")}</p>

      <div className="mt-auto pt-2">
        <DotButton href="/crear" variant="pasto" full icon="plus">
          {t("mine.create")}
        </DotButton>
      </div>
    </div>
  );
}
