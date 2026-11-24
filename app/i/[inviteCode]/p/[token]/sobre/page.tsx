import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { ParticipantLoading } from "@/components/participant/Loading";
import { BackLink, ParticipantTop } from "@/components/participant/ParticipantTop";
import { AppShell } from "@/components/ui/AppShell";
import { ScreenTitle } from "@/components/ui/primitives";
import { PageTransition } from "@/components/ui/Transitions";
import { requireParticipant } from "@/lib/data/access";
import { getParticipants } from "@/lib/data/exchanges";
import { formatMoney, formatShortDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { backTarget, parseDesde, withDesde } from "@/lib/nav";
import { Envelope } from "./Envelope";

export const metadata: Metadata = { title: "Tu sobre", robots: { index: false } };

async function EnvelopePage({ params, searchParams }: { params: Promise<{ inviteCode: string; token: string }>; searchParams: Promise<{ desde?: string | string[] }> }) {
  const [{ exchange, me, inviteCode, token, base }, sp] = await Promise.all([requireParticipant(params), searchParams]);
  const desde = parseDesde(sp.desde);
  const back = backTarget({ desde, isOwner: me.kind === "owner", base, exchangeId: exchange.id });

  if (exchange.status !== "drawn") {
    return (
      <>
        <ParticipantTop exchangeName={exchange.name} backHref={back.href} backLabel={back.label} />
        <div className="flex flex-1 flex-col items-center pt-8 text-center">
          <Image src="/illustrations/web/08-esperando.webp" width={845} height={385} alt="" className="h-[150px] w-auto md:h-[200px]" />
          <ScreenTitle className="mt-4">{t("envelope.notDrawnTitle")}</ScreenTitle>
          <p className="mt-2.5 text-[17px]">{t("envelope.notDrawnText")}</p>
        </div>
      </>
    );
  }

  const participants = await getParticipants(exchange.id);
  const opened = participants.filter((p) => p.revealed).length;
  return (
    <>
      <ParticipantTop exchangeName={exchange.name} />
      <BackLink href={back.href} label={back.label} />
      <Envelope
        inviteCode={inviteCode}
        token={token}
        personHref={withDesde(`${base}/persona`, desde)}
        mailboxHref={withDesde(`${base}/buzon`, desde)}
        mailboxEnabled={exchange.rules.mailboxEnabled}
        budget={t("home.budget", { budget: formatMoney(exchange.budget.amount) })}
        date={formatShortDate(exchange.eventAt, exchange.timeZone)}
        progress={t("envelope.progress", { n: opened, total: participants.length })}
      />
    </>
  );
}

export default function SobrePage({ params, searchParams }: PageProps<"/i/[inviteCode]/p/[token]/sobre">) {
  return (
    <PageTransition>
      <AppShell variant="escenario" tone="pasto" pattern="papel" className="relative overflow-x-clip">
        <Suspense fallback={<ParticipantLoading />}>
          <EnvelopePage params={params} searchParams={searchParams} />
        </Suspense>
        {/* Regalito al margen del escenario (decorativo, solo en pantallas anchas). */}
        <Image
          src="/illustrations/web/09-revelacion.webp"
          width={692}
          height={669}
          alt=""
          aria-hidden
          className="pointer-events-none absolute bottom-6 left-8 hidden h-[220px] w-auto xl:block 2xl:h-[280px]"
        />
      </AppShell>
    </PageTransition>
  );
}
