// Piezas compartidas de las imágenes para compartir (Open Graph). Satori sólo entiende flexbox y estilos en línea.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

export const OG_SIZE = { width: 1200, height: 630 };

export const COLORS = { crema: "#F5F1E4", tinta: "#2C2E2A", pasto: "#8ED462", gris: "#6B6D69", sol: "#F5DF16", coral: "#FF705D" };

/** Ilustraciones existentes convertidas a PNG (Satori no lee WebP). Viven en assets/og, fuera de public/. */
export async function ogArt(name: "regalitos" | "invitar"): Promise<string> {
  const data = await readFile(join(process.cwd(), "assets/og", `${name}.png`), "base64");
  return `data:image/png;base64,${data}`;
}

/** Regalito mínimo (caja tinta, moño verde, ojitos) + «givegifts», igual que la barra de la app. */
export function OgBrand({ size = 44 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ display: "flex", position: "relative", width: size, height: size, marginTop: size * 0.25, borderRadius: size * 0.28, background: COLORS.tinta }}>
        <svg width={size * 0.72} height={size * 0.44} viewBox="0 0 26 16" style={{ position: "absolute", top: -size * 0.25, left: size * 0.14 }}>
          <path d="M13 13 C 8 3, 1 4, 2 9 C 3 14, 9 14, 13 13 Z M13 13 C 18 3, 25 4, 24 9 C 23 14, 17 14, 13 13 Z" fill={COLORS.pasto} stroke={COLORS.tinta} strokeWidth="1.5" />
        </svg>
        <div style={{ position: "absolute", top: size * 0.42, left: size * 0.28, width: size * 0.14, height: size * 0.14, borderRadius: 99, background: "white" }} />
        <div style={{ position: "absolute", top: size * 0.42, left: size * 0.58, width: size * 0.14, height: size * 0.14, borderRadius: 99, background: "white" }} />
      </div>
      <span style={{ fontSize: size * 0.82, letterSpacing: "-0.04em", color: COLORS.tinta }}>givegifts</span>
    </div>
  );
}

export function OgFrame({ background, children }: { background: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background, color: COLORS.tinta, padding: "56px 64px", position: "relative" }}>
      {children}
    </div>
  );
}
