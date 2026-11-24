import { BrandBar } from "@/components/ui/BrandBar";
import { t } from "@/lib/i18n";

/** Respaldo de Suspense de las pantallas del participante: la barra de marca queda en su lugar mientras carga. */
export function ParticipantLoading() {
  return (
    <>
      <BrandBar className="pt-2" />
      <p className="pt-10 text-gris" role="status">
        {t("common.loading")}
      </p>
    </>
  );
}
