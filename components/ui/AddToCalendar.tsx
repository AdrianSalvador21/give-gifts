"use client";

import { track } from "@vercel/analytics";
import { useState } from "react";
import { useBrowserValue } from "@/components/organizer/useBrowserValue";
import { t } from "@/lib/i18n";
import { isInAppBrowser } from "@/lib/webview";
import { Sheet } from "./Dialog";
import { ArrowIcon, CalendarIcon, ClockIcon } from "./icons";
import { HandNote } from "./primitives";

type Props = {
  /** Ruta del .ics (route handler del link personal o del panel). */
  icsHref: string;
  /** Link de Google Calendar (lib/calendar: googleCalendarHref). */
  googleHref: string;
  /** Subtítulo de la hoja: «Posada de los primos · sáb 20 dic, 19:00». */
  summary: string;
  role: "participant" | "owner";
  /** `boton`: ancho completo con trazo (tarjeta de la fecha). `link`: texto subrayado (en líneas de detalle). */
  variant?: "boton" | "link" | "fantasma";
  className?: string;
};

const option =
  "flex min-h-[72px] items-center gap-3.5 rounded-tarjeta border-2 bg-white px-3.5 py-3 text-tinta no-underline transition-transform active:scale-[0.99]";

/** «Agregar a mi calendario»: hoja con el .ics (Apple, Outlook; alarma 3 días antes) y Google Calendar. */
export function AddToCalendar({ icsHref, googleHref, summary, role, variant = "boton", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  // En WhatsApp/Instagram la descarga del .ics suele fallar: se avisa que lo abran en el navegador.
  const webview = useBrowserValue(() => isInAppBrowser(navigator.userAgent), false);
  const added = (kind: "ics" | "google") => {
    try {
      track("calendar_added", { kind, role });
    } catch {
      // La analítica nunca debe romper la acción.
    }
  };

  const trigger =
    variant === "link"
      ? "inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium underline underline-offset-4"
      : variant === "fantasma"
        ? "flex h-[52px] items-center justify-center gap-2 rounded-boton bg-white px-4 text-[15px] font-medium transition-transform active:scale-[0.98] lg:h-11"
        : "flex h-12 w-full items-center justify-center gap-2 rounded-boton border-2 border-tinta bg-hueso px-4 text-[15px] font-medium transition-transform active:scale-[0.98]";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`cursor-pointer ${trigger} ${className}`} aria-haspopup="dialog">
        {variant !== "link" && <CalendarIcon size={18} />}
        {t("calendar.add")}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("calendar.title")} description={summary}>
        <a
          href={icsHref}
          download
          onClick={() => added("ics")}
          className={`${option} trazo-tinta border-tinta`}
        >
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-cielo-50">
            <CalendarIcon size={22} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base font-semibold">{t("calendar.ics")}</span>
            <span className="text-[13px] text-gris">{t("calendar.icsHint")}</span>
          </span>
          <ArrowIcon size={16} />
        </a>
        <a href={googleHref} target="_blank" rel="noopener noreferrer" onClick={() => added("google")} className={`${option} border-linea`}>
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-pasto-50">
            <ClockIcon size={22} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base font-semibold">{t("calendar.google")}</span>
            <span className="text-[13px] text-gris">{t("calendar.googleHint")}</span>
          </span>
          <ArrowIcon size={16} />
        </a>
        <p className="flex items-start gap-2.5 rounded-boton bg-sol-50 px-3.5 py-3 text-[13px] leading-snug">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-sol outline outline-1 outline-tinta" />
          <span>
            <strong className="font-semibold">{t("calendar.alarmTitle")}</strong> {t("calendar.alarmText")}
          </span>
        </p>
        {webview && <p className="text-center text-[13px] leading-snug text-gris">{t("calendar.webview")}</p>}
        <HandNote className="self-end text-[18px]" rotate={-3}>
          {t("calendar.note")}
        </HandNote>
      </Sheet>
    </>
  );
}
