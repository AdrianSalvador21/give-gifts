import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { CheckIcon } from "./icons";

/** `locked`: todavía no se puede (atenuado; el motivo va en `aside`). */
export type StepState = "done" | "current" | "todo" | "locked";

export function StepDot({ n, state, size = "md" }: { n: number; state: StepState; size?: "sm" | "md" }) {
  const s = size === "sm" ? "size-7 text-[13px]" : "size-8 text-sm";
  const c =
    state === "done"
      ? "bg-pasto"
      : state === "current"
        ? "bg-tinta text-white"
        : state === "locked"
          ? "border-2 border-dashed border-punteado text-gris"
          : "bg-arena";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-medium cifra ${s} ${c}`}>
      {state === "done" ? <CheckIcon size={14} className="gg-dibujar" /> : n}
    </span>
  );
}

export type StepItem = {
  title: ReactNode;
  hint?: ReactNode;
  state: StepState;
  /** A la derecha: «Hecho», un link («Sortear») o el motivo del bloqueo («Tras el sorteo»). */
  aside?: ReactNode;
  /** Número del punto (por defecto, su posición en la lista). */
  n?: number;
};

/**
 * Lista vertical de pasos («Así sigue»): Home del participante. El check se dibuja al completarse.
 * Va dentro de una <Card variant="base">; pon un <Eyebrow> encima si hace falta.
 */
export function StepList({ steps, className = "" }: { steps: StepItem[]; className?: string }) {
  return (
    <ol className={`flex flex-col ${className}`}>
      {steps.map((s, i) => (
        <li
          key={i}
          aria-current={s.state === "current" ? "step" : undefined}
          className={`flex items-center gap-3.5 border-b border-arena py-3.5 last:border-b-0 ${s.state === "locked" ? "text-gris" : ""}`}
        >
          <StepDot n={s.n ?? i + 1} state={s.state} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={`text-base ${s.state === "done" ? "text-gris" : s.state === "current" ? "font-medium" : ""}`}>
              {s.title}
              {s.state === "done" && <span className="sr-only"> ({t("ui.stepDone")})</span>}
            </span>
            {s.hint && <span className="text-[13px] leading-snug text-gris">{s.hint}</span>}
          </span>
          {s.aside && <span className="flex shrink-0 items-center gap-1 text-right text-[13px] text-gris">{s.aside}</span>}
        </li>
      ))}
    </ol>
  );
}

/**
 * Rail de pasos del wizard en escritorio (lg+). En móvil usa <StepBar>. Los pasos ya válidos son
 * clicables vía `onSelect` (componente cliente). `art` va debajo (ilustración 06-crear).
 */
export function StepRail({
  steps,
  current,
  onSelect,
  canSelect,
  art,
  className = "",
}: {
  steps: ReactNode[];
  /** Índice base 0 del paso actual. */
  current: number;
  onSelect?: (index: number) => void;
  /** Qué pasos se pueden abrir (por defecto los anteriores al actual). */
  canSelect?: (index: number) => boolean;
  art?: ReactNode;
  className?: string;
}) {
  const selectable = canSelect ?? ((i: number) => i < current);
  return (
    <nav aria-label={t("ui.stepOf", { n: current + 1, total: steps.length })} className={`hidden flex-col gap-1 lg:flex ${className}`}>
      <p className="etiqueta mb-2">{t("ui.stepOf", { n: current + 1, total: steps.length })}</p>
      <ol className="flex flex-col gap-1">
        {steps.map((title, i) => {
          const state: StepState = i < current ? "done" : i === current ? "current" : "todo";
          const content = (
            <>
              <StepDot n={i + 1} state={state} size="sm" />
              <span className="min-w-0 text-left">{title}</span>
            </>
          );
          const cls = `flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[15px] ${
            state === "current" ? "bg-white font-medium" : "text-gris"
          }`;
          return (
            <li key={i} aria-current={state === "current" ? "step" : undefined}>
              {onSelect && selectable(i) && state !== "current" ? (
                <button type="button" onClick={() => onSelect(i)} className={`${cls} transition-colors hover:bg-white/60 hover:text-tinta`}>
                  {content}
                </button>
              ) : (
                <span className={cls}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
      {art && <div className="mt-8">{art}</div>}
    </nav>
  );
}

/**
 * Columna de vista previa en vivo del wizard («Así la verá tu grupo»). Visible solo en xl.
 * Dentro va la tarjeta de invitación (InviteCard) alimentada con el estado del wizard.
 */
export function PreviewPanel({ label, children, className = "" }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <aside aria-label={typeof label === "string" ? label : undefined} className={`hidden xl:sticky xl:top-6 xl:flex xl:flex-col xl:gap-2.5 xl:self-start ${className}`}>
      <p className="etiqueta">{label}</p>
      <div className="pointer-events-none select-none" inert>
        {children}
      </div>
    </aside>
  );
}
