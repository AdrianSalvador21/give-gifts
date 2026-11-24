"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { listMessages, sendMessage } from "@/app/actions/mailbox";
import { SendIcon } from "@/components/ui/icons";
import type { MailboxMessage, MailboxRole, Unread } from "@/lib/data/gifts";
import { TIME_ZONE } from "@/lib/format";
import { t } from "@/lib/i18n";

const POLL_MS = 10_000;

type Props = {
  inviteCode: string;
  token: string;
  receiverName: string | null; // null si todavía no abre su sobre: entonces solo ve la pestaña de su amigo secreto
  initial: Record<MailboxRole, MailboxMessage[]>;
  initialRole: MailboxRole;
  initialUnread: Unread;
};

function time(iso: string) {
  return new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(iso))
    .replace(/\./g, "")
    .replace(/ de /g, " ");
}

/** P3. Dos pestañas: como quien regala («Tu persona») y como quien recibe («Tu amigo secreto»). */
export function Mailbox({ inviteCode, token, receiverName, initial, initialRole, initialUnread }: Props) {
  const [role, setRole] = useState<MailboxRole>(initialRole);
  const [messages, setMessages] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  // Refresca cada 10 s solo mientras la pestaña del navegador está visible.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const poll = async () => {
      const res = await listMessages(inviteCode, token, role);
      if (res.ok) {
        setMessages((m) => ({ ...m, [role]: res.messages }));
        setUnread(res.unread);
      }
    };
    const startPolling = () => {
      clearInterval(timer);
      if (document.visibilityState === "visible") timer = setInterval(poll, POLL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") poll();
      startPolling();
    };
    // Al cambiar de pestaña se lee de inmediato (y queda marcada como leída).
    if (role !== initialRole || unread[role] > 0) poll();
    startPolling();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de pestaña, no con cada contador
  }, [inviteCode, token, role]);

  const list = messages[role];
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [list.length, role]);

  const isGiver = role === "giver";

  return (
    <div className="flex flex-1 flex-col">
      {receiverName && (
        <div role="tablist" aria-label={t("mailbox.title")} className="mt-4 grid grid-cols-2 gap-1 rounded-boton bg-white p-1">
          {(["giver", "receiver"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={role === r}
              onClick={() => {
                setRole(r);
                setError(null);
                setUnread((u) => ({ ...u, [r]: 0 }));
              }}
              className={`flex h-11 items-center justify-center gap-2 rounded-[10px] text-[15px] font-medium ${role === r ? "bg-tinta text-white" : ""}`}
            >
              {r === "giver" ? t("mailbox.tabPerson") : t("mailbox.tabFriend")}
              {role !== r && unread[r] > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-pasto px-1.5 text-xs font-semibold text-tinta">
                  <span className="sr-only">{unread[r] === 1 ? t("mailbox.unreadLabelOne") : t("mailbox.unreadLabel", { n: unread[r] })}</span>
                  <span aria-hidden>{unread[r]}</span>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 border-b border-arena pb-3.5">
        <div className="flex flex-1 flex-col">
          <span className="text-[17px] font-medium">{isGiver ? receiverName : t("mailbox.friendName")}</span>
          <span className="text-[13px] text-gris">{isGiver ? t("mailbox.personSub") : t("mailbox.friendSub")}</span>
        </div>
        <span aria-hidden className={`grid size-9 place-items-center rounded-full ${isGiver ? "bg-tinta text-white" : "bg-pasto"}`}>
          <SendIcon size={16} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 py-4" aria-live="polite">
        <Image src="/illustrations/web/11-buzon.webp" width={668} height={566} alt={t("mailbox.alt")} className="mx-auto h-[140px] w-auto" />
        <p className="mb-1.5 text-center text-[13px] leading-snug text-gris">{isGiver ? t("mailbox.hintPerson") : t("mailbox.hintFriend")}</p>
        {list.length === 0 && <p className="text-center text-sm font-medium">{isGiver ? t("mailbox.emptyPerson") : t("mailbox.emptyFriend")}</p>}
        {list.map((m) => (
          <div
            key={m.id}
            className={`max-w-[78%] px-4 py-3 text-base leading-snug break-words whitespace-pre-wrap ${
              m.mine ? "self-end rounded-[20px_20px_6px_20px] bg-tinta text-white" : "self-start rounded-[20px_20px_20px_6px] bg-white"
            }`}
          >
            {m.text}
            <span className="mt-1 block text-[11px] opacity-60">{time(m.at)}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-0 flex flex-col gap-1.5 bg-crema pt-3 pb-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return setError(t("mailbox.errors.empty"));
          setError(null);
          start(async () => {
            const res = await sendMessage(inviteCode, token, role, text);
            if (res.ok) {
              setText("");
              setMessages((m) => ({ ...m, [role]: res.messages }));
              setUnread(res.unread);
            } else {
              setError(t(`mailbox.errors.${res.error === "empty" || res.error === "long" || res.error === "closed" ? res.error : "generic"}`));
            }
          });
        }}
      >
        <div className="flex items-center gap-2">
          <label htmlFor="mb-msg" className="sr-only">
            {t("mailbox.label")}
          </label>
          <input
            id="mb-msg"
            value={text}
            maxLength={500}
            autoComplete="off"
            placeholder={t("mailbox.placeholder")}
            onChange={(e) => setText(e.target.value)}
            className="h-[52px] min-w-0 flex-1 rounded-full border-2 border-transparent bg-white px-4 text-base outline-none focus:border-tinta"
          />
          <button type="submit" disabled={pending} aria-label={t("mailbox.send")} className="grid size-[52px] shrink-0 place-items-center rounded-full bg-tinta text-white disabled:opacity-50">
            <SendIcon size={18} />
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-[#B23A2A]">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
