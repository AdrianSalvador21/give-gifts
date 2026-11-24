"use client";

import { Analytics } from "@vercel/analytics/next";
import { beforeSend } from "@/lib/analytics";

/**
 * Vercel Web Analytics (sin cookies) con los tokens personales quitados de la URL.
 * Se renderiza una vez en app/layout.tsx: `<AppAnalytics />` dentro de <body>.
 * (Es un componente cliente porque `beforeSend` es una función y no puede cruzar desde el layout.)
 */
export function AppAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
