"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { listMessages, pollMailbox, sendMessage } from "@/app/actions/mailbox";
import { Alert } from "@/components/ui/Alert";
import { Bubble, ConversationPane, ThreadList, ThreadTab } from "@/components/ui/Chat";
import { SendIcon } from "@/components/ui/icons";
import { Avatar, Columns, HandNote, ScreenTitle } from "@/components/ui/primitives";
import type { MailboxMessage, MailboxRole, Unread } from "@/lib/data/gifts";
import { DEFAULT_TIME_ZONE } from "@/lib/format";
import { t } from "@/lib/i18n";

// Polling barato: pollMailbox solo lee los docs de hilo. Empieza en 20 s y, si no hay nada nuevo, se espacia hasta 60 s.
const POLL_MIN_MS = 20_000;
const POLL_MAX_MS = 60_000;

type Props = {
  inviteCode: string;
  token: string;
  receiverName: string | null; // null si todavía no abre su sobre: entonces solo ve la pestaña de su amigo secreto
  initial: Record<MailboxRole, MailboxMessage[]>;
  initialRole: MailboxRole;
  initialUnread: Unread;
  /** Zona del intercambio, para la hora de cada mensaje. */
  timeZone?: string;
};

function time(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-MX", { timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(iso))
    .replace(/\./g, "")
    .replace(/ de /g, " ");
}

const SEND_ERRORS = ["empty", "long", "closed", "limit", "rate"] as const;
type SendError = (typeof SEND_ERRORS)[number];
const isSendError = (e: string): e is SendError => (SEND_ERRORS as readonly string[]).includes(e);

function UnreadPill({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="grid h-6 min-w-6 shrink-0 animate-pop place-items-center rounded-full bg-coral px-1.5 text-xs font-semibold text-tinta">
      <span className="sr-only">{n === 1 ? t("mailbox.unreadLabelOne") : t("mailbox.unreadLabel", { n })}</span>
      <span aria-hidden>{n > 9 ? "9+" : n}</span>
    </span>
  );
}

function SecretAvatar() {
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-tinta text-[15px] font-semibold text-white">
      ?
    </span>
  );
}

/**
 * P3. Dos conversaciones: como quien regala («Tu persona») y como quien recibe («Tu amigo secreto»).
 * Móvil: pestañas arriba + conversación. lg: lista de conversaciones a la izquierda y la conversación a la derecha.
 */
