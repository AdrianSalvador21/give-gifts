import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { Screen, ScreenTitle, TopBar } from "@/components/ui/primitives";
import { requireParticipant } from "@/lib/data/access";
import { getParticipants } from "@/lib/data/exchanges";
import { formatMoney, formatShortDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { Envelope } from "./Envelope";

export const metadata: Metadata = { title: "Tu sobre", robots: { index: false } };

async function EnvelopePage({ params }: { params: Promise<{ inviteCode: string; token: string }> }) {
  const { exchange, inviteCode, token, base } = await requireParticipant(params);

  if (exchange.status !== "drawn") {
    return (
      <>
        <TopBar backHref={base} backLabel={t("envelope.back")} title={exchange.name} />
        <Image src="/illustrations/web/08-esperando.webp" width={845} height={385} alt="" className="mx-auto mt-10 mb-3 h-[150px] w-auto" />
        <ScreenTitle>{t("envelope.notDrawnTitle")}</ScreenTitle>
        <p className="mt-2.5 text-[17px] text-gris">{t("envelope.notDrawnText")}</p>
      </>
    );
  }

  const participants = await getParticipants(exchange.id);
  const opened = participants.filter((p) => p.revealed).length;
  return (
    <>
      <TopBar backHref={base} backLabel={t("envelope.back")} title={exchange.name} />
      <Envelope
        inviteCode={inviteCode}
        token={token}
        base={base}
        mailboxEnabled={exchange.rules.mailboxEnabled}
        meta={t("envelope.meta", { budget: formatMoney(exchange.budget.amount), date: formatShortDate(exchange.eventAt) })}
        progress={t("envelope.progress", { n: opened, total: participants.length })}
      />
    </>
  );
}

export default function SobrePage({ params }: PageProps<"/i/[inviteCode]/p/[token]/sobre">) {
  return (
    <Screen>
      <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
        <EnvelopePage params={params} />
      </Suspense>
    </Screen>
  );
}
