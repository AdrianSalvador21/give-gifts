"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { Sheet } from "@/components/ui/Dialog";
import { DotButton, TextButton } from "@/components/ui/DotButton";
import { whatsappHref } from "@/lib/format";
import { t } from "@/lib/i18n";

/** Caja blanca con el link recortado + «Copiar». */
export function LinkBox({ link }: { link: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-boton bg-white py-1.5 pr-1.5 pl-3">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{link.replace(/^https?:\/\//, "")}</span>
      <CopyButton text={link} />
    </div>
  );
}

/**
 * Primera visita (?nuevo=1, lo pone joinExchange al redirigir): antes de nada, pide guardar el link.
 * Al cerrar quita el parámetro de la URL para que no vuelva a salir al recargar ni se guarde así en favoritos.
 */
export function FirstVisitSheet({ link, exchangeName }: { link: string; exchangeName: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Se abre tras montar: <dialog>.showModal() solo existe en el navegador.
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("nuevo")) {
      url.searchParams.delete("nuevo");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, []);

  return (
    <Sheet open={open} onClose={close} title={t("home.firstTitle")} description={t("home.firstText")}>
      <LinkBox link={link} />
      <div className="flex flex-col gap-1.5">
        <DotButton
          href={whatsappHref(t("home.saveWhatsappText", { exchange: exchangeName, link }))}
          target="_blank"
          rel="noopener noreferrer"
          variant="pasto"
          size="sm"
          ink
          full
        >
          {t("home.saveWhatsapp")}
        </DotButton>
        <TextButton onClick={close}>{t("home.firstDone")}</TextButton>
      </div>
    </Sheet>
  );
}
