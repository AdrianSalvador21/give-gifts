"use client";

import { useState, useTransition } from "react";
import { addAssisted } from "@/app/actions/organizer";
import { Alert } from "@/components/ui/Alert";
import { PlusIcon } from "@/components/ui/icons";
import { t } from "@/lib/i18n";

export function AddAssistedForm({ exchangeId }: { exchangeId: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await addAssisted(exchangeId, name);
          if (res.ok) setName("");
          else setError(t(`panel.errors.${res.error === "name" || res.error === "taken" || res.error === "closed" || res.error === "full" || res.error === "paused" ? res.error : "generic"}`));
        });
      }}
    >
      <h3 className="text-base font-medium">{t("panel.addAssistedTitle")}</h3>
      <p className="text-[13px] leading-snug text-gris">{t("panel.addAssistedHint")}</p>
      <label htmlFor="assisted-name" className="sr-only">
        {t("panel.addAssistedLabel")}
      </label>
      <div className="flex gap-2">
        <input
          id="assisted-name"
          value={name}
          maxLength={40}
          placeholder={t("panel.addAssistedLabel")}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          className="h-12 min-w-0 flex-1 rounded-boton border-2 border-transparent bg-crema px-4 text-base outline-none focus:border-tinta aria-invalid:border-coral"
          aria-invalid={error ? true : undefined}
        />
        <button type="submit" disabled={pending} className="flex h-12 shrink-0 items-center gap-1.5 rounded-boton bg-tinta px-4 font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-50">
          <PlusIcon size={16} />
          {t("panel.addAssisted")}
        </button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </form>
  );
}
