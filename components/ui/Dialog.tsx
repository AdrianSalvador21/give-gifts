"use client";

import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { CloseIcon } from "./icons";

/**
 * Hoja modal sobre <dialog> nativo (foco atrapado, Esc cierra, fondo inerte).
 * Móvil: hoja que sube desde abajo. sm+: tarjeta centrada con trazo tinta.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    // Con cacheComponents la página anterior queda oculta en <Activity> (display:none) y conserva el DOM:
    // un showModal() abierto ahí dejaría inerte la página nueva. Al ocultarse corre esta limpieza y lo cierra.
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clic en el fondo (fuera de la caja) cierra.
        if (e.target === e.currentTarget) onClose();
      }}
      className={`m-0 mt-auto w-full max-w-none bg-transparent p-0 text-tinta backdrop:bg-tinta/45 open:animate-hoja sm:m-auto sm:max-w-[440px] ${className}`}
    >
      <div className="flex flex-col gap-4 rounded-t-panel bg-crema px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-panel sm:trazo-tinta sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="pt-1.5 text-[24px] leading-tight font-medium tracking-[-0.03em]">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("ui.close")} className="grid size-11 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90">
            <CloseIcon />
          </button>
        </div>
        {description && (
          <div id={descId} className="text-[15px] leading-snug text-gris">
            {description}
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}

/**
 * Confirmación para acciones destructivas o irreversibles (quitar a alguien, borrar deseo, sortear).
 * El botón de confirmar es coral si `tone="peligro"`. Cancelar recibe el foco inicial.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = t("ui.confirm"),
  cancelLabel = t("common.cancel"),
  tone = "peligro",
  pending = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "peligro" | "normal";
  pending?: boolean;
  /** Mensaje de error del intento (se anuncia con role="alert"). */
  error?: string | null;
}) {
  return (
    <Sheet open={open} onClose={pending ? () => {} : onClose} title={title} description={description}>
      {error && (
        <p role="alert" className="rounded-boton bg-coral-50 px-4 py-3 text-sm text-coral-700">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <button
          type="button"
          autoFocus
          onClick={onClose}
          disabled={pending}
          className="min-h-12 rounded-boton bg-white px-5 font-medium transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          aria-busy={pending || undefined}
          className={`trazo-tinta presionable min-h-12 rounded-boton px-5 font-medium disabled:opacity-60 ${tone === "peligro" ? "bg-coral" : "bg-pasto"}`}
        >
          {pending ? t("common.loading") : confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
