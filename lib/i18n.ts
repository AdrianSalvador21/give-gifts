import messages from "@/messages/es-MX.json";

type Messages = typeof messages;

// "a.b.c" para cada hoja de tipo string del diccionario.
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;

/**
 * Devuelve el texto en es-MX. `{nombre}` en el texto se reemplaza con `vars.nombre`.
 */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], messages);
  if (typeof value !== "string") return key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
