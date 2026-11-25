import { t } from "@/lib/i18n";

/** Contador verde de mensajes nuevos; no pinta nada en 0. `label` reemplaza el texto para lector de pantalla (p. ej. avisos). */
export function UnreadBadge({ n, label, className = "" }: { n: number; label?: string; className?: string }) {
  if (n <= 0) return null;
  return (
    <span className={`ml-2 inline-grid h-6 min-w-6 place-items-center rounded-full bg-pasto px-1.5 text-[13px] font-semibold text-tinta ${className}`}>
      <span className="sr-only">{label ?? (n === 1 ? t("mailbox.unreadLabelOne") : t("mailbox.unreadLabel", { n }))}</span>
      <span aria-hidden>{n > 9 ? "9+" : n}</span>
    </span>
  );
}
