// Todo se muestra en hora del centro de México (sin horario de verano desde 2022).
export const TIME_ZONE = "America/Mexico_City";
const OFFSET = "-06:00";

/** "2026-12-16" + "19:00" → Date en hora de CDMX. */
export function eventDateFrom(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${OFFSET}`);
}

/** Date → { date: "2026-12-16", time: "19:00" } en hora de CDMX (para rellenar inputs). */
export function eventInputs(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** "mié 16 dic · 19:00" */
export function formatEvent(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" }).format(d).replace(/\./g, "").replace(",", "").replace(/ de /g, " ");
  const time = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${day} · ${time}`;
}

/** "16 dic" */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "").replace(/ de /g, " ");
}

/** { day: "16", month: "DIC" } para las tarjetitas de calendario. */
export function calendarParts(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, day: "numeric" }).format(d);
  const month = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, month: "short" }).format(d).replace(/\./g, "").toUpperCase();
  return { day, month };
}

/** 500 → "$500" ; 389.5 → "$389.50" */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
}

export function appUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export function whatsappHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Link para agregar el evento a Google Calendar (3 horas, en UTC). */
export function calendarHref(title: string, iso: string, place: string | null): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${fmt(start)}/${fmt(end)}` });
  if (place) params.set("location", place);
  return `https://calendar.google.com/calendar/render?${params}`;
}
