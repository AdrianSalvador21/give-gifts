import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppShell } from "@/components/ui/AppShell";
import { BrandBar, MineLink } from "@/components/ui/BrandBar";
import { PageTransition } from "@/components/ui/Transitions";
import { getOrganizer } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { Wizard } from "./Wizard";

export const metadata: Metadata = { title: "Crear intercambio", robots: { index: false } };

/** Sin sesión se puede llenar todo el asistente: la cuenta se pide en el último paso. */
async function CreateGate({ searchParams }: { searchParams: Promise<{ nombre?: string | string[] }> }) {
  const [{ nombre }, organizer] = await Promise.all([searchParams, getOrganizer()]);
  const initialName = (Array.isArray(nombre) ? nombre[0] : nombre)?.trim().slice(0, 60) ?? "";
  return <Wizard initialName={initialName} organizer={organizer ? { email: organizer.email, name: organizer.name } : null} />;
}

/** Con sesión, «Mis intercambios»; sin sesión, «Entrar» (vuelve a /crear y el borrador sigue ahí). */
async function HeaderAction() {
  const organizer = await getOrganizer();
  if (organizer) return <MineLink />;
  return (
    <Link href="/entrar?next=/crear" className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[15px] font-medium underline-offset-4 hover:underline">
      <span className="hidden lg:inline">{t("create.signInPrefix")}&nbsp;</span>
      {t("nav.signIn")}
    </Link>
  );
}

export default function CrearPage({ searchParams }: PageProps<"/crear">) {
  return (
    <AppShell
      variant="tablero"
      pattern="puntos"
      className="pt-2"
      header={
        <BrandBar
          action={
            <Suspense fallback={null}>
              <HeaderAction />
            </Suspense>
          }
        />
      }
    >
      <PageTransition>
        <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
          <CreateGate searchParams={searchParams} />
        </Suspense>
      </PageTransition>
    </AppShell>
  );
}
