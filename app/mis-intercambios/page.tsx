import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AppShell } from "@/components/ui/AppShell";
import { BrandBar } from "@/components/ui/BrandBar";
import { Avatar } from "@/components/ui/primitives";
import { PageTransition } from "@/components/ui/Transitions";
import { getOrganizer } from "@/lib/auth/session";
import { getOwnedExchanges, getOwnerParticipant } from "@/lib/data/exchanges";
import type { ExchangeSummary } from "@/lib/data/types";
import { t } from "@/lib/i18n";
import { ownerSteps } from "@/lib/ownerSteps";
import { MineList } from "./MineList";

export const metadata: Metadata = { title: "Mis intercambios", robots: { index: false } };

async function Mine() {
  const organizer = await getOrganizer();
  const exchanges = organizer ? await getOwnedExchanges(organizer.uid) : [];
  // Si también participa: su registro (1 lectura por intercambio) da «Mi lista» y el siguiente paso.
  const owners = await Promise.all(exchanges.map((e) => getOwnerParticipant(e)));
  const owned: ExchangeSummary[] = exchanges.map((e, i) => {
    const me = owners[i];
    const steps = ownerSteps({
      participates: Boolean(me),
      drawn: e.status === "drawn",
      total: e.participantCount,
      wishCount: me?.wishCount ?? 0,
      revealed: Boolean(me?.revealed),
      bought: Boolean(me?.bought),
    });
    return {
      key: `o:${e.id}`,
      exchangeId: e.id,
      name: e.name,
      eventAt: e.eventAt,
      timeZone: e.timeZone,
      status: e.status,
      participantCount: e.participantCount,
      role: "owner",
      href: `/organizar/${e.id}`,
      ...(me?.path && { listHref: `${me.path}/lista`, wishCount: me.wishCount, revealed: me.revealed, bought: me.bought }),
      nextStep: steps.find((s) => s.state === "current")?.key ?? null,
      stepsDone: steps.filter((s) => s.state === "done").length,
      stepsTotal: steps.length,
    };
  });

  return (
    <>
      <BrandBar
        action={
          organizer && (
            <span className="flex items-center gap-2.5">
              <span className="hidden max-w-[220px] truncate text-sm text-gris md:inline">{organizer.email}</span>
              <Avatar name={organizer.name || organizer.email} color="pasto" size={40} />
            </span>
          )
        }
      />
      <MineList owned={owned} />
      <div className="mt-6 flex flex-col items-center gap-0.5 text-sm lg:items-start">
        {organizer ? (
          <>
            <span className="text-gris">{t("mine.signedAs", { email: organizer.email })}</span>
            <SignOutButton />
          </>
        ) : (
          <Link href="/entrar?next=/mis-intercambios" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
            {t("mine.signIn")}
          </Link>
        )}
      </div>
    </>
  );
}

export default function MisIntercambiosPage() {
  return (
    <AppShell variant="tablero" pattern="puntos" className="pt-2">
      <PageTransition>
        <Suspense
          fallback={
            <>
              <BrandBar />
              <p className="pt-10 text-gris">{t("common.loading")}</p>
            </>
          }
        >
          <Mine />
        </Suspense>
      </PageTransition>
    </AppShell>
  );
}
