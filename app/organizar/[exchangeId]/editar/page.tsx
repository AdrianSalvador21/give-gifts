import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/ui/AppShell";
import { ScreenTitle, TopBar } from "@/components/ui/primitives";
import { PageTransition } from "@/components/ui/Transitions";
import { requireOwnedExchange } from "@/lib/data/owner";
import { eventInputs, formatEvent, timeZoneName } from "@/lib/format";
import { t } from "@/lib/i18n";
import { EditForm } from "./EditForm";

export const metadata: Metadata = { title: "Editar intercambio", robots: { index: false } };

/** ¿Ya pasó el evento? (M13: entonces la fecha puede quedarse como está). La página ya es dinámica (sesión). */
function hasPassed(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

async function Edit({ params }: { params: Promise<{ exchangeId: string }> }) {
  const { exchangeId } = await params;
  const { exchange } = await requireOwnedExchange(exchangeId, `/organizar/${exchangeId}/editar`);
  const { date, time } = eventInputs(exchange.eventAt, exchange.timeZone);
  return (
    <>
      <TopBar backHref={`/organizar/${exchange.id}`} backLabel={t("common.back")} title={exchange.name} />
      <ScreenTitle className="mt-6 mb-5 lg:mt-8 lg:mb-8">{t("edit.title")}</ScreenTitle>
      <EditForm
        exchangeId={exchange.id}
        exchangeName={exchange.name}
        drawn={exchange.status === "drawn"}
        timeZone={exchange.timeZone}
        zoneName={timeZoneName(exchange.eventAt, exchange.timeZone)}
        initialWhen={formatEvent(exchange.eventAt, exchange.timeZone)}
        past={hasPassed(exchange.eventAt)}
        initial={{
          name: exchange.name,
          groupType: exchange.groupType,
          giftCategory: exchange.giftCategory,
          date,
          time,
          place: exchange.place ?? "",
          budget: String(exchange.budget.amount),
          message: exchange.message,
          ownerSeesMap: exchange.rules.ownerSeesMap,
          mailboxEnabled: exchange.rules.mailboxEnabled,
        }}
      />
    </>
  );
}

export default function EditarPage({ params }: PageProps<"/organizar/[exchangeId]/editar">) {
  return (
    <AppShell variant="tablero">
      <PageTransition>
        <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
          <Edit params={params} />
        </Suspense>
      </PageTransition>
    </AppShell>
  );
}
