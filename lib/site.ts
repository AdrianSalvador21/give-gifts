// Datos del sitio y del responsable legal, en un solo lugar.
// Los valores entre [CORCHETES] son marcadores: reemplázalos antes de lanzar (ver README › Textos legales).
import { appBaseUrl } from "./env";

export const SITE_NAME = "givegifts";

/** URL pública sin diagonal al final (NEXT_PUBLIC_APP_URL; ver lib/env.ts). */
export const SITE_URL = appBaseUrl();

export const SITE_DESCRIPTION =
  "Organiza tu intercambio de regalos o amigo secreto con un solo link: sorteo secreto, exclusiones, listas de deseos y buzón anónimo. Gratis.";

/** Correo para dudas, derechos ARCO y reportes. */
export const CONTACT_EMAIL = "[CORREO DE CONTACTO]";

export const LEGAL = {
  /** Persona física o moral responsable de los datos personales. */
  responsable: "[NOMBRE DEL RESPONSABLE]",
  /** Domicilio para oír y recibir notificaciones. */
  domicilio: "[DOMICILIO DEL RESPONSABLE]",
  /** Fecha de la última actualización de los textos legales. */
  updatedAt: "[FECHA DE ÚLTIMA ACTUALIZACIÓN]",
  /** Días que se conservan los datos de un intercambio después de la fecha del evento. */
  retentionDays: 60,
} as const;
