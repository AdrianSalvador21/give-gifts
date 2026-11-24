"use client";

import { useState, useTransition } from "react";
import { deleteExchange } from "@/app/actions/organizer";
import { Alert } from "@/components/ui/Alert";
import { Sheet } from "@/components/ui/Dialog";
import { TextButton } from "@/components/ui/DotButton";
import { TextField } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";

const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-MX");

/**
 * «Borrar intercambio» con confirmación fuerte: hay que escribir el nombre. Si sale bien, la acción
 * redirige a /mis-intercambios; aquí solo llegan errores.
 */
export function DeleteExchange({ exchangeId, exchangeName, className = "" }: { exchangeId: string; exchangeName: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const matches = normalize(typed) === normalize(exchangeName);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setTyped("");
    setError(null);
  };

  return (
    <>
      <TextButton onClick={() => setOpen(true)} className={`-mx-3 self-start text-[15px] text-coral-700 underline underline-offset-4 ${className}`}>
        {t("panel.deleteExchange")}
      </TextButton>
      <Sheet open={open} onClose={close} title={t("panel.deleteExchange")} description={t("panel.deleteConfirm", { name: exchangeName })}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!matches) return;
            setError(null);
            start(async () => {
              const res = await deleteExchange(exchangeId);
              if (res && !res.ok) setError(t("panel.errors.generic"));
            });
          }}
        >
          <TextField
            id="delete-exchange-name"
            label={t("panel.deleteTypeName")}
            placeholder={exchangeName}
            value={typed}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
          />
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="min-h-12 rounded-boton bg-white px-5 font-medium transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!matches || pending}
              aria-busy={pending || undefined}
              className="trazo-tinta presionable min-h-12 rounded-boton bg-coral px-5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? t("common.loading") : t("panel.deleteYes")}
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
