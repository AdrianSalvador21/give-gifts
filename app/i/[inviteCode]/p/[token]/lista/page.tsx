import type { Metadata } from "next";
import { Suspense } from "react";
import { ListView } from "@/components/participant/ListView";
import { ParticipantLoading } from "@/components/participant/Loading";
import { ParticipantTop } from "@/components/participant/ParticipantTop";
import { AppShell } from "@/components/ui/AppShell";
import { PageTransition } from "@/components/ui/Transitions";
import { requireParticipant } from "@/lib/data/access";
import { getWishes, MAX_WISHES } from "@/lib/data/exchanges";
import { getNudges } from "@/lib/data/nudges";
import { backTarget, parseDesde } from "@/lib/nav";

export const metadata: Metadata = { title: "Mi lista", robots: { index: false } };

async function MyList({ params, searchParams }: { params: Promise<{ inviteCode: string; token: string }>; searchParams: Promise<{ desde?: string | string[] }> }) {
  const [{ exchange, me, inviteCode, token, base }, { desde }] = await Promise.all([requireParticipant(params), searchParams]);
  const [wishes, nudges] = await Promise.all([getWishes(exchange.id, me.id), getNudges(exchange, me)]);
  const back = backTarget({ desde: parseDesde(desde), isOwner: me.kind === "owner", base, exchangeId: exchange.id });

  return (
    <>
      <ParticipantTop exchangeName={exchange.name} backHref={back.href} backLabel={back.label} />
      <ListView
        wishes={wishes}
        max={MAX_WISHES}
        inviteCode={inviteCode}
        token={token}
        nudge={nudges.hasGiver ? { ideasPending: nudges.ideasPending, canNudge: nudges.canNudge, timeZone: exchange.timeZone } : null}
      />
    </>
  );
}

export default function ListaPage({ params, searchParams }: PageProps<"/i/[inviteCode]/p/[token]/lista">) {
  return (
    <PageTransition>
      <AppShell variant="tablero" pattern="puntos">
        <Suspense fallback={<ParticipantLoading />}>
          <MyList params={params} searchParams={searchParams} />
        </Suspense>
      </AppShell>
    </PageTransition>
  );
}
