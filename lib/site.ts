// Datos del sitio y del responsable legal, en un solo lugar.
// Los textos legales (/privacidad, /terminos) leen de aquí; ver README › Textos legales.
import { appBaseUrl } from "./env";

export const SITE_NAME = "givegifts";

/** URL pública sin diagonal al final (NEXT_PUBLIC_APP_URL; ver lib/env.ts). */
export const SITE_URL = appBaseUrl();

export const SITE_DESCRIPTION =
  "Organiza tu intercambio de regalos o amigo secreto con un solo link: sorteo secreto, exclusiones, listas de deseos y buzón anónimo. Gratis.";

/** Correo para dudas, derechos ARCO y reportes. */
export const CONTACT_EMAIL = "adriansalvadorsil25@gmail.com";

/** Teléfono de contacto en formato internacional (para `tel:`) y como se muestra. */
export const CONTACT_PHONE = "+529602460590";
export const CONTACT_PHONE_DISPLAY = "+52 960 246 0590";

export const LEGAL = {
  /** Persona física o moral responsable de los datos personales. */
  responsable: "Adrian Salvador Silva",
  /** Domicilio para oír y recibir notificaciones. */
  domicilio: "Av. Niños Héroes de Chapultepec 125, Benito Juárez, CDMX",
  /** Fecha de la última actualización de los textos legales. */
  updatedAt: "23 de noviembre de 2026",
  /** Días que se conservan los datos de un intercambio después de la fecha del evento. */
  retentionDays: 60,
} as const;
