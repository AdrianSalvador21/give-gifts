import type { ReactNode } from "react";
import { TONE_BG, type Tone } from "./primitives";

/**
 * Tarjeta de siguiente acción (Home del participante): el protagonista de la pantalla.
 * Trazo tinta + listón vertical, como un regalo. Cambia tono e ilustración según el estado
 * (lista → sol, sobre → pasto, comprar → cielo, buzón → lila).
 */
export function ActionCard({
  eyebrow,
  title,
  text,
  action,
  art,
  tone = "sol",
  ribbon = "sol",
  progress,
  className = "",
  artClassName = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  /** Botón: normalmente <DotButton variant="blanco"> (o el CTA de la pantalla con `ink`). */
  action?: ReactNode;
  /** Ilustración existente (<Image>) a la derecha en sm+, arriba a la izquierda en móvil. */
  art?: ReactNode;
  tone?: Tone;
  ribbon?: "sol" | "coral" | "pasto" | "cielo" | "lila" | "blanco";
  /** Fila de progreso opcional (p. ej. 3 segmentos de ideas). */
  progress?: ReactNode;
  className?: string;
  /** Clases extra del contenedor del arte (p. ej. `xl:hidden` cuando la columna es angosta). */
  artClassName?: string;
}) {
  const ribbonColor = ribbon === "blanco" ? "#fff" : `var(--color-${ribbon})`;
  return (
    <section
      className={`liston flex flex-col gap-4 rounded-panel trazo-tinta p-5 [--liston-x:36px] sm:flex-row sm:items-center sm:gap-6 sm:p-7 sm:[--liston-x:56px] ${TONE_BG[tone]} ${className}`}
      style={{ ["--liston" as string]: ribbonColor }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 pr-10 sm:pr-0">
        {eyebrow && <p className="etiqueta">{eyebrow}</p>}
        <h2 className="text-[26px] leading-[1.05] font-medium tracking-[-0.04em] text-balance lg:text-[40px]">{title}</h2>
        {text && <p className="text-[15px] leading-snug">{text}</p>}
        {progress}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {art && <div className={`order-first shrink-0 self-start sm:order-none sm:mr-16 sm:self-center ${artClassName}`}>{art}</div>}
    </section>
  );
}
