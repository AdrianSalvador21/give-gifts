import { t } from "@/lib/i18n";

/**
 * «Atrás» que respeta el origen en las páginas personales (lista, sobre, persona, buzón, compré).
 * `?desde=panel` → panel del organizador · `?desde=mis` → Mis intercambios · sin parámetro → inicio personal.
 */
export type Desde = "panel" | "mis";

export function parseDesde(value: unknown): Desde | null {
  return value === "panel" || value === "mis" ? value : null;
}

/** Agrega `?desde=` a un link interno (o lo deja igual si no hay origen). */
export function withDesde(href: string, desde: Desde | null): string {
  return desde ? `${href}${href.includes("?") ? "&" : "?"}desde=${desde}` : href;
}

/**
 * A dónde lleva «atrás». Quien organiza (participante `owner`) sin parámetro vuelve al panel:
 * su inicio personal ya lo redirige ahí cuando tiene sesión.
 */
export function backTarget({ desde, isOwner, base, exchangeId }: { desde: Desde | null; isOwner: boolean; base: string; exchangeId: string }): { href: string; label: string } {
  if (desde === "mis") return { href: "/mis-intercambios", label: t("nav.backMine") };
  if (desde === "panel" || isOwner) return { href: `/organizar/${exchangeId}`, label: t("nav.backPanel") };
  return { href: base, label: t("home.backHome") };
}
