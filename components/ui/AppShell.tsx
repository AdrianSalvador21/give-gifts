import type { ComponentProps, ReactNode } from "react";

/* ---------- Shell de la app ---------- */

export type ShellVariant = "columna" | "split" | "tablero" | "escenario";
export type ShellTone = "crema" | "pasto" | "sol" | "cielo" | "blanco";
export type ShellPattern = "puntos" | "papel" | "confeti";

const TONE: Record<ShellTone, string> = {
  crema: "bg-crema",
  pasto: "bg-pasto",
  sol: "bg-sol",
  cielo: "bg-cielo",
  blanco: "bg-white",
};

const PATTERN: Record<ShellPattern, string> = {
  puntos: "bg-puntos",
  papel: "bg-papel",
  confeti: "bg-confeti",
};

const MAIN = "mx-auto flex min-h-dvh w-full flex-col px-5 pb-6";

const SHELL: Record<ShellVariant, string> = {
  // Columna de celular: 440 → 520 en sm. Formularios cortos, pasos simples.
  columna: "max-w-[440px] sm:max-w-[520px] sm:px-6",
  // Dos columnas de contenido en lg (sin panel de arte; para eso está SplitShell).
  split: "max-w-[440px] sm:max-w-[520px] sm:px-6 lg:max-w-[1200px] lg:px-10 lg:pb-10",
  // Tablero: columna en móvil, rejillas de 2 en md, 2–3 columnas en lg/xl.
  tablero: "max-w-[440px] sm:max-w-[600px] sm:px-6 md:max-w-[1200px] md:px-8 lg:px-10 lg:pb-10",
  // Escenario: un momento al centro (sobre). El contenido se centra a 760 px desde md.
  escenario: "max-w-none md:px-10",
};

type AppShellProps = ComponentProps<"main"> & {
  variant?: ShellVariant;
  tone?: ShellTone;
  pattern?: ShellPattern;
  /** Barra superior (normalmente <BrandBar />). Queda arriba a todo el ancho del shell. */
  header?: ReactNode;
  /** Solo `tablero`: barra lateral (<Sidebar />). Oculta en móvil; 72 px en lg, 248 px en xl. */
  sidebar?: ReactNode;
};

/**
 * Contenedor de pantalla con variantes de escritorio. Ocupa todo el alto.
 * - `columna`: Entrar (móvil), Crear (móvil), pasos sencillos.
 * - `split`: dos columnas de contenido en lg (Persona, Mi lista, Sorteo, Editar, Buzón).
 * - `tablero`: Home del participante, Panel del organizador (con `sidebar`), Mis intercambios.
 * - `escenario`: Sobre (revelación).
 */
export function AppShell({ variant = "columna", tone = "crema", pattern, header, sidebar, className = "", children, ...rest }: AppShellProps) {
  const bg = `${TONE[tone]} ${pattern ? PATTERN[pattern] : ""}`;
  const inner =
    variant === "split" ? (
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2 lg:content-start lg:gap-12">{children}</div>
    ) : variant === "escenario" ? (
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col sm:max-w-[520px] md:max-w-[760px]">{children}</div>
    ) : (
      children
    );

  const main = (
    <main className={`${MAIN} ${SHELL[variant]} ${sidebar ? "lg:mx-0 lg:max-w-[1200px] xl:mx-auto" : ""} ${className}`} {...rest}>
      {header}
      {inner}
    </main>
  );

  if (sidebar && variant === "tablero") {
    return (
      <div className={`min-h-dvh ${bg} lg:grid lg:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)]`}>
        <div className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh">{sidebar}</div>
        <div className="min-w-0">{main}</div>
      </div>
    );
  }
  return <div className={`min-h-dvh ${bg}`}>{main}</div>;
}

/** Alias histórico: `<Screen>` = `<AppShell variant="columna">`. Acepta los mismos tonos de antes. */
export function Screen({ tone = "crema", ...rest }: ComponentProps<"main"> & { tone?: "crema" | "pasto" | "sol" }) {
  return <AppShell variant="columna" tone={tone} {...rest} />;
}

/* ---------- SplitShell ---------- */

type SplitShellProps = {
  /** Panel de arte: ilustración existente, título grande, nota manuscrita. En móvil queda arriba como banda. */
  art: ReactNode;
  /** Barra de marca; va arriba del panel de arte (móvil y lg). */
  header?: ReactNode;
  tone?: Exclude<ShellTone, "crema" | "blanco">;
  pattern?: ShellPattern;
  /** `mitad` 1:1 (Entrar, Compré) · `arte` 1.1:1 (Invitación, Listo). */
  ratio?: "mitad" | "arte";
  /** Ancho de la columna de acción en lg: `angosto` 420 (formularios), `normal` 520, `ancho` 540 (tarjetas). */
  width?: "angosto" | "normal" | "ancho";
  /** En móvil, el contenido sube como hoja crema redondeada sobre la banda de color. */
  sheet?: boolean;
  className?: string;
  artClassName?: string;
  children: ReactNode;
};

