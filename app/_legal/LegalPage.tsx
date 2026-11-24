import Link from "next/link";
import type { ReactNode } from "react";
import { BrandBar, MineLink } from "@/components/ui/BrandBar";
import { Eyebrow, ScreenTitle } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";
import { CONTACT_EMAIL, LEGAL } from "@/lib/site";

export type LegalTocItem = { id: string; title: string };

const FOOT_LINK = "inline-flex min-h-11 items-center px-3 underline underline-offset-4";

/**
 * Contenedor de lectura para textos legales: banda pasto con el título, y debajo una hoja blanca angosta.
 * En lg, índice fijo a la izquierda (`toc`).
 */
export function LegalPage({ title, intro, toc = [], children }: { title: string; intro: ReactNode; toc?: LegalTocItem[]; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-crema">
      <div className="bg-pasto bg-papel">
        <div className="mx-auto w-full max-w-[1100px] px-5 pb-14 sm:px-6 lg:px-10 lg:pb-20">
          <BrandBar action={<MineLink />} />
          <header className="flex flex-col gap-3 pt-6 lg:pt-12">
            <Eyebrow>{t("legal.eyebrow")}</Eyebrow>
            <ScreenTitle>{title}</ScreenTitle>
            <p className="text-sm font-medium">{t("legal.updated", { date: LEGAL.updatedAt })}</p>
          </header>
        </div>
      </div>

      <div className="mx-auto -mt-8 w-full max-w-[1100px] px-5 pb-16 sm:px-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:px-10">
        {toc.length > 0 && (
          <nav aria-label={t("legal.toc")} className="hidden lg:sticky lg:top-6 lg:mt-14 lg:block lg:self-start">
            <Eyebrow className="mb-3 text-gris">{t("legal.toc")}</Eyebrow>
            <ul className="flex flex-col">
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="flex min-h-11 items-center rounded-[10px] px-3 py-2 text-[15px] leading-snug hover:bg-white">
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <article className="flex max-w-[760px] flex-col gap-8 rounded-panel bg-white px-5 py-8 sm:px-10 sm:py-12">
          <div className="text-[17px] leading-relaxed">{intro}</div>
          {children}
          <footer className="-mx-3 flex flex-wrap border-t border-arena pt-4 text-[15px]">
            <Link href="/privacidad" className={FOOT_LINK}>
              {t("legal.privacy")}
            </Link>
            <Link href="/terminos" className={FOOT_LINK}>
              {t("legal.terms")}
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className={FOOT_LINK}>
              {t("legal.contact")}
            </a>
          </footer>
        </article>
      </div>
    </div>
  );
}

export function LegalSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-3 text-[16px] leading-relaxed [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      <h2 className="text-[24px] leading-tight font-medium tracking-[-0.03em]">{title}</h2>
      {children}
    </section>
  );
}

export function Mail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>
  );
}

/** Índice + props de cada sección a partir de una sola lista (sin repetir títulos). */
export function legalToc<const T extends readonly LegalTocItem[]>(items: T) {
  const byId = new Map(items.map((i) => [i.id, i]));
  return {
    toc: [...items],
    section: (id: T[number]["id"]) => byId.get(id)!,
  };
}
