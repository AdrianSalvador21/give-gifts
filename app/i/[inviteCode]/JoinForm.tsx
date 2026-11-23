"use client";

import { useState, useTransition } from "react";
import { joinExchange } from "@/app/actions/participants";
import { DotButton } from "@/components/ui/DotButton";
import { TextField } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";

export function JoinForm({ inviteCode }: { inviteCode: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      noValidate
      className="flex flex-1 flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed.length < 2 || trimmed.length > 40) {
          setError(t("join.errors.name"));
          return;
        }
        setError(null);
        start(async () => {
          const res = await joinExchange(inviteCode, trimmed);
          // Si sale bien, la acción redirige a la página personal.
          if (res?.error) setError(t(`join.errors.${res.error}`));
        });
      }}
    >
      <TextField
        id="join-name"
        label={t("join.nameLabel")}
        placeholder={t("join.namePlaceholder")}
        value={name}
        maxLength={40}
        autoComplete="given-name"
        onChange={(e) => setName(e.target.value)}
        error={error}
      />
      <p className="text-[13px] leading-snug text-gris">{t("join.note")}</p>
      <div className="mt-auto pt-3">
        <DotButton type="submit" variant="tinta" full disabled={pending}>
          {pending ? t("join.joining") : t("join.submit")}
        </DotButton>
      </div>
    </form>
  );
}
