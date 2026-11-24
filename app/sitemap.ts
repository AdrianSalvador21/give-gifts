import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Sólo páginas públicas e indexables (/entrar lleva noindex, por eso no va aquí).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
