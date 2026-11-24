import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/ui/AppShell";
import { CloseIcon } from "@/components/ui/icons";
import { RoundIconLink, ScreenTitle } from "@/components/ui/primitives";
import { PageTransition } from "@/components/ui/Transitions";
import { getExclusions, getParticipants } from "@/lib/data/exchanges";
import { requireOwnedExchange } from "@/lib/data/owner";
import { t } from "@/lib/i18n";
import { DrawForm } from "./DrawForm";

export const metadata: Metadata = { title: "Sortear", robots: { index: false } };

async function Draw({ params }: { params: Promise<{ exchangeId: string }> }) {
  const { exchangeId } = await params;
  const { exchange } = await requireOwnedExchange(exchangeId, `/organizar/${exchangeId}/sorteo`);
  if (exchange.status !== "open") redirect(`/organizar/${exchange.id}`);
  const [participants, exclusions] = await Promise.all([getParticipants(exchange.id), getExclusions(exchange.id)]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 pt-4 lg:pt-6">
        <span className="w-11" />
        <span className="min-w-0 truncate text-sm font-medium text-gris">{exchange.name}</span>
        <RoundIconLink href={`/organizar/${exchange.id}`} label={t("draw.close")}>
          <CloseIcon size={16} />
        </RoundIconLink>
      </div>
      <DrawForm
        exchangeId={exchange.id}
        seesMap={exchange.rules.ownerSeesMap}
        people={participants.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
        exclusions={exclusions}
        intro={
          <>
            <Image src="/illustrations/web/13-exclusiones.webp" width={897} height={527} alt={t("draw.alt")} priority className="mx-auto mt-4 h-[170px] w-auto lg:hidden" />
            <ScreenTitle className="mt-3 lg:mt-4">{t("draw.title")}</ScreenTitle>
            <p className="mt-2.5 text-[17px] leading-snug text-gris lg:text-lg">{t("draw.exclusionsText")}</p>
          </>
        }
      />
    </>
  );
}

export default function SorteoPage({ params }: PageProps<"/organizar/[exchangeId]/sorteo">) {
  return (
    <AppShell variant="tablero">
      <PageTransition>
        <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
          <Draw params={params} />
        </Suspense>
      </PageTransition>
    </AppShell>
  );
}
