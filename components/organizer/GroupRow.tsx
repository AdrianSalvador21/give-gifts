"use client";

import { useState, useTransition } from "react";
import { regenerateParticipantLink, removeParticipant, removeParticipantAfterDraw } from "@/app/actions/organizer";
import { CopyButton } from "@/components/ui/CopyButton";
import { ConfirmDialog, Sheet } from "@/components/ui/Dialog";
import { DotButton } from "@/components/ui/DotButton";
import { Avatar, Pill, type Tone } from "@/components/ui/primitives";
import type { AvatarColor } from "@/lib/data/types";
import { whatsappHref } from "@/lib/format";
import { t, type MessageKey } from "@/lib/i18n";

export type GroupRowData = {
  id: string;
  name: string;
  color: AvatarColor;
  isOwner: boolean;
  assisted: boolean;
  link: string | null; // null: se apuntó solo y quien organiza no tiene su link (R1)
  /** «1 de 3 ideas», «4 ideas», «Sin ideas». */
  ideas: string;
  /** Un solo estado por persona («Lista lista», «Sobre abierto», «Ya compró»). */
  pill?: { label: string; tone: Tone };
  givesTo?: string;
  remindHref?: string;
};


type Mode = null | "menu" | "regenerate" | "remove" | "link";

const REMOVE_ERRORS: Record<string, MessageKey> = {
  closed: "panel.errors.closed",
  owner: "panel.errors.owner",
  "not-drawn": "panel.errors.notDrawn",
  min: "panel.errors.min",
  exclusion: "panel.errors.exclusion",
};

function MoreButton({ name, onClick, className = "" }: { name: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("panel.moreActions", { name })}
      title={t("panel.moreActions", { name })}
      className={`grid size-11 shrink-0 place-items-center rounded-full bg-crema text-lg leading-none font-semibold transition-[transform,background-color] active:scale-90 md:bg-transparent md:hover:bg-crema ${className}`}
    >
      <span aria-hidden>···</span>
    </button>
  );
}

const actionClass = "flex min-h-12 w-full items-center rounded-boton bg-white px-4 text-left text-base font-medium transition-transform active:scale-[0.99]";

/**
 * Persona del grupo: fila en móvil, tarjeta de la cuadrícula desde md. «···» abre las acciones
 * (copiar su link, link nuevo, recordar, quitar).
 * El link nuevo se muestra una sola vez, aquí mismo, con copiar y WhatsApp.
 */
export function GroupRow({ row, exchangeId, exchangeName, drawn }: { row: GroupRowData; exchangeId: string; exchangeName: string; drawn: boolean }) {
  const [mode, setMode] = useState<Mode>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const first = row.name.split(" ")[0];

  const open = (next: Mode) => {
    setError(null);
    if (next === "regenerate") setNewLink(null);
    setMode(next);
  };
  // El <dialog> nativo avisa su cierre después (evento close): solo cierra si sigue abierto ese mismo modo,
  // para que pasar del menú a una confirmación (o de la confirmación al link nuevo) no cierre todo.
  const closeIf = (current: Exclude<Mode, null>) => () => setMode((m) => (m === current ? null : m));

  function regenerate() {
    start(async () => {
      const res = await regenerateParticipantLink(exchangeId, row.id);
      if (res.ok) {
        setNewLink(res.link);
        setMode("link");
      } else setError(t(res.error === "not-found" ? "panel.errors.notFound" : "panel.errors.generic"));
    });
  }

  function remove() {
    start(async () => {
      const res = drawn ? await removeParticipantAfterDraw(exchangeId, row.id) : await removeParticipant(exchangeId, row.id);
      if (res.ok) setMode(null);
      else setError(t(REMOVE_ERRORS[res.error] ?? "panel.errors.generic"));
    });
  }

  return (
    <li className={`relative flex items-center gap-3 py-3 md:flex-col md:items-start md:gap-3 md:rounded-tarjeta md:bg-white md:p-[18px] ${pending ? "opacity-60" : ""}`}>
      <Avatar name={row.name} color={row.color} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:w-full md:flex-none md:pr-10">
        <span className="truncate text-[15px] font-medium md:text-[17px]">
          {row.name}
          {row.isOwner && <span className="font-normal text-gris"> · {t("panel.you")}</span>}
        </span>
        <span className="cifra truncate text-[13px] font-normal text-gris">{[row.ideas, row.assisted ? t("panel.assisted") : null].filter(Boolean).join(" · ")}</span>
        {row.givesTo && <span className="truncate text-[13px] text-gris">{t("panel.givesTo", { name: row.givesTo })}</span>}
      </span>
      {row.pill && (
        <Pill tone={row.pill.tone} className="shrink-0 px-2.5 py-1 text-xs">
          {row.pill.label}
        </Pill>
      )}
      <MoreButton name={row.name} onClick={() => open("menu")} className="md:absolute md:top-2.5 md:right-2.5" />

      <Sheet open={mode === "menu"} onClose={closeIf("menu")} title={row.name}>
        <div className="flex flex-col gap-2">
          {row.link && (
            <div className="flex flex-wrap items-center gap-2 rounded-boton bg-white py-1.5 pr-1.5 pl-4">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.link.replace(/^https?:\/\//, "")}</span>
              <CopyButton text={row.link} />
            </div>
          )}
          {!row.link && <p className="text-sm leading-snug text-gris">{t("panel.noLinkSelf")}</p>}
          <button type="button" onClick={() => open("regenerate")} className={actionClass}>
            {t("panel.regenerateLink")}
          </button>
          {row.remindHref && (
            <a href={row.remindHref} target="_blank" rel="noopener noreferrer" className={actionClass}>
              {t("panel.remind")}
            </a>
          )}
          {!row.isOwner && (
            <button type="button" onClick={() => open("remove")} className={`${actionClass} text-coral-700`}>
              {drawn ? t("panel.removeAfterDraw") : t("panel.remove")}
            </button>
          )}
        </div>
      </Sheet>

      <ConfirmDialog
        open={mode === "regenerate"}
        onClose={closeIf("regenerate")}
        onConfirm={regenerate}
        title={t("panel.regenerateLink")}
        description={t("panel.regenerateConfirm", { name: first })}
        confirmLabel={t("panel.regenerateYes")}
        tone="normal"
        pending={pending}
        error={error}
      />

      <ConfirmDialog
        open={mode === "remove"}
        onClose={closeIf("remove")}
        onConfirm={remove}
        title={drawn ? t("panel.removeAfterDraw") : t("panel.confirmRemove", { name: row.name })}
        description={drawn ? t("panel.confirmRemoveAfterDraw", { name: row.name }) : undefined}
        confirmLabel={t("panel.yesRemove")}
        tone="peligro"
        pending={pending}
        error={error}
      />

      <Sheet open={mode === "link" && newLink !== null} onClose={closeIf("link")} title={t("panel.regenerateTitle", { name: first })} description={t("panel.regenerateDone", { name: first })}>
        {newLink && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-boton bg-white py-1.5 pr-1.5 pl-4">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{newLink.replace(/^https?:\/\//, "")}</span>
              <CopyButton text={newLink} />
            </div>
            <DotButton
              href={whatsappHref(t("panel.regenerateWhatsappText", { name: first, exchange: exchangeName, link: newLink }))}
              target="_blank"
              rel="noopener noreferrer"
              variant="tinta"
              icon="send"
              full
            >
              {t("common.whatsapp")}
            </DotButton>
          </div>
        )}
      </Sheet>
    </li>
  );
}
