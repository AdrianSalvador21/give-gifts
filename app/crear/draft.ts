// Borrador del asistente /crear en el navegador (localStorage). Nunca lleva correo ni contraseña.
// Todo va en try/catch: con localStorage bloqueado o lleno, el asistente sigue en memoria y solo se pierde el retomar.

import type { GiftCategory, GroupType } from "@/lib/data/types";

export const DRAFT_KEY = "gg:borrador-crear:v1";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type DraftStep = 1 | 2 | 3 | 4 | 5;

/** El estado del formulario del asistente. */
export type ExchangeFormState = {
  name: string;
  groupType: GroupType | "";
  giftCategory: GiftCategory;
  date: string;
  time: string;
  place: string;
  budget: string;
  ownerName: string;
  message: string;
  ownerParticipates: boolean;
  ownerSeesMap: boolean;
  mailboxEnabled: boolean;
};

export type CreateDraft = {
  v: 1;
  step: DraftStep;
  form: ExchangeFormState;
  savedAt: string;
};

const STRING_FIELDS = ["name", "groupType", "giftCategory", "date", "time", "place", "budget", "ownerName", "message"] as const;
const BOOL_FIELDS = ["ownerParticipates", "ownerSeesMap", "mailboxEnabled"] as const;

/** Solo acepta la forma esperada: un borrador viejo o manipulado se descarta en vez de romper el asistente. */
function isDraft(value: unknown): value is CreateDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as Partial<CreateDraft>;
  if (d.v !== 1 || ![1, 2, 3, 4, 5].includes(d.step as number) || typeof d.savedAt !== "string" || !d.form || typeof d.form !== "object") return false;
  const f = d.form as Record<string, unknown>;
  return STRING_FIELDS.every((k) => typeof f[k] === "string") && BOOL_FIELDS.every((k) => typeof f[k] === "boolean");
}

/** Lee el borrador; null si no hay, si está dañado o si tiene más de 30 días (y en ese caso lo borra). */
export function readDraft(): CreateDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft: unknown = JSON.parse(raw);
    const savedAt = isDraft(draft) ? Date.parse(draft.savedAt) : NaN;
    if (!isDraft(draft) || Number.isNaN(savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      clearDraft();
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft(step: DraftStep, form: ExchangeFormState): void {
  try {
    const draft: CreateDraft = { v: 1, step, form, savedAt: new Date().toISOString() };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Sin almacenamiento: el asistente sigue en memoria.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nada que borrar.
  }
}
