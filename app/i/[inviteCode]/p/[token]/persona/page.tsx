import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ParticipantLoading } from "@/components/participant/Loading";
import { ParticipantTop } from "@/components/participant/ParticipantTop";
import { PersonView } from "@/components/participant/PersonView";
import { AppShell } from "@/components/ui/AppShell";
import { PageTransition } from "@/components/ui/Transitions";
import { requireParticipant } from "@/lib/data/access";
import { getWishes } from "@/lib/data/exchanges";
import { getMyAssignment, getUnread } from "@/lib/data/gifts";
import { backTarget, parseDesde, withDesde } from "@/lib/nav";

export const metadata: Metadata = { title: "Tu persona", robots: { index: false } };

async function Person({ params, searchParams }: { params: Promise<{ inviteCode: string; token: string }>; searchParams: Promise<{ desde?: string | string[] }> }) {
  const [{ exchange, me, inviteCode, token, base }, sp] = await Promise.all([requireParticipant(params), searchParams]);
  const desde = parseDesde(sp.desde);
  const back = backTarget({ desde, isOwner: me.kind === "owner", base, exchangeId: exchange.id });
  if (exchange.status !== "drawn") redirect(back.href);
  // Sin abrir el sobre no se muestra el nombre: primero el ritual del sobre.
  if (!me.revealed) redirect(withDesde(`${base}/sobre`, desde));
  const mine = await getMyAssignment(exchange.id, me.id);
  if (!mine) redirect(base);
  const { assignment, receiver } = mine;
  const [wishes, unread] = await Promise.all([
    getWishes(exchange.id, receiver.id, true),
    exchange.rules.mailboxEnabled ? getUnread(exchange.id, me.id, true) : { giver: 0, receiver: 0 },
  ]);

  return (
    <>
      <ParticipantTop exchangeName={exchange.name} backHref={back.href} backLabel={back.label} />
      <PersonView
        exchange={exchange}
        me={me}
        receiverName={receiver.name}
        plannedWishId={assignment.plannedWishId}
        wishes={wishes}
        unread={unread.giver + unread.receiver}
        inviteCode={inviteCode}
        token={token}
        base={base}
        desde={desde}
      />
    </>
  );
}

export default function PersonaPage({ params, searchParams }: PageProps<"/i/[inviteCode]/p/[token]/persona">) {
  return (
    <PageTransition>
      <AppShell variant="tablero">
        <Suspense fallback={<ParticipantLoading />}>
          <Person params={params} searchParams={searchParams} />
        </Suspense>
      </AppShell>
    </PageTransition>
  );
}
