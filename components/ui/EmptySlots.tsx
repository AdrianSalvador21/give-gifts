import type { ComponentProps, ReactNode } from "react";
import { PlusIcon } from "./icons";

type SlotTone = "pasto" | "sol" | "cielo" | "coral" | "lila";

const THUMB: Record<SlotTone, string> = {
  pasto: "bg-pasto-50",
  sol: "bg-sol-50",
  cielo: "bg-cielo-50",
  coral: "bg-coral-50",
  lila: "bg-lila-50",
};

const FADE = ["", "opacity-70", "opacity-45", "opacity-30"];

/**
 * Hueco punteado: muestra lo que falta en vez de un texto. `fade` 0–3 lo va apagando.
 * Por defecto es un <div>; pasa `onClick` para que sea un botón (p. ej. enfocar el formulario).
 */
export function EmptySlot({
  children,
  tone,
  fade = 0,
  layout = "fila",
  className = "",
  onClick,
  ...rest
}: {
  children?: ReactNode;
  /** Color de la miniatura (tinte -50). Sin tone no hay miniatura. */
  tone?: SlotTone;
  fade?: 0 | 1 | 2 | 3;
  /** `fila` 64 px de alto con miniatura a la izquierda (móvil) · `tarjeta` celda de rejilla (≥ 176 px). */
  layout?: "fila" | "tarjeta";
  className?: string;
} & Omit<ComponentProps<"button">, "className" | "children">) {
  const base =
    layout === "tarjeta"
      ? "flex min-h-44 flex-col items-center justify-center gap-2 p-5 text-center text-gris"
      : "flex min-h-16 items-center gap-3 px-3.5 py-2.5 text-left";
  const classes = `rounded-[18px] border-2 border-dashed border-punteado bg-white/50 text-[15px] ${base} ${FADE[fade]} ${className}`;
  const inner = (
    <>
      {tone && layout === "fila" && <span aria-hidden className={`size-11 shrink-0 rounded-xl ${THUMB[tone]}`} />}
      {layout === "tarjeta" && !children && <PlusIcon size={24} />}
      {children}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${classes} transition-[border-color,transform] hover:border-tinta active:scale-[0.99]`} {...rest}>
        {inner}
      </button>
    );
  }
  return <div className={classes}>{inner}</div>;
}

const TONES: SlotTone[] = ["pasto", "sol", "cielo", "coral", "lila"];

/**
 * Pila de huecos para estados vacíos («Pega un link de tienda», «o escribe una idea», «una tercera…»).
 * El primero va a opacidad completa; los siguientes se apagan.
 */
export function EmptySlots({ items, onSelect, className = "" }: { items: ReactNode[]; onSelect?: (index: number) => void; className?: string }) {
  return (
    <ul className={`escalonado flex flex-col gap-2.5 ${className}`}>
      {items.map((item, i) => (
        <li key={i}>
          <EmptySlot
            tone={TONES[i % TONES.length]}
            fade={Math.min(i, 3) as 0 | 1 | 2 | 3}
            className={`w-full ${i === 0 ? "font-medium" : ""}`}
            onClick={onSelect ? () => onSelect(i) : undefined}
          >
            {item}
          </EmptySlot>
        </li>
      ))}
    </ul>
  );
}

/**
 * Rellena una rejilla con huecos hasta `target` (p. ej. objetivo de 3 ideas o la fila completa).
 * Renderiza <li> para ir dentro de un <ul> de rejilla.
 */
export function GridFillers({ filled, target, first, onSelect }: { filled: number; target: number; first?: ReactNode; onSelect?: () => void }) {
  const missing = Math.max(0, target - filled);
  return (
    <>
      {Array.from({ length: missing }, (_, i) => (
        <li key={`hueco-${i}`} aria-hidden={i > 0 || undefined}>
          <EmptySlot layout="tarjeta" fade={Math.min(i, 3) as 0 | 1 | 2 | 3} className="h-full w-full" onClick={i === 0 ? onSelect : undefined}>
            {i === 0 ? first : null}
          </EmptySlot>
        </li>
      ))}
    </>
  );
}

/** Fila de chips de ideas rápidas («Libros», «Café», «Algo para la casa»). Usa <Chip> dentro. */
export function IdeaChips({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-2 ${className}`}>
      {children}
    </div>
  );
}
