import type { Metadata } from "next";
import { Suspense } from "react";
import { Screen, ScreenTitle, TopBar } from "@/components/ui/primitives";
import { requireOwnedExchange } from "@/lib/data/owner";
import { eventInputs } from "@/lib/format";
import { t } from "@/lib/i18n";
import { EditForm } from "./EditForm";

export const metadata: Metadata = { title: "Editar intercambio", robots: { index: false } };

async function Edit({ params }: { params: Promise<{ exchangeId: string }> }) {
  const { exchangeId } = await params;
  const { exchange } = await requireOwnedExchange(exchangeId, `/organizar/${exchangeId}/editar`);
  const { date, time } = eventInputs(exchange.eventAt);
  return (
    <>
      <TopBar backHref={`/organizar/${exchange.id}`} backLabel={t("panel.back")} title={exchange.name} />
      <ScreenTitle className="mt-6 mb-5">{t("edit.title")}</ScreenTitle>
      <EditForm
        exchangeId={exchange.id}
        drawn={exchange.status === "drawn"}
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
    <Screen>
      <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
        <Edit params={params} />
      </Suspense>
    </Screen>
  );
}
