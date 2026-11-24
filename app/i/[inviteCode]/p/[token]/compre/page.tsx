import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DotButton } from "@/components/ui/DotButton";
import { BrandBar } from "@/components/ui/BrandBar";
import { Screen, ScreenTitle, TopBar } from "@/components/ui/primitives";
import { requireParticipant } from "@/lib/data/access";
import { getOwnerName, getParticipants } from "@/lib/data/exchanges";
import { calendarHref, calendarParts, formatEvent } from "@/lib/format";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "¡Regalo comprado!", robots: { index: false } };

async function Bought({ params }: { params: Promise<{ inviteCode: string; token: string }> }) {
  const { exchange, me, base } = await requireParticipant(params);
  if (exchange.status !== "drawn" || !me.bought) redirect(base);
  const [participants, owner] = await Promise.all([getParticipants(exchange.id), getOwnerName(exchange)]);
  const bought = participants.filter((p) => p.bought).length;
  const pct = Math.round((bought / participants.length) * 100);
  const cal = calendarParts(exchange.eventAt);
  const [day, time] = formatEvent(exchange.eventAt).split(" · ");

  return (
    <>
      <BrandBar className="pt-2" />
      <TopBar backHref={base} title={exchange.name} />
      <Image src="/illustrations/web/12-ya-compre.webp" width={603} height={549} alt={t("bought.alt")} priority className="mx-auto mt-6 h-[220px] w-auto" />
      <ScreenTitle className="mt-4">{t("bought.title")}</ScreenTitle>
      <p className="mt-2.5 text-[17px] leading-snug text-gris">{me.kind === "owner" ? t("bought.textOwner") : t("bought.text", { owner: owner.split(" ")[0] || "Quien organiza" })}</p>

      <div className="mt-5 flex flex-col gap-2 rounded-[20px] bg-white p-4">
        <span className="text-[15px] font-medium">{t("bought.progress", { n: bought, total: participants.length })}</span>
        <div className="h-2.5 rounded-full bg-arena" role="progressbar" aria-valuenow={bought} aria-valuemin={0} aria-valuemax={participants.length}>
          <div className="h-2.5 rounded-full bg-pasto" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3.5 rounded-[20px] bg-white p-4">
        <span className="flex size-[58px] shrink-0 flex-col items-center justify-center rounded-[14px] bg-pasto leading-none">
          <span className="text-[11px] font-medium">{cal.month}</span>
          <span className="text-2xl font-medium">{cal.day}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-medium">{`${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`}</span>
          {exchange.place && <span className="truncate text-sm text-gris">{exchange.place}</span>}
        </span>
        <a
          href={calendarHref(exchange.name, exchange.eventAt, exchange.place)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-[10px] bg-crema px-3 py-2 text-[13px] font-medium"
        >
          {t("bought.calendar")}
        </a>
      </div>

      <div className="mt-auto flex flex-col gap-2.5 pt-6">
        <DotButton href={base} variant="pasto" full>
          {t("bought.back")}
        </DotButton>
        <DotButton href="/mis-intercambios" variant="blanco" full>
          {t("bought.mine")}
        </DotButton>
      </div>
    </>
  );
}

export default function ComprePage({ params }: PageProps<"/i/[inviteCode]/p/[token]/compre">) {
  return (
    <Screen>
      <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
        <Bought params={params} />
      </Suspense>
    </Screen>
  );
}
