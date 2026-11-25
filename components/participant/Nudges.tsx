"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { askForIdeas, dismissNudge, markListSeen, nudgeGiver } from "@/app/actions/nudges";
import { Alert } from "@/components/ui/Alert";
import { DotButton } from "@/components/ui/DotButton";
import { BulbIcon, CheckIcon, CloseIcon } from "@/components/ui/icons";
import { Eyebrow, Pill } from "@/components/ui/primitives";
import { formatNextAt } from "@/lib/format";
import { t } from "@/lib/i18n";

// Avisos secretos (SPEC 03): tarjetas en la página de la otra persona y los botones que las mandan.

const FWD = ["nav-forward"];

type Key = { inviteCode: string; token: string };

function DismissButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={t("nudge.dismiss")}
      className="grid size-11 shrink-0 place-items-center rounded-[12px] transition-transform active:scale-90 disabled:opacity-50"
    >
      <CloseIcon size={18} />
    </button>
  );
}

/** Se oculta al instante y avisa al servidor; si falla, vuelve a aparecer. */
function useDismiss({ inviteCode, token }: Key, kind: "ideas" | "list") {
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  const dismiss = () => {
    setHidden(true);
    start(async () => {
      try {
        const res = await dismissNudge(inviteCode, token, kind);
        if (!res.ok) setHidden(false);
      } catch {
        setHidden(false);
      }
    });
  };
  return { hidden, pending, dismiss };
}

type CardProps = Key & {
  href: string;
  /** `panel`: fila compacta para el panel del organizador («Como participante»). */
  layout?: "tarjeta" | "panel";
};

/** A quien recibe: «Alguien quiere ideas para tu regalo» (lila, en secreto). */
export function IdeasRequestedCard({ inviteCode, token, href, layout = "tarjeta" }: CardProps) {
  const { hidden, pending, dismiss } = useDismiss({ inviteCode, token }, "ideas");
  if (hidden) return null;

  if (layout === "panel") {
    return (
      <section aria-labelledby="aviso-ideas" className="flex items-center gap-3 rounded-tarjeta bg-lila-50 py-3 pr-2 pl-4 sm:gap-4">
        <Image src="/illustrations/web/11-buzon.webp" width={668} height={566} alt="" className="hidden h-14 w-auto shrink-0 sm:block" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Eyebrow className="text-gris">{t("nudge.asParticipant")}</Eyebrow>
          <h2 id="aviso-ideas" className="text-base leading-snug font-medium lg:text-lg">
            {t("nudge.ideasTitle")}
          </h2>
        </div>
        <DotButton href={href} variant="tinta" size="sm" transitionTypes={FWD} className="shrink-0">
          {t("nudge.ideasCta")}
        </DotButton>
        <DismissButton onClick={dismiss} disabled={pending} />
      </section>
    );
  }

  return (
    <section aria-labelledby="aviso-ideas" className="relative flex flex-col gap-3 rounded-panel trazo-tinta bg-lila-50 p-5">
      <div className="absolute top-2.5 right-2.5">
        <DismissButton onClick={dismiss} disabled={pending} />
      </div>
      <div className="flex items-center gap-3 pr-10">
        <Image src="/illustrations/web/11-buzon.webp" width={668} height={566} alt="" className="h-[72px] w-auto shrink-0" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <Pill tone="blanco" className="self-start px-2.5 py-0.5 text-xs font-semibold">
            {t("nudge.secret")}
          </Pill>
          <h2 id="aviso-ideas" className="text-xl leading-tight font-medium tracking-[-0.03em]">
            {t("nudge.ideasTitle")}
          </h2>
        </div>
      </div>
      <p className="text-[15px] leading-snug">{t("nudge.ideasText")}</p>
      <DotButton href={href} variant="tinta" full transitionTypes={FWD}>
        {t("nudge.ideasCta")}
      </DotButton>
    </section>
  );
}

