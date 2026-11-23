import { z } from "zod";
import { GIFT_CATEGORIES, GROUP_TYPES } from "@/lib/data/types";
import { eventDateFrom } from "@/lib/format";

// Se usa igual en el asistente (cliente) y en la Server Action (servidor).
export const exchangeFields = {
  name: z.string().trim().min(2).max(60),
  groupType: z.enum(GROUP_TYPES),
  giftCategory: z.enum(GIFT_CATEGORIES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  place: z.string().trim().max(80),
  budget: z.coerce.number().positive().max(100_000),
  ownerName: z.string().trim().min(2).max(40),
  message: z.string().trim().max(500),
  ownerParticipates: z.boolean(),
  ownerSeesMap: z.boolean(),
  mailboxEnabled: z.boolean(),
};

export const exchangeInput = z
  .object(exchangeFields)
  .refine((v) => eventDateFrom(v.date, v.time).getTime() > Date.now(), { path: ["date"] });

export type ExchangeInput = z.input<typeof exchangeInput>;

/** Campos que valida cada paso del asistente. */
export const STEP_FIELDS: Record<1 | 2 | 3 | 4, (keyof typeof exchangeFields)[]> = {
  1: ["name"],
  2: ["groupType", "giftCategory"],
  3: ["date", "time", "place", "budget"],
  4: ["ownerName", "message", "ownerParticipates", "ownerSeesMap", "mailboxEnabled"],
};

/** Clave de texto del error para cada campo. */
export const FIELD_ERROR: Record<string, string> = {
  name: "create.errors.name",
  groupType: "create.errors.group",
  giftCategory: "create.errors.gift",
  date: "create.errors.date",
  time: "create.errors.date",
  place: "create.errors.place",
  budget: "create.errors.budget",
  ownerName: "create.errors.ownerName",
  message: "create.errors.message",
};
