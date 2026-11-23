// Sorteo de un solo ciclo: A → B → C → … → A.
// Nadie se regala a sí mismo, no hay parejas mutuas (con 3 o más) y se respetan las exclusiones (en ambos sentidos).

export class DrawImpossibleError extends Error {
  constructor() {
    super("No hay sorteo posible con estas exclusiones.");
  }
}

export type Exclusion = { a: string; b: string };

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Devuelve Map<quien regala, quien recibe>.
 * Primero prueba barajados aleatorios (rápido y uniforme cuando hay pocas exclusiones);
 * si no encuentra, hace una búsqueda en profundidad con orden aleatorio.
 */
export function draw(participantIds: string[], exclusions: Exclusion[], random: () => number = Math.random): Map<string, string> {
  const ids = [...new Set(participantIds)];
  if (ids.length < 3) throw new DrawImpossibleError();

  const forbidden = new Set<string>();
  for (const { a, b } of exclusions) {
    forbidden.add(`${a}>${b}`);
    forbidden.add(`${b}>${a}`);
  }
  const allowed = (from: string, to: string) => from !== to && !forbidden.has(`${from}>${to}`);
  const toMap = (order: string[]) => new Map(order.map((id, i) => [id, order[(i + 1) % order.length]]));

  for (let attempt = 0; attempt < 2000; attempt++) {
    const order = shuffle(ids, random);
    if (order.every((id, i) => allowed(id, order[(i + 1) % order.length]))) return toMap(order);
  }

  // Búsqueda exhaustiva (con tope de pasos) de un ciclo hamiltoniano.
  const start = ids[Math.floor(random() * ids.length)];
  const path = [start];
  const used = new Set([start]);
  let steps = 0;
  const search = (): boolean => {
    if (++steps > 500_000) return false;
    const last = path[path.length - 1];
    if (path.length === ids.length) return allowed(last, start);
    for (const next of shuffle(ids, random)) {
      if (used.has(next) || !allowed(last, next)) continue;
      path.push(next);
      used.add(next);
      if (search()) return true;
      path.pop();
      used.delete(next);
    }
    return false;
  };
  if (search()) return toMap(path);
  throw new DrawImpossibleError();
}
