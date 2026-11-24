import type { BeforeSendEvent } from "@vercel/analytics";

// Los links personales (/i/{código}/p/{token}) son credenciales: nunca deben llegar a la analítica.
const TOKEN_IN_PATH = /\/p\/[0-9A-Za-z]{12}(?=\/|$|\?|#)/;

/** "https://x.mx/i/posada-abc1234/p/AbC123xYz789/lista?nuevo=1" → "https://x.mx/i/posada-abc1234/p/[token]/lista" */
export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (TOKEN_IN_PATH.test(url.pathname)) {
      url.pathname = url.pathname.replace(TOKEN_IN_PATH, "/p/[token]");
      url.search = "";
    }
    url.hash = "";
    return url.toString();
  } catch {
    return raw.replace(new RegExp(TOKEN_IN_PATH.source, "g"), "/p/[token]");
  }
}

/** Para `<Analytics beforeSend={beforeSend} />`: quita el token de la URL antes de mandarla. */
export function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  return { ...event, url: redactUrl(event.url) };
}
