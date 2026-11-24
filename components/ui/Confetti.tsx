import type { CSSProperties } from "react";

const COLORS = ["var(--color-sol)", "var(--color-coral)", "var(--color-cielo)", "var(--color-lila)", "#fff", "var(--color-pasto)"];

/** Pseudoaleatorio estable por índice: el confeti se ve igual en servidor y cliente (sin Math.random en render). */
function noise(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Ráfaga de confeti CSS (24 piezas). Va dentro de un contenedor `relative`; no captura clics.
 * Se dispara al montar; cambia `burst` (p. ej. un contador) para repetirla. Con movimiento reducido no se muestra.
 * Sobre, Listo (una vez al cargar), Compré.
 */
export function Confetti({
  burst = 0,
  count = 24,
  spread = 1,
  delay = 0,
  className = "",
}: {
  burst?: number;
  count?: number;
  /** Multiplica el radio de la explosión (1 ≈ 110–230 px). */
  spread?: number;
  /** Retraso en ms (p. ej. 700 para esperar a que abra el sobre). */
  delay?: number;
  className?: string;
}) {
  return (
    <span aria-hidden className={`pointer-events-none absolute inset-0 z-10 overflow-visible ${className}`}>
      {Array.from({ length: count }, (_, i) => {
        const a = (Math.PI * 2 * i) / count + (noise(i, burst) - 0.5) * 0.5;
        const r = (110 + noise(i, burst + 1) * 120) * spread;
        const style = {
          "--x": `${Math.round(Math.cos(a) * r)}px`,
          "--y": `${Math.round(Math.sin(a) * r - 60 * spread)}px`,
          "--r": `${Math.round(noise(i, burst + 2) * 1080 - 540)}deg`,
          "--d": `${delay + Math.round(noise(i, burst + 3) * 80)}ms`,
          background: COLORS[i % COLORS.length],
        } as CSSProperties;
        return <span key={`${burst}-${i}`} className="gg-confeti" style={style} />;
      })}
    </span>
  );
}