/** A quien regala: «{nombre} actualizó su lista» (verde). Antes de abrir el sobre no se dice el nombre. */
export function ListUpdatedCard({ inviteCode, token, href, layout = "tarjeta", name, revealed }: CardProps & { name: string | null; revealed: boolean }) {
  const { hidden, pending, dismiss } = useDismiss({ inviteCode, token }, "list");
  if (hidden) return null;
  const title = revealed && name ? t("nudge.updatedTitle", { name }) : t("nudge.updatedTitleHidden");
  const cta = revealed ? t("nudge.updatedCta") : t("nudge.updatedCtaEnvelope");

  if (layout === "panel") {
    return (
      <section aria-labelledby="aviso-lista" className="flex items-center gap-3 rounded-tarjeta bg-pasto-50 py-3 pr-2 pl-4 sm:gap-4">
        <Image src="/illustrations/web/03-lista.webp" width={1143} height={674} alt="" className="hidden h-14 w-auto shrink-0 sm:block" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Eyebrow className="text-gris">{t("nudge.asParticipant")}</Eyebrow>
          <h2 id="aviso-lista" className="text-base leading-snug font-medium lg:text-lg">
            {title}
          </h2>
        </div>
        <DotButton href={href} variant="tinta" size="sm" transitionTypes={FWD} className="shrink-0">
          {cta}
        </DotButton>
        <DismissButton onClick={dismiss} disabled={pending} />
      </section>
    );
  }

  return (
    <section aria-labelledby="aviso-lista" className="relative flex flex-col gap-3 rounded-panel trazo-tinta bg-pasto-50 p-5">
      <div className="absolute top-2.5 right-2.5">
        <DismissButton onClick={dismiss} disabled={pending} />
      </div>
      <div className="flex items-center gap-3 pr-10">
        <Image src="/illustrations/web/03-lista.webp" width={1143} height={674} alt="" className="h-[64px] w-auto shrink-0" />
        <h2 id="aviso-lista" className="text-xl leading-tight font-medium tracking-[-0.03em]">
          {title}
        </h2>
      </div>
      <p className="text-[15px] leading-snug">{revealed ? t("nudge.updatedText") : t("nudge.updatedTextEnvelope")}</p>
      <DotButton href={href} variant="tinta" full transitionTypes={FWD}>
        {cta}
      </DotButton>
    </section>
  );
}

/** En «Mi lista», arriba: recuerda que alguien pidió ideas. */
export function IdeasBanner() {
  return (
    <p role="status" className="flex items-center gap-2.5 rounded-boton bg-lila-50 px-4 py-2.5 text-sm leading-snug">
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-lila outline outline-1 outline-tinta" />
      <span>
        <strong className="font-semibold">{t("nudge.ideasBanner")}</strong> {t("nudge.ideasBannerText")}
      </span>
    </p>
  );
}

export type CanNudge = { ok: boolean; reason: "unchanged" | "cooldown" | null; nextAt: string | null; first: boolean };

