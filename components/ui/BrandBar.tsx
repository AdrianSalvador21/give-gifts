import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/landing/Decor";
import { t } from "@/lib/i18n";

/** Link a «Mis intercambios» para la derecha de la barra: es la puerta de regreso a lo que ya creaste. */
export function MineLink() {
  return (
    <Link href="/mis-intercambios" className="rounded-[10px] px-3 py-2 text-[15px] font-medium underline-offset-4 hover:underline">
      {t("nav.mine")}
    </Link>
  );
}

/** Barra superior de la app: Regalito + «givegifts» (lleva al inicio) y una acción opcional a la derecha. */
export function BrandBar({ action, className = "" }: { action?: ReactNode; className?: string }) {
  return (
    <header className={`flex h-[60px] items-center justify-between gap-3 ${className}`}>
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <LogoMark />
        <span className="text-[22px] font-medium tracking-[-0.04em]">{t("brand.name")}</span>
      </Link>
      {action}
    </header>
  );
}
