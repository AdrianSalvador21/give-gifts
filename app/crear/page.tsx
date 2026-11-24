import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandBar, MineLink } from "@/components/ui/BrandBar";
import { Screen } from "@/components/ui/primitives";
import { requireOrganizer } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { Wizard } from "./Wizard";

export const metadata: Metadata = { title: "Crear intercambio", robots: { index: false } };

async function CreateGate({ searchParams }: { searchParams: Promise<{ nombre?: string | string[] }> }) {
  const { nombre } = await searchParams;
  const initialName = (Array.isArray(nombre) ? nombre[0] : nombre)?.trim().slice(0, 60) ?? "";
  const next = initialName ? `/crear?nombre=${encodeURIComponent(initialName)}` : "/crear";
  const organizer = await requireOrganizer(next);
  return <Wizard initialName={initialName} ownerName={organizer.name.slice(0, 40)} />;
}

export default function CrearPage({ searchParams }: PageProps<"/crear">) {
  return (
    <Screen className="pt-2">
      <BrandBar action={<MineLink />} />
      <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
        <CreateGate searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}
