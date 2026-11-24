import type { ComponentProps, ReactNode } from "react";

/**
 * Primitivas del Buzón anónimo. Móvil: pestañas arriba + conversación. lg: dos paneles
 * (<Columns layout="buzon">): lista vertical de conversaciones a la izquierda y la conversación con scroll interno.
 * Se usan desde el componente cliente del buzón (los handlers van ahí).
 */

/** Contenedor de pestañas/conversaciones. Mantiene role="tablist"; en lg se vuelve lista vertical. */
export function ThreadList({ label, className = "", ...rest }: ComponentProps<"div"> & { label: string }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex gap-1 rounded-boton bg-white p-1 lg:flex-col lg:gap-2.5 lg:bg-transparent lg:p-0 ${className}`}
      {...rest}
    />
  );
}

/** Una conversación. En móvil es una pestaña compacta; en lg una tarjeta con avatar y vista previa. */
export function ThreadTab({
  selected,
  title,
  subtitle,
  avatar,
  badge,
  className = "",
  ...rest
}: Omit<ComponentProps<"button">, "title"> & { selected: boolean; title: ReactNode; subtitle?: ReactNode; avatar?: ReactNode; badge?: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={`flex min-h-11 flex-1 items-center justify-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-[background-color,box-shadow] lg:flex-none lg:justify-start lg:rounded-tarjeta lg:p-4 lg:text-left ${
        selected ? "bg-tinta text-white lg:trazo-tinta lg:bg-white lg:text-tinta" : "text-tinta hover:bg-arena lg:bg-white lg:hover:bg-white lg:hover:shadow-tinta-sm"
      } ${className}`}
      {...rest}
    >
      {avatar && <span className="hidden lg:block">{avatar}</span>}
      <span className="flex min-w-0 flex-col lg:flex-1">
        <span className="truncate">{title}</span>
        {subtitle && <span className="hidden truncate text-[13px] font-normal text-gris lg:block">{subtitle}</span>}
      </span>
      {badge}
    </button>
  );
}

/** Panel de conversación: cabecera, mensajes con scroll interno (en lg) y redactor abajo. */
export function ConversationPane({ header, composer, children, className = "", ...rest }: ComponentProps<"section"> & { header?: ReactNode; composer?: ReactNode }) {
  return (
    <section role="tabpanel" className={`flex min-h-0 flex-1 flex-col rounded-tarjeta bg-white bg-puntos p-4 lg:p-6 ${className}`} {...rest}>
      {header && <div className="flex items-center gap-3 border-b border-arena pb-4">{header}</div>}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4" aria-live="polite">
        {children}
      </div>
      {composer && <div className="pt-2">{composer}</div>}
    </section>
  );
}

/** Burbuja: tinta para lo tuyo (esquina inferior derecha recortada), crema para lo recibido. */
export function Bubble({ mine, children, meta, className = "" }: { mine: boolean; children: ReactNode; meta?: ReactNode; className?: string }) {
  return (
    <div className={`flex max-w-[80%] animate-entrada flex-col gap-1 lg:max-w-[60%] ${mine ? "self-end items-end" : "self-start items-start"} ${className}`}>
      <p
        className={`px-4 py-2.5 text-[15px] leading-snug break-words whitespace-pre-wrap ${
          mine ? "rounded-[18px_18px_5px_18px] bg-tinta text-white" : "rounded-[18px_18px_18px_5px] bg-crema text-tinta"
        }`}
      >
        {children}
      </p>
      {meta && <span className="px-1 text-[12px] text-gris">{meta}</span>}
    </div>
  );
}
