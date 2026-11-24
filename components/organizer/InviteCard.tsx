import Image from "next/image";
import { DotButton } from "@/components/ui/DotButton";
import { t } from "@/lib/i18n";

/**
 * Tarjeta de invitación tal como la verá el grupo. Solo presentación: la usa la vista previa en vivo del
 * asistente (/crear, alimentada con el estado del formulario). El botón es decorativo (va dentro de un panel inerte).
 */
export function InviteCard({
  owner,
  name,
  message,
  when,
  gift,
}: {
  owner: string;
  name: string;
  message?: string;
  when: string;
  gift: string;
}) {
  return (
    <div className="overflow-hidden rounded-panel bg-pasto bg-papel">
      <Image src="/illustrations/web/01-hero-v2.webp" width={1012} height={807} alt="" className="mx-auto mt-3 -mb-1 h-[128px] w-auto" />
      <div className="flex flex-col gap-3 rounded-t-panel bg-crema p-5">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-gris">{t("join.invites", { owner })}</span>
          <span className="text-[26px] leading-[1.05] font-medium tracking-[-0.04em] break-words">{name}</span>
          {message && <p className="mt-0.5 line-clamp-3 text-sm leading-snug text-gris">«{message}»</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            [t("join.when"), when],
            [t("join.gift"), gift],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-0.5 rounded-boton bg-white px-3 py-2.5">
              <span className="text-xs text-gris">{label}</span>
              <span className="truncate text-[15px] font-medium">{value}</span>
            </div>
          ))}
        </div>
        <DotButton variant="tinta" size="sm" full tabIndex={-1}>
          {t("join.submit")}
        </DotButton>
      </div>
    </div>
  );
}