const SPLIT_W = { angosto: "lg:max-w-[420px]", normal: "lg:max-w-[520px]", ancho: "lg:max-w-[540px]" };

/**
 * Split de pantalla completa: arte/contexto a la izquierda (sticky, alto de ventana) y acción a la derecha,
 * centrada verticalmente. Entrar, Invitación, Listo, Compré.
 */
export function SplitShell({ art, header, tone = "pasto", pattern = "papel", ratio = "mitad", width = "normal", sheet = true, className = "", artClassName = "", children }: SplitShellProps) {
  return (
    <div className={`min-h-dvh bg-crema lg:grid ${ratio === "arte" ? "lg:grid-cols-[1.1fr_1fr]" : "lg:grid-cols-2"}`}>
      <aside className={`relative ${TONE[tone]} ${PATTERN[pattern]} ${sheet ? "pb-10" : "pb-6"} lg:sticky lg:top-0 lg:h-dvh lg:pb-0`}>
        <div className={`mx-auto flex w-full max-w-[440px] flex-col px-5 sm:max-w-[520px] sm:px-6 lg:h-full lg:max-w-none lg:px-14 lg:py-8 xl:px-16 ${artClassName}`}>
          {header}
          {art}
        </div>
      </aside>
      <div className={`relative ${sheet ? "-mt-6 rounded-t-panel bg-crema lg:mt-0 lg:rounded-none" : ""} lg:flex lg:min-h-dvh lg:items-center`}>
        <main className={`mx-auto flex w-full max-w-[440px] flex-col px-5 pt-6 pb-6 sm:max-w-[520px] sm:px-6 lg:py-12 ${SPLIT_W[width]} ${className}`}>{children}</main>
      </div>
    </div>
  );
}

/* ---------- Rejillas por pantalla ---------- */

const COLUMNS = {
  /** Home participante: acción + lateral en lg; stepper a la izquierda en xl. */
  home: "flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]",
  /** Crear: rail + formulario en lg, + vista previa en xl. */
  wizard: "flex flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[240px_minmax(0,1fr)_380px]",
  /** Persona: ficha fija + rejilla de deseos. */
  ficha: "flex flex-col gap-6 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-10",
  /** Mi lista: formulario fijo + rejilla con huecos. */
  formulario: "flex flex-col gap-6 lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-10",
  /** Sorteo / Editar: configuración + resumen fijo a la derecha. */
  resumen: "flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10",
  /** Buzón: lista de conversaciones + conversación con scroll interno. */
  buzon: "flex flex-1 flex-col gap-4 lg:grid lg:h-[calc(100dvh-88px)] lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6",
  /** Panel del organizador: grupo + columna lateral. */
  panel: "flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6",
  /** KPIs: 2 en móvil, 4 en lg. */
  kpis: "grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4",
  /** Deseos (Persona / Mi lista). */
  deseos: "grid gap-4 sm:grid-cols-2 2xl:grid-cols-3",
  /** Tarjetas de Mis intercambios. */
  intercambios: "grid gap-5 md:grid-cols-2 xl:grid-cols-3",
  /** Campos de formulario largo (Editar). */
  campos: "grid gap-4 md:grid-cols-2",
} as const;

export type ColumnsLayout = keyof typeof COLUMNS;

/** Rejilla responsiva con los presets de la propuesta. `as="ul"` para listas. */
export function Columns({ layout, as: Tag = "div", className = "", ...rest }: ComponentProps<"div"> & { layout: ColumnsLayout; as?: "div" | "ul" | "ol" | "section" }) {
  const El = Tag as "div";
  return <El className={`${COLUMNS[layout]} ${className}`} {...rest} />;
}

/** Columna que se queda fija al hacer scroll en lg (ficha de Persona, formulario de Mi lista, resumen de Sorteo). */
export function StickyPanel({ as: Tag = "div", className = "", ...rest }: ComponentProps<"div"> & { as?: "div" | "aside" | "section" }) {
  return <Tag className={`lg:sticky lg:top-6 lg:self-start ${className}`} {...rest} />;
}

/** Barra inferior pegajosa (guardar en Editar, CTA de pantallas largas en móvil). */
export function StickyBar({ className = "", ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={`sticky bottom-0 z-10 -mx-5 mt-6 flex flex-col gap-2.5 border-t border-linea bg-crema/95 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:flex-row lg:items-center lg:justify-end ${className}`}
      {...rest}
    />
  );
}
