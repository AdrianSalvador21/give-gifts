import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { BackIcon } from "./icons";

/* ---------- Card ---------- */

export function Card({ className = "", ...rest }: ComponentProps<"div">) {
  return <div className={`rounded-tarjeta bg-white p-4 ${className}`} {...rest} />;
}

/* ---------- Chip ---------- */

type ChipProps = Omit<ComponentProps<"button">, "className"> & { selected?: boolean; className?: string };

export function Chip({ selected, className = "", type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`h-10 rounded-full px-4 text-[15px] font-medium transition-colors ${
        selected ? "bg-tinta text-white" : "bg-white text-tinta hover:bg-arena"
      } ${className}`}
      {...rest}
    />
  );
}

export function Pill({ className = "", ...rest }: ComponentProps<"span">) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium ${className}`} {...rest} />;
}

/* ---------- TextField ---------- */

type FieldBase = { label: ReactNode; id: string; hint?: ReactNode; error?: string | null };

const inputClass =
  "w-full rounded-boton border-2 border-transparent bg-white px-4 text-base font-medium text-tinta outline-none placeholder:font-normal placeholder:text-gris focus:border-tinta aria-invalid:border-coral";

export function TextField({ label, id, hint, error, className = "", ...rest }: FieldBase & Omit<ComponentProps<"input">, "id">) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} aria-invalid={error ? true : undefined} className={`h-[54px] ${inputClass}`} {...rest} />
      {error ? <p className="text-sm text-[#B23A2A]">{error}</p> : hint ? <p className="text-sm text-gris">{hint}</p> : null}
    </div>
  );
}

export function TextArea({ label, id, hint, error, className = "", ...rest }: FieldBase & Omit<ComponentProps<"textarea">, "id">) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea id={id} aria-invalid={error ? true : undefined} className={`resize-none py-3.5 leading-snug ${inputClass}`} {...rest} />
      {error ? <p className="text-sm text-[#B23A2A]">{error}</p> : hint ? <p className="text-sm text-gris">{hint}</p> : null}
    </div>
  );
}

/* ---------- StepBar ---------- */

export function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full ${i < step ? "bg-pasto" : "bg-arena"}`} />
      ))}
    </div>
  );
}

/* ---------- TopBar ---------- */

export function RoundIconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} aria-label={label} className="grid size-11 shrink-0 place-items-center rounded-full bg-white">
      {children}
    </Link>
  );
}

export function TopBar({ backHref, backLabel = "Volver", title, action }: { backHref?: string; backLabel?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      {backHref ? (
        <RoundIconLink href={backHref} label={backLabel}>
          <BackIcon />
        </RoundIconLink>
      ) : (
        <span className="w-11" />
      )}
      <span className="min-w-0 truncate text-center text-sm font-medium text-gris">{title}</span>
      {action ?? <span className="w-11" />}
    </div>
  );
}

/* ---------- Avatar ---------- */

export type AvatarColor = "pasto" | "sol" | "cielo" | "coral" | "lila" | "arena";

const AVATAR_BG: Record<AvatarColor, string> = {
  pasto: "bg-pasto",
  sol: "bg-sol",
  cielo: "bg-cielo",
  coral: "bg-coral",
  lila: "bg-lila",
  arena: "bg-arena",
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Avatar({ name, color, size = 36 }: { name: string; color: AvatarColor; size?: number }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full text-[13px] font-medium ${AVATAR_BG[color]}`}
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Pantalla móvil ---------- */

/** Contenedor de las pantallas de la app: columna de 390 px máx. centrada, ocupa todo el alto. */
export function Screen({ className = "", tone = "crema", ...rest }: ComponentProps<"main"> & { tone?: "crema" | "pasto" | "sol" }) {
  const bg = tone === "pasto" ? "bg-pasto" : tone === "sol" ? "bg-sol" : "bg-crema";
  return (
    <div className={`min-h-dvh ${bg}`}>
      <main className={`mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-6 ${className}`} {...rest} />
    </div>
  );
}

export function ScreenTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`text-[40px] leading-none font-medium tracking-[-0.05em] ${className}`}>{children}</h1>;
}
