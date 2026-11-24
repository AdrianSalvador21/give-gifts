"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Valor que solo existe en el navegador (zona horaria, fecha local) sin romper la hidratación:
 * en el servidor y en el primer render devuelve `server`; después, `get()`. `get` debe devolver un valor estable (string, número).
 */
export function useBrowserValue<T>(get: () => T, server: T): T {
  return useSyncExternalStore(subscribe, get, () => server);
}
