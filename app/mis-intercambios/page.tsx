import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { LogoMark } from "@/components/landing/Decor";
import { Avatar, Screen, ScreenTitle } from "@/components/ui/primitives";
import { getOrganizer } from "@/lib/auth/session";
import { getOwnedExchanges } from "@/lib/data/exchanges";
import type { ExchangeSummary } from "@/lib/data/types";
import { t } from "@/lib/i18n";
import { MineList } from "./MineList";

export const metadata: Metadata = { title: "Mis intercambios", robots: { index: false } };

async function Mine() {
  const organizer = await getOrganizer();
  const owned: ExchangeSummary[] = organizer
    ? (await getOwnedExchanges(organizer.uid)).map((e) => ({
        key: `o:${e.id}`,
        exchangeId: e.id,
        name: e.name,
        eventAt: e.eventAt,
        status: e.status,
        participantCount: e.participantCount,
        role: "owner",
        href: `/organizar/${e.id}`,
      }))
    : [];

  return (
    <>
      <div className="flex items-center justify-between pt-4">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <LogoMark />
          <span className="text-xl font-medium tracking-[-0.04em]">{t("brand.name")}</span>
        </Link>
        {organizer && <Avatar name={organizer.name || organizer.email} color="pasto" size={40} />}
      </div>
      <ScreenTitle className="mt-6 mb-4">{t("mine.title")}</ScreenTitle>
      <MineList owned={owned} />
      <div className="mt-4 flex flex-col items-center gap-1.5 text-sm">
        {organizer ? (
          <>
            <span className="text-gris">{t("mine.signedAs", { email: organizer.email })}</span>
            <SignOutButton />
          </>
        ) : (
          <Link href="/entrar?next=/mis-intercambios" className="font-medium underline underline-offset-4">
            {t("mine.signIn")}
          </Link>
        )}
      </div>
    </>
  );
}

export default function MisIntercambiosPage() {
  return (
    <Screen>
      <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
        <Mine />
      </Suspense>
    </Screen>
  );
}
