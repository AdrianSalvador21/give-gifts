"use client";

import { useCallback, useState, useTransition } from "react";
import { redoDraw } from "@/app/actions/draw";
import { setRegistrationOpen } from "@/app/actions/organizer";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { TextButton } from "@/components/ui/DotButton";
import { Card } from "@/components/ui/primitives";
import { Toast } from "@/components/ui/Toast";
import { t } from "@/lib/i18n";
import { DeleteExchange } from "./DeleteExchange";

type Redo = null | { stage: "confirm" } | { stage: "revealed"; n: number };

/**
 * Controles poco frecuentes del panel: cerrar/abrir inscripciones (antes del sorteo), rehacer el sorteo
 * (después; con segunda confirmación si alguien ya abrió su sobre) y borrar el intercambio.
 */
export function PanelOptions({ exchangeId, exchangeName, drawn, registrationOpen }: { exchangeId: string; exchangeName: string; drawn: boolean; registrationOpen: boolean }) {
  const [redo, setRedo] = useState<Redo>(null);
  const [redoError, setRedoError] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const closeToast = useCallback(() => setToast(null), []);

  function toggleRegistration() {
    setRegError(null);
    start(async () => {
      const res = await setRegistrationOpen(exchangeId, !registrationOpen);
      if (res.ok) setToast(t("panel.registrationDone"));
      else setRegError(t(res.error === "closed" ? "panel.errors.closed" : "panel.errors.generic"));
    });
  }

  function runRedo(confirm: boolean) {
    setRedoError(null);
    start(async () => {
      const res = await redoDraw(exchangeId, confirm ? { confirm: true } : undefined);
      if (res.ok) {
        setRedo(null);
        setToast(t("panel.redoDone"));
      } else if (res.error === "confirm") {
        setRedo({ stage: "revealed", n: res.revealed ?? 1 });
      } else {
        setRedoError(t(res.error === "not-drawn" ? "panel.errors.notDrawn" : "panel.errors.generic"));
      }
    });
  }

  // Igual que en GroupRow: el cierre nativo del <dialog> llega después; solo cierra la etapa que sigue abierta.
  const closeStage = (stage: "confirm" | "revealed") => () => setRedo((r) => (r?.stage === stage ? null : r));

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">{t("panel.optionsTitle")}</h2>

      {!drawn && (
        <div className="flex flex-col gap-1">
          <p className="text-sm leading-snug text-gris">{registrationOpen ? t("panel.registrationOpenText") : t("panel.registrationClosed")}</p>
          <TextButton onClick={toggleRegistration} disabled={pending} aria-busy={pending || undefined} className="-mx-3 self-start text-[15px] underline underline-offset-4">
            {registrationOpen ? t("panel.closeRegistration") : t("panel.openRegistration")}
          </TextButton>
          {regError && <Alert tone="error">{regError}</Alert>}
        </div>
      )}

      {drawn && (
        <div className="flex flex-col gap-1">
          <p className="text-sm leading-snug text-gris">{t("panel.redoText")}</p>
          <TextButton
            onClick={() => {
              setRedoError(null);
              setRedo({ stage: "confirm" });
            }}
            className="-mx-3 self-start text-[15px] underline underline-offset-4"
          >
            {t("panel.redoDraw")}
          </TextButton>
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-arena pt-4">
        <p className="text-sm leading-snug text-gris">{t("panel.deleteText")}</p>
        <DeleteExchange exchangeId={exchangeId} exchangeName={exchangeName} />
      </div>

      <ConfirmDialog
        open={redo?.stage === "confirm"}
        onClose={closeStage("confirm")}
        onConfirm={() => runRedo(false)}
        title={t("panel.redoDraw")}
        description={t("panel.redoConfirm")}
        confirmLabel={t("panel.redoYes")}
        tone="peligro"
        pending={pending}
        error={redo?.stage === "confirm" ? redoError : null}
      />
      <ConfirmDialog
        open={redo?.stage === "revealed"}
        onClose={closeStage("revealed")}
        onConfirm={() => runRedo(true)}
        title={t("panel.redoDraw")}
        description={redo?.stage === "revealed" ? (redo.n === 1 ? t("panel.redoConfirmRevealedOne") : t("panel.redoConfirmRevealed", { n: redo.n })) : undefined}
        confirmLabel={t("panel.redoYes")}
        tone="peligro"
        pending={pending}
        error={redo?.stage === "revealed" ? redoError : null}
      />
      <Toast open={toast !== null} onClose={closeToast}>
        {toast}
      </Toast>
    </Card>
  );
}