export function Mailbox({ inviteCode, token, receiverName, initial, initialRole, initialUnread, timeZone = DEFAULT_TIME_ZONE }: Props) {
  const [role, setRole] = useState<MailboxRole>(initialRole);
  const [messages, setMessages] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  // Cursor (último mensaje visto) por pestaña: el polling compara contra él y solo trae mensajes si cambió.
  const cursorRef = useRef<Record<MailboxRole, string | null>>({ giver: null, receiver: null });
  const delayRef = useRef(POLL_MIN_MS);
  // El link dejó de existir (se regeneró o se borró el intercambio): se deja de preguntar.
  const goneRef = useRef(false);

  // Pregunta si hay algo nuevo solo mientras la pestaña del navegador está visible.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const fetchAll = async () => {
      const res = await listMessages(inviteCode, token, role);
      if (cancelled || !res.ok) return;
      cursorRef.current[role] = res.cursor;
      setMessages((m) => ({ ...m, [role]: res.messages }));
      setUnread(res.unread);
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!cancelled && !goneRef.current && document.visibilityState === "visible") timer = setTimeout(tick, delayRef.current);
    };
    const tick = async () => {
      try {
        const res = await pollMailbox(inviteCode, token, role, cursorRef.current[role]);
        if (cancelled) return;
        if (!res.ok && res.error === "not-found") {
          goneRef.current = true;
          setGone(true);
          return;
        }
        if (res.ok && res.changed) {
          delayRef.current = POLL_MIN_MS;
          await fetchAll();
        } else {
          if (res.ok) setUnread((u) => ({ ...res.unread, [role]: u[role] }));
          delayRef.current = Math.min(Math.round(delayRef.current * 1.5), POLL_MAX_MS);
        }
      } catch {
        delayRef.current = POLL_MAX_MS; // sin red: se reintenta más tarde
      }
      schedule();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (goneRef.current) return;
        delayRef.current = POLL_MIN_MS;
        tick();
      } else {
        clearTimeout(timer);
      }
    };
    // Al cambiar de pestaña se lee de inmediato (y queda marcada como leída).
    delayRef.current = POLL_MIN_MS;
    if (role !== initialRole || unread[role] > 0)
      fetchAll()
        .catch(() => {})
        .then(schedule);
    else schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de pestaña, no con cada contador
  }, [inviteCode, token, role]);

  const list = messages[role];
  // Baja al último mensaje dentro del panel (sin mover la página).
  useEffect(() => {
    const box = endRef.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [list.length, role]);

  const isGiver = role === "giver";
  const roles: MailboxRole[] = receiverName ? ["giver", "receiver"] : ["receiver"];
  const select = (r: MailboxRole) => {
    setRole(r);
    setError(null);
    setUnread((u) => ({ ...u, [r]: 0 }));
  };

  const header = (
    <>
      {isGiver && receiverName ? <Avatar name={receiverName} color="pasto" size={40} /> : <SecretAvatar />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[17px] font-medium">{isGiver ? receiverName : t("mailbox.friendName")}</span>
        <span className="text-[13px] text-gris">{isGiver ? t("mailbox.personSub") : t("mailbox.friendSub")}</span>
      </span>
    </>
  );

  const composer = (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return setError(t("mailbox.errors.empty"));
        setError(null);
        start(async () => {
          try {
            const res = await sendMessage(inviteCode, token, role, text);
            if (res.ok) {
              setText("");
              cursorRef.current[role] = res.cursor;
              delayRef.current = POLL_MIN_MS;
              setMessages((m) => ({ ...m, [role]: res.messages }));
              setUnread(res.unread);
            } else if (res.error === "not-found") {
              goneRef.current = true;
              setGone(true);
            } else {
              setError(t(`mailbox.errors.${isSendError(res.error) ? res.error : "generic"}`));
            }
          } catch {
            setError(t("mailbox.errors.generic"));
          }
        });
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex items-center gap-2">
        <label htmlFor="mb-msg" className="sr-only">
          {t("mailbox.label")}
        </label>
        <input
          id="mb-msg"
          value={text}
          maxLength={500}
          autoComplete="off"
          disabled={gone}
          placeholder={isGiver ? t("mailbox.placeholder") : t("mailbox.placeholderFriend")}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setText(e.target.value)}
          className="h-[52px] min-w-0 flex-1 rounded-full border-2 border-arena bg-white px-4 text-base outline-none focus:border-tinta disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || gone}
          aria-label={t("mailbox.send")}
          aria-busy={pending || undefined}
          className="trazo-tinta presionable grid size-[52px] shrink-0 place-items-center rounded-full bg-pasto text-tinta disabled:opacity-50"
        >
          <SendIcon size={18} />
        </button>
      </div>
    </form>
  );

  return (
    <Columns layout="buzon" className="mt-3 lg:mt-4 lg:h-[calc(100dvh-168px)]! lg:min-h-[520px]">
      <div className="flex min-h-0 flex-col gap-3 lg:gap-4">
        <ScreenTitle size="sm" className="sr-only lg:not-sr-only">
          {t("mailbox.title")}
        </ScreenTitle>
        <ThreadList label={t("mailbox.title")} className={receiverName ? "" : "hidden lg:flex"}>
          {roles.map((r) => (
            <ThreadTab
              key={r}
              id={`mb-tab-${r}`}
              aria-controls="mb-panel"
              selected={role === r}
              onClick={() => select(r)}
              title={
                r === "giver" ? (
                  <>
                    <span className="lg:hidden">{t("mailbox.tabPerson")}</span>
                    <span className="hidden lg:inline">{receiverName}</span>
                  </>
                ) : (
                  t("mailbox.tabFriend")
                )
              }
              subtitle={r === "giver" ? `${t("mailbox.tabPerson")} · ${t("mailbox.shh")}` : t("mailbox.friendSub")}
              avatar={r === "giver" && receiverName ? <Avatar name={receiverName} color="pasto" size={40} /> : <SecretAvatar />}
              badge={role !== r ? <UnreadPill n={unread[r]} /> : null}
            />
          ))}
        </ThreadList>
        <div className="mt-auto hidden flex-col items-center gap-2 pt-4 lg:flex">
          <Image src="/illustrations/web/11-buzon.webp" width={668} height={566} alt={t("mailbox.alt")} className="h-auto w-[72%] max-w-[220px]" />
          <HandNote className="text-[19px]">{t("mailbox.shh")}</HandNote>
        </div>
      </div>

      <ConversationPane
        id="mb-panel"
        aria-labelledby={`mb-tab-${role}`}
        header={header}
        composer={composer}
        className="h-[calc(100dvh-210px)] min-h-[380px] flex-none lg:h-auto lg:min-h-0"
      >
        {gone && <Alert tone="error">{t("mailbox.errors.gone")}</Alert>}
        {list.length === 0 && <Image src="/illustrations/web/11-buzon.webp" width={668} height={566} alt="" className="mx-auto mt-2 h-[110px] w-auto lg:hidden" />}
        <p className="mx-auto mb-1 max-w-[460px] text-center text-[13px] leading-snug text-gris">{isGiver ? t("mailbox.hintPerson") : t("mailbox.hintFriend")}</p>
        {list.length === 0 && <p className="text-center text-sm font-medium">{isGiver ? t("mailbox.emptyPerson") : t("mailbox.emptyFriend")}</p>}
        {list.map((m) => (
          <Bubble key={m.id} mine={m.mine} meta={time(m.at, timeZone)}>
            {m.text}
          </Bubble>
        ))}
        <div ref={endRef} />
      </ConversationPane>
    </Columns>
  );
}
