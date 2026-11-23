"use client";

import { useEffect } from "react";

/**
 * Efectos de scroll de la landing. Escribe variables CSS en <html> que el marcado usa en sus transforms:
 * --hero (0→1 mientras la hoja crema sube), y por cada elemento con data-fx="N":
 * --mN (posición relativa, para el parallax).
 * Los valores se interpolan cuadro a cuadro hacia el objetivo para que el movimiento sea suave.
 */
export function ScrollFx({ sheetId }: { sheetId: string }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const current = new Map<string, number>();
    let frame = 0;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const sheet = document.getElementById(sheetId);
      if (!sheet) return;
      const vh = window.innerHeight || 800;

      const targets = new Map<string, number>();
      targets.set("--hero", clamp(1 - sheet.getBoundingClientRect().top / vh));
      document.querySelectorAll<HTMLElement>("[data-fx]").forEach((el) => {
        const key = el.dataset.fx;
        const rect = el.getBoundingClientRect();
        targets.set(`--m${key}`, Math.min(1.5, Math.max(-0.5, (vh - rect.top) / (vh + rect.height))));
      });

      for (const [name, target] of targets) {
        const prev = current.get(name);
        // Primer cuadro: salta directo; después se acerca un 12% por cuadro (≈ easing exponencial).
        const next = prev === undefined ? target : prev + (target - prev) * 0.12;
        if (prev !== undefined && Math.abs(next - prev) < 0.0005) continue;
        current.set(name, next);
        root.style.setProperty(name, next.toFixed(4));
      }
    };

    tick();
    return () => {
      cancelAnimationFrame(frame);
      for (const name of current.keys()) root.style.removeProperty(name);
    };
  }, [sheetId]);

  return null;
}
