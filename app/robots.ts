import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PRIVATE = ["/organizar/", "/mis-intercambios", "/crear"];

// Bots que arman la vista previa de un link compartido. Algunos (Twitterbot) respetan robots.txt, así que
// pueden leer /i/ para mostrar la tarjeta de la invitación; esas páginas llevan noindex de todos modos.
const PREVIEW_BOTS = ["facebookexternalhit", "WhatsApp", "Twitterbot", "TelegramBot", "Slackbot", "LinkedInBot", "Discordbot"];

// Invitaciones, links personales y el panel son privados: fuera de los buscadores.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/i/", ...PRIVATE] },
      { userAgent: PREVIEW_BOTS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
