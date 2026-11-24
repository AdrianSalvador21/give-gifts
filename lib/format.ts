import { DEFAULT_TIME_ZONE } from "@/lib/data/types";
import { appBaseUrl } from "@/lib/env";

// Cada intercambio guarda su zona horaria (IANA). Sin ella se usa la hora del centro de México.
// `TIME_ZONE` se conserva por compatibilidad: es la zona por defecto, no la de un intercambio concreto.
export const TIME_ZONE = DEFAULT_TIME_ZONE;
export { DEFAULT_TIME_ZONE };

/** ¿Es una zona IANA que entiende Intl? ("America/Tijuana" sí, "Marte/Olympus" no). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Zona del navegador (para el input oculto `timeZone` del asistente y de la edición). */
export function browserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

const zone = (tz?: string | null) => (tz && isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE);

/** Partes de fecha/hora de `d` vistas en la zona `tz`. */
function partsIn(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Diferencia (ms) entre la hora local de `tz` y UTC en el instante `ms`. */
function offsetMs(ms: number, tz: string): number {
  const p = partsIn(new Date(ms), tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/** "2026-12-16" + "19:00" en la zona del intercambio → Date (instante absoluto). Respeta horario de verano. */
export function eventDateFrom(date: string, time: string, timeZone?: string | null): Date {
  const tz = zone(timeZone);
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  if (!Number.isFinite(wall)) return new Date(NaN);
  // La primera suposición usa el desfase de esa hora tomada como UTC; si el cambio de horario cae en medio,
  // la segunda pasada lo corrige. Si la hora no existe (salto de primavera), se usa la más tardía.
  const first = wall - offsetMs(wall, tz);
  if (offsetMs(first, tz) === offsetMs(wall, tz)) return new Date(first);
  const second = wall - offsetMs(first, tz);
  return new Date(offsetMs(second, tz) === offsetMs(first, tz) ? second : Math.max(first, second));
}

/** Date → { date: "2026-12-16", time: "19:00" } en la zona del intercambio (para rellenar inputs). */
export function eventInputs(iso: string, timeZone?: string | null): { date: string; time: string } {
  const p = partsIn(new Date(iso), zone(timeZone));
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

/**
 * Fecha de hoy "YYYY-MM-DD" para el `min` de los date pickers (M3).
 * Sin zona usa la del navegador/servidor que ejecuta; con zona, la de ese lugar. Nunca UTC.
 */
export function localToday(timeZone?: string | null): string {
  const now = new Date();
  if (timeZone && isValidTimeZone(timeZone)) return eventInputs(now.toISOString(), timeZone).date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "mié 16 dic · 19:00" */
export function formatEvent(iso: string, timeZone?: string | null): string {
  const d = new Date(iso);
  const tz = zone(timeZone);
  const day = new Intl.DateTimeFormat("es-MX", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(d).replace(/\./g, "").replace(",", "").replace(/ de /g, " ");
  const time = new Intl.DateTimeFormat("es-MX", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${day} · ${time}`;
}

/** "16 dic" */
export function formatShortDate(iso: string, timeZone?: string | null): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zone(timeZone), day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "").replace(/ de /g, " ");
}

/** "16 dic, 19:00" (para avisos como «generó un link nuevo el …»). */
export function formatDateTime(iso: string, timeZone?: string | null): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zone(timeZone), day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(iso))
    .replace(/\./g, "")
    .replace(/ de /g, " ");
}

/** { day: "16", month: "DIC" } para las tarjetitas de calendario. */
export function calendarParts(iso: string, timeZone?: string | null): { day: string; month: string } {
  const d = new Date(iso);
  const tz = zone(timeZone);
  const day = new Intl.DateTimeFormat("es-MX", { timeZone: tz, day: "numeric" }).format(d);
  const month = new Intl.DateTimeFormat("es-MX", { timeZone: tz, month: "short" }).format(d).replace(/\./g, "").toUpperCase();
  return { day, month };
}

/** "hora estándar del centro" / "hora del Pacífico": para aclarar en qué hora está el evento. */
export function timeZoneName(iso: string, timeZone?: string | null): string {
  const parts = new Intl.DateTimeFormat("es-MX", { timeZone: zone(timeZone), timeZoneName: "long" }).formatToParts(new Date(iso));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? zone(timeZone);
}

/** 500 → "$500" ; 389.5 → "$389.50" */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
}

/** URL absoluta. En producción exige NEXT_PUBLIC_APP_URL (ver lib/env.ts); en desarrollo cae a localhost:3000. */
export function appUrl(path: string): string {
  return `${appBaseUrl()}${path}`;
}

export function whatsappHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Link para agregar el evento a Google Calendar (3 horas). Las horas van en UTC y `ctz` muestra la zona del intercambio. */
export function calendarHref(title: string, iso: string, place: string | null, timeZone?: string | null): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${fmt(start)}/${fmt(end)}`, ctz: zone(timeZone) });
  if (place) params.set("location", place);
  return `https://calendar.google.com/calendar/render?${params}`;
}
