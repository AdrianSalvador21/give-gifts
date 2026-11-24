"use client";

import { EmptySlots, GridFillers } from "@/components/ui/EmptySlots";
import { PlusIcon } from "@/components/ui/icons";
import { t } from "@/lib/i18n";
import { ADD_WISH_INPUT_ID } from "./AddWishForm";

function focusAdd() {
  const input = document.getElementById(ADD_WISH_INPUT_ID) as HTMLInputElement | null;
  input?.focus();
  input?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

/** Estado vacío de Mi lista: tres huecos que se apagan; tocarlos lleva al campo. */
export function EmptyListSlots({ className = "" }: { className?: string }) {
  return <EmptySlots className={className} items={[t("list.slot1"), t("list.slot2"), t("list.slot3")]} onSelect={focusAdd} />;
}

/** Huecos punteados para completar la rejilla (objetivo de 3 o «Otra idea»). Van dentro del <ul>. */
export function WishGridFillers({ filled, target }: { filled: number; target: number }) {
  const first = (
    <>
      <PlusIcon size={24} />
      <span className="text-[15px] font-medium">{filled === 0 ? t("list.slot1") : t("list.another")}</span>
    </>
  );
  return <GridFillers filled={filled} target={target} first={first} onSelect={focusAdd} />;
}
