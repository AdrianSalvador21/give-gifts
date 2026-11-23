"use client";

import { useState, useTransition } from "react";
import { addWish } from "@/app/actions/wishes";
import { PlusIcon } from "@/components/ui/icons";
import { t } from "@/lib/i18n";

export function AddWishForm({ inviteCode, token, full }: { inviteCode: string; token: string; full: boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (full) return <p className="rounded-boton bg-white px-4 py-3 text-sm">{t("list.full")}</p>;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return setError(t("list.errors.empty"));
        setError(null);
        start(async () => {
          const res = await addWish(inviteCode, token, value);
          if (res.ok) setValue("");
          else setError(t(`list.errors.${res.error === "full" ? "generic" : res.error}`));
        });
      }}
    >
      <label htmlFor="add-wish" className="text-sm font-medium">
        {t("list.addLabel")}
      </label>
      <div className="flex gap-2">
        <input
          id="add-wish"
          value={value}
          maxLength={500}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("list.addPlaceholder")}
          aria-invalid={error ? true : undefined}
          className="h-14 min-w-0 flex-1 rounded-boton border-2 border-transparent bg-white px-4 text-base outline-none placeholder:text-gris focus:border-tinta"
        />
        <button type="submit" disabled={pending} aria-label={t("list.add")} className="grid size-14 shrink-0 place-items-center rounded-boton bg-pasto disabled:opacity-50">
          {pending ? <span className="size-5 animate-spin rounded-full border-2 border-tinta border-t-transparent" /> : <PlusIcon size={20} />}
        </button>
      </div>
      {pending && <p className="text-sm text-gris">{t("list.adding")}</p>}
      {error && <p className="text-sm text-[#B23A2A]">{error}</p>}
    </form>
  );
}
