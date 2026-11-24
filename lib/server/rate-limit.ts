import "server-only";

import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { headers } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";
import { logError } from "./action";

type Rule = { limit: number; windowSec: number };

/** Límites por acción. Generosos: en México muchas personas comparten IP (CGNAT de celular, wifi de la posada). */
export const RATE_LIMITS = {
  join: { limit: 20, windowSec: 60 * 60 }, // por IP
  wish: { limit: 40, windowSec: 60 * 60 }, // por link personal: agregar o cambiar el link (lee la tienda)
  message: { limit: 30, windowSec: 10 * 60 }, // por link personal
} satisfies Record<string, Rule>;

/** Tope de mensajes por hilo por día (ambos lados juntos). */
export const MAX_MESSAGES_PER_THREAD_PER_DAY = 100;

/**
 * Contador de ventana fija en Firestore: rateLimits/{sha256(key)} = { count, windowStart, expiresAt }.
 * 1 lectura + 1 escritura por llamada. La llave se guarda con hash (no se guardan IPs en claro).
 * Si Firestore falla, deja pasar (fail-open): un límite caído no debe tumbar la app.
 * `expiresAt` tiene política TTL (firestore.indexes.json) para que la colección no crezca.
 */
export async function hitRateLimit(bucket: keyof typeof RATE_LIMITS, subject: string): Promise<boolean> {
  const { limit, windowSec } = RATE_LIMITS[bucket];
  const id = createHash("sha256").update(`${bucket}:${subject}`).digest("hex").slice(0, 40);
  const ref = adminDb().collection("rateLimits").doc(id);
  const now = Date.now();
  try {
    return await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as { count: number; windowStart: number } | undefined;
      const fresh = !data || now - data.windowStart >= windowSec * 1000;
      if (!fresh && data.count >= limit) return true;
      const windowStart = fresh ? now : data.windowStart;
      tx.set(ref, {
        count: fresh ? 1 : data.count + 1,
        windowStart,
        expiresAt: Timestamp.fromMillis(windowStart + windowSec * 1000 * 2),
      });
      return false;
    });
  } catch (err) {
    logError("rate-limit", err);
    return false;
  }
}

/** IP de quien llama, según los headers del proxy (Vercel pone la real primero en x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "unknown";
}
