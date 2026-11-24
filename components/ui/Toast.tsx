"use client";

import { useEffect, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { CloseIcon } from "./icons";

/**
 * Aviso flotante abajo al centro (encima de la barra de gestos). Se cierra solo tras `duration` ms.
 * `tone="error"` → role="alert"; si no, role="status". Monta el componente siempre y controla `open`.
 */
export function Toast({
  open,
  onClose,
  children,
  tone = "exito",
  duration = 3200,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  tone?: "exito" | "error" | "info";
  duration?: number;
}) {
  useEffect(() => {
    if (!open || duration <= 0) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [open, duration, onClose]);

  const dot = tone === "error" ? "bg-coral" : tone === "info" ? "bg-cielo" : "bg-pasto";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
    >
      {open && (
        <div className="pointer-events-auto flex max-w-[440px] animate-hoja items-center gap-3 rounded-boton bg-tinta py-2 pr-2 pl-4 text-[15px] font-medium text-white shadow-tinta-sm">
          <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${dot}`} />
          <span className="min-w-0 flex-1">{children}</span>
          <button type="button" onClick={onClose} aria-label={t("ui.close")} className="grid size-11 shrink-0 place-items-center rounded-full transition-transform active:scale-90">
            <CloseIcon size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
