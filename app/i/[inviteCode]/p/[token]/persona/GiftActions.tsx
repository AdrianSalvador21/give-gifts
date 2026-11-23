"use client";

import { useState, useTransition } from "react";
import { markBought, planGift } from "@/app/actions/gifts";
import { DotButton } from "@/components/ui/DotButton";
import { CheckIcon } from "@/components/ui/icons";
import { t } from "@/lib/i18n";

/** «Lo voy a regalar» / «Lo vas a regalar tú · Cambiar». */
export function PlanButton({ inviteCode, token, wishId, planned }: { inviteCode: string; token: string; wishId: string; planned: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const run = (id: string | null) =>
    start(async () => {
      const res = await planGift(inviteCode, token, id);
      setError(!res.ok);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {planned ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pasto px-3 py-1.5 text-[13px] font-medium">
            <CheckIcon size={12} />
            {t("person.planned")}
          </span>
          <button type="button" disabled={pending} onClick={() => run(null)} className="text-[13px] font-medium text-gris underline underline-offset-4">
            {t("person.unplan")}
          </button>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={() => run(wishId)} className="h-9 rounded-[10px] bg-tinta px-3 text-[13px] font-medium text-white disabled:opacity-50">
          {t("person.plan")}
        </button>
      )}
      {error && <span className="text-[13px] text-[#B23A2A]">{t("person.error")}</span>}
    </div>
  );
}

export function BoughtButton({ inviteCode, token }: { inviteCode: string; token: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <>
      <DotButton
        variant="blanco"
        full
        icon="check"
        disabled={pending}
        onClick={() =>
          start(async () => {
            // Si sale bien, la acción redirige a /compre.
            const res = await markBought(inviteCode, token);
            if (res && !res.ok) setError(true);
          })
        }
      >
        {t("person.bought")}
      </DotButton>
      {error && <p className="text-sm text-[#B23A2A]">{t("person.error")}</p>}
    </>
  );
}
