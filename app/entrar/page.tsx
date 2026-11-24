import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandBar } from "@/components/ui/BrandBar";
import { Screen, ScreenTitle } from "@/components/ui/primitives";
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

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <Screen className="gap-6 pt-2">
      <Suspense fallback={null}>
        <RedirectIfSignedIn searchParams={searchParams as Promise<{ next?: string | string[] }>} />
      </Suspense>
      <BrandBar />
      <Image src="/illustrations/web/06-crear.webp" width={790} height={635} alt="" priority className="mx-auto h-[170px] w-auto" />
      <div className="flex flex-col gap-2.5">
        <ScreenTitle>{t("auth.title")}</ScreenTitle>
        <p className="text-[17px] leading-snug text-gris">{t("auth.subtitle")}</p>
      </div>
      <Suspense fallback={<p className="text-gris">{t("common.loading")}</p>}>
        <LoginForm />
      </Suspense>
    </Screen>
  );
}
