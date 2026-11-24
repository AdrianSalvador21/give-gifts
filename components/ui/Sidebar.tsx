import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/landing/Decor";
import { t } from "@/lib/i18n";
import type { Tone } from "./primitives";
import { TONE_BG } from "./primitives";

export type SidebarItem = {
  href: string;
  label: string;
  /** Día del evento («19») para el mosaico; sin día muestra la inicial. */
  day?: string;
  tone?: Tone;
  current?: boolean;
};

export type SidebarSection = { label: string; items: SidebarItem[] };

/**
 * Barra lateral tinta del tablero (Panel del organizador). Se monta en <AppShell variant="tablero" sidebar={…}>.
 * lg: colapsada a 72 px (solo mosaicos, nombre en tooltip y para lectores) · xl: completa (248 px).
 */
export function Sidebar({ sections, footer, label = t("ui.sidebar") }: { sections: SidebarSection[]; footer?: ReactNode; label?: string }) {
  return (
    <nav aria-label={label} className="flex h-full flex-col gap-1 overflow-y-auto bg-tinta px-3 py-6 text-white xl:px-4">
      <Link href="/" className="mb-6 flex min-h-11 items-center justify-center gap-2.5 text-white no-underline xl:justify-start xl:px-2">
        <LogoMark onDark />
        <span className="hidden text-[20px] font-medium tracking-[-0.04em] xl:inline">{t("brand.name")}</span>
      </Link>
      {sections.map((section) => (
        <div key={section.label} className="mb-4 flex flex-col gap-1">
          <p className="etiqueta mb-1 hidden px-2 text-[#a9ab9f] xl:block">{section.label}</p>
          <span aria-hidden className="mx-auto mb-1 h-px w-8 bg-white/15 xl:hidden" />
          <ul className="flex flex-col gap-1">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  aria-current={item.current ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center gap-2.5 rounded-xl p-1.5 text-[15px] no-underline transition-colors xl:justify-start xl:px-2 ${
                    item.current ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span aria-hidden className={`cifra grid size-9 shrink-0 place-items-center rounded-[10px] text-[15px] font-medium text-tinta ${TONE_BG[item.tone ?? "pasto"]}`}>
                    {item.day ?? item.label.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="sr-only truncate xl:not-sr-only">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {footer && <div className="mt-auto flex justify-center pt-4 xl:block">{footer}</div>}
    </nav>
  );
}
