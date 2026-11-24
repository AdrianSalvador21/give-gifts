import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandBar } from "@/components/ui/BrandBar";
import { CheckIcon } from "@/components/ui/icons";
import { Eyebrow, ScreenTitle, SplitShell } from "@/components/ui/primitives";
import { getOrganizer, safeNext } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

/** Si ya hay sesión, no tiene caso mostrar el formulario: directo a donde iba (o a Mis intercambios). */
async function RedirectIfSignedIn({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const [{ next }, organizer] = await Promise.all([searchParams, getOrganizer()]);
  if (organizer) redirect(safeNext(Array.isArray(next) ? next[0] : next));
  return null;
}

const POINTS = [t("auth.artPoint1"), t("auth.artPoint2"), t("auth.artPoint3")];

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <SplitShell
      tone="pasto"
      pattern="papel"
      ratio="mitad"
      width="angosto"
      header={<BrandBar />}
      art={
        <>
          <Image
            src="/illustrations/web/06-crear.webp"
            width={790}
            height={635}
            alt=""
            preload
            sizes="(min-width: 1024px) 440px, 200px"
            className="mx-auto h-[150px] w-auto lg:my-auto lg:h-auto lg:w-[78%] lg:max-w-[440px]"
          />
          <div className="hidden flex-col gap-4 lg:flex">
            <p className="text-[clamp(36px,3.4vw,48px)] leading-none font-medium tracking-[-0.05em]">{t("auth.artTitle")}</p>
            <ul className="flex flex-col gap-2 text-[17px] font-medium">
              {POINTS.map((p) => (
                <li key={p} className="flex items-center gap-2.5">
                  <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-white">
                    <CheckIcon size={13} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </>
      }
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn searchParams={searchParams as Promise<{ next?: string | string[] }>} />
      </Suspense>
      <div className="flex flex-col gap-2.5">
        <Eyebrow>{t("auth.eyebrow")}</Eyebrow>
        <ScreenTitle size="sm">{t("auth.title")}</ScreenTitle>
        <p className="text-[17px] leading-snug text-gris">{t("auth.subtitle")}</p>
      </div>
      <Suspense fallback={<p className="mt-6 text-gris">{t("common.loading")}</p>}>
        <LoginForm />
      </Suspense>
    </SplitShell>
  );
}
