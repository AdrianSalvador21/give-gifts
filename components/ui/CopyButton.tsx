"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { CheckIcon } from "./icons";

type Status = "idle" | "copied" | "shared" | "manual";

/**
 * Copia `text` al portapapeles. Si el navegador lo bloquea (iframe, http, permisos), intenta
 * `navigator.share`; si tampoco hay, muestra el texto seleccionado para copiarlo a mano.
 */
export function CopyButton({
  text,
  label = t("common.copy"),
  className = "",
  variant = "tinta",
}: {
  text: string;
  label?: string;
  className?: string;
  variant?: "tinta" | "blanco";
}) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const manualRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (status === "manual") manualRef.current?.select();
  }, [status]);

  function flash(next: Status) {
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 1800);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      flash("copied");
      return;
    } catch {
      // Sigue con el respaldo.
    }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        flash("shared");
        return;
      } catch (err) {
        // El usuario cerró la hoja de compartir: no es error.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    setStatus("manual");
  }

  const done = status === "copied" || status === "shared";
  const colors = variant === "blanco" ? "bg-white text-tinta" : "bg-tinta text-white";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={`inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-3.5 text-sm font-medium transition-[transform,background-color] duration-150 ease-rebote active:scale-95 ${
          done ? "bg-pasto text-tinta" : colors
        } ${className}`}
      >
        {done && <CheckIcon size={14} className="gg-dibujar" />}
        <span aria-live="polite">{status === "copied" ? t("common.copied") : status === "shared" ? t("ui.shared") : label}</span>
      </button>
      {status === "manual" && (
        <label className="mt-2 flex w-full basis-full flex-col gap-1 text-[13px] text-gris">
          {t("ui.copyManual")}
          <input
            ref={manualRef}
            readOnly
            value={text}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => setStatus("idle")}
            className="h-11 w-full rounded-[10px] border-2 border-tinta bg-white px-3 text-sm font-medium text-tinta outline-none"
          />
        </label>
      )}
    </>
  );
}
