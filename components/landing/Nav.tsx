"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowIcon, CloseIcon, MenuIcon } from "@/components/ui/icons";
import { t } from "@/lib/i18n";
import { LogoMark } from "./Decor";

const LINKS = [
  { href: "#pasos", label: t("nav.how") },
  { href: "#listas", label: t("nav.lists") },
  { href: "#secreto", label: t("nav.privacy") },
  { href: "/mis-intercambios", label: t("nav.mine") },
  { href: "/entrar?next=/mis-intercambios", label: t("nav.signIn") },
];

/**
 * Nav flotante: pill + CTA aparte. Es transparente sobre el hero y se vuelve blanca cuando la hoja crema
 * (sheetId) llega debajo de ella. En móvil los links viven en un panel desplegable.
 */
export function Nav({ sheetId }: { sheetId: string }) {
  const [open, setOpen] = useState(false);
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const update = () => {
      const sheet = document.getElementById(sheetId);
      // 84px = alto de la nav (68) + su margen superior (16).
      setOverHero(!!sheet && sheet.getBoundingClientRect().top > 84);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sheetId]);

  const clear = overHero && !open;
  const surface = `transition-colors duration-300 ${clear ? "bg-transparent" : "bg-white"}`;

  return (
    <header className="sticky top-0 z-50 h-0">
      <div className="mx-auto flex max-w-[1296px] items-start gap-3 px-4 pt-4 sm:px-6">
        <nav aria-label={t("nav.main")} className={`min-w-0 flex-1 rounded-boton ${surface}`}>
          <div className="flex h-[68px] items-center justify-between gap-4 pr-3 pl-[18px]">
            <Link href="/" className="flex min-h-11 items-center gap-2.5 no-underline">
              <LogoMark />
              <span className="text-[25px] font-medium tracking-[-0.04em]">{t("brand.name")}</span>
            </Link>
            <div className="hidden items-center gap-1 lg:flex">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-[10px] px-3.5 py-2.5 text-[17px] font-medium ${clear ? "hover:bg-white/40" : "hover:bg-crema"}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <button
              type="button"
              aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`grid size-[46px] shrink-0 place-items-center rounded-full transition-colors duration-300 lg:hidden ${clear ? "bg-white" : "bg-pasto"}`}
            >
              {open ? <CloseIcon size={18} /> : <MenuIcon size={20} />}
            </button>
          </div>
          {open && (
            <div className="flex flex-col gap-1 border-t border-arena p-3 lg:hidden">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-[10px] px-3 py-3 text-lg font-medium hover:bg-crema">
                  {l.label}
                </Link>
              ))}
              <Link href="/crear" className="rounded-[10px] px-3 py-3 text-lg font-medium hover:bg-crema sm:hidden">
                {t("nav.create")}
              </Link>
            </div>
          )}
        </nav>
        <Link
          href="/crear"
          className={`group hidden h-[68px] shrink-0 items-center gap-4 rounded-boton pr-2.5 pl-[22px] text-lg font-medium sm:flex ${surface}`}
        >
          {t("nav.create")}
          <span className="grid size-[46px] place-items-center rounded-full bg-coral transition-transform group-hover:translate-x-1">
            <ArrowIcon />
          </span>
        </Link>
      </div>
    </header>
  );
}
