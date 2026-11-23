import "server-only";

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

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local") || !h.includes(".")) return true;
  if (h.includes(":")) return h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h.startsWith("::ffff:");
  const ip = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ip) return false;
  const [a, b] = [Number(ip[1]), Number(ip[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** "www.amazon.com.mx" → "amazon.com.mx" */
export function storeFrom(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

/**
 * Lee título, imagen y precio de una página de producto (Open Graph). Nunca lanza:
 * si la tienda bloquea o tarda más de 5 s, devuelve el dominio como título.
 */
export async function fetchLinkMetadata(rawUrl: string): Promise<LinkMetadata | null> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const store = storeFrom(url);
  const fallback: LinkMetadata = { url: url.toString(), title: store, imageUrl: null, price: null, store };
  // El servidor no debe pedir direcciones internas (SSRF): se guarda el link sin leerlo.
  if (isPrivateHost(url.hostname)) return fallback;

  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, "accept-language": "es-MX,es;q=0.9", accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return fallback;
    // Solo el <head> importa; cortamos para no procesar páginas enormes.
    const html = (await res.text()).slice(0, 1_500_000);
    const product = jsonLdProduct(html);
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    const title = cleanTitle(meta(html, "og:title") ?? product.name ?? meta(html, "twitter:title") ?? (titleTag ? decodeEntities(titleTag) : null));
    const image =
      meta(html, "og:image") ??
      product.image ??
      meta(html, "twitter:image") ??
      // Amazon: imagen principal del producto
      html.match(/data-old-hires=["'](https:\/\/[^"']+)["']/i)?.[1] ??
      html.match(/"hiRes":"(https:\/\/[^"]+)"/)?.[1] ??
      null;
    const priceRaw = meta(html, "product:price:amount") ?? meta(html, "og:price:amount") ?? product.price ?? meta(html, "price");
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
      title: (title || store).slice(0, 120),
      imageUrl: imageUrl?.startsWith("https://") ? imageUrl : null,
      price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
      store,
    };
  } catch {
    return fallback;
  }
}
