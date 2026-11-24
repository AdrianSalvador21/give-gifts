"use client";

import Image from "next/image";
import { useEffect } from "react";
import { DotButton } from "@/components/ui/DotButton";
import { BrandBar } from "@/components/ui/BrandBar";
import { Eyebrow, ScreenTitle, SplitShell } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <SplitShell
      tone="sol"
      pattern="papel"
      ratio="mitad"
      width="angosto"
      header={<BrandBar />}
      art={
        <Image
          src="/illustrations/web/13-exclusiones.webp"
          width={897}
          height={527}
          alt=""
          sizes="(min-width: 1024px) 520px, 320px"
          className="mx-auto mt-2 h-auto w-full max-w-[320px] lg:my-auto lg:max-w-[520px]"
        />
      }
    >
      <div className="flex flex-col gap-2.5">
        <Eyebrow>{t("fallback.errorEyebrow")}</Eyebrow>
        <ScreenTitle size="sm">{t("fallback.errorTitle")}</ScreenTitle>
        <p className="text-[17px] leading-snug text-gris">{t("fallback.errorText")}</p>
        {digest && <p className="cifra text-sm text-gris">{t("fallback.code", { digest })}</p>}
      </div>
      <div className="mt-8 flex flex-col gap-3 lg:flex-row">
        <DotButton onClick={() => retry()} variant="tinta" ink full="mobile">
          {t("fallback.retry")}
        </DotButton>
        <DotButton href="/" variant="blanco" full="mobile">
          {t("fallback.home")}
        </DotButton>
      </div>
    </SplitShell>
  );
}
