import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/landing/Decor";
import { t } from "@/lib/i18n";

/** Link a «Mis intercambios» para la derecha de la barra: es la puerta de regreso a lo que ya creaste. */
export function MineLink() {
  return (
    <Link href="/mis-intercambios" className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[15px] font-medium underline-offset-4 hover:underline">
      {t("nav.mine")}
    </Link>
  );
}

/**
 * Barra superior de la app: Regalito + «givegifts» (lleva al inicio) y una acción opcional a la derecha.
 * `pill` muestra el nombre del intercambio (pantallas del participante). No se mueve en las transiciones de ruta.
 */
export function BrandBar({ action, pill, className = "" }: { action?: ReactNode; pill?: ReactNode; className?: string }) {
  return (
    <header className={`flex h-[60px] shrink-0 items-center justify-between gap-3 lg:h-[72px] ${className}`} style={{ viewTransitionName: "site-header" }}>
      <Link href="/" className="flex min-h-11 items-center gap-2.5 no-underline">
        <LogoMark />
        <span className="text-[22px] font-medium tracking-[-0.04em]">{t("brand.name")}</span>
      </Link>
      {(pill || action) && (
        <div className="flex min-w-0 items-center gap-2">
          {pill && <span className="min-w-0 truncate rounded-full bg-white px-3 py-1.5 text-[13px] font-medium">{pill}</span>}
          {action}
        </div>
      )}
    </header>
  );
}
