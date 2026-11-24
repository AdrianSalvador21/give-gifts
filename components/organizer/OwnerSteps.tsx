import Link from "next/link";
import type { ReactNode } from "react";
import { AnnounceLink } from "@/components/organizer/AnnounceLink";
import { DotButton } from "@/components/ui/DotButton";
import { LockIcon } from "@/components/ui/icons";
import { Eyebrow, TONE_BG, type Tone } from "@/components/ui/primitives";
import { StepDot, StepList, type StepItem } from "@/components/ui/Stepper";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import type { Exchange, PanelParticipant } from "@/lib/data/types";
import { formatShortDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { withDesde } from "@/lib/nav";
import { LIST_GOAL, ownerSteps, type OwnerStep, type OwnerStepKey } from "@/lib/ownerSteps";

const FWD = ["nav-forward"];

/** `announce`: el CTA es «Avisar al grupo» (abre WhatsApp y guarda el aviso con markAnnounced). */
type Now = { title: string; text: string; cta: string; href: string; announce?: boolean; tone: Tone; ribbon: string };
type Detail = { title: string; sub: string; aside?: ReactNode; now?: Now };

const asideLink = "inline-flex min-h-11 items-center text-sm font-medium text-tinta underline-offset-4 hover:underline";

type Props = {
  exchange: Exchange;
  /** Participante de quien organiza (null si no participa). */
  owner: PanelParticipant | null;
  total: number;
  /** Mensajes sin leer del buzón del owner. */
  unread: number;
  announceHref: string;
};

function ideas(n: number) {
  return t("panel.ideasGoal", { n: Math.min(n, LIST_GOAL) });
}

function detail(key: OwnerStepKey, step: OwnerStep, { exchange, owner, total, announceHref }: Props): Detail {
  const id = exchange.id;
  const path = owner?.path ?? "";
  const locked = step.state === "locked";
  switch (key) {
    case "create":
      return { title: t("panel.steps.create.title"), sub: t("panel.steps.done"), aside: t("panel.steps.done") };
    case "list": {
      const n = owner?.wishCount ?? 0;
      const href = withDesde(`${path}/lista`, "panel");
      return {
        title: t("panel.steps.list.title"),
        sub: n >= LIST_GOAL ? t("panel.ideasCount", { n }) : ideas(n),
        aside: (
          <Link href={href} transitionTypes={FWD} className={asideLink}>
            {n >= LIST_GOAL ? t("panel.ideasCount", { n }) : ideas(n)}
          </Link>
        ),
        now: {
          title: t("panel.steps.list.nowTitle"),
          text: t("panel.steps.list.nowText", { n: Math.min(n, LIST_GOAL) }),
          cta: n === 0 ? t("panel.steps.list.cta") : t("panel.steps.list.ctaMore"),
          href,
          tone: "sol-50",
          ribbon: "var(--color-sol)",
        },
      };
    }
    case "invite": {
      const href = `/crear/listo/${id}`;
      return {
        title: t("panel.steps.invite.title"),
        sub: total === 1 ? t("panel.steps.invite.subOne") : t("panel.steps.invite.sub", { n: total }),
        aside: exchange.status === "drawn" ? t("panel.steps.invite.sub", { n: total }) : (
          <Link href={href} transitionTypes={FWD} className={asideLink}>
            {total === 1 ? t("panel.steps.invite.actionOne") : t("panel.steps.invite.action", { n: total })}
          </Link>
        ),
        now: {
          title: t("panel.steps.invite.title"),
          text: total <= 1 ? t("panel.steps.invite.nowTextOne") : t("panel.steps.invite.nowText", { n: total }),
          cta: t("panel.steps.invite.cta"),
          href,
          tone: "cielo-50",
          ribbon: "var(--color-cielo)",
        },
      };
    }
    case "draw": {
      const href = `/organizar/${id}/sorteo`;
      const drawn = exchange.status === "drawn";
      return {
        title: t("panel.steps.draw.title"),
        sub: drawn ? t("panel.steps.draw.sub", { date: formatShortDate(exchange.drawnAt ?? exchange.eventAt, exchange.timeZone) }) : locked ? t("panel.steps.fromThree") : t("panel.steps.draw.ready"),
        aside: drawn ? t("panel.steps.done") : locked ? <Locked>{t("panel.steps.fromThree")}</Locked> : (
          <Link href={href} transitionTypes={FWD} className={asideLink}>
            {t("panel.steps.draw.cta")}
          </Link>
        ),
        now: { title: t("panel.steps.draw.title"), text: t("panel.steps.draw.nowText", { n: total }), cta: t("panel.steps.draw.cta"), href, tone: "pasto-50", ribbon: "var(--color-pasto)" },
      };
    }
    case "gift": {
      const revealed = Boolean(owner?.revealed);
      return {
        title: t("panel.steps.gift.title"),
        sub: owner?.bought ? t("panel.steps.gift.subDone") : locked ? t("panel.steps.afterDraw") : t("panel.steps.gift.sub"),
        aside: owner?.bought ? t("panel.steps.gift.subDone") : locked ? <Locked>{t("panel.steps.afterDraw")}</Locked> : undefined,
        now: revealed
          ? {
              title: t("panel.steps.gift.buyTitle"),
              text: t("panel.steps.gift.buyText"),
              cta: t("panel.steps.gift.buyCta"),
              href: withDesde(`${path}/persona`, "panel"),
              tone: "cielo-50",
              ribbon: "var(--color-cielo)",
            }
          : {
              title: t("panel.steps.gift.envelopeTitle"),
              text: t("panel.steps.gift.envelopeText"),
              cta: t("panel.steps.gift.envelopeCta"),
              href: withDesde(`${path}/sobre`, "panel"),
              tone: "pasto-50",
              ribbon: "var(--color-pasto)",
            },
      };
    }
    case "announce": {
      const done = step.state === "done";
      return {
        title: t("panel.steps.announce.title"),
        sub: done ? t("panel.steps.announce.subDone") : locked ? t("panel.steps.afterDraw") : t("panel.steps.announce.sub"),
        aside: done ? t("panel.steps.announce.subDone") : locked ? <Locked>{t("panel.steps.afterDraw")}</Locked> : undefined,
        now: {
          title: t("panel.steps.announce.nowTitle"),
          text: t("panel.steps.announce.nowText"),
          cta: t("panel.steps.announce.cta"),
          href: announceHref,
          announce: true,
          tone: "pasto-50",
          ribbon: "var(--color-pasto)",
        },
      };
    }
  }
}

function Locked({ children }: { children: ReactNode }) {
  return (
    <>
      <LockIcon size={14} />
      {children}
    </>
  );
}

const TILE: Record<OwnerStep["state"], string> = {
  done: "bg-pasto-50",
  current: "bg-white border-2 border-tinta shadow-tinta-sm",
  todo: "bg-white border-[1.5px] border-linea",
  locked: "border-[1.5px] border-dashed border-punteado text-gris",
};

/** Bloque «Ahora»: el único paso resaltado, con listón (como ActionCard, sin trazo: ya lo lleva la sección). */
function NowBlock({ n, now, exchangeId, className = "" }: { n: number | null; now: Now; exchangeId: string; className?: string }) {
  return (
    <div
      className={`liston flex flex-col gap-3 rounded-tarjeta p-4 [--liston-x:24px] sm:p-5 lg:flex-row lg:items-center lg:gap-5 lg:p-6 lg:[--liston-x:40px] ${TONE_BG[now.tone]} ${className}`}
      style={{ ["--liston" as string]: now.ribbon }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 pr-10 lg:pr-0">
        {n !== null && (
          <span className="lg:hidden">
            <StepDot n={n} state="current" />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="etiqueta text-gris">{n === null ? t("home.doneEyebrow") : t("panel.steps.now")}</p>
          <h3 className="text-[19px] leading-tight font-medium tracking-[-0.02em] lg:text-[26px] lg:tracking-[-0.03em]">{now.title}</h3>
          <p className="text-sm leading-snug lg:text-[15px]">{now.text}</p>
        </div>
      </div>
      {now.announce ? (
        <AnnounceLink exchangeId={exchangeId} href={now.href} track dot className="lg:mr-16">
          {now.cta}
        </AnnounceLink>
      ) : (
        <DotButton href={now.href} variant="tinta" size="sm" full="mobile" transitionTypes={FWD} className="lg:mr-16">
          {now.cta}
        </DotButton>
      )}
    </div>
  );
}

/** «Mi parte»: accesos a Mi lista y al Buzón (con no leídos). Solo si quien organiza participa. */
function MyPart({ exchange, owner, unread, className = "" }: Pick<Props, "exchange" | "owner" | "unread"> & { className?: string }) {
  if (!owner?.path) return null;
  const drawn = exchange.status === "drawn";
  const n = owner.wishCount;
  const tile = "flex min-h-[104px] flex-col gap-1.5 rounded-tarjeta border-[1.5px] p-3.5 lg:min-h-14 lg:flex-row lg:items-center lg:justify-between lg:px-4 lg:py-2";
  return (
    <section aria-label={t("panel.myPart.title")} className={`flex flex-col gap-2.5 ${className}`}>
      <Eyebrow as="h2" className="text-gris">
        {t("panel.myPart.title")}
      </Eyebrow>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
        <Link href={withDesde(`${owner.path}/lista`, "panel")} transitionTypes={FWD} className={`${tile} levantable border-linea bg-white no-underline`}>
          <span className="text-base font-medium">{t("panel.myPart.list")}</span>
          <span className="cifra text-[13px] font-normal text-gris">{n >= LIST_GOAL ? t("panel.ideasCount", { n }) : ideas(n)}</span>
        </Link>
        {exchange.rules.mailboxEnabled &&
          (drawn ? (
            <Link href={withDesde(`${owner.path}/buzon`, "panel")} transitionTypes={FWD} className={`${tile} levantable border-linea bg-white no-underline`}>
              <span className="text-base font-medium">
                {t("panel.myPart.mailbox")}
                <UnreadBadge n={unread} />
              </span>
              <span className={`text-[13px] ${unread > 0 ? "font-medium text-coral-700" : "text-gris"}`}>
                {unread > 0 ? t("panel.myPart.unread", { n: unread }) : t("panel.myPart.noUnread")}
              </span>
            </Link>
          ) : (
            <div className={`${tile} border-dashed border-punteado text-gris`}>
              <span className="text-base font-medium">{t("panel.myPart.mailbox")}</span>
              <span className="text-[13px]">{t("panel.myPart.mailboxLocked")}</span>
            </div>
          ))}
      </div>
    </section>
  );
}

/**
 * «Tus pendientes» arriba del panel: un solo paso «Ahora» resaltado, los hechos con ✓ y los bloqueados
 * atenuados con el motivo. Móvil: barra de segmentos + bloque «Ahora» + lista. Escritorio: 5–6 mosaicos + «Ahora» | Mi parte.
 */
export function OwnerSteps(props: Props) {
  const { exchange, owner, total } = props;
  const drawn = exchange.status === "drawn";
  const participates = Boolean(owner?.path);
  const steps = ownerSteps({
    participates,
    drawn,
    announced: Boolean(exchange.announcedAt),
    total,
    wishCount: owner?.wishCount ?? 0,
    revealed: Boolean(owner?.revealed),
    bought: Boolean(owner?.bought),
  });
  const details = steps.map((s) => detail(s.key, s, props));
  const currentIndex = steps.findIndex((s) => s.state === "current");
  const current = currentIndex >= 0 ? details[currentIndex].now : undefined;
  const done = steps.filter((s) => s.state === "done").length;
  const allDone: Now = {
    title: t("panel.steps.allDone.title"),
    text: t("panel.steps.allDone.text", { date: formatShortDate(exchange.eventAt, exchange.timeZone) }),
    cta: t("panel.steps.allDone.cta"),
    href: withDesde(`${owner?.path ?? ""}/compre`, "panel"),
    tone: "pasto-50",
    ribbon: "var(--color-pasto)",
  };
  const now = current ?? (participates && owner?.bought ? allDone : undefined);

  const list: StepItem[] = steps
    .map((s, i) => ({ title: details[i].title, state: s.state, aside: details[i].aside, n: i + 1 }))
    .filter((s) => s.state !== "current");

  return (
    <>
      <section aria-labelledby="pendientes" className="flex flex-col gap-4 rounded-panel bg-hueso p-4 trazo-tinta sm:p-5 lg:gap-5 lg:p-6 lg:shadow-tinta-lg">
        <div className="flex items-center justify-between gap-3">
          <h2 id="pendientes" className="etiqueta">
            {t("panel.steps.title")}
          </h2>
          <span className="cifra text-[13px] text-gris lg:text-sm">{t("panel.steps.progress", { n: done, total: steps.length })}</span>
        </div>

        {/* Móvil: un segmento por paso. */}
        <div aria-hidden className="grid gap-1 lg:hidden" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((s) => (
            <span key={s.key} className={`h-1.5 rounded-full ${s.state === "done" ? "bg-pasto" : s.state === "current" ? "bg-tinta" : "bg-arena"}`} />
          ))}
        </div>

        {/* Escritorio: mosaicos. */}
        <ol className="hidden gap-2.5 lg:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((s, i) => (
            <li key={s.key} aria-current={s.state === "current" ? "step" : undefined} className={`flex min-h-24 flex-col gap-1.5 rounded-2xl p-3.5 ${TILE[s.state]}`}>
              <StepDot n={i + 1} state={s.state} size="sm" />
              <span className="text-sm leading-tight font-medium">
                {details[i].title}
                {s.state === "done" && <span className="sr-only"> ({t("ui.stepDone")})</span>}
              </span>
              <span className="flex items-center gap-1 text-xs text-gris">
                {s.state === "locked" && <LockIcon size={12} />}
                {details[i].sub}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          {now && <NowBlock n={current ? currentIndex + 1 : null} now={now} exchangeId={exchange.id} className="lg:flex-[2]" />}
          <MyPart {...props} className="hidden lg:flex lg:flex-1" />
        </div>

        <StepList steps={list} className="-mt-1 lg:hidden" />
      </section>

      <MyPart {...props} className="lg:hidden" />
    </>
  );
}

