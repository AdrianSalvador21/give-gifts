"use client";

import { useState, useTransition } from "react";
import { deleteWish, updateWish } from "@/app/actions/wishes";
import { StarIcon, TrashIcon } from "@/components/ui/icons";
import { TextField } from "@/components/ui/primitives";
import type { Wish } from "@/lib/data/types";
import { t } from "@/lib/i18n";
import { wishMeta, WishThumb } from "./WishDisplay";

/** Deseo editable (lista propia). */
export function WishItem({ wish, index, inviteCode, token }: { wish: Wish; index: number; inviteCode: string; token: string }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(wish.title);
  const [note, setNote] = useState(wish.note ?? "");
  const [price, setPrice] = useState(wish.price != null ? String(wish.price) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const res = await task();
      if (!res.ok) setError(t(`list.errors.${res.error === "title" || res.error === "note" || res.error === "price" ? res.error : "generic"}`));
      else {
        setError(null);
        after?.();
      }
    });

  return (
    <li className={`flex flex-col gap-2.5 rounded-tarjeta bg-white p-3.5 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        <WishThumb wish={wish} index={index} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base leading-snug font-medium">{wish.title}</span>
          <span className="truncate text-[13px] text-gris">{wishMeta(wish)}</span>
        </span>
        <button
          type="button"
          aria-label={wish.favorite ? t("list.unfavorite") : t("list.favorite")}
          aria-pressed={wish.favorite}
          onClick={() => run(() => updateWish(inviteCode, token, wish.id, { favorite: !wish.favorite }))}
          className={`grid size-11 shrink-0 place-items-center rounded-full ${wish.favorite ? "bg-coral" : "bg-crema"}`}
        >
          <StarIcon size={18} filled={wish.favorite} />
        </button>
      </div>

      {wish.favorite && !editing && <span className="self-start rounded-full bg-coral px-2.5 py-1 text-xs font-medium">{t("list.favorite")}</span>}
      {wish.note && !editing && <p className="rounded-[12px] bg-crema px-3 py-2 text-[13px]">{wish.note}</p>}

      {editing ? (
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            const p = price.trim() ? Number(price.replace(/[^\d.]/g, "")) : null;
            if (p !== null && !(p > 0)) return setError(t("list.errors.price"));
            run(() => updateWish(inviteCode, token, wish.id, { title, note: note.trim() || null, price: p }), () => setEditing(false));
          }}
        >
          <TextField id={`w-title-${wish.id}`} label={t("list.titleLabel")} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          <TextField id={`w-note-${wish.id}`} label={t("list.noteLabel")} placeholder={t("list.notePlaceholder")} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
          <TextField id={`w-price-${wish.id}`} label={t("list.priceLabel")} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          {error && <p className="text-sm text-[#B23A2A]">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="h-11 flex-1 rounded-boton bg-tinta font-medium text-white">
              {t("list.save")}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="h-11 flex-1 rounded-boton bg-crema font-medium">
              {t("list.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-4 text-sm font-medium">
          <button type="button" onClick={() => setEditing(true)} className="underline underline-offset-4">
            {t("list.edit")}
          </button>
          {wish.url && (
            <a href={wish.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">
              {t("list.openStore", { store: wish.store ?? "" })}
            </a>
          )}
          <button
            type="button"
            aria-label={t("list.delete")}
            onClick={() => run(() => deleteWish(inviteCode, token, wish.id))}
            className="ml-auto grid size-10 place-items-center rounded-full text-gris hover:bg-crema"
          >
            <TrashIcon size={18} />
          </button>
        </div>
      )}
      {error && !editing && <p className="text-sm text-[#B23A2A]">{error}</p>}
    </li>
  );
}
