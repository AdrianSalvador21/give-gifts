"use client";

import { useEffect, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { Confetti } from "./Confetti";

/** Tamaño del nombre según su largo (en cqw del sobre): los nombres largos bajan para no salirse de la carta. */
function nameSize(name: string) {
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length), 1);
  const k = longest <= 7 ? 15 : longest <= 10 ? 12 : longest <= 14 ? 9 : 7;
  return `clamp(28px, ${k}cqw, 96px)`;
}

/**
 * Sobre CSS de la revelación. Puramente visual: no sabe nada del servidor.
 * - `name = null` → sobre cerrado con sello. Si hay `onOpen`, el sobre es un botón.
 * - Cuando `name` pasa de null a un texto: la solapa gira, la carta sube con el nombre, cae confeti y vibra (30 ms).
 * - Volver a `null` lo cierra (sin confeti).
 * El nombre solo existe en el DOM cuando llega por `name`; la página lo pide al servidor tras el clic.
 */
export function EnvelopeReveal({
  name,
  onOpen,
  pending = false,
  label = t("envelope.givesTo"),
  openLabel = t("ui.envelopeOpen"),
  children,
  className = "max-w-[360px] md:max-w-[520px]",
}: {
  name: string | null;
  onOpen?: () => void;
  pending?: boolean;
  /** Texto arriba del nombre: «Le regalas a». */
  label?: ReactNode;
  /** Nombre accesible del sobre cerrado cuando es botón. */
  openLabel?: string;
  /** Detalles que aparecen debajo una vez abierto (pills de presupuesto, fecha, ideas). */
  children?: ReactNode;
  className?: string;
}) {
  const [prevName, setPrevName] = useState(name);
  const [burst, setBurst] = useState(0);
  // Ajuste de estado durante el render (no en un efecto): solo la transición cerrado → abierto dispara confeti.
  if (name !== prevName) {
    setPrevName(name);
    if (name && !prevName) setBurst((b) => b + 1);
  }

  useEffect(() => {
    if (burst > 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate?.(30);
  }, [burst]);

  const open = Boolean(name);
  const envelope = (
    <div className="gg-sobre">
      <div className="gg-carta">
        {name && (
          <>
            <span className="block text-[clamp(13px,3.6cqw,20px)] font-medium">{label}</span>
            <span className="mt-[1cqw] block leading-[0.92] font-medium tracking-[-0.06em] break-words text-balance" style={{ fontSize: nameSize(name) }}>
              {name}
            </span>
          </>
        )}
      </div>
      <div className="gg-frente" />
      <div className="gg-solapa" />
      <span className={`gg-sello ${pending ? "animate-pulse" : ""}`} />
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      <div className={`gg-escena ${className}`} data-state={open ? "abierto" : "cerrado"}>
        <div aria-live="polite" className="sr-only">
          {name && (
            <>
              {label} {name}
            </>
          )}
        </div>
        {!open && onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            disabled={pending}
            aria-label={openLabel}
            aria-busy={pending || undefined}
            className="block w-full rounded-[12px] transition-transform duration-200 ease-rebote hover:-rotate-1 active:scale-[0.98] disabled:cursor-wait"
          >
            {envelope}
          </button>
        ) : (
          <div aria-hidden>{envelope}</div>
        )}
        {burst > 0 && <Confetti burst={burst} delay={700} spread={1.2} />}
      </div>
      {open && children && <div className="mt-6 w-full animate-entrada [animation-delay:900ms]">{children}</div>}
    </div>
  );
}
