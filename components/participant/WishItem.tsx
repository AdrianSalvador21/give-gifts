"use client";

import { useState, useTransition } from "react";
import { deleteWish, updateWish } from "@/app/actions/wishes";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/Dialog";
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
  const [url, setUrl] = useState(wish.url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  // Al abrir la edición se parte de lo guardado (pudo cambiar tras agregar un link).
  const startEditing = () => {
    setTitle(wish.title);
    setNote(wish.note ?? "");
    setPrice(wish.price != null ? String(wish.price) : "");
    setUrl(wish.url ?? "");
    setError(null);
    setEditing(true);
  };

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      let res: { ok: boolean; error?: string };
      try {
        res = await task();
      } catch {
        res = { ok: false, error: "generic" };
      }
      const known = res.error === "title" || res.error === "note" || res.error === "price" || res.error === "url" || res.error === "rate";
      if (!res.ok) setError(t(`list.errors.${known ? (res.error as "title" | "note" | "price" | "url" | "rate") : "generic"}`));
      else {
        setError(null);
        after?.();
      }
    });

  return (
    <li className={`relative flex flex-col gap-2.5 rounded-tarjeta bg-white p-3.5 transition-opacity ${pending || deleting ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 sm:flex-col sm:items-stretch">
        <WishThumb wish={wish} index={index} size="tarjeta" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base leading-snug font-medium">{wish.title}</span>
          <span className="truncate text-[13px] text-gris">{wishMeta(wish)}</span>
        </span>
        <button
          type="button"
          aria-label={wish.favorite ? t("list.unfavorite") : t("list.favorite")}
          aria-pressed={wish.favorite}
          onClick={() => run(() => updateWish(inviteCode, token, wish.id, { favorite: !wish.favorite }))}
          className={`grid size-11 shrink-0 place-items-center rounded-full transition-transform active:scale-90 sm:absolute sm:top-5 sm:right-5 ${wish.favorite ? "bg-pasto" : "bg-crema"}`}
        >
          <StarIcon size={18} filled={wish.favorite} />
        </button>
      </div>

      {wish.favorite && !editing && <span className="self-start rounded-full bg-pasto px-2.5 py-1 text-xs font-medium">{t("list.favorite")}</span>}
      {wish.note && !editing && <p className="rounded-[12px] bg-crema px-3 py-2 text-[13px]">{wish.note}</p>}

      {editing ? (
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            const p = price.trim() ? Number(price.replace(/[^\d.]/g, "")) : null;
            if (p !== null && !(p > 0)) return setError(t("list.errors.price"));
            // El link solo viaja si cambió: así no se vuelve a leer la tienda en cada guardado.
            const nextUrl = url.trim() === (wish.url ?? "") ? undefined : url.trim() || null;
            run(() => updateWish(inviteCode, token, wish.id, { title, note: note.trim() || null, price: p, url: nextUrl }), () => setEditing(false));
          }}
        >
          <TextField id={`w-title-${wish.id}`} label={t("list.titleLabel")} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          <TextField
            id={`w-url-${wish.id}`}
            type="url"
            inputMode="url"
            label={
              <>
                {t("list.urlLabel")} <span className="font-normal text-gris">{t("common.optional")}</span>
              </>
            }
            placeholder={t("list.urlPlaceholder")}
            value={url}
            maxLength={2000}
            onChange={(e) => setUrl(e.target.value)}
            hint={wish.url && url.trim() === wish.url ? t("list.urlHint") : undefined}
          />
          <TextField id={`w-note-${wish.id}`} label={t("list.noteLabel")} placeholder={t("list.notePlaceholder")} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
          <TextField id={`w-price-${wish.id}`} label={t("list.priceLabel")} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="h-11 flex-1 rounded-boton bg-tinta font-medium text-white">
              {pending ? t("list.saving") : t("list.save")}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="h-11 flex-1 rounded-boton bg-crema font-medium">
              {t("list.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-auto flex items-center gap-3 text-sm font-medium">
          <button type="button" onClick={startEditing} className="min-h-11 underline underline-offset-4">
            {t("list.edit")}
          </button>
          {!wish.url && (
            <button type="button" onClick={startEditing} className="min-h-11 underline underline-offset-4">
              {t("list.addLink")}
            </button>
          )}
          {wish.url && (
            <a href={wish.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 min-w-0 items-center underline underline-offset-4">
              {/* El recorte va en un hijo: en un inline-flex el texto no muestra «…» y se corta en seco. */}
              <span className="truncate">{t("list.openStore", { store: wish.store ?? "" })}</span>
            </a>
          )}
          <button
            type="button"
            aria-label={t("list.delete")}
            onClick={() => {
              setDeleteError(null);
              setConfirming(true);
            }}
            className="ml-auto grid size-11 place-items-center rounded-full text-gris transition-colors hover:bg-crema hover:text-coral-700"
          >
            <TrashIcon size={18} />
          </button>
        </div>
      )}
      {error && !editing && <Alert tone="error">{error}</Alert>}
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("list.deleteTitle", { title: wish.title.length > 60 ? `${wish.title.slice(0, 57)}…` : wish.title })}
        description={t("list.deleteText")}
        confirmLabel={t("list.deleteYes")}
        pending={deleting}
        error={deleteError}
        onConfirm={() =>
          startDelete(async () => {
            try {
              const res = await deleteWish(inviteCode, token, wish.id);
              if (res.ok) setConfirming(false);
              else setDeleteError(t("list.errors.generic"));
            } catch {
              setDeleteError(t("list.errors.generic"));
            }
          })
        }
      />
    </li>
  );
}
