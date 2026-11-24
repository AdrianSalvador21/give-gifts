/**
 * «Tus pendientes» de quien organiza: lógica pura (sin datos ni textos), compartida por el panel
 * (OwnerSteps) y las tarjetas de Mis intercambios.
 */

/** Ideas que pedimos en la lista (el mismo objetivo que ve el participante). */
export const LIST_GOAL = 3;
/** Mínimo de personas para sortear. */
export const MIN_TO_DRAW = 3;

export type OwnerStepKey = "create" | "list" | "invite" | "draw" | "gift" | "announce";
/** `locked`: aún no se puede (se muestra atenuado con el motivo). */
export type OwnerStepState = "done" | "current" | "todo" | "locked";
export type OwnerStep = { key: OwnerStepKey; state: OwnerStepState };

export type OwnerProgress = {
  /** Participa en el sorteo (rules.ownerParticipates y existe su participante). */
  participates: boolean;
  drawn: boolean;
  /** Ya tocó «Avisar al grupo» después del sorteo (exchange.announcedAt). */
  announced: boolean;
  /** Personas apuntadas. */
  total: number;
  wishCount: number;
  revealed: boolean;
  bought: boolean;
};

/**
 * Pasos en orden. Antes del sorteo el «actual» es invitar (hasta 3 personas) y luego sortear; la lista de
 * quien organiza es opcional y nunca bloquea. Después, primero avisar al grupo (los participantes esperan
 * ese aviso) y luego el sobre/regalo. Solo uno queda como `current`.
 */
export function ownerSteps(p: OwnerProgress): OwnerStep[] {
  // Después del sorteo, con al menos una idea ya cuenta: quien le regala ya tiene de dónde escoger.
  const listDone = p.wishCount >= LIST_GOAL || (p.drawn && p.wishCount > 0);
  const inviteDone = p.drawn || p.total >= MIN_TO_DRAW;
  const steps: { key: OwnerStepKey; done: boolean; locked: boolean }[] = [
    { key: "create", done: true, locked: false },
    ...(p.participates ? [{ key: "list" as const, done: listDone, locked: false }] : []),
    { key: "invite", done: inviteDone, locked: false },
    { key: "draw", done: p.drawn, locked: !p.drawn && p.total < MIN_TO_DRAW },
    { key: "announce", done: p.drawn && p.announced, locked: !p.drawn },
    ...(p.participates ? [{ key: "gift" as const, done: p.bought, locked: !p.drawn }] : []),
  ];

  // La lista es opcional: nunca es el paso «Ahora» ni bloquea el sorteo (sigue disponible como «todo»).
  // Antes del sorteo: invitar hasta tener 3 y luego sortear. Después: avisar al grupo y luego el sobre/regalo.
  const current = p.drawn
    ? steps.find((s) => (s.key === "announce" || s.key === "gift") && !s.done)
    : steps.find((s) => s.key !== "list" && !s.done && !s.locked);

  return steps.map((s) => ({ key: s.key, state: s.done ? "done" : s === current ? "current" : s.locked ? "locked" : "todo" }));
}

/** El paso «Ahora», o null si ya no queda nada por hacer. */
export function ownerNextStep(p: OwnerProgress): OwnerStepKey | null {
  return ownerSteps(p).find((s) => s.state === "current")?.key ?? null;
}
