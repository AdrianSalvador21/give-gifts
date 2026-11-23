import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getByToken, getExchangeByInvite, getOwnerName } from "@/lib/data/exchanges";
import { deviceCookie } from "@/lib/data/participants";
import { formatMoney, formatShortDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = { title: "Invitación", robots: { index: false } };

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-t-[32px] bg-crema px-5 pt-7 pb-6">
      <h1 className="text-[34px] leading-[1.02] font-medium tracking-[-0.05em]">{title}</h1>
      <p className="text-[17px] leading-snug text-gris">{text}</p>
      <Link href="/" className="mt-auto pt-6 text-center font-medium underline underline-offset-4">
        {t("join.backHome")}
      </Link>
    </div>
  );
}

async function Invitation({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  const exchange = await getExchangeByInvite(inviteCode);
  if (!exchange) return <Message title={t("join.notFoundTitle")} text={t("join.notFoundText")} />;

  // Mismo navegador que ya se apuntó: directo a su página personal.
  const known = (await cookies()).get(deviceCookie(inviteCode))?.value;
  if (known && (await getByToken(inviteCode, known))) redirect(`/i/${inviteCode}/p/${known}`);

  if (exchange.status !== "open") return <Message title={t("join.closedTitle")} text={t("join.closedText")} />;

  const owner = await getOwnerName(exchange);
  const count = exchange.participantCount;

  return (
    <div className="flex flex-1 flex-col gap-3.5 rounded-t-[32px] bg-crema px-5 pt-6 pb-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-gris">{t("join.invites", { owner })}</span>
        <h1 className="text-[34px] leading-[1.02] font-medium tracking-[-0.05em]">{exchange.name}</h1>
        {exchange.message && <p className="mt-0.5 text-[15px] leading-snug text-gris">«{exchange.message}»</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          [t("join.when"), formatShortDate(exchange.eventAt)],
          [t("join.gift"), formatMoney(exchange.budget.amount)],
          [t("join.already"), count === 1 ? t("join.onePerson") : t("join.people", { n: count })],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-boton bg-white px-3 py-2.5">
            <span className="text-xs text-gris">{label}</span>
            <span className="text-[15px] font-medium">{value}</span>
          </div>
        ))}
      </div>
      <JoinForm inviteCode={inviteCode} />
    </div>
  );
}

export default function InvitePage({ params }: PageProps<"/i/[inviteCode]">) {
  return (
    <div className="flex min-h-dvh justify-center bg-pasto">
      <div className="flex w-full max-w-[440px] flex-col">
        <div className="flex items-center justify-between px-5 pt-[18px]">
          <Link href="/" className="text-[22px] font-medium tracking-[-0.04em]">
            {t("brand.name")}
          </Link>
          <span className="rounded-full bg-white px-3 py-1.5 text-[13px] font-medium">Invitación</span>
        </div>
        <Image src="/illustrations/web/01-hero-v2.webp" width={1012} height={807} alt={t("join.alt")} priority className="mx-auto mt-2.5 -mb-1.5 h-[190px] w-auto" />
        <Suspense fallback={<div className="flex-1 rounded-t-[32px] bg-crema p-6 text-gris">{t("common.loading")}</div>}>
          <Invitation params={params} />
        </Suspense>
      </div>
    </div>
  );
}
