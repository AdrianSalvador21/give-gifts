import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BoughtView } from "@/components/participant/BoughtView";
import { ParticipantLoading } from "@/components/participant/Loading";
import { Screen } from "@/components/ui/primitives";
import { PageTransition } from "@/components/ui/Transitions";
import { requireParticipant } from "@/lib/data/access";
import { getOwnerName, getParticipants } from "@/lib/data/exchanges";
import { t } from "@/lib/i18n";
import { backTarget, parseDesde } from "@/lib/nav";

export const metadata: Metadata = { title: "¡Regalo comprado!", robots: { index: false } };

async function Bought({ params, searchParams }: { params: Promise<{ inviteCode: string; token: string }>; searchParams: Promise<{ desde?: string | string[] }> }) {
  const [{ exchange, me, base }, { desde }] = await Promise.all([requireParticipant(params), searchParams]);
  const back = backTarget({ desde: parseDesde(desde), isOwner: me.kind === "owner", base, exchangeId: exchange.id });
  if (exchange.status !== "drawn" || !me.bought) redirect(back.href);
  const [participants, owner] = await Promise.all([getParticipants(exchange.id), getOwnerName(exchange)]);
  const bought = participants.filter((p) => p.bought).length;
  const missing = participants.filter((p) => !p.bought).map((p) => p.name.split(" ")[0]);
  const text = me.kind === "owner" ? t("bought.textOwner") : t("bought.text", { owner: owner.split(" ")[0] || "Quien organiza" });

  return <BoughtView exchange={exchange} back={back} text={text} bought={bought} total={participants.length} missing={missing} />;
}

export default function ComprePage({ params, searchParams }: PageProps<"/i/[inviteCode]/p/[token]/compre">) {
  return (
    <PageTransition>
      <Suspense
        fallback={
          <Screen tone="sol">
            <ParticipantLoading />
          </Screen>
        }
      >
        <Bought params={params} searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}
