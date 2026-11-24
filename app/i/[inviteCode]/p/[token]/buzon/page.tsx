import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ParticipantLoading } from "@/components/participant/Loading";
import { ParticipantTop } from "@/components/participant/ParticipantTop";
import { Alert } from "@/components/ui/Alert";
import { AppShell } from "@/components/ui/AppShell";
import { PageTransition } from "@/components/ui/Transitions";
import { requireParticipant } from "@/lib/data/access";
import { getMyAssignment, getThreadRef, getUnread, markRead, readMessages, type MailboxMessage, type MailboxRole } from "@/lib/data/gifts";
import { t } from "@/lib/i18n";
import { backTarget, parseDesde, withDesde } from "@/lib/nav";
import { Mailbox } from "./Mailbox";

export const metadata: Metadata = { title: "Buzón anónimo", robots: { index: false } };

async function MailboxPage({ params, searchParams }: { params: Promise<{ inviteCode: string; token: string }>; searchParams: Promise<{ desde?: string | string[] }> }) {
  const [{ exchange, me, inviteCode, token, base }, sp] = await Promise.all([requireParticipant(params), searchParams]);
  const desde = parseDesde(sp.desde);
  const back = backTarget({ desde, isOwner: me.kind === "owner", base, exchangeId: exchange.id });
  if (exchange.status !== "drawn") redirect(back.href);
  if (!exchange.rules.mailboxEnabled) {
    return (
      <>
        <ParticipantTop exchangeName={exchange.name} backHref={back.href} backLabel={back.label} />
        <Alert tone="info" className="mt-8 max-w-[520px] text-[15px]">
          {t("mailbox.closed")}
        </Alert>
      </>
    );
  }

  const [giverThread, receiverThread, mine] = await Promise.all([
    getThreadRef(exchange.id, me.id, "giver"),
    getThreadRef(exchange.id, me.id, "receiver"),
    me.revealed ? getMyAssignment(exchange.id, me.id) : null,
  ]);
  // Abre en la pestaña con mensajes nuevos (o «Tu persona» si ya abrió su sobre) y la marca como leída.
  const unread = await getUnread(exchange.id, me.id, Boolean(mine));
  const initialRole: MailboxRole = mine && !(unread.receiver > 0 && unread.giver === 0) ? "giver" : "receiver";
  const opened = initialRole === "giver" ? giverThread : receiverThread;
  if (opened) await markRead(opened, initialRole);
  unread[initialRole] = 0;

  const [asGiver, asReceiver]: MailboxMessage[][] = await Promise.all([
    giverThread && mine ? readMessages(giverThread, "giver") : [],
    receiverThread ? readMessages(receiverThread, "receiver") : [],
  ]);

  return (
    <>
      <ParticipantTop
        exchangeName={exchange.name}
        backHref={me.revealed ? withDesde(`${base}/persona`, desde) : back.href}
        backLabel={me.revealed ? t("person.title") : back.label}
      />
      <Mailbox
        inviteCode={inviteCode}
        token={token}
        receiverName={mine?.receiver.name ?? null}
        initial={{ giver: asGiver, receiver: asReceiver }}
        initialRole={initialRole}
        initialUnread={unread}
        timeZone={exchange.timeZone}
      />
    </>
  );
}

export default function BuzonPage({ params, searchParams }: PageProps<"/i/[inviteCode]/p/[token]/buzon">) {
  return (
    <PageTransition>
      <AppShell variant="tablero">
        <Suspense fallback={<ParticipantLoading />}>
          <MailboxPage params={params} searchParams={searchParams} />
        </Suspense>
      </AppShell>
    </PageTransition>
  );
}
