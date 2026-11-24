import type { ReactNode } from "react";
import { RegalitoThumb } from "@/components/participant/WishDisplay";
import { StarIcon } from "@/components/ui/icons";
import { Avatar, type AvatarColor } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";

/**
 * Muestras estáticas del producto para las tarjetas de la landing (FeatureSection).
 * Son ilustrativas: un solo texto accesible (`label`) y el contenido oculto a lectores de pantalla.
 */
function Sample({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} className="grid gap-2 rounded-2xl bg-crema p-3.5">
      <span aria-hidden className="etiqueta text-[11px] text-gris">
        {title}
      </span>
      <div aria-hidden className="contents">
        {children}
      </div>
    </div>
  );
}

function Exclusion({ a, b, why }: { a: { name: string; color: AvatarColor }; b: { name: string; color: AvatarColor }; why: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-coral-50 px-2.5 py-2 text-sm font-medium">
      <Avatar name={a.name.charAt(0)} color={a.color} size={28} className="border-[1.5px] border-tinta" />
      {a.name}
      <span className="text-gris">↔</span>
      <Avatar name={b.name.charAt(0)} color={b.color} size={28} className="border-[1.5px] border-tinta" />
      {b.name}
      {/* En pantallas angostas el motivo baja a su propia línea en lugar de salirse. */}
      <span className="ml-auto text-[13px] font-semibold whitespace-nowrap text-coral-700">{why}</span>
    </div>
  );
}

export function DrawSample() {
  return (
    <Sample label={t("landing.draw.sampleLabel")} title={t("landing.draw.sampleCount")}>
      <Exclusion a={{ name: t("landing.draw.ex1a"), color: "sol" }} b={{ name: t("landing.draw.ex1b"), color: "cielo" }} why={t("landing.draw.ex1Why")} />
      <Exclusion a={{ name: t("landing.draw.ex2a"), color: "lila" }} b={{ name: t("landing.draw.ex2b"), color: "pasto" }} why={t("landing.draw.ex2Why")} />
      <div className="flex items-center justify-between pt-1 text-sm font-medium">
        {t("landing.draw.ready")}
        <span className="rounded-[10px] bg-tinta px-3.5 py-2 text-white">{t("landing.draw.draw")}</span>
      </div>
    </Sample>
  );
}

export function WishSample() {
  return (
    <Sample label={t("landing.lists.sampleLabel")} title={t("landing.lists.sampleTitle")}>
      <div className="grid grid-cols-[60px_1fr] items-center gap-3 rounded-[14px] bg-white p-2.5">
        <span className="grid size-[60px] place-items-center overflow-hidden rounded-[14px] bg-cielo">
          <RegalitoThumb link />
        </span>
        <span className="min-w-0">
          <b className="block text-[15px] leading-tight font-semibold">{t("landing.lists.wish")}</b>
          <span className="block text-[13px] text-gris">{t("landing.lists.wishMeta")}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[13px] font-medium">
        <span className="inline-flex items-center gap-1 rounded-full bg-sol px-2.5 py-1">
          <StarIcon filled size={12} />
          {t("landing.lists.fav")}
        </span>
        <span className="rounded-full bg-white px-2.5 py-1">{t("landing.lists.size")}</span>
        <span className="rounded-full bg-white px-2.5 py-1">{t("landing.lists.color")}</span>
      </div>
    </Sample>
  );
}

export function MailboxSample() {
  return (
    <Sample label={t("landing.secret.sampleLabel")} title={t("landing.secret.sampleTitle")}>
      <div className="grid gap-1 rounded-[14px] border-[1.5px] border-dashed border-lila bg-lila-50 px-3.5 py-3">
        <small className="text-xs font-semibold text-gris">{t("landing.secret.fromFriend")}</small>
        <p className="text-[15px] font-medium">{t("landing.secret.question")}</p>
      </div>
      <div className="grid max-w-[85%] gap-1 justify-self-end rounded-[14px] border-[1.5px] border-arena bg-white px-3.5 py-3">
        <small className="text-xs font-semibold text-gris">{t("landing.secret.fromYou")}</small>
        <p className="text-[15px] font-medium">{t("landing.secret.answer")}</p>
      </div>
      <span className="mano mt-0.5 -rotate-3 justify-self-start text-[17px]">{t("landing.secret.note")}</span>
    </Sample>
  );
}
