"use client";

import { useRef, useState, useTransition } from "react";
import { addWish } from "@/app/actions/wishes";
import { Alert } from "@/components/ui/Alert";
import { IdeaChips } from "@/components/ui/EmptySlots";
import { PlusIcon } from "@/components/ui/icons";
import { Chip } from "@/components/ui/primitives";
import { t, type MessageKey } from "@/lib/i18n";

export const ADD_WISH_INPUT_ID = "add-wish";

const IDEAS: MessageKey[] = ["list.ideaBook", "list.ideaCoffee", "list.ideaHome"];

/** Un solo campo: si es un link, el servidor lee la tienda; si no, es una idea en texto. `ideas` muestra chips rápidos. */
export function AddWishForm({ inviteCode, token, full, ideas = false }: { inviteCode: string; token: string; full: boolean; ideas?: boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  if (full) return <Alert tone="info">{t("list.full")}</Alert>;

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return setError(t("list.errors.empty"));
        setError(null);
        start(async () => {
          try {
            const res = await addWish(inviteCode, token, value);
            if (res.ok) setValue("");
            else setError(res.error === "full" ? t("list.full") : t(`list.errors.${res.error}`));
          } catch {
            setError(t("list.errors.generic"));
          }
        });
      }}
    >
      <label htmlFor={ADD_WISH_INPUT_ID} className="text-sm font-medium">
        {t("list.addLabel")}
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id={ADD_WISH_INPUT_ID}
          value={value}
          maxLength={500}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("list.addPlaceholder")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${ADD_WISH_INPUT_ID}-error` : undefined}
          className="h-14 min-w-0 flex-1 rounded-boton border-2 border-arena bg-white px-4 text-base outline-none placeholder:text-gris focus:border-tinta aria-invalid:border-coral"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label={t("list.add")}
          aria-busy={pending || undefined}
          className="trazo-tinta presionable grid size-14 shrink-0 place-items-center rounded-boton bg-pasto disabled:opacity-60"
        >
          {pending ? <span className="size-5 animate-spin rounded-full border-2 border-tinta border-t-transparent" /> : <PlusIcon size={20} />}
        </button>
      </div>
      {pending && (
        <p className="text-sm text-gris" role="status">
          {t("list.adding")}
        </p>
      )}
      {error && (
        <div id={`${ADD_WISH_INPUT_ID}-error`}>
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {ideas && (
        <IdeaChips label={t("list.ideasLabel")} className="mt-1">
          {IDEAS.map((k) => (
            <Chip
              key={k}
              className="border-2 border-arena"
              onClick={() => {
                setValue(t(k));
                setError(null);
                inputRef.current?.focus();
              }}
            >
              {t(k)}
            </Chip>
          ))}
        </IdeaChips>
      )}
    </form>
  );
}
