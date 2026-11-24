import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BrandBar } from "@/components/ui/BrandBar";
import { DotButton } from "@/components/ui/DotButton";
import { AvatarStack, Figure, HandNote, Pill, ScreenTitle, SplitShell } from "@/components/ui/primitives";
import { getByToken, getExchangeByInvite, getInviteView, getOwnerName, getParticipantPreview } from "@/lib/data/exchanges";
import { deviceCookie } from "@/lib/data/participants";
import { formatEvent, formatMoney, formatShortDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { JoinForm } from "./JoinForm";

export async function generateMetadata({ params }: PageProps<"/i/[inviteCode]">): Promise<Metadata> {
  const robots = { index: false, follow: false };
  const { inviteCode } = await params;
  const exchange = await getExchangeByInvite(inviteCode);
  if (!exchange) return { title: "Invitación", robots };

  // Sólo lo que ya muestra la invitación: nunca lugar, mensaje ni participantes.
  const owner = await getOwnerName(exchange);
  const title = owner ? `${owner} te invita a ${exchange.name}` : `Te invitan a ${exchange.name}`;
  const description = `${formatEvent(exchange.eventAt)} · Regalo de hasta ${formatMoney(exchange.budget.amount)}. Apúntate con tu nombre en givegifts.`;
  return {
    title,
    description,
    robots,
    openGraph: { type: "website", locale: "es_MX", siteName: "givegifts", title, description, url: `/i/${inviteCode}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

const ART_IMAGE = (
  <Image
    src="/illustrations/web/01-hero-v2.webp"
    width={1012}
    height={807}
    alt={t("join.alt")}
    preload
    sizes="(min-width: 1024px) 560px, 240px"
    className="mx-auto mt-1 h-[170px] w-auto lg:mt-10 lg:h-auto lg:w-[85%] lg:max-w-[620px]"
  />
);

/** Split de la invitación: arte (Regalitos + nota del organizador) | acción. */
function InviteShell({ note, children }: { note?: ReactNode; children: ReactNode }) {
  return (
    <SplitShell
      tone="pasto"
      pattern="papel"
      ratio="arte"
      width="normal"
      header={<BrandBar />}
      art={
        <>
          {ART_IMAGE}
          {note}
        </>
      }
    >
      {children}
    </SplitShell>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Pill tone="blanco" className="self-start">
        {t("join.badge")}
      </Pill>
      <ScreenTitle size="sm">{title}</ScreenTitle>
      <p className="text-[17px] leading-snug text-gris">{text}</p>
      <DotButton href="/" variant="blanco" full="mobile" className="mt-6 lg:self-start">
        {t("join.backHome")}
      </DotButton>
    </div>
  );
}

const BLOCKED = {
  drawn: { title: "join.closedTitle", text: "join.closedTextOwner" },
  paused: { title: "join.pausedTitle", text: "join.pausedText" },
  full: { title: "join.fullTitle", text: "join.fullText" },
} as const;

/** «Ana, Luis, Jorge y 4 más» con sólo nombres de pila. */
function proofText(names: string[], total: number): string {
  const first = names.slice(0, 3).map((n) => n.trim().split(/\s+/)[0]);
  const rest = Math.max(total, names.length) - first.length;
  return rest > 0 ? t("join.proofSome", { names: first.join(", "), n: rest }) : t("join.proofAll", { names: first.join(", ") });
}

async function Invitation({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  const view = await getInviteView(inviteCode);
  if (!view)
    return (
      <InviteShell>
        <Message title={t("join.notFoundTitle")} text={t("join.notFoundText")} />
      </InviteShell>
    );

  // Mismo navegador que ya se apuntó: directo a su página personal.
  const known = (await cookies()).get(deviceCookie(inviteCode))?.value;
  if (known && (await getByToken(inviteCode, known))) redirect(`/i/${inviteCode}/p/${known}`);

  const { exchange, ownerName: owner, block } = view;
  if (block) {
    const b = BLOCKED[block];
    return (
      <InviteShell>
        <Message title={t(b.title)} text={t(b.text, { owner })} />
      </InviteShell>
    );
  }

  const people = await getParticipantPreview(exchange.id);
  const count = exchange.participantCount;
  const tz = exchange.timeZone;

  const note = exchange.message ? (
    <div className="mt-auto mb-2 hidden max-w-[460px] lg:block">
      <HandNote variant="pegada" className="text-[21px]">
        «{exchange.message}» · {owner}
      </HandNote>
    </div>
  ) : null;

  return (
    <InviteShell note={note}>
      <div className="flex flex-col gap-5">
        <Pill tone="blanco" className="hidden self-start lg:inline-flex">
          {t("join.badge")}
        </Pill>
        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] text-gris">{t("join.invites", { owner })}</span>
          <ScreenTitle>{exchange.name}</ScreenTitle>
          {exchange.message && <p className="mt-1 text-[15px] leading-snug text-gris lg:hidden">«{exchange.message}»</p>}
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {[
            [t("join.when"), formatShortDate(exchange.eventAt, tz)],
            [t("join.gift"), formatMoney(exchange.budget.amount)],
            [t("join.already"), count === 1 ? t("join.onePerson") : t("join.people", { n: count })],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5 rounded-boton bg-white px-3 py-2.5 lg:px-4 lg:py-3">
              <dt className="text-xs text-gris">{label}</dt>
              <dd>
                <Figure className="text-[15px] lg:text-[17px]">{value}</Figure>
              </dd>
            </div>
          ))}
        </dl>
        {people.length > 0 && (
          <div className="flex items-center gap-3">
            <AvatarStack people={people} max={4} total={count} size={34} />
            <span className="text-[13px] leading-snug text-gris">{proofText(people.map((p) => p.name), count)}</span>
          </div>
        )}
        <JoinForm inviteCode={inviteCode} exchangeName={exchange.name} owner={owner} />
      </div>
    </InviteShell>
  );
}

export default function InvitePage({ params }: PageProps<"/i/[inviteCode]">) {
  return (
    <Suspense
      fallback={
        <InviteShell>
          <p className="text-gris">{t("common.loading")}</p>
        </InviteShell>
      }
    >
      <Invitation params={params} />
    </Suspense>
  );
}
