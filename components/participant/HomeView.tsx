import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ActionCard } from "@/components/ui/ActionCard";
import { AddToCalendar } from "@/components/ui/AddToCalendar";
import { Alert } from "@/components/ui/Alert";
import { DotButton } from "@/components/ui/DotButton";
import { ArrowIcon } from "@/components/ui/icons";
import { Card, Columns, DateTile, Eyebrow, ScreenTitle } from "@/components/ui/primitives";
import { StepList, type StepItem } from "@/components/ui/Stepper";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import type { Exchange, Participant } from "@/lib/data/types";
import type { Unread } from "@/lib/data/gifts";
import type { Nudges } from "@/lib/data/nudges";
import { calendarParts, formatDateTime, formatEvent, formatMoney, formatShortDate, whatsappHref } from "@/lib/format";
import { t } from "@/lib/i18n";
import { IdeasRequestedCard, ListUpdatedCard } from "./Nudges";
import { FirstVisitSheet, LinkBox } from "./SaveLink";

/**
 * Días de calendario (en la zona del intercambio) que faltan para el evento. Lee la hora actual: llámalo en la
 * página después de leer datos en vivo (con Cache Components, `new Date()` no puede ir en el prerender).
 */
export function daysUntil(iso: string, timeZone: string): number {
  const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const [a, b] = [ymd(new Date()), ymd(new Date(iso))].map((s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

function countdown(n: number): string {
  if (n < 0) return t("home.countdownPast");
  if (n === 0) return t("home.countdownToday");
  return n === 1 ? t("home.countdownOne") : t("home.countdown", { n });
}

const FWD = ["nav-forward"];

// En xl la columna central es angosta (stepper | acción | lateral): el arte se esconde y el texto libra el listón.
const CARD = { artClassName: "xl:hidden", className: "xl:pr-24" };

/** Tres segmentos: el objetivo de 3 ideas. */
function IdeaSegments({ n }: { n: number }) {
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <span className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < n ? "bg-tinta" : "bg-tinta/20"}`} />
        ))}
      </span>
      <span className="sr-only">{t("home.ideasProgress", { n: Math.min(n, 3) })}</span>
    </div>
  );
}

export type HomeData = {
  exchange: Exchange;
  me: Participant;
  owner: string;
  unread: Unread;
  base: string;
  link: string;
  nuevo: boolean;
  /** daysUntil(exchange.eventAt, exchange.timeZone), calculado en la página. */
  daysLeft: number;
  /** Solo quien organiza, sin sesión: link a /entrar que vuelve a su panel. */
  ownerSignIn?: string;
  /** Avisos secretos (SPEC 03) y, si mi persona actualizó su lista y ya abrí el sobre, su nombre. */
  nudges: Nudges;
  receiverName: string | null;
  /** «Agregar a mi calendario»: ruta del .ics personal y link de Google. */
  calendar: { ics: string; google: string };
  inviteCode: string;
  token: string;
};

type Art = { src: string; w: number; h: number };
const ART = {
  lista: { src: "/illustrations/web/10-lista-vacia.webp", w: 783, h: 582 },
  espera: { src: "/illustrations/web/08-esperando.webp", w: 845, h: 385 },
  sobre: { src: "/illustrations/web/09-revelacion.webp", w: 692, h: 669 },
  comprar: { src: "/illustrations/web/03-lista.webp", w: 1143, h: 674 },
  buzon: { src: "/illustrations/web/11-buzon.webp", w: 668, h: 566 },
  fiesta: { src: "/illustrations/web/05-fiesta.webp", w: 1200, h: 802 },
} satisfies Record<string, Art>;

/**
 * Ya se sorteó y su lista sigue vacía. La lista es opcional: no bloquea el sobre, solo se sugiere
 * como acción secundaria (quien le regala todavía no tiene de dónde escoger).
 */
function emptyListAfterDraw({ exchange, me }: Pick<HomeData, "exchange" | "me">): boolean {
  return exchange.status === "drawn" && me.wishCount === 0 && !me.bought;
}

function artFor({ exchange, me }: HomeData): Art {
  if (exchange.status !== "drawn") return me.wishCount < 3 ? ART.lista : ART.espera;
  if (!me.revealed) return ART.sobre;
  if (!me.bought) return ART.comprar;
  return exchange.rules.mailboxEnabled ? ART.buzon : ART.fiesta;
}

/** La tarjeta protagonista cambia con el estado: lista → sobre → comprar → buzón. */
function NextAction({ exchange, me, owner, unread, base }: HomeData) {
  const drawn = exchange.status === "drawn";
  const mailbox = exchange.rules.mailboxEnabled;
  const art = ({ src, w, h }: Art) => <Image src={src} width={w} height={h} alt="" priority className="h-[84px] w-auto sm:h-[130px] lg:h-[150px]" />;

  if (!drawn) {
    // Antes del sorteo la tarjeta siempre dice que todavía no se sortea; la lista es opcional.
    const missing = Math.max(0, 3 - me.wishCount);
    return (
      <ActionCard
        {...CARD}
        {...(missing > 0 ? {} : { tone: "sol-50" as const })}
        eyebrow={t("home.notDrawnEyebrow")}
        title={missing === 0 ? t("home.waitTitle") : me.wishCount === 0 ? t("home.listMeanwhile") : missing === 1 ? t("home.moreIdeasOne") : t("home.moreIdeas", { n: missing })}
        text={t("home.notDrawnText", { owner })}
        art={art(missing > 0 ? ART.lista : ART.espera)}
        progress={<IdeaSegments n={me.wishCount} />}
        action={
          <DotButton href={`${base}/lista`} variant="blanco" transitionTypes={FWD}>
            {me.wishCount === 0 ? t("home.fillList") : t("home.editList")}
          </DotButton>
        }
      />
    );
  }

  if (!me.revealed) {
    return (
      <ActionCard
        {...CARD}
        tone="pasto"
        ribbon="sol"
        eyebrow={t("home.envelopeEyebrow")}
        title={t("home.drawnTitle")}
        text={emptyListAfterDraw({ exchange, me }) ? `${t("home.drawnText")} ${t("home.emptyListNudge")}` : t("home.drawnText")}
        art={art(ART.sobre)}
        action={
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <DotButton href={`${base}/sobre`} variant="blanco" transitionTypes={FWD}>
              {t("home.openEnvelope")}
            </DotButton>
            {emptyListAfterDraw({ exchange, me }) && (
              <Link href={`${base}/lista`} transitionTypes={FWD} className="inline-flex min-h-11 items-center self-start font-medium underline underline-offset-4 sm:self-center">
                {t("home.fillList")}
              </Link>
            )}
          </div>
        }
      />
    );
  }

  if (!me.bought) {
    return (
      <ActionCard
        {...CARD}
        tone="cielo"
        ribbon="sol"
        eyebrow={t("home.nextStep")}
        title={t("home.buyTitle")}
        text={emptyListAfterDraw({ exchange, me }) ? `${t("home.revealedText")} ${t("home.emptyListNudge")}` : t("home.revealedText")}
        art={art(ART.comprar)}
        action={
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <DotButton href={`${base}/persona`} variant="blanco" transitionTypes={FWD}>
              {t("home.seePerson")}
            </DotButton>
            {emptyListAfterDraw({ exchange, me }) && (
              <Link href={`${base}/lista`} transitionTypes={FWD} className="inline-flex min-h-11 items-center self-start font-medium underline underline-offset-4 sm:self-center">
                {t("home.fillList")}
              </Link>
            )}
          </div>
        }
      />
    );
  }

  return (
    <ActionCard
      {...CARD}
      tone={mailbox ? "lila" : "pasto-50"}
      ribbon="sol"
      eyebrow={t("home.doneEyebrow")}
      title={t("home.doneTitle")}
      text={mailbox ? t("home.doneText") : t("home.doneTextNoMailbox")}
      art={art(mailbox ? ART.buzon : ART.fiesta)}
      action={
        mailbox ? (
          <DotButton href={`${base}/buzon`} variant="blanco" transitionTypes={FWD}>
            <span>
              {t("home.mailbox")}
              <UnreadBadge n={unread.giver + unread.receiver} />
            </span>
          </DotButton>
        ) : (
          <DotButton href={`${base}/compre`} variant="blanco" transitionTypes={FWD}>
            {t("home.seeBought")}
          </DotButton>
        )
      }
    />
  );
}

function stepsFor({ exchange, me, owner }: HomeData): StepItem[] {
  const drawn = exchange.status === "drawn";
  const hasList = me.wishCount > 0;
  // La lista es opcional: nunca es el paso actual. Antes del sorteo lo actual es esperarlo; después, el sobre.
  return [
    { title: t("home.step1"), state: "done" },
    {
      title: hasList ? (me.wishCount === 1 ? t("home.step2DoneOne") : t("home.step2Done", { n: me.wishCount })) : t("home.step2Optional"),
      hint: hasList ? undefined : t("home.step2Hint"),
      state: hasList ? "done" : "todo",
    },
    {
      title: t("home.step3"),
      hint: drawn ? (me.revealed ? undefined : t("home.step3HintDrawn")) : t("home.step3Hint", { owner }),
      state: me.revealed ? "done" : "current",
    },
    {
      title: t("home.step4"),
      hint: t("home.step4Hint", { date: formatShortDate(exchange.eventAt, exchange.timeZone) }),
      state: me.bought ? "done" : me.revealed ? "current" : "todo",
    },
  ];
}

function Steps({ data, className = "" }: { data: HomeData; className?: string }) {
  return (
    <Card className={`px-4 py-1.5 sm:px-5 ${className}`}>
      <Eyebrow as="h2" className="pt-3 pb-1">
        {t("home.stepsTitle")}
      </Eyebrow>
      <StepList steps={stepsFor(data)} />
    </Card>
  );
}

function Shortcut({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        transitionTypes={FWD}
        className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-[15px] font-medium no-underline transition-colors hover:bg-crema"
      >
        {children}
        <ArrowIcon size={14} />
      </Link>
    </li>
  );
}

export function HomeView(data: HomeData) {
  const { exchange, me, owner, unread, base, link, nuevo, daysLeft, ownerSignIn, nudges, receiverName, calendar, inviteCode, token } = data;
  const tz = exchange.timeZone;
  const cal = calendarParts(exchange.eventAt, tz);
  const [day, time] = formatEvent(exchange.eventAt, tz).split(" · ");
  const drawn = exchange.status === "drawn";
  const header = artFor(data);

  return (
    <>
      {nuevo && <FirstVisitSheet link={link} exchangeName={exchange.name} />}

      {ownerSignIn && (
        <Alert
          tone="exito"
          title={t("home.ownerNoticeTitle")}
          className="mt-3 lg:mt-6"
          action={
            <Link href={ownerSignIn} className="inline-flex min-h-11 shrink-0 items-center self-center rounded-boton bg-tinta px-4 text-[15px] font-medium text-white no-underline transition-transform active:scale-95">
              {t("home.ownerNoticeCta")}
            </Link>
          }
        >
          {t("home.ownerNoticeText")}
        </Alert>
      )}

      <div className="mt-3 flex items-end justify-between gap-4 lg:mt-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Eyebrow>{countdown(daysLeft)}</Eyebrow>
          <ScreenTitle>{nuevo ? t("home.welcome") : t("home.hello", { name: me.name.split(" ")[0] })}</ScreenTitle>
        </div>
        {/* En xl el arte sale de la tarjeta de acción (columna angosta) y sube a la cabecera. */}
        <Image src={header.src} width={header.w} height={header.h} alt="" className="hidden h-[150px] w-auto shrink-0 xl:block" />
      </div>

      {(me.linkResetAt || me.assignmentChangedAt) && (
        <div className="mt-5 flex flex-col gap-2.5">
          {me.linkResetAt && (
            <Alert tone="aviso" title={t("home.noticeTitle")}>
              {t("home.linkReset", { owner, date: formatDateTime(me.linkResetAt, tz) })}
            </Alert>
          )}
          {me.assignmentChangedAt && (
            <Alert
              tone="aviso"
              action={
                <Link href={me.revealed ? `${base}/persona` : `${base}/sobre`} transitionTypes={FWD} className="shrink-0 self-center font-medium underline underline-offset-4">
                  {me.revealed ? t("home.seePerson") : t("home.seeEnvelope")}
                </Link>
              }
            >
              {t("home.assignmentChanged", { date: formatDateTime(me.assignmentChangedAt, tz) })}
              {me.bought && <> {t("home.assignmentChangedBought")}</>}
            </Alert>
          )}
        </div>
      )}

      {(nudges.ideasPending || nudges.listNudgePending) && (
        <div className="mt-5 grid gap-3 lg:mt-8 lg:grid-cols-2 lg:gap-4">
          {nudges.ideasPending && <IdeasRequestedCard inviteCode={inviteCode} token={token} href={`${base}/lista`} />}
          {nudges.listNudgePending && (
            <ListUpdatedCard
              inviteCode={inviteCode}
              token={token}
              href={me.revealed ? `${base}/persona` : `${base}/sobre`}
              name={receiverName}
              revealed={me.revealed}
            />
          )}
        </div>
      )}

      <Columns layout="home" className="mt-5 lg:mt-8">
        <Steps data={data} className="hidden self-start xl:block" />

        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          <NextAction {...data} />
          <Steps data={data} className="xl:hidden" />
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-3.5">
              <DateTile month={cal.month} day={cal.day} tone="cielo" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-medium">{`${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`}</span>
                <span className="text-[13px] text-gris">
                  {[exchange.place, t("home.budget", { budget: formatMoney(exchange.budget.amount) })].filter(Boolean).join(" · ")}
                </span>
              </span>
            </div>
            {daysLeft >= 0 && (
              <AddToCalendar icsHref={calendar.ics} googleHref={calendar.google} summary={`${exchange.name} · ${formatEvent(exchange.eventAt, tz)}`} role="participant" />
            )}
          </Card>

          {/* Sin abrir el sobre también sale si quien le regala ya le escribió: si no, el mensaje no se ve en ningún lado. */}
          {drawn && (me.revealed || nudges.ideasPending || (exchange.rules.mailboxEnabled && unread.giver + unread.receiver > 0)) && (
            <Card className="px-2 py-2 sm:px-2 sm:py-2">
              <Eyebrow as="h2" className="px-3 pt-2 pb-1">
                {t("home.shortcuts")}
              </Eyebrow>
              <ul className="flex flex-col">
                {me.revealed && (
                  <Shortcut href={`${base}/persona`}>
                    <span>
                      {t("home.seePerson")}
                      <UnreadBadge n={nudges.listNudgePending ? 1 : 0} label={t("nudge.unreadLabel")} />
                    </span>
                  </Shortcut>
                )}
                {exchange.rules.mailboxEnabled && (
                  <Shortcut href={`${base}/buzon`}>
                    <span>
                      {t("home.mailbox")}
                      <UnreadBadge n={unread.giver + unread.receiver} />
                    </span>
                  </Shortcut>
                )}
                <Shortcut href={`${base}/lista`}>
                  <span>
                    {t("home.editList")}
                    <UnreadBadge n={nudges.ideasPending ? 1 : 0} label={t("nudge.unreadLabel")} />
                  </span>
                </Shortcut>
              </ul>
            </Card>
          )}

          <Card variant="punteada" className="flex flex-col gap-2.5">
            <h2 className="text-base font-medium">{t("home.saveTitle")}</h2>
            <p className="text-[13px] leading-snug text-gris">{t("home.saveText")}</p>
            <LinkBox link={link} />
            <a
              href={whatsappHref(t("home.saveWhatsappText", { exchange: exchange.name, link }))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center text-sm font-medium underline underline-offset-4"
            >
              {t("home.saveWhatsapp")}
            </a>
          </Card>
        </div>
      </Columns>
    </>
  );
}
