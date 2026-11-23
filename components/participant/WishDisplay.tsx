import Image from "next/image";
import type { Wish } from "@/lib/data/types";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";

// Sin "use client": lo usan tanto la lista propia (cliente) como la lista de tu persona (servidor).

const SWATCHES = ["bg-pasto", "bg-cielo", "bg-lila", "bg-sol", "bg-coral"];

/** Miniatura del deseo: la imagen de la tienda o un bloque de color. */
export function WishThumb({ wish, index }: { wish: Wish; index: number }) {
  if (wish.imageUrl) {
    return (
      <span className="relative size-[60px] shrink-0 overflow-hidden rounded-[14px] bg-white">
        <Image src={wish.imageUrl} alt="" fill unoptimized sizes="60px" className="object-contain" />
      </span>
    );
  }
  return <span aria-hidden className={`size-[60px] shrink-0 rounded-[14px] ${SWATCHES[index % SWATCHES.length]}`} />;
}

export function wishMeta(wish: Wish): string {
  return [wish.store ?? t("list.noLink"), wish.price != null ? formatMoney(wish.price) : null].filter(Boolean).join(" · ");
}
