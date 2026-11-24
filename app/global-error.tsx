"use client";

import { useEffect } from "react";
import { t } from "@/lib/i18n";
import "./globals.css";

// Reemplaza al layout raíz cuando éste falla: no depende de ningún componente de la app, sólo de los estilos globales.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es-MX">
      <body className="min-h-dvh bg-crema bg-puntos text-tinta antialiased" style={{ fontFamily: "system-ui, sans-serif" }}>
        <title>{`${t("fallback.errorTitle")} · givegifts`}</title>
        <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center gap-6 px-5 py-10">
          <span className="text-[22px] font-medium tracking-[-0.04em]">{t("brand.name")}</span>
          <div className="flex flex-col gap-3 rounded-panel bg-white p-6 trazo-tinta">
            <p className="etiqueta">{t("fallback.errorEyebrow")}</p>
            <h1 className="text-[36px] leading-none font-medium tracking-[-0.05em]">{t("fallback.errorTitle")}</h1>
            <p className="text-[17px] leading-snug text-gris">{t("fallback.errorText")}</p>
          </div>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => retry()} className="h-[60px] rounded-boton bg-tinta px-6 text-lg font-medium text-white trazo-tinta presionable">
              {t("fallback.retry")}
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- recarga completa: el layout raíz falló */}
            <a href="/" className="h-[60px] content-center rounded-boton bg-white px-6 text-center text-lg font-medium">
              {t("fallback.home")}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
