// URL pública de la app. Se usa en next.config.ts (build/arranque), en instrumentation.ts y en appUrl().
// Sin "server-only": next.config.ts la importa fuera del bundle de la app.

const DEV_FALLBACK = "http://localhost:3000";

/** Error claro si falta NEXT_PUBLIC_APP_URL en producción (los links de WhatsApp apuntarían a localhost). */
export class MissingAppUrlError extends Error {
  constructor(detail: string) {
    super(
      `NEXT_PUBLIC_APP_URL ${detail}. Defínela en Vercel (Production y Preview) con la URL pública, p. ej. https://givegifts.mx, sin diagonal al final. Ver .env.example.`,
    );
    this.name = "MissingAppUrlError";
  }
}

/**
 * Base pública sin diagonal final.
 * - Producción: NEXT_PUBLIC_APP_URL es obligatoria (en un deploy Preview de Vercel se acepta VERCEL_URL).
 * - Desarrollo: si falta, http://localhost:3000.
 */
export function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new MissingAppUrlError(`no es una URL válida («${raw}»)`);
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new MissingAppUrlError(`debe empezar con https:// («${raw}»)`);
    return raw.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK;
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  throw new MissingAppUrlError("no está definida");
}

/** Para next.config.ts / instrumentation: lanza en producción si falta o es inválida. */
export function assertAppUrl(): void {
  appBaseUrl();
}
