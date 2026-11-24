import "server-only";

import { fetchPublicHtml, isPrivateHostname } from "@/lib/server/safe-fetch";

export type LinkMetadata = { url: string; title: string; imageUrl: string | null; price: number | null; store: string };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Valor de <meta property|name="key" content="…">, con los atributos en cualquier orden. */
function meta(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content) : null;
}

/** Busca un objeto schema.org Product en los <script type="application/ld+json">. */
function jsonLdProduct(html: string): { name: string | null; image: string | null; price: string | null } {
  const empty = { name: null, image: null, price: null };
  const scripts = html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of scripts) {
    try {
      const data = JSON.parse(body.trim());
      const nodes: unknown[] = Array.isArray(data) ? data : data?.["@graph"] ?? [data];
      for (const node of nodes) {
        const n = node as Record<string, unknown>;
        const type = n?.["@type"];
        if (type !== "Product" && !(Array.isArray(type) && type.includes("Product"))) continue;
        const img = n.image;
        const image = typeof img === "string" ? img : Array.isArray(img) ? (typeof img[0] === "string" ? img[0] : (img[0] as { url?: string })?.url) : (img as { url?: string })?.url;
        const offers = Array.isArray(n.offers) ? n.offers[0] : n.offers;
        const o = offers as Record<string, unknown> | undefined;
        const price = o?.price ?? o?.lowPrice;
        return { name: typeof n.name === "string" ? decodeEntities(n.name) : null, image: image ?? null, price: price != null ? String(price) : null };
      }
    } catch {
      // JSON-LD inválido: se ignora
    }
  }
  return empty;
}

/** Quita sufijos de tienda: "Libro X : Autor: Amazon.com.mx: Libros" → "Libro X : Autor". */
function cleanTitle(title: string | null): string | null {
  if (!title) return null;
  return title
    .replace(/\s*[:|–-]\s*Amazon\.com(\.mx)?\b.*$/i, "")
    .replace(/^Amazon\.com(\.mx)?\s*:\s*/i, "")
    .replace(/\s*\|\s*(Mercado Libre|Liverpool|Walmart|Coppel|Sanborns).*$/i, "")
    .trim();
}

/** "www.amazon.com.mx" → "amazon.com.mx" */
export function storeFrom(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

const AMAZON = /(^|\.)amazon\.(com\.mx|com|es|ca|co\.uk|de|fr|it|com\.br)$/i;

/** Amazon: el link largo con rastreo → https://www.amazon.com.mx/dp/ASIN (más corto y estable). */
function canonicalUrl(url: URL): URL {
  const clean = new URL(url);
  clean.hash = ""; // los fragmentos (#polycard…, #tracking) solo sirven para rastreo
  if (MERCADO_LIBRE.test(clean.hostname)) clean.search = "";
  if (!AMAZON.test(clean.hostname)) return clean;
  const asin = clean.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1];
  return asin ? new URL(`https://${clean.hostname}/dp/${asin.toUpperCase()}`) : clean;
}

const MERCADO_LIBRE = /(^|\.)mercadoli[bv]re\.com(\.[a-z]{2})?$/i;

/** La tienda nos mandó a un muro (verificación, captcha, login) en lugar del producto. */
function isBlockedPage(finalUrl: string, html: string): boolean {
  let path = "";
  try {
    path = new URL(finalUrl).pathname;
  } catch {
    // sin URL final: se revisa solo el HTML
  }
  if (/account-verification|captcha|challenge|\/(login|signin|sign-in)\b/i.test(path)) return true;
  return /api-services-support@amazon|captcha/i.test(html.slice(0, 20_000)) && !/productTitle|og:title/.test(html);
}

/**
 * Nombre legible sacado de la ruta cuando la tienda no deja leer la página:
 * "/Bose-SoundLink-inal%C3%A1mbrico-Exteriores/dp/B0F…" → "Bose SoundLink inalámbrico Exteriores".
 */
function titleFromPath(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  const candidates = segments
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .filter((s) => /[-_]/.test(s) && /\p{L}{3,}/u.test(s) && !/^(dp|gp|product|products|p|item|items)$/i.test(s))
    .map((s) => s.replace(/\.(html?|aspx?|php)$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim());
  const best = candidates.sort((a, b) => b.length - a.length)[0];
  return best && best.length >= 6 ? (best.charAt(0).toUpperCase() + best.slice(1)).slice(0, 120) : null;
}

/**
 * Lee título, imagen y precio de una página de producto (Open Graph, JSON-LD y Amazon). Nunca lanza:
 * si la tienda bloquea o tarda, usa el nombre que venga en la ruta del link o, al final, el dominio.
 */
export async function fetchLinkMetadata(rawUrl: string): Promise<LinkMetadata | null> {
  let original: URL;
  try {
    original = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (original.protocol !== "https:" && original.protocol !== "http:") return null;
  const url = canonicalUrl(original);
  const store = storeFrom(url);
  const fallback: LinkMetadata = { url: url.toString(), title: titleFromPath(original) ?? store, imageUrl: null, price: null, store };
  // El servidor no debe pedir direcciones internas (SSRF): se guarda el link sin leerlo.
  // fetchPublicHtml vuelve a validar cada redirección y la IP real al conectar.
  if (isPrivateHostname(url.hostname)) return fallback;

  try {
    // Páginas como Amazon pesan >2 MB: lo útil está en el primer 1.2 MB.
    const page = await fetchPublicHtml(url, {
      maxRedirects: 3,
      totalMs: 8000,
      maxBytes: 1_200_000,
      headers: {
        "user-agent": UA,
        "accept-language": "es-MX,es;q=0.9",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!page) return fallback;
    const { html } = page;
    if (isBlockedPage(page.url, html)) return fallback;
    const product = jsonLdProduct(html);
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    // Amazon: #productTitle es el nombre limpio, sin el sufijo de la tienda.
    const amazonTitle = html.match(/id=["']productTitle["'][^>]*>([^<]+)</i)?.[1];
    const title = cleanTitle(
      (amazonTitle ? decodeEntities(amazonTitle) : null) ??
        meta(html, "og:title") ??
        product.name ??
        meta(html, "twitter:title") ??
        (titleTag ? decodeEntities(titleTag) : null),
    );
    const image =
      meta(html, "og:image") ??
      product.image ??
      meta(html, "twitter:image") ??
      // Amazon: imagen principal del producto
      html.match(/data-old-hires=["'](https:\/\/[^"']+)["']/i)?.[1] ??
      html.match(/"hiRes":"(https:\/\/[^"]+)"/)?.[1] ??
      null;
    // Amazon: el precio visible vive en el bloque corePrice como <span class="a-offscreen">$1,234.00</span>.
    const amazonPrice = html.match(/corePrice[\s\S]{0,4000}?class=["']a-offscreen["']>\s*([^<]+)</i)?.[1];
    const priceRaw = meta(html, "product:price:amount") ?? meta(html, "og:price:amount") ?? product.price ?? meta(html, "price") ?? amazonPrice;
    const price = priceRaw ? Number(String(priceRaw).replace(/[^\d.]/g, "")) : NaN;
    let imageUrl: string | null = null;
    if (image) {
      try {
        imageUrl = new URL(image, url).toString();
      } catch {
        imageUrl = null;
      }
    }
    return {
      url: url.toString(),
      title: (title || fallback.title).slice(0, 120),
      imageUrl: imageUrl?.startsWith("https://") ? imageUrl : null,
      price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
      store,
    };
  } catch (err) {
    console.error("[fetchLinkMetadata]", err);
    return fallback;
  }
}
