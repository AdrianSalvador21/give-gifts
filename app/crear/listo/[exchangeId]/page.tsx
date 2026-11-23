import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { DotButton } from "@/components/ui/DotButton";
import { Pill } from "@/components/ui/primitives";
import { requireOrganizer } from "@/lib/auth/session";
import { getExchange, getParticipants } from "@/lib/data/exchanges";
import { appUrl, formatEvent, formatMoney, whatsappHref } from "@/lib/format";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "¡Listo!", robots: { index: false } };

async function Ready({ params }: { params: Promise<{ exchangeId: string }> }) {
  const { exchangeId } = await params;
  const organizer = await requireOrganizer(`/crear/listo/${exchangeId}`);
  const exchange = await getExchange(exchangeId);
  if (!exchange || exchange.ownerUid !== organizer.uid) notFound();

  const participants = await getParticipants(exchange.id);
  const ownerName = participants.find((p) => p.kind === "owner")?.name ?? organizer.name;
  const link = appUrl(`/i/${exchange.inviteCode}`);
  const budget = formatMoney(exchange.budget.amount);
  const message = t("ready.whatsappText", { owner: ownerName, name: exchange.name, date: formatEvent(exchange.eventAt), budget, link });

  return (
    <div className="mx-auto mt-5 flex w-full max-w-[440px] flex-1 flex-col gap-3.5 rounded-t-panel bg-crema p-[22px]">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-gris">{t("ready.invites", { owner: ownerName })}</span>
        <span className="text-[26px] leading-[1.1] font-medium tracking-[-0.03em]">{exchange.name}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill className="bg-white text-sm">{formatEvent(exchange.eventAt)}</Pill>
        <Pill className="bg-white text-sm">Hasta {budget} MXN</Pill>
      </div>
      <div className="flex items-center gap-2 rounded-boton bg-white py-2 pr-2 pl-3.5">
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{link.replace(/^https?:\/\//, "")}</span>
        <CopyButton text={link} />
      </div>
      <DotButton href={whatsappHref(message)} target="_blank" rel="noopener noreferrer" variant="tinta" full>
        {t("common.whatsapp")}
      </DotButton>
      <p className="text-center text-sm leading-snug text-gris">{t("ready.min")}</p>
      <Link href={`/organizar/${exchange.id}`} className="mt-auto p-3 text-center text-base font-medium underline underline-offset-4">
        {t("ready.goPanel")}
      </Link>
    </div>
  );
}

export default function ListoPage({ params }: PageProps<"/crear/listo/[exchangeId]">) {
  return (
    <div className="flex min-h-dvh flex-col bg-pasto px-5 pb-0">
      <Image src="/illustrations/web/07-invitar.webp" width={845} height={612} alt={t("ready.alt")} priority className="mx-auto mt-7 h-[190px] w-auto" />
      <h1 className="mt-2 text-center text-[40px] leading-none font-medium tracking-[-0.05em]">
        {t("ready.title1")}
        <br />
        {t("ready.title2")}
      </h1>
      <Suspense fallback={<p className="mt-8 text-center">{t("common.loading")}</p>}>
        <Ready params={params} />
      </Suspense>
    </div>
  );
}
