"use client";

import { useState, useTransition } from "react";
import { joinExchange } from "@/app/actions/participants";
import { Alert } from "@/components/ui/Alert";
import { DotButton } from "@/components/ui/DotButton";
import { TextField } from "@/components/ui/primitives";
import type { JoinError } from "@/lib/data/participants";
import { whatsappHref } from "@/lib/format";
import { t } from "@/lib/i18n";

/** Errores que tienen que ver con el nombre escrito: se muestran pegados al campo. El resto, en un aviso. */
const FIELD_ERRORS = new Set<JoinError>(["name", "taken"]);

export function JoinForm({ inviteCode, exchangeName, owner }: { inviteCode: string; exchangeName: string; owner: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<{ code: JoinError; owner: string; name: string } | null>(null);
  const [pending, start] = useTransition();

  const who = error?.owner || owner;
  const fieldError = error && FIELD_ERRORS.has(error.code) ? t(`join.errors.${error.code}`) : null;

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed.length < 2 || trimmed.length > 40) {
          setError({ code: "name", owner, name: trimmed });
          return;
        }
        setError(null);
        start(async () => {
          const res = await joinExchange(inviteCode, trimmed);
          // Si sale bien, la acción redirige a la página personal.
          if (res?.error) setError({ code: res.error, owner: res.owner ?? owner, name: trimmed });
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
        error={fieldError}
      />

      {/* «¿Eres tú?»: si el nombre ya existe, quizá es la misma persona que perdió su link. */}
      {error?.code === "taken" && who && (
        <Alert
          tone="info"
          title={t("join.takenIsYou", { owner: who })}
        >
          <div className="mt-2 flex">
            <DotButton
              href={whatsappHref(t("join.askLinkText", { owner: who, exchange: exchangeName, name: error.name }))}
              target="_blank"
              rel="noopener noreferrer"
              variant="pasto"
              size="sm"
            >
              {t("join.askLink")}
            </DotButton>
          </div>
        </Alert>
      )}

      {error && !FIELD_ERRORS.has(error.code) && <Alert tone="error">{t(`join.errors.${error.code}`)}</Alert>}

      <p className="text-[13px] leading-snug text-gris">{t("join.note")}</p>
      <div className="pt-2">
        <DotButton type="submit" variant="tinta" ink full disabled={pending}>
          {pending ? t("join.joining") : t("join.submit")}
        </DotButton>
      </div>
    </form>
  );
}
