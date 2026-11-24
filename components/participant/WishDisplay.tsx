import Image from "next/image";
import type { Wish } from "@/lib/data/types";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";

// Sin "use client": lo usan tanto la lista propia (cliente) como la lista de tu persona (servidor).

const SWATCHES = ["bg-pasto", "bg-cielo", "bg-lila", "bg-sol", "bg-coral"];

/** Color fijo por deseo (no por posición): no cambia al agregar o reordenar. */
function swatchFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SWATCHES[h % SWATCHES.length];
}

const BOW = "fill-crema stroke-tinta";

/** Regalito para el hueco sin foto. `link` lo corre a la izquierda y le pone la insignia de eslabón. */
function RegalitoThumb({ link }: { link: boolean }) {
  const dx = link ? -3 : 0;
  const dy = link ? -2 : 0;
  return (
    <svg viewBox="0 0 60 60" className="size-full" aria-hidden>
      <g transform={`translate(${dx} ${dy})`}>
        <path
          d="M30 21 C 25 12, 17 13, 19 18 C 20.5 22, 26 22, 30 21 Z M30 21 C 35 12, 43 13, 41 18 C 39.5 22, 34 22, 30 21 Z"
          className={BOW}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect x="16" y="21" width="28" height="8" rx="3" className="fill-tinta" />
        <rect x="18" y="28" width="24" height="19" rx="3.5" className="fill-tinta" />
        <line x1="19" y1="28.6" x2="41" y2="28.6" className="stroke-gris" strokeWidth="1" />
        <circle cx="25.5" cy="36" r="2.2" fill="#fff" />
        <circle cx="34.5" cy="36" r="2.2" fill="#fff" />
      </g>
      {link && (
        <>
          <circle cx="44" cy="44" r="10" fill="#fff" className="stroke-tinta" strokeWidth="1.6" />
          <path
            d="M41.2 46.8 L 46.8 41.2 M 39.6 44.6 l -0.9 0.9 a 2.6 2.6 0 0 0 3.7 3.7 l 0.9 -0.9 M 48.4 43.4 l 0.9 -0.9 a 2.6 2.6 0 0 0 -3.7 -3.7 l -0.9 0.9"
            fill="none"
            className="stroke-tinta"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

/**
 * Miniatura del deseo: la imagen de la tienda o, si no hay, Regalito sobre un color de la paleta.
 * `size="tarjeta"`: 60 px en móvil y banda ancha arriba de la tarjeta desde sm (rejilla de Mi lista).
 */
export function WishThumb({ wish, size = "fila" }: { wish: Wish; index?: number; size?: "fila" | "tarjeta" }) {
  const box = size === "tarjeta" ? "size-[60px] sm:h-28 sm:w-full" : "size-[60px]";
  if (wish.imageUrl) {
    return (
      <span className={`relative shrink-0 overflow-hidden rounded-[14px] bg-white ${box}`}>
        <Image src={wish.imageUrl} alt="" fill unoptimized sizes={size === "tarjeta" ? "(min-width: 640px) 320px, 60px" : "60px"} className="object-contain" />
      </span>
    );
  }
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center overflow-hidden rounded-[14px] ${box} ${swatchFor(wish.id)}`}>
      <span className={size === "tarjeta" ? "block size-[60px] sm:size-28" : "block size-full"}>
        <RegalitoThumb link={Boolean(wish.url)} />
      </span>
    </span>
  );
}

export function wishMeta(wish: Wish): string {
  return [wish.store ?? t("list.noLink"), wish.price != null ? formatMoney(wish.price) : null].filter(Boolean).join(" · ");
}
