import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { t } from "@/lib/i18n";
import { BackIcon } from "./icons";

export { AppShell, Columns, Screen, SplitShell, StickyBar, StickyPanel, type ColumnsLayout, type ShellPattern, type ShellTone, type ShellVariant } from "./AppShell";

/* ---------- Tonos compartidos ---------- */

export type Tone =
  | "blanco"
  | "crema"
  | "hueso"
  | "pasto"
  | "sol"
  | "cielo"
  | "coral"
  | "lila"
  | "arena"
  | "tinta"
  | "pasto-50"
  | "sol-50"
  | "cielo-50"
  | "coral-50"
  | "lila-50";

export const TONE_BG: Record<Tone, string> = {
  blanco: "bg-white",
  crema: "bg-crema",
  hueso: "bg-hueso",
  pasto: "bg-pasto",
  sol: "bg-sol",
  cielo: "bg-cielo",
  coral: "bg-coral",
  lila: "bg-lila",
  arena: "bg-arena",
  tinta: "bg-tinta text-white",
  "pasto-50": "bg-pasto-50",
  "sol-50": "bg-sol-50",
  "cielo-50": "bg-cielo-50",
  "coral-50": "bg-coral-50",
  "lila-50": "bg-lila-50",
};

type RibbonColor = "sol" | "coral" | "pasto" | "cielo" | "lila" | "blanco";

const RIBBON: Record<RibbonColor, string> = {
  sol: "var(--color-sol)",
  coral: "var(--color-coral)",
  pasto: "var(--color-pasto)",
  cielo: "var(--color-cielo)",
  lila: "var(--color-lila)",
  blanco: "#fff",
};

/* ---------- Card ---------- */

/**
 * - `base`: tarjeta blanca tranquila (default, igual que antes).
 * - `protagonista`: el elemento principal de la pantalla. Borde + sombra tinta, radio panel. Una por pantalla.
 * - `punteada`: hueco / estado vacío.
 * - `plana`: sin padding ni fondo propio (contenedor de filas).
 */
export type CardVariant = "base" | "protagonista" | "punteada" | "plana";

type CardStyle = { variant?: CardVariant; tone?: Tone; ribbon?: boolean | RibbonColor; className?: string; style?: CSSProperties };

function cardClasses({ variant = "base", tone, ribbon }: CardStyle) {
  const base =
    variant === "protagonista"
      ? "rounded-panel trazo-tinta p-5 sm:p-6"
      : variant === "punteada"
        ? "rounded-tarjeta border-2 border-dashed border-punteado p-4"
        : variant === "plana"
          ? "rounded-tarjeta"
          : "rounded-tarjeta p-4 sm:p-5";
  const bg = tone ? TONE_BG[tone] : variant === "punteada" ? "bg-white/50" : "bg-white";
  return [base, bg, ribbon ? "liston" : ""].join(" ");
}

function ribbonStyle(ribbon: CardStyle["ribbon"], style?: CSSProperties): CSSProperties | undefined {
  if (!ribbon) return style;
  const color = RIBBON[ribbon === true ? "sol" : ribbon];
  return { ["--liston" as string]: color, ...style };
}

export function Card({ variant, tone, ribbon, className = "", style, ...rest }: CardStyle & Omit<ComponentProps<"div">, "className" | "style">) {
  return <div className={`${cardClasses({ variant, tone, ribbon })} ${className}`} style={ribbonStyle(ribbon, style)} {...rest} />;
}

/** Tarjeta que es un link: se eleva al hover (escritorio) y se hunde al tocar. */
export function CardLink({
  variant,
  tone,
  ribbon,
  className = "",
  style,
  ...rest
}: CardStyle & Omit<ComponentProps<typeof Link>, "className" | "style">) {
  const motion = variant === "protagonista" ? "presionable" : "levantable";
  return (
    <Link
      className={`block text-inherit no-underline ${cardClasses({ variant, tone, ribbon })} ${motion} ${className}`}
      style={ribbonStyle(ribbon, style)}
      {...rest}
    />
  );
}

/* ---------- Chip ---------- */

type ChipProps = Omit<ComponentProps<"button">, "className"> & { selected?: boolean; className?: string };

export function Chip({ selected, className = "", type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-[background-color,transform] duration-150 active:scale-95 disabled:opacity-50 ${
        selected ? "bg-tinta text-white" : "bg-white text-tinta hover:bg-arena"
      } ${className}`}
      {...rest}
    />
  );
}

/** Etiqueta de estado. `tone` usa los tintes -50 para estados («Organizas», «Por comprar»). */
export function Pill({ className = "", tone, ...rest }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap ${tone ? TONE_BG[tone] : ""} ${className}`}
      {...rest}
    />
  );
}

/* ---------- Tipografía ---------- */

/** Etiqueta pequeña en mayúsculas sobre un título: «Faltan 12 días», «Paso 2 de 4», «Tu sobre llegó». */
export function Eyebrow({ as: Tag = "p", className = "", ...rest }: ComponentProps<"p"> & { as?: "p" | "span" | "h2" | "h3" }) {
  return <Tag className={`etiqueta ${className}`} {...rest} />;
}

/** Nota manuscrita al margen. `pegada`: papelito sol con trazo tinta. Solo textos cortos. */
export function HandNote({
  className = "",
  rotate = -2,
  variant = "suelta",
  style,
  ...rest
}: ComponentProps<"p"> & { rotate?: number; variant?: "suelta" | "pegada" }) {
  const v = variant === "pegada" ? "inline-block rounded-xl border-2 border-tinta bg-sol px-3 py-1.5 shadow-tinta-sm" : "";
  return <p className={`mano text-[17px] leading-tight ${v} ${className}`} style={{ rotate: `${rotate}deg`, ...style }} {...rest} />;
}

