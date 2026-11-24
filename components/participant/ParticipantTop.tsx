import Link from "next/link";
import { BrandBar } from "@/components/ui/BrandBar";
import { BackIcon } from "@/components/ui/icons";
import { t } from "@/lib/i18n";

/**
 * Cabecera de las pantallas del participante: BrandBar con el nombre del intercambio y, debajo, el regreso.
 * Una sola BrandBar por página (queda fija en las transiciones de ruta).
 */
export function ParticipantTop({ exchangeName, backHref, backLabel = t("home.backHome") }: { exchangeName: string; backHref?: string; backLabel?: string }) {
  return (
    <>
      <BrandBar pill={exchangeName} className="pt-2" />
      {backHref && <BackLink href={backHref} label={backLabel} />}
    </>
  );
}

/** «‹ Mi intercambio»: regreso con deslizamiento hacia atrás. ≥ 44 px. */
export function BackLink({ href, label, className = "" }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      transitionTypes={["nav-back"]}
      className={`group mt-1 inline-flex min-h-11 items-center gap-2.5 self-start rounded-full pr-3 text-[15px] font-medium no-underline ${className}`}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white transition-transform group-active:scale-90">
        <BackIcon />
      </span>
      {label}
    </Link>
  );
}
