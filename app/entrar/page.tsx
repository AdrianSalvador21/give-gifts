import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/landing/Decor";
import { Screen, ScreenTitle } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function EntrarPage() {
  return (
    <Screen className="gap-6 pt-5">
      <Link href="/" className="flex items-center gap-2.5 self-start">
        <LogoMark />
        <span className="text-[22px] font-medium tracking-[-0.04em]">{t("brand.name")}</span>
      </Link>
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
