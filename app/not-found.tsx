import type { Metadata } from "next";
import Image from "next/image";
import { DotButton } from "@/components/ui/DotButton";
import { BrandBar } from "@/components/ui/BrandBar";
import { Eyebrow, ScreenTitle, SplitShell } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "No encontramos esta página", robots: { index: false } };

export default function NotFound() {
  return (
    <SplitShell
      tone="cielo"
      pattern="papel"
      ratio="mitad"
      width="angosto"
      header={<BrandBar />}
      art={
        <Image
          src="/illustrations/web/08-esperando.webp"
          width={845}
          height={385}
          alt={t("fallback.notFoundAlt")}
          preload
          sizes="(min-width: 1024px) 520px, 340px"
          className="mx-auto mt-2 h-auto w-full max-w-[340px] lg:my-auto lg:max-w-[520px]"
        />
      }
    >
      <div className="flex flex-col gap-2.5">
        <Eyebrow>{t("fallback.notFoundEyebrow")}</Eyebrow>
        <ScreenTitle size="sm">{t("fallback.notFoundTitle")}</ScreenTitle>
        <p className="text-[17px] leading-snug text-gris">{t("fallback.notFoundText")}</p>
      </div>
      <DotButton href="/" variant="tinta" ink full="mobile" className="mt-8 lg:self-start">
        {t("fallback.home")}
      </DotButton>
    </SplitShell>
  );
}
