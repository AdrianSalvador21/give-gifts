import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { RememberDevice } from "@/components/participant/RememberDevice";
import { BrandBar } from "@/components/ui/BrandBar";
import { CopyButton } from "@/components/ui/CopyButton";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { DotButton } from "@/components/ui/DotButton";
import { CheckIcon } from "@/components/ui/icons";
import { Screen, ScreenTitle } from "@/components/ui/primitives";
import { requireParticipant } from "@/lib/data/access";
import { getOwnerName } from "@/lib/data/exchanges";
import { getUnread } from "@/lib/data/gifts";
import { appUrl, formatShortDate, whatsappHref } from "@/lib/format";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Tu intercambio", robots: { index: false } };

function Step({ n, done, current, title, hint }: { n: number; done?: boolean; current?: boolean; title: string; hint?: string }) {
  return (
    <li className="flex items-center gap-3.5 border-b border-arena py-3.5 last:border-b-0">
      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium ${done ? "bg-pasto" : current ? "bg-tinta text-white" : "bg-arena"}`}>
        {done ? <CheckIcon size={14} /> : n}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className={`text-base ${done ? "text-gris" : "font-medium"}`}>{title}</span>
        {hint && <span className="text-[13px] leading-snug text-gris">{hint}</span>}
      </span>
    </li>
  );
}

async function Home({ params, searchParams }: { params: Promise<{ inviteCode: string; token: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const [{ exchange, me, inviteCode, token, base }, { nuevo }] = await Promise.all([requireParticipant(params), searchParams]);
  const drawnWithMailbox = exchange.status === "drawn" && exchange.rules.mailboxEnabled;
  const [owner, unread] = await Promise.all([
    getOwnerName(exchange),
    drawnWithMailbox ? getUnread(exchange.id, me.id, me.revealed) : { giver: 0, receiver: 0 },
  ]);
  const link = appUrl(base);
  const drawn = exchange.status === "drawn";
  const hasList = me.wishCount > 0;

  return (
    <>
      <RememberDevice entry={{ inviteCode, token, exchangeName: exchange.name }} />
      <BrandBar className="pt-2" />
      <Image src="/illustrations/web/08-esperando.webp" width={845} height={385} alt={t("home.alt")} priority className="mx-auto mt-4 mb-2.5 h-[150px] w-auto" />
      <ScreenTitle>{nuevo ? t("home.welcome") : t("home.hello", { name: me.name.split(" ")[0] })}</ScreenTitle>
      <p className="mt-2.5 text-[17px] leading-snug text-gris">{t("home.intro", { exchange: exchange.name })}</p>

      {drawn && (
        <Link href={me.revealed ? `${base}/persona` : `${base}/sobre`} className="mt-5 flex flex-col gap-1 rounded-panel bg-pasto p-5">
          <span className="text-[22px] leading-tight font-medium tracking-[-0.03em]">{me.revealed ? t("home.revealedTitle") : t("home.drawnTitle")}</span>
          <span className="text-sm">{me.revealed ? t("home.revealedText") : t("home.drawnText")}</span>
        </Link>
      )}

      <ol className="mt-5 flex flex-col rounded-[22px] bg-white px-4 py-1.5">
        <Step n={1} done title={t("home.step1")} />
        <Step
          n={2}
          done={hasList}
          current={!hasList && !drawn}
          title={hasList ? (me.wishCount === 1 ? t("home.step2DoneOne") : t("home.step2Done", { n: me.wishCount })) : t("home.step2")}
          hint={hasList ? undefined : t("home.step2Hint")}
        />
        <Step n={3} done={me.revealed} title={t("home.step3")} hint={drawn ? undefined : t("home.step3Hint", { owner })} />
        <Step n={4} done={me.bought} title={t("home.step4")} hint={t("home.step4Hint", { date: formatShortDate(exchange.eventAt) })} />
      </ol>

      <section className="mt-4 flex flex-col gap-2.5 rounded-[22px] border border-dashed border-gris p-4">
        <h2 className="text-base font-medium">{t("home.saveTitle")}</h2>
        <p className="text-[13px] leading-snug text-gris">{t("home.saveText")}</p>
        <div className="flex items-center gap-2 rounded-boton bg-white py-1.5 pr-1.5 pl-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{link.replace(/^https?:\/\//, "")}</span>
          <CopyButton text={link} />
        </div>
        <a
          href={whatsappHref(t("home.saveWhatsappText", { exchange: exchange.name, link }))}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm font-medium underline underline-offset-4"
        >
          {t("home.saveWhatsapp")}
        </a>
      </section>

      <div className="mt-auto flex flex-col gap-2.5 pt-6">
        {drawn && me.revealed ? (
          <>
            <DotButton href={`${base}/persona`} variant="pasto" full>
              {t("home.seePerson")}
            </DotButton>
            {exchange.rules.mailboxEnabled && (
              <DotButton href={`${base}/buzon`} variant="tinta" full>
                <span>
                  {t("home.mailbox")}
                  <UnreadBadge n={unread.giver + unread.receiver} />
                </span>
              </DotButton>
            )}
            <DotButton href={`${base}/lista`} variant="blanco" full>
              {t("home.editList")}
            </DotButton>
          </>
        ) : drawn ? (
          <DotButton href={`${base}/sobre`} variant="pasto" full>
            {t("home.openEnvelope")}
          </DotButton>
        ) : (
          <DotButton href={`${base}/lista`} variant="sol" full>
            {hasList ? t("home.editList") : t("home.fillList")}
          </DotButton>
        )}
      </div>
    </>
  );
}

export default function ParticipantHomePage({ params, searchParams }: PageProps<"/i/[inviteCode]/p/[token]">) {
  return (
    <Screen>
      <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
        <Home params={params} searchParams={searchParams as Promise<{ nuevo?: string }>} />
      </Suspense>
    </Screen>
  );
}
