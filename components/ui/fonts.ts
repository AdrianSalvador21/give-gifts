import { Shantell_Sans } from "next/font/google";

/**
 * Fuente manuscrita para notas cortas al margen («¡shh!», «faltan 3»). Nunca en títulos ni botones.
 * app/layout.tsx debe agregar `shantell.variable` a las clases de <html> para que `font-mano` funcione;
 * sin la variable, `font-mano` cae en "Comic Sans MS" / cursive.
 */
export const shantell = Shantell_Sans({
  variable: "--font-shantell",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});
