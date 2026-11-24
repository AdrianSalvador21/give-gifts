import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { daysUntil, HomeView } from "@/components/participant/HomeView";
import { ParticipantLoading } from "@/components/participant/Loading";
import { ParticipantTop } from "@/components/participant/ParticipantTop";
import { RememberDevice } from "@/components/participant/RememberDevice";
import { AppShell } from "@/components/ui/AppShell";
import { PageTransition } from "@/components/ui/Transitions";
import { getOrganizer } from "@/lib/auth/session";
import { requireParticipant } from "@/lib/data/access";
import { getOwnerName } from "@/lib/data/exchanges";
import { getUnread } from "@/lib/data/gifts";
import { appUrl } from "@/lib/format";

export const metadata: Metadata = { title: "Tu intercambio", robots: { index: false } };

async function Home({ params, searchParams }: { params: Promise<{ inviteCode: string; token: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const [{ exchange, me, inviteCode, token, base }, { nuevo }] = await Promise.all([requireParticipant(params), searchParams]);
  // Quien organiza tiene una sola casa del evento: con sesión, su inicio personal es el panel.
  // Sin sesión (otro dispositivo) se queda aquí, con un aviso para entrar.
  const isOwner = me.kind === "owner";
  const organizer = isOwner ? await getOrganizer() : null;
  if (isOwner && organizer?.uid === exchange.ownerUid) redirect(`/organizar/${exchange.id}`);

  const drawnWithMailbox = exchange.status === "drawn" && exchange.rules.mailboxEnabled;
  const [owner, unread] = await Promise.all([
    getOwnerName(exchange),
    drawnWithMailbox ? getUnread(exchange.id, me.id, me.revealed) : { giver: 0, receiver: 0 },
  ]);

  return (
    <>
      <RememberDevice entry={{ inviteCode, token, exchangeName: exchange.name }} />
      <ParticipantTop exchangeName={exchange.name} />
      <HomeView
        exchange={exchange} me={me} owner={owner} unread={unread} base={base} link={appUrl(base)} nuevo={Boolean(nuevo)}
        daysLeft={daysUntil(exchange.eventAt, exchange.timeZone)}
        ownerSignIn={isOwner ? `/entrar?next=${encodeURIComponent(`/organizar/${exchange.id}`)}` : undefined}
      />
    </>
  );
}

export default function ParticipantHomePage({ params, searchParams }: PageProps<"/i/[inviteCode]/p/[token]">) {
  return (
    <PageTransition>
      <AppShell variant="tablero" pattern="puntos">
        <Suspense fallback={<ParticipantLoading />}>
          <Home params={params} searchParams={searchParams as Promise<{ nuevo?: string }>} />
        </Suspense>
      </AppShell>
    </PageTransition>
  );
}
