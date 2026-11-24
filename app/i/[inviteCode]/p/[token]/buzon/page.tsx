import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandBar } from "@/components/ui/BrandBar";
import { Screen, TopBar } from "@/components/ui/primitives";
import { requireParticipant } from "@/lib/data/access";
import { getMyAssignment, getThreadRef, getUnread, markRead, readMessages, type MailboxMessage, type MailboxRole } from "@/lib/data/gifts";
import { t } from "@/lib/i18n";
import { Mailbox } from "./Mailbox";

export const metadata: Metadata = { title: "Buzón anónimo", robots: { index: false } };

async function MailboxPage({ params }: { params: Promise<{ inviteCode: string; token: string }> }) {
  const { exchange, me, inviteCode, token, base } = await requireParticipant(params);
  if (exchange.status !== "drawn") redirect(base);
  if (!exchange.rules.mailboxEnabled) {
    return (
      <>
        <BrandBar className="pt-2" />
        <TopBar backHref={base} title={t("mailbox.title")} />
        <p className="mt-10 rounded-boton bg-white px-4 py-3.5 text-[15px]">{t("mailbox.closed")}</p>
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
      <BrandBar className="pt-2" />
      <TopBar backHref={me.revealed ? `${base}/persona` : base} title={t("mailbox.title")} />
      <Mailbox
        inviteCode={inviteCode}
        token={token}
        receiverName={mine?.receiver.name ?? null}
        initial={{ giver: asGiver, receiver: asReceiver }}
        initialRole={initialRole}
        initialUnread={unread}
      />
    </>
  );
}

export default function BuzonPage({ params }: PageProps<"/i/[inviteCode]/p/[token]/buzon">) {
  return (
    <Screen>
      <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
        <MailboxPage params={params} />
      </Suspense>
    </Screen>
  );
}
