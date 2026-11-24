import "server-only";

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import type { Readable } from "node:stream";

// Lector de páginas de tiendas a prueba de SSRF (I5):
// - redirecciones manuales (máx. 3), validando cada Location;
// - la IP se valida al conectar (lookup propio), así un DNS que cambia entre validar y conectar no sirve;
// - solo http/https en puertos estándar; tope de tiempo total y de bytes.

// Listas separadas: net.BlockList trata las IPv4 como IPv6 mapeadas (::ffff:a.b.c.d), así que una regla
// ::ffff:0:0/96 en la misma lista bloquearía todo IPv4.
const BLOCKED_V4 = new net.BlockList();
const BLOCKED_V6 = new net.BlockList();
// IPv4: «esta red», privadas, CGNAT, loopback, link-local, IETF, documentación, benchmarking, multicast y reservadas.
for (const [ip, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3], // 224.0.0.0 – 255.255.255.255
] as const) {
  BLOCKED_V4.addSubnet(ip, prefix, "ipv4");
}
// IPv6: no especificada, loopback, IPv4 mapeada/traducida (NAT64, 6to4, Teredo: pueden esconder una IPv4 interna),
// documentación, ULA, link-local, site-local y multicast.
for (const [ip, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  BLOCKED_V6.addSubnet(ip, prefix, "ipv6");
}

/** ¿La IP es interna, reservada o puede esconder una interna? (IPs inválidas cuentan como bloqueadas.) */
export function isPrivateIp(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, "").split("%")[0];
  const family = net.isIP(ip);
  if (family === 4) return BLOCKED_V4.check(ip, "ipv4");
  if (family === 6) return BLOCKED_V6.check(ip, "ipv6");
  return true;
}

/** Nombres que nunca se piden, aunque resuelvan a algo público. */
export function isPrivateHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (net.isIP(h)) return isPrivateIp(h);
  return h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".home.arpa") || !h.includes(".");
}

class BlockedError extends Error {
  code = "EBLOCKED";
}

/** `lookup` para http(s).request: resuelve todas las IPs y rechaza si alguna es interna. */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as unknown as dns.LookupAddress[];
    if (!list.length || list.some((a) => isPrivateIp(a.address))) return callback(new BlockedError(`blocked ${hostname}`), "", 4);
    if (options.all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function checkUrl(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  return !isPrivateHostname(url.hostname);
}

type Hop = { status: number; location: string | null; contentType: string; body: string };

function requestOnce(url: URL, deadline: number, maxBytes: number, headers: Record<string, string>): Promise<Hop> {
  return new Promise((resolve, reject) => {
    const left = deadline - Date.now();
    if (left <= 0) return reject(new Error("timeout"));
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(url, { method: "GET", headers, lookup: safeLookup, agent: false, timeout: Math.min(left, 6000) }, (res) => {
      const status = res.statusCode ?? 0;
      const contentType = String(res.headers["content-type"] ?? "");
      const location = typeof res.headers.location === "string" ? res.headers.location : null;
      if ((status >= 300 && status < 400) || status < 200 || status >= 300 || !contentType.includes("html")) {
        res.resume();
        req.destroy();
        return resolve({ status, location, contentType, body: "" });
      }

      // Por si la tienda comprime aunque pidamos identity.
      const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
      let stream: Readable = res;
      if (encoding === "gzip" || encoding === "x-gzip") stream = res.pipe(zlib.createGunzip());
      else if (encoding === "deflate") stream = res.pipe(zlib.createInflate());
      else if (encoding === "br") stream = res.pipe(zlib.createBrotliDecompress());

      const decoder = new TextDecoder();
      let body = "";
      let bytes = 0;
      let done = false;
      // Se queda con lo que llegó si se acaba el tiempo o el límite (lo útil suele estar al principio).
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        req.destroy();
        resolve({ status, location, contentType, body: body + decoder.decode() });
      };
      const timer = setTimeout(finish, Math.max(0, deadline - Date.now()));
      stream.on("data", (chunk: Buffer) => {
        if (done) return;
        bytes += chunk.byteLength;
        body += decoder.decode(chunk, { stream: true });
        if (bytes >= maxBytes) finish();
      });
      stream.on("end", finish);
      stream.on("error", finish); // conexión cortada o compresión rota: se usa lo que haya llegado
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

export type SafeHtml = { url: string; html: string };

/**
 * GET de una página HTML pública. Devuelve null si la URL (o alguna redirección) es interna,
 * si no responde 2xx con HTML o si algo falla. Nunca lanza.
 */
export async function fetchPublicHtml(
  start: URL,
  { maxRedirects = 3, totalMs = 8000, maxBytes = 1_200_000, headers = {} as Record<string, string> } = {},
): Promise<SafeHtml | null> {
  const deadline = Date.now() + totalMs;
  let url = start;
  try {
    for (let hop = 0; hop <= maxRedirects; hop++) {
      if (!checkUrl(url)) return null;
      const res = await requestOnce(url, deadline, maxBytes, { ...headers, "accept-encoding": "identity" });
      if (res.status >= 300 && res.status < 400) {
        if (!res.location) return null;
        url = new URL(res.location, url);
        continue;
      }
      if (res.status < 200 || res.status >= 300 || !res.contentType.includes("html")) return null;
      return { url: url.toString(), html: res.body };
    }
    return null; // demasiadas redirecciones
  } catch (err) {
    if (!(err instanceof BlockedError)) {
      const code = (err as { code?: string }).code;
      // Timeouts y DNS que no resuelven son normales con links de usuarios; solo se registran los raros.
      if (code !== "ENOTFOUND" && code !== "ECONNRESET" && code !== "ECONNREFUSED" && (err as Error).message !== "timeout") console.error("[safe-fetch]", err);
    }
    return null;
  }
}
