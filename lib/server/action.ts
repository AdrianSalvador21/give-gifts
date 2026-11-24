import "server-only";

import { unstable_rethrow } from "next/navigation";

/**
 * Envuelve el cuerpo de una Server Action: si algo lanza (Firestore, red…), lo registra y devuelve `fallback`
 * en lugar de que el cliente reciba una excepción que `startTransition` no atrapa.
 * `redirect()` / `notFound()` se vuelven a lanzar para que Next los maneje.
 */
export async function guard<T>(name: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    console.error(`[action:${name}]`, err);
    return fallback;
  }
}

/** Para los `catch` de código que sí se recupera: deja rastro en los logs en lugar de tragarse el error. */
export function logError(scope: string, err: unknown): void {
  console.error(`[${scope}]`, err);
}
