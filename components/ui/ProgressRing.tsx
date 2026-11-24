import type { CSSProperties, ReactNode } from "react";
import { t } from "@/lib/i18n";

const RING: Record<"pasto" | "sol" | "cielo" | "coral" | "tinta", string> = {
  pasto: "var(--color-pasto)",
  sol: "var(--color-sol)",
  cielo: "var(--color-cielo)",
  coral: "var(--color-coral)",
  tinta: "var(--color-tinta)",
};

/**
 * Anillo de progreso con conic-gradient que se llena al entrar (≈0.9 s; instantáneo con movimiento reducido).
 * Al centro muestra «7/10» salvo que pases `children`.
 */
export function ProgressRing({
  value,
  max,
  size = 80,
  thickness = 11,
  tone = "pasto",
  label,
  children,
  className = "",
}: {
  value: number;
  max: number;
  size?: number;
  /** Grosor del anillo en px. */
  thickness?: number;
  tone?: keyof typeof RING;
  /** Texto accesible; por defecto «7 de 10». */
  label?: string;
  children?: ReactNode;
  className?: string;
}) {
  const pct = max > 0 ? Math.round(Math.min(1, Math.max(0, value / max)) * 100) : 0;
  const style = { width: size, height: size, "--p": pct, "--anillo": RING[tone] } as CSSProperties;
  return (
    <span
      role="img"
      aria-label={label ?? t("ui.progress", { value, max })}
      className={`gg-anillo grid shrink-0 place-items-center rounded-full ${className}`}
      style={style}
    >
      <span className="grid place-items-center rounded-full bg-white" style={{ width: size - thickness * 2, height: size - thickness * 2 }} aria-hidden>
        {children ?? (
          <span className="cifra" style={{ fontSize: Math.max(13, size * 0.2) }}>
            {value}/{max}
          </span>
        )}
      </span>
    </span>
  );
}