/** Cifra con tabular-nums 600: presupuesto, progreso, contadores. */
export function Figure({ className = "", ...rest }: ComponentProps<"span">) {
  return <span className={`cifra ${className}`} {...rest} />;
}

/* ---------- TextField ---------- */

type FieldBase = { label: ReactNode; id: string; hint?: ReactNode; error?: string | null };

const inputClass =
  "w-full rounded-boton border-2 border-transparent bg-white px-4 text-base font-medium text-tinta outline-none transition-colors placeholder:font-normal placeholder:text-gris focus:border-tinta aria-invalid:border-coral";

export function TextField({ label, id, hint, error, className = "", ...rest }: FieldBase & Omit<ComponentProps<"input">, "id">) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-hint` : undefined}
        className={`h-[54px] ${inputClass}`}
        {...rest}
      />
      {error ? (
        <p id={`${id}-hint`} className="text-sm text-coral-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-gris">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextArea({ label, id, hint, error, className = "", ...rest }: FieldBase & Omit<ComponentProps<"textarea">, "id">) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-hint` : undefined}
        className={`resize-none py-3.5 leading-snug ${inputClass}`}
        {...rest}
      />
      {error ? (
        <p id={`${id}-hint`} className="text-sm text-coral-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-gris">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- StepBar (móvil) ---------- */

export function StepBar({ step, total, className = "" }: { step: number; total: number; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className}`} style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-colors duration-300 ${i < step ? "bg-pasto" : "bg-arena"}`} />
      ))}
    </div>
  );
}

/* ---------- TopBar ---------- */

export function RoundIconLink({ href, label, children, className = "" }: { href: string; label: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      transitionTypes={["nav-back"]}
      className={`grid size-11 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90 ${className}`}
    >
      {children}
    </Link>
  );
}

export function TopBar({ backHref, backLabel = t("common.back"), title, action }: { backHref?: string; backLabel?: string; title?: ReactNode; action?: ReactNode }) {
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
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Avatar({ name, color, size = 36, ring = false, className = "" }: { name: string; color: AvatarColor; size?: number; ring?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full text-[13px] font-medium ${AVATAR_BG[color]} ${ring ? "ring-[2.5px] ring-hueso" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}

/** Pila de avatares encimados («prueba social»). Muestra `max` y un «+n». El texto accesible lo pone la página. */
/** `total` permite pasar sólo una muestra de `people` y mostrar el «+N» con el conteo real. */
export function AvatarStack({ people, max = 4, size = 36, total, className = "" }: { people: { name: string; color: AvatarColor }[]; max?: number; size?: number; total?: number; className?: string }) {
  const shown = people.slice(0, max);
  const rest = Math.max(total ?? people.length, people.length) - shown.length;
  return (
    <span className={`flex ${className}`} aria-hidden>
      {shown.map((p, i) => (
        <Avatar key={`${p.name}-${i}`} name={p.name} color={p.color} size={size} ring className={i > 0 ? "-ml-2.5" : ""} />
      ))}
      {rest > 0 && (
        <span className="-ml-2.5 grid shrink-0 place-items-center rounded-full bg-white text-[13px] font-semibold ring-[2.5px] ring-hueso" style={{ width: size, height: size }}>
          {t("ui.more", { n: rest })}
        </span>
      )}
    </span>
  );
}

/* ---------- DateTile ---------- */

/** Mosaico de calendario («DIC / 19»). Usa `calendarParts(iso)` de lib/format. */
export function DateTile({
  month,
  day,
  tone = "pasto",
  size = "md",
  className = "",
}: {
  month?: string;
  day: string;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const s = size === "sm" ? "size-10 rounded-[10px] text-base" : size === "lg" ? "size-[70px] rounded-[18px] text-[28px]" : "size-[58px] rounded-[14px] text-2xl";
  return (
    <span aria-hidden className={`flex shrink-0 flex-col items-center justify-center leading-none ${s} ${TONE_BG[tone]} ${className}`}>
      {month && size !== "sm" && <span className="text-[10px] font-semibold tracking-[0.06em]">{month}</span>}
      <span className="cifra font-medium">{day}</span>
    </span>
  );
}

/* ---------- Barra de progreso lineal ---------- */

export function ProgressBar({ value, max, tone = "pasto", className = "", label }: { value: number; max: number; tone?: Tone; className?: string; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={`relative block h-2 overflow-hidden rounded-full bg-arena ${className}`}
    >
      <span className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-salida ${TONE_BG[tone]}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

/* ---------- Títulos de pantalla ---------- */

/** H1 de pantalla: 40 px en móvil, 56 px en lg. `size="sm"` para paneles densos (32 → 44). */
export function ScreenTitle({ children, className = "", size = "md" }: { children: ReactNode; className?: string; size?: "sm" | "md" }) {
  const s = size === "sm" ? "text-[32px] lg:text-[44px]" : "text-[40px] lg:text-[56px]";
  return <h1 className={`${s} leading-none font-medium tracking-[-0.05em] text-balance ${className}`}>{children}</h1>;
}

/** H2 de tarjeta: 22 → 26 px. */
export function CardTitle({ children, className = "", as: Tag = "h2" }: { children: ReactNode; className?: string; as?: "h2" | "h3" | "p" }) {
  return <Tag className={`text-[22px] leading-tight font-medium tracking-[-0.03em] lg:text-[26px] ${className}`}>{children}</Tag>;
}
