import type { Metadata } from "next";
import type { ReactNode } from "react";

// Los links personales son una credencial: nunca deben indexarse ni mostrar datos del intercambio en la vista
// previa (WhatsApp la guarda en caché). Aquí se reemplaza la imagen de la invitación por la genérica de la marca.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "givegifts",
    title: "Tu link personal de givegifts",
    description: "No compartas este link: es sólo tuyo.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "givegifts" }],
  },
  twitter: { card: "summary_large_image", title: "Tu link personal de givegifts", images: ["/opengraph-image"] },
};

export default function PersonalLinkLayout({ children }: { children: ReactNode }) {
  return children;
}
