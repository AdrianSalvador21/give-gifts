import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowIcon, CheckIcon, PlusIcon } from "./icons";

export type DotVariant = "pasto" | "coral" | "sol" | "cielo" | "blanco" | "tinta";

const VARIANTS: Record<DotVariant, { button: string; dot: string }> = {
  pasto: { button: "bg-pasto text-tinta", dot: "bg-white" },
  coral: { button: "bg-coral text-tinta", dot: "bg-white" },
  sol: { button: "bg-sol text-tinta", dot: "bg-white" },
  cielo: { button: "bg-cielo text-tinta", dot: "bg-white" },
  blanco: { button: "bg-white text-tinta", dot: "bg-pasto" },
  tinta: { button: "bg-tinta text-white", dot: "bg-pasto text-tinta" },
};

const ICONS = { arrow: ArrowIcon, plus: PlusIcon, check: CheckIcon };

type Common = {
  children: ReactNode;
  variant?: DotVariant;
  /** Color del círculo cuando no se quiere el del variant (p. ej. CTA blanca con punto coral). */
  dotClassName?: string;
  icon?: keyof typeof ICONS;
  size?: "md" | "lg";
  full?: boolean;
  className?: string;
};

type AsLink = Common & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;
type AsButton = Common & { href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">;

/** Botón de la marca: texto a la izquierda y un círculo con flecha a la derecha. */
export function DotButton(props: AsLink | AsButton) {
  const { children, variant = "pasto", dotClassName, icon = "arrow", size = "md", full, className = "", ...rest } = props;
  const v = VARIANTS[variant];
  const Icon = ICONS[icon];
  const classes = [
    "group inline-flex items-center justify-between gap-4 whitespace-nowrap rounded-boton font-medium no-underline",
    "transition-opacity disabled:opacity-50 aria-disabled:opacity-50",
    size === "lg" ? "h-[68px] pl-6 pr-2.5 text-[19px]" : "h-[60px] pl-[22px] pr-2 text-lg",
    full ? "w-full" : "",
    v.button,
    className,
  ].join(" ");
  const dot = (
    <span
      className={`grid shrink-0 place-items-center rounded-full text-tinta transition-transform group-hover:translate-x-1 ${
        size === "lg" ? "size-12" : "size-11"
      } ${dotClassName ?? v.dot}`}
    >
      <Icon size={icon === "arrow" ? 16 : 18} />
    </span>
  );

  if (rest.href !== undefined) {
    return (
      <Link className={classes} {...(rest as Omit<AsLink, keyof Common>)}>
        {children}
        {dot}
      </Link>
    );
  }
  const { type = "button", ...buttonRest } = rest as Omit<AsButton, keyof Common>;
  return (
    <button type={type} className={classes} {...buttonRest}>
      {children}
      {dot}
    </button>
  );
}
