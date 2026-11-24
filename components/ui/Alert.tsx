import type { ReactNode } from "react";

export type AlertTone = "error" | "aviso" | "exito" | "info";

const TONES: Record<AlertTone, string> = {
  error: "bg-coral-50 text-coral-700",
  aviso: "bg-sol-50 text-tinta",
  exito: "bg-pasto-50 text-tinta",
  info: "bg-cielo-50 text-tinta",
};

/**
 * Mensaje en línea. `error` y `aviso` usan role="alert" (se anuncian de inmediato); `exito` e `info` role="status".
 * Renderízalo solo cuando haya mensaje para que el lector lo anuncie.
 */
export function Alert({ tone = "error", title, children, action, className = "" }: { tone?: AlertTone; title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  const role = tone === "error" || tone === "aviso" ? "alert" : "status";
  return (
    <div role={role} className={`flex items-start gap-3 rounded-boton px-4 py-3 text-sm leading-snug ${TONES[tone]} ${className}`}>
      <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${tone === "error" ? "bg-coral" : tone === "aviso" ? "bg-sol" : tone === "exito" ? "bg-pasto" : "bg-cielo"}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title && <strong className="font-semibold">{title}</strong>}
        <div>{children}</div>
      </div>
      {action}
    </div>
  );
}
