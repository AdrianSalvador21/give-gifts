"use client";

import { useState, useTransition } from "react";
import { markBought, planGift, unmarkBought } from "@/app/actions/gifts";
import { Alert } from "@/components/ui/Alert";
import { DotButton, TextButton } from "@/components/ui/DotButton";
import { CheckIcon } from "@/components/ui/icons";
import { t } from "@/lib/i18n";
import type { Desde } from "@/lib/nav";

/** «Lo voy a regalar» / «Lo vas a regalar tú · Cambiar». */
export function PlanButton({ inviteCode, token, wishId, planned }: { inviteCode: string; token: string; wishId: string; planned: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const run = (id: string | null) =>
    start(async () => {
      try {
        const res = await planGift(inviteCode, token, id);
        setError(!res.ok);
      } catch {
        setError(true);
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {planned ? (
        <>
          <span className="inline-flex h-9 animate-pop items-center gap-1.5 rounded-full bg-pasto px-3 text-[13px] font-medium">
            <CheckIcon size={12} className="gg-dibujar" />
            {t("person.planned")}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(null)}
            className="inline-flex min-h-11 items-center px-1 text-[13px] font-medium text-gris underline underline-offset-4 disabled:opacity-50"
          >
            {t("person.unplan")}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => run(wishId)}
          className="h-11 rounded-[12px] bg-tinta px-3.5 text-[13px] font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
        >
          {t("person.plan")}
        </button>
      )}
      {error && (
        <p role="alert" className="basis-full text-[13px] text-coral-700">
          {t("person.error")}
        </p>
      )}
    </div>
  );
}

export function BoughtButton({ inviteCode, token, desde }: { inviteCode: string; token: string; desde: Desde | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <>
      <DotButton
        variant="blanco"
        full
        icon="check"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          start(async () => {
            // Si sale bien, la acción redirige a /compre.
            const res = await markBought(inviteCode, token, desde);
            if (res && !res.ok) setError(true);
          })
        }
      >
        {t("person.bought")}
      </DotButton>
      {error && <Alert tone="error">{t("person.error")}</Alert>}
    </>
  );
}

/** «Deshacer, aún no lo compro» (en /compre y en Tu persona). Si sale bien, la acción redirige a /persona. */
export function UndoBoughtButton({ inviteCode, token, desde, className = "" }: { inviteCode: string; token: string; desde: Desde | null; className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <div className={`flex flex-col items-center gap-1 lg:items-start ${className}`}>
      <TextButton
        disabled={pending}
        aria-busy={pending || undefined}
        className="text-[15px] text-gris underline"
        onClick={() =>
          start(async () => {
            // Como BoughtButton: si sale bien, la acción redirige (no se envuelve en try/catch para no atrapar la redirección).
            const res = await unmarkBought(inviteCode, token, desde);
            if (res && !res.ok) setError(true);
          })
        }
      >
        {pending ? t("bought.undoing") : t("bought.undo")}
      </TextButton>
      {error && (
        <p role="alert" className="text-[13px] text-coral-700">
          {t("bought.undoError")}
        </p>
      )}
    </div>
  );
}
