// Evento del intercambio para el calendario: archivo .ics (Apple, Outlook) y link de Google Calendar.
// El evento dura 3 horas y lleva el link para volver a la página (personal o del panel).

import { DEFAULT_TIME_ZONE, type Exchange } from "@/lib/data/types";
import { formatMoney, isValidTimeZone } from "@/lib/format";
import { t } from "@/lib/i18n";

/** Duración del evento en el calendario. */
const DURATION_MS = 3 * 60 * 60 * 1000;

export type CalendarEvent = {
  /** Estable por intercambio: si se vuelve a importar, el calendario lo reconoce como el mismo evento. */
  uid: string;
  title: string;
  startIso: string;
  place: string | null;
  description: string;
  url: string;
  /** Texto de la alarma (3 días antes). */
  alarm: string;
};

/** 2026-12-20T01:00:00.000Z → 20261220T010000Z */
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escapa un valor TEXT de RFC 5545: \ ; , y saltos de línea. */
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Corta una línea a 75 octetos (RFC 5545 §3.1); las continuaciones empiezan con un espacio. Respeta los caracteres UTF-8. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // la continuación ya trae el espacio inicial
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** Archivo .ics con un solo evento y una alarma 3 días antes. Horas en UTC para no tener que escribir VTIMEZONE. */
export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const start = new Date(event.startIso);
  const end = new Date(start.getTime() + DURATION_MS);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//givegifts//es-MX",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.place ? [`LOCATION:${escapeText(event.place)}`] : []),
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.url}`,
    "BEGIN:VALARM",
    "TRIGGER:-P3D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(event.alarm)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/**
 * Link para agregar el evento a Google Calendar. Las horas van en UTC y `ctz` muestra la zona del intercambio.
 * Google no acepta alarmas en el link: quien lo agrega pone la suya.
 */
export function googleCalendarHref({ title, startIso, place, description, timeZone }: { title: string; startIso: string; place: string | null; description?: string; timeZone?: string | null }): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + DURATION_MS);
  const ctz = timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${utc(start)}/${utc(end)}`, ctz });
  if (place) params.set("location", place);
  if (description) params.set("details", description);
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Nombre del archivo: el código de invitación ya es un slug legible («primos-7qk2.ics»). */
export const icsFileName = (inviteCode: string) => `${inviteCode.replace(/[^a-z0-9-]/gi, "") || "intercambio"}.ics`;

/** Evento y link de Google de un intercambio. `url` es el link para volver: el personal o el del panel. */
export function exchangeCalendar(exchange: Pick<Exchange, "id" | "name" | "eventAt" | "place" | "budget" | "timeZone">, url: string) {
  const description = t("calendar.description", { budget: formatMoney(exchange.budget.amount), link: url });
  const event: CalendarEvent = {
    uid: `${exchange.id}@givegifts`,
    title: exchange.name,
    startIso: exchange.eventAt,
    place: exchange.place,
    description,
    url,
    alarm: t("calendar.alarm", { exchange: exchange.name }),
  };
  return { event, google: googleCalendarHref({ title: exchange.name, startIso: exchange.eventAt, place: exchange.place, description, timeZone: exchange.timeZone }) };
}
