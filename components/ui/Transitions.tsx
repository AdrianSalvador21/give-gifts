import { ViewTransition, type ReactNode } from "react";

/**
 * Deslizamiento direccional entre rutas. Envuelve el contenido de cada `page.tsx` participante (no el layout).
 * Se activa solo en navegaciones con tipo: `<Link transitionTypes={["nav-forward"]}>` (más adentro) o
 * `["nav-back"]` (regresar). Navegaciones sin tipo (botón atrás del navegador, refresh) no animan.
 * La BrandBar queda fija (view-transition-name: site-header).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
