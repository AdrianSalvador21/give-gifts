"use client";

import { useState, useTransition } from "react";
import { revealAssignment } from "@/app/actions/gifts";
import { Alert } from "@/components/ui/Alert";
import { DotButton, TextButton } from "@/components/ui/DotButton";
import { EnvelopeReveal } from "@/components/ui/EnvelopeReveal";
import { Eyebrow, HandNote, Pill } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";

type Props = {
  inviteCode: string;
  token: string;
  /** Links a Tu persona y al Buzón (ya llevan `?desde=` si aplica). */
  personHref: string;
  mailboxHref: string;
  budget: string;
  date: string;
  progress: string;
  mailboxEnabled: boolean;
};

/** P1. El nombre no viene en el HTML: llega solo cuando se pulsa «Abrir mi sobre» (revealAssignment). */
export function Envelope({ inviteCode, token, personHref, mailboxHref, budget, date, progress, mailboxEnabled }: Props) {
  const [opened, setOpened] = useState<{ name: string; wishCount: number } | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const open = () =>
    start(async () => {
      try {
        const res = await revealAssignment(inviteCode, token);
        if (res.ok) {
          setError(false);
          setOpened({ name: res.name, wishCount: res.wishCount });
        } else setError(true);
      } catch {
        setError(true); // sin red
      }
    });

  const ideas = !opened
    ? ""
    : opened.wishCount === 0
      ? mailboxEnabled
        ? t("envelope.ideasNone")
        : t("envelope.ideasNoneNoMailbox")
      : opened.wishCount === 1
        ? t("envelope.ideasOne")
        : t("envelope.ideas", { n: opened.wishCount });

  const ideasPill = !opened
    ? null
    : opened.wishCount === 0
      ? t("envelope.ideasPillNone")
      : opened.wishCount === 1
        ? t("envelope.ideasPillOne")
        : t("envelope.ideasPill", { n: opened.wishCount });

  return (
    <div className="flex flex-1 flex-col items-center pt-4 text-center md:pt-6">
      <Eyebrow className={opened ? "md:sr-only" : ""}>{opened ? t("envelope.eyebrowOpen") : t("envelope.eyebrowClosed")}</Eyebrow>
      {!opened && (
        <>
          <h1 className="mt-2 text-[44px] leading-[0.98] font-medium tracking-[-0.05em] text-balance md:text-[56px]">
            {t("envelope.title1")} {t("envelope.title2")}
          </h1>
          <p className="mt-3 max-w-[420px] text-[17px] leading-snug">{t("envelope.text")}</p>
        </>
      )}

      <div className={`relative w-full ${opened ? "mt-2 md:mt-0" : "mt-6"}`}>
        <EnvelopeReveal name={opened?.name ?? null} pending={pending} onOpen={open} className="max-w-[360px] md:max-w-[520px]">
          <div className="flex flex-wrap justify-center gap-2">
            <Pill tone="blanco">{budget}</Pill>
            <Pill tone="crema">{date}</Pill>
            <Pill tone="sol">{ideasPill}</Pill>
          </div>
          {/* Con ideas, la pill ya lo dice; sin ideas, la frase orienta (buzón o volver después). */}
          {opened?.wishCount === 0 && <p className="mx-auto mt-3 max-w-[440px] text-[15px] leading-snug">{ideas}</p>}
          {opened && opened.wishCount > 0 && <p className="sr-only">{ideas}</p>}
        </EnvelopeReveal>
        {opened && (
          // Nota al margen: junto al sobre en pantallas anchas, debajo en el celular.
          <HandNote
            rotate={-6}
            className="mt-4 animate-entrada text-[22px] [animation-delay:1100ms] md:absolute md:top-[38%] md:right-0 md:mt-0 md:w-[200px] md:text-[26px] lg:-right-6 xl:-right-16"
          >
            {t("envelope.shh")}
          </HandNote>
        )}
      </div>

      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8 md:mt-6 md:pt-0">
        {error && (
          <Alert tone="error" className="w-full max-w-[440px] text-left">
            {t("envelope.error")}
          </Alert>
        )}
        {opened ? (
          <>
            <div className="flex w-full flex-col gap-2.5 md:w-auto md:flex-row md:justify-center">
              <DotButton href={personHref} variant="sol" ink full="mobile" className="md:w-auto" transitionTypes={["nav-forward"]}>
                {t("envelope.seeList")}
              </DotButton>
              {mailboxEnabled && (
                <DotButton href={mailboxHref} variant="blanco" full="mobile" className="md:w-auto" transitionTypes={["nav-forward"]}>
                  {t("envelope.ask")}
                </DotButton>
              )}
            </div>
            <TextButton onClick={() => setOpened(null)}>{t("envelope.close")}</TextButton>
          </>
        ) : (
          <>
            <DotButton variant="sol" ink full="mobile" className="md:w-auto md:min-w-[280px]" disabled={pending} onClick={open}>
              {pending ? t("envelope.opening") : t("envelope.open")}
            </DotButton>
            <p className="text-[13px]">{progress}</p>
          </>
        )}
      </div>
    </div>
  );
}
