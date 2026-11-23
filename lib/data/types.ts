import type { Timestamp } from "firebase-admin/firestore";

export const GROUP_TYPES = ["familia", "amigos", "oficina", "escuela", "comunidad", "otro"] as const;
export const GIFT_CATEGORIES = ["todo", "libros", "tecnologia", "comida", "hecho-a-mano", "experiencias"] as const;
export const AVATAR_COLORS = ["pasto", "sol", "cielo", "coral", "lila", "arena"] as const;

export type GroupType = (typeof GROUP_TYPES)[number];
export type GiftCategory = (typeof GIFT_CATEGORIES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number];
export type ParticipantKind = "owner" | "self" | "assisted";
export type ExchangeStatus = "open" | "drawn";

/* ---------- Documentos tal como viven en Firestore ---------- */

export type UserDoc = { displayName: string; email: string; createdAt: Timestamp };

export type ExchangeDoc = {
  name: string;
  groupType: GroupType;
  giftCategory: GiftCategory;
  eventAt: Timestamp;
  place: string | null;
  budget: { amount: number; currency: "MXN" };
  message: string;
  ownerUid: string;
  rules: { ownerParticipates: boolean; ownerSeesMap: boolean; mailboxEnabled: boolean };
  inviteCode: string;
  status: ExchangeStatus;
  drawnAt: Timestamp | null;
  participantCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ParticipantDoc = {
  name: string;
  nameKey: string; // nombre normalizado (minúsculas, sin acentos ni espacios extra) para evitar duplicados
  color: AvatarColor;
  kind: ParticipantKind;
  token: string;
  wishCount: number;
  revealed: boolean;
  bought: boolean;
  joinedAt: Timestamp;
};

export type TokenDoc = { exchangeId: string; participantId: string };
export type InviteDoc = { exchangeId: string };
export type ExclusionDoc = { a: string; b: string };
export type AssignmentDoc = { receiverId: string; plannedWishId: string | null };

export type WishDoc = {
  title: string;
  url: string | null;
  imageUrl: string | null;
  store: string | null;
  price: number | null;
  note: string | null;
  favorite: boolean;
  createdAt: Timestamp;
};

export type ThreadDoc = { giverId: string; receiverId: string; updatedAt: Timestamp };
export type MessageDoc = { from: "giver" | "receiver"; text: string; createdAt: Timestamp };

/* ---------- Formas serializables que viajan a componentes ---------- */

export type Exchange = Omit<ExchangeDoc, "eventAt" | "drawnAt" | "createdAt" | "updatedAt"> & {
  id: string;
  eventAt: string; // ISO
  drawnAt: string | null;
};

export type Participant = Omit<ParticipantDoc, "joinedAt" | "nameKey"> & { id: string; joinedAt: string };

export type Wish = Omit<WishDoc, "createdAt"> & { id: string; createdAt: string };

/** Fila de «Mis intercambios»: viene del organizador (sesión) o de un link personal guardado en el navegador. */
export type ExchangeSummary = {
  key: string;
  exchangeId: string;
  name: string;
  eventAt: string; // ISO
  status: ExchangeStatus;
  participantCount: number;
  role: "owner" | "participant";
  href: string;
  revealed?: boolean;
  bought?: boolean;
  wishCount?: number;
  listHref?: string;
};
