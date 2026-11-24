import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SplitShell } from "@/components/ui/AppShell";
import { BrandBar, MineLink } from "@/components/ui/BrandBar";
import { Confetti } from "@/components/ui/Confetti";
import { CopyButton } from "@/components/ui/CopyButton";
import { DotButton } from "@/components/ui/DotButton";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";
import { Card, Eyebrow, HandNote, Pill } from "@/components/ui/primitives";
import { PageTransition } from "@/components/ui/Transitions";
import { requireOrganizer } from "@/lib/auth/session";
import { getExchange, getOwnerName, getOwnerParticipant } from "@/lib/data/exchanges";
import { appUrl, formatEvent, formatMoney, formatShortDate, whatsappHref } from "@/lib/format";
import { t } from "@/lib/i18n";
import { withDesde } from "@/lib/nav";
import { LIST_GOAL } from "@/lib/ownerSteps";

export const metadata: Metadata = { title: "¡Listo!", robots: { index: false } };

async function Ready({ params }: { params: Promise<{ exchangeId: string }> }) {
  const { exchangeId } = await params;
  const organizer = await requireOrganizer(`/crear/listo/${exchangeId}`);
  const exchange = await getExchange(exchangeId);
  if (!exchange || exchange.ownerUid !== organizer.uid) notFound();

  const [ownerName, me] = await Promise.all([getOwnerName(exchange).then((n) => n || organizer.name), getOwnerParticipant(exchange)]);
  const link = appUrl(`/i/${exchange.inviteCode}`);
  const budget = formatMoney(exchange.budget.amount);
  const message = t("ready.whatsappText", { owner: ownerName, name: exchange.name, date: formatShortDate(exchange.eventAt, exchange.timeZone), budget, link });

  return (
    <div className="flex flex-col gap-4 overflow-x-clip">
      <Card variant="protagonista" className="relative flex flex-col gap-4 bg-white lg:p-8">
        <Confetti delay={250} spread={1.2} />
        {me && <StepHeading n={1}>{t("ready.inviteTitle")}</StepHeading>}
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-gris">{t("ready.invites", { owner: ownerName })}</span>
          <span className="text-[28px] leading-[1.05] font-medium tracking-[-0.04em] break-words lg:text-[34px]">{exchange.name}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone="crema">{formatEvent(exchange.eventAt, exchange.timeZone)}</Pill>
          <Pill tone="pasto-50">{t("ready.budget", { budget })}</Pill>
        </div>

        <div className="flex flex-col gap-1.5">
          <Eyebrow as="h2">{t("ready.linkLabel")}</Eyebrow>
          <div className="flex flex-wrap items-center gap-2 rounded-boton bg-crema py-1.5 pr-1.5 pl-3.5">
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{link.replace(/^https?:\/\//, "")}</span>
            <CopyButton text={link} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Eyebrow as="h2">{t("ready.messagePreview")}</Eyebrow>
          <p className="relative max-w-[92%] rounded-[18px] rounded-bl-[6px] bg-pasto-50 px-4 py-3 text-[15px] leading-snug break-words">{message}</p>
        </div>

        <DotButton href={whatsappHref(message)} target="_blank" rel="noopener noreferrer" variant="tinta" ink full="mobile" icon="send" className="lg:self-start">
          {t("common.whatsapp")}
        </DotButton>
      </Card>
      <p className="text-center text-sm leading-snug text-gris lg:text-left">{t("ready.min")}</p>
      {me?.path && <FillList href={withDesde(`${me.path}/lista`, "panel")} n={me.wishCount} />}
      <Link
        href={`/organizar/${exchange.id}`}
        transitionTypes={["nav-forward"]}
        className="inline-flex min-h-11 items-center justify-center self-center rounded-boton px-3 text-base font-medium underline underline-offset-4 lg:self-start lg:px-0"
      >
        {t("ready.goPanel")}
      </Link>
    </div>
  );
}

function StepHeading({ n, children }: { n: number; children: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-medium tracking-[-0.02em]">
      <span aria-hidden className="cifra grid size-8 shrink-0 place-items-center rounded-full bg-tinta text-sm text-white">
        {n}
      </span>
      {children}
    </h2>
  );
}

/** Segundo paso, tranquilo (el protagonista es invitar): «Mientras se unen, llena tu lista», con 3 huecos. */
function FillList({ href, n }: { href: string; n: number }) {
  const text = n === 0 ? t("ready.fillListText") : n < LIST_GOAL ? t("ready.fillListMore", { n }) : t("ready.fillListDone", { n });
  return (
    <Card className="flex flex-col gap-3.5 lg:p-6">
      <StepHeading n={2}>{t("ready.fillListTitle")}</StepHeading>
      <p className="text-[15px] leading-snug text-gris">{text}</p>
      <div aria-hidden className="grid grid-cols-3 gap-2">
        {Array.from({ length: LIST_GOAL }, (_, i) =>
          i < n ? (
            <span key={i} className="grid h-14 place-items-center rounded-[14px] bg-pasto-50">
              <CheckIcon size={18} />
            </span>
          ) : (
            <span key={i} className={`grid h-14 place-items-center rounded-[14px] border-2 border-dashed border-punteado bg-white/50 text-gris ${i > n ? "opacity-60" : ""}`}>
              <PlusIcon size={18} />
            </span>
          ),
        )}
      </div>
      <span className="sr-only">{t("home.ideasProgress", { n: Math.min(n, LIST_GOAL) })}</span>
      <DotButton href={href} variant="sol" size="sm" full="mobile" transitionTypes={["nav-forward"]} className="lg:self-start">
        {n === 0 ? t("ready.fillListCta") : t("ready.fillListEdit")}
      </DotButton>
      {n < LIST_GOAL && <HandNote className="self-center text-[18px] lg:self-start">{t("ready.fillListNote")}</HandNote>}
    </Card>
  );
}

export default function ListoPage({ params }: PageProps<"/crear/listo/[exchangeId]">) {
  return (
    <PageTransition>
      <SplitShell
        tone="pasto"
        pattern="papel"
        ratio="arte"
        width="ancho"
        header={<BrandBar action={<MineLink />} />}
        art={
          <div className="flex flex-col items-center text-center lg:flex-1 lg:items-start lg:justify-center lg:text-left">
            <Image src="/illustrations/web/07-invitar.webp" width={845} height={612} alt={t("ready.alt")} priority className="mt-2 h-[170px] w-auto lg:h-auto lg:w-[80%] lg:max-w-[520px]" />
            <h1 className="mt-3 text-[40px] leading-none font-medium tracking-[-0.05em] lg:mt-8 lg:text-[64px]">
              {t("ready.title1")}
              <br />
              {t("ready.title2")}
            </h1>
          </div>
        }
      >
        <Suspense fallback={<p className="mt-8 text-center text-gris">{t("common.loading")}</p>}>
          <Ready params={params} />
        </Suspense>
      </SplitShell>
    </PageTransition>
  );
}
