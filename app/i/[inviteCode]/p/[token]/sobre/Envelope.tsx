"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { revealAssignment } from "@/app/actions/gifts";
import { DotButton } from "@/components/ui/DotButton";
import { t } from "@/lib/i18n";

type Props = {
  inviteCode: string;
  token: string;
  base: string;
  meta: string;
  progress: string;
  mailboxEnabled: boolean;
};

/** P1. El nombre no viene en el HTML: llega solo cuando se pulsa «Abrir mi sobre». */
export function Envelope({ inviteCode, token, base, meta, progress, mailboxEnabled }: Props) {
  const [opened, setOpened] = useState<{ name: string; wishCount: number } | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  if (!opened) {
    return (
      <div className="flex flex-1 flex-col pt-5">
        <h1 className="text-[44px] leading-[0.98] font-medium tracking-[-0.05em]">
          {t("envelope.title1")}
          <br />
          {t("envelope.title2")}
        </h1>
        <p className="mt-3 text-[17px] leading-snug text-gris">{t("envelope.text")}</p>
        <Image src="/illustrations/web/09-revelacion.webp" width={692} height={669} alt={t("envelope.alt")} priority className="mx-auto mt-6 h-[290px] w-auto" />
        <div className="mt-auto flex flex-col gap-3 pt-6">
          {error && (
            <p role="alert" className="rounded-boton bg-white px-4 py-3 text-sm text-[#B23A2A]">
              {t("envelope.error")}
            </p>
          )}
          <DotButton
            variant="pasto"
            full
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await revealAssignment(inviteCode, token);
                if (res.ok) {
                  setError(false);
                  setOpened({ name: res.name, wishCount: res.wishCount });
                } else setError(true);
              })
            }
          >
            {pending ? t("envelope.opening") : t("envelope.open")}
          </DotButton>
          <p className="text-center text-[13px] text-gris">{progress}</p>
        </div>
      </div>
    );
  }

  const ideas =
    opened.wishCount === 0
      ? mailboxEnabled
        ? t("envelope.ideasNone")
        : t("envelope.ideasNoneNoMailbox")
      : opened.wishCount === 1
        ? t("envelope.ideasOne")
        : t("envelope.ideas", { n: opened.wishCount });

  return (
    <div className="flex flex-1 flex-col pt-5">
      <div className="flex flex-col gap-2 rounded-panel bg-pasto px-6 py-[30px]" aria-live="polite">
        <span className="text-base font-medium">{t("envelope.givesTo")}</span>
        <span className="text-[clamp(44px,15vw,64px)] leading-[0.95] font-medium tracking-[-0.06em] break-words">{opened.name}</span>
        <span className="text-[15px]">{meta}</span>
      </div>
      <p className="mt-[18px] text-[17px] leading-snug">{ideas}</p>
      <div className="mt-auto flex flex-col gap-2.5 pt-6">
        <DotButton href={`${base}/persona`} variant="sol" full>
          {t("envelope.seeList")}
        </DotButton>
        <button type="button" onClick={() => setOpened(null)} className="h-12 rounded-boton font-medium">
          {t("envelope.close")}
        </button>
      </div>
    </div>
  );
}