/** «¿Ya está tu lista? Avisarle que ya está» (quien recibe, después del sorteo). */
export function NudgeGiverCard({ inviteCode, token, canNudge, timeZone }: Key & { canNudge: CanNudge; timeZone: string }) {
  const [sentUntil, setSentUntil] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState(canNudge);
  const [pending, start] = useTransition();
  // Si el servidor trae otro estado (p. ej. después de agregar un deseo), se adopta; el «¡Listo!» se conserva.
  const [prev, setPrev] = useState(canNudge);
  if (JSON.stringify(prev) !== JSON.stringify(canNudge)) {
    setPrev(canNudge);
    setState(canNudge);
  }

  const send = () =>
    start(async () => {
      try {
        const res = await nudgeGiver(inviteCode, token);
        if (res.ok) {
          setError(null);
          setSentUntil(res.nextAt);
        } else if (res.error === "cooldown" || res.error === "unchanged") {
          setState({ ok: false, reason: res.error, nextAt: res.nextAt ?? null, first: state.first });
        } else setError(t("nudge.error"));
      } catch {
        setError(t("nudge.error"));
      }
    });

  const waiting = sentUntil ?? (state.reason === "cooldown" ? state.nextAt : null);

  return (
    <section aria-labelledby="aviso-recordar" className={`flex flex-col gap-3 rounded-panel bg-white p-5 ${state.ok && !sentUntil ? "trazo-tinta" : ""}`}>
      {sentUntil ? (
        <div role="status" className="flex items-center gap-3">
          <span aria-hidden className="grid size-12 shrink-0 animate-pop place-items-center rounded-full bg-pasto">
            <CheckIcon size={20} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <h2 id="aviso-recordar" className="text-xl leading-tight font-medium tracking-[-0.03em]">
              {t("nudge.listSentTitle")}
            </h2>
            <span className="text-sm text-gris">{t("nudge.listSentText")}</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Image src="/illustrations/web/14-regalito-solo.webp" width={320} height={489} alt="" className="h-[64px] w-auto shrink-0" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <h2 id="aviso-recordar" className="text-xl leading-tight font-medium tracking-[-0.03em]">
              {t("nudge.listTitle")}
            </h2>
            <span className="text-sm text-gris">{t("nudge.listText")}</span>
          </span>
        </div>
      )}

      {!sentUntil && state.ok && (
        <>
          <Pill tone="pasto-50" className="self-start whitespace-normal">
            {state.first ? t("nudge.listChangedFirst") : t("nudge.listChanged")}
          </Pill>
          <DotButton variant="tinta" icon="send" full disabled={pending} aria-busy={pending || undefined} onClick={send}>
            {t("nudge.listCta")}
          </DotButton>
        </>
      )}

      {(waiting || (!state.ok && state.reason === "unchanged")) && (
        <>
          <button
            type="button"
            disabled
            className="min-h-[52px] rounded-boton border-2 border-dashed border-punteado px-4 text-[15px] font-medium text-gris"
          >
            {waiting ? t("nudge.listCooldown", { when: formatNextAt(waiting, timeZone) }) : t("nudge.listCta")}
          </button>
          {!waiting && <p className="text-center text-[13px] text-gris">{t("nudge.listUnchanged")}</p>}
        </>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </section>
  );
}

/** «Pedirle ideas en secreto» (quien regala, en «Tu persona»). `primary` con la lista vacía. */
export function AskIdeasButton({
  inviteCode,
  token,
  receiverName,
  canAsk,
  timeZone,
  primary,
}: Key & { receiverName: string; canAsk: { ok: boolean; nextAt: string | null }; timeZone: string; primary?: boolean }) {
  const [sent, setSent] = useState(false);
  const [nextAt, setNextAt] = useState(canAsk.ok ? null : canAsk.nextAt);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ask = () =>
    start(async () => {
      try {
        const res = await askForIdeas(inviteCode, token);
        if (res.ok) {
          setError(null);
          setSent(true);
          setNextAt(res.nextAt);
        } else if (res.error === "cooldown") setNextAt(res.nextAt ?? null);
        else setError(t("nudge.error"));
      } catch {
        setError(t("nudge.error"));
      }
    });

  // Sin aviso posible (p. ej. ya pasó la fecha) y sin espera que mostrar: no hay nada que ofrecer.
  if (!canAsk.ok && !canAsk.nextAt && !sent) return null;

  return (
    <div className="flex w-full flex-col gap-2.5">
      {sent && (
        <p role="status" className="flex items-center gap-2.5 rounded-boton bg-pasto-50 px-4 py-3 text-left text-sm leading-snug">
          <CheckIcon size={16} className="shrink-0" />
          <span>{t("nudge.askSent", { name: receiverName })}</span>
        </p>
      )}
      {nextAt ? (
        <button type="button" disabled className="min-h-[52px] rounded-boton border-2 border-dashed border-punteado px-4 text-[15px] font-medium text-gris">
          {t("nudge.askCooldown", { when: formatNextAt(nextAt, timeZone) })}
        </button>
      ) : primary ? (
        <DotButton variant="tinta" full dotClassName="bg-lila text-tinta" disabled={pending} aria-busy={pending || undefined} onClick={ask}>
          {t("nudge.askCta")}
        </DotButton>
      ) : (
        <button
          type="button"
          onClick={ask}
          disabled={pending}
          aria-busy={pending || undefined}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-boton border-2 border-linea bg-white px-4 text-[15px] font-medium transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <BulbIcon size={18} />
          {t("nudge.askCta")}
        </button>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

/** Al abrir «Tu persona»: guarda la visita (una vez por montaje). Las etiquetas de esta visita se quedan. */
export function MarkListSeen({ inviteCode, token }: Key) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    markListSeen(inviteCode, token).catch(() => {});
  }, [inviteCode, token]);
  return null;
}

/** Etiqueta «Nuevo» / «Cambió» en un deseo de «Tu persona». */
export function WishTag({ tag }: { tag: "new" | "changed" }) {
  return (
    <span className="inline-flex items-center rounded-full border-[1.5px] border-tinta bg-sol px-2 py-px text-[11px] font-bold tracking-[0.04em] uppercase">
      {tag === "new" ? t("nudge.tagNew") : t("nudge.tagChanged")}
    </span>
  );
}
