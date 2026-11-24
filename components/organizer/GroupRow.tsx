"use client";

import { useState, useTransition } from "react";
import { removeParticipant } from "@/app/actions/organizer";
import { CopyIcon } from "@/components/ui/icons";
import { Avatar, Pill } from "@/components/ui/primitives";
import type { AvatarColor } from "@/lib/data/types";
import { t } from "@/lib/i18n";

export type GroupRowData = {
  id: string;
  name: string;
  color: AvatarColor;
  isOwner: boolean;
  assisted: boolean;
  link: string;
  pills: { label: string; tone: "pasto" | "arena" | "cielo" | "sol" | "coral-outline" }[];
  givesTo?: string;
  remindHref?: string;
};

const TONE: Record<GroupRowData["pills"][number]["tone"], string> = {
  pasto: "bg-pasto",
  arena: "bg-arena",
  cielo: "bg-tinta text-white",
  sol: "bg-sol",
  "coral-outline": "border border-tinta",
};

export function GroupRow({ row, exchangeId, canRemove }: { row: GroupRowData; exchangeId: string; canRemove: boolean }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <li className={`flex flex-col gap-2 border-b border-arena py-3 last:border-b-0 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <Avatar name={row.name} color={row.color} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[15px] font-medium">
            {row.name}
            {row.isOwner && <span className="font-normal text-gris"> · {t("panel.you")}</span>}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {row.assisted && <Pill className="bg-lila px-2.5 py-0.5 text-xs">{t("panel.assisted")}</Pill>}
            {row.pills.map((p) => (
              <Pill key={p.label} className={`px-2.5 py-0.5 text-xs ${TONE[p.tone]}`}>
                {p.label}
              </Pill>
            ))}
          </span>
          {row.givesTo && <span className="text-[13px] text-gris">{t("panel.givesTo", { name: row.givesTo })}</span>}
        </span>
        <button
          type="button"
          aria-label={t("panel.copyLink")}
          title={t("panel.copyLink")}
          onClick={async () => {
            await navigator.clipboard.writeText(row.link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-crema"
        >
          <CopyIcon size={16} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 pl-12 text-[13px] font-medium">
        {copied && <span role="status">{t("panel.copied")}</span>}
        {row.remindHref && (
          <a href={row.remindHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            {t("panel.remind")}
          </a>
        )}
        {canRemove && !row.isOwner && !confirming && (
          <button type="button" onClick={() => setConfirming(true)} className="text-gris underline underline-offset-4">
            {t("panel.remove")}
          </button>
        )}
        {confirming && (
          <>
            <span>{t("panel.confirmRemove", { name: row.name })}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await removeParticipant(exchangeId, row.id);
                  if (!res.ok) setError(t(`panel.errors.${res.error === "closed" || res.error === "owner" ? res.error : "generic"}`));
                  setConfirming(false);
                })
              }
              className="text-[#B23A2A] underline underline-offset-4"
            >
              {t("panel.yesRemove")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="underline underline-offset-4">
              {t("panel.cancel")}
            </button>
          </>
        )}
        {error && <span className="text-[#B23A2A]">{error}</span>}
      </div>
    </li>
  );
}
