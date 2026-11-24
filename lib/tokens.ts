import "server-only";

import { randomInt } from "node:crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";
const INVITE_SUFFIX = 7;

function random(alphabet: string, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

/** Llave del link personal: 12 caracteres base62 (~71 bits). Solo cambia si quien organiza genera uno nuevo. */
export function newToken(): string {
  return random(BASE62, 12);
}

/**
 * "Posada de los primos 2026" → "posada-de-los-primos-2026-7qk2m9x".
 * 7 caracteres base36 (~78 mil millones): adivinar un código conociendo el nombre ya no es práctico.
 * Los códigos viejos de 4 siguen siendo válidos.
 */
export function newInviteCode(name: string): string {
  const slug =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30)
      .replace(/-+$/g, "") || "intercambio";
  return `${slug}-${random(BASE36, INVITE_SUFFIX)}`;
}

export function isValidToken(token: string): boolean {
  return /^[0-9A-Za-z]{12}$/.test(token);
}

export function isValidInviteCode(code: string): boolean {
  return /^[a-z0-9-]{6,40}$/.test(code);
}

/** "  María  José " → "maria jose": clave para comparar nombres dentro de un intercambio. */
export function nameKey(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
