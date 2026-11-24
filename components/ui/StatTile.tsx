import type { ReactNode } from "react";
import { ProgressBar, type Tone } from "./primitives";

/**
 * Mosaico de métrica (KPIs del panel, resumen de Sorteo). Etiqueta chica + cifra 600 tabular + barra opcional.
 * `featured`: el mosaico de acción (Sortear / Abrir mi sobre) en pasto con trazo tinta; pon el botón en `children`.
 */
export function StatTile({
  label,
  value,
  of,
  progress,
  progressTone = "tinta",
  featured,
  tone,
  children,
  className = "",
}: {
  label: ReactNode;
  value?: ReactNode;
  /** Muestra «/8» junto a la cifra. */
  of?: number;
  /** 0–1 para la barra inferior. */
  progress?: number;
  progressTone?: Tone;
  featured?: boolean;
  tone?: Tone;
  children?: ReactNode;
  className?: string;
}) {
  const bg = featured ? "bg-pasto trazo-tinta" : tone === "crema" ? "bg-crema" : "bg-white";
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 rounded-tarjeta p-4 ${bg} ${className}`}>
      <span className={`text-[13px] ${featured ? "font-medium" : "text-gris"}`}>{label}</span>
      {value !== undefined && (
        <span className="cifra text-[34px] leading-none">
          {value}
          {of !== undefined && <span className="text-base font-medium text-gris">/{of}</span>}
        </span>
      )}
      {progress !== undefined && <ProgressBar value={Math.round(progress * 100)} max={100} tone={progressTone} label={typeof label === "string" ? label : undefined} className="mt-1.5" />}
      {children}
    </div>
  );
}
