import type { Timestamp } from "firebase-admin/firestore";
import type { OwnerStepKey } from "@/lib/ownerSteps";

export const GROUP_TYPES = ["familia", "amigos", "oficina", "escuela", "comunidad", "otro"] as const;
export const GIFT_CATEGORIES = ["todo", "libros", "tecnologia", "comida", "hecho-a-mano", "experiencias"] as const;
export const AVATAR_COLORS = ["pasto", "sol", "cielo", "coral", "lila", "arena"] as const;

export type GroupType = (typeof GROUP_TYPES)[number];
export type GiftCategory = (typeof GIFT_CATEGORIES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number];
export type ParticipantKind = "owner" | "self" | "assisted";
export type ExchangeStatus = "open" | "drawn";

/** Zona horaria por defecto (hora del centro de México). */
export const DEFAULT_TIME_ZONE = "America/Mexico_City";
/** Tope de participantes por intercambio (abuso y costo del sorteo, que lee a todos en una transacción). */
export const MAX_PARTICIPANTS = 100;

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
  // IANA (p. ej. "America/Tijuana"). Los intercambios viejos no lo tienen: se asume DEFAULT_TIME_ZONE.
  timeZone?: string;
  // «Cerrar inscripciones» antes del sorteo. Sin el campo = abiertas.
  registrationOpen?: boolean;
  // Quien organiza tocó «Avisar al grupo» después del sorteo. Sin el campo (o null) = aún no avisa.
  announcedAt?: Timestamp | null;
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
  // Quien organiza generó un link nuevo (el anterior dejó de servir). Se le muestra al participante.
  linkResetAt?: Timestamp | null;
  linkResets?: number;
  // Su persona cambió porque quitaron a alguien después del sorteo. Se le muestra al participante.
  assignmentChangedAt?: Timestamp | null;
  // Última vez que agregó, editó o borró un deseo («Recordar» solo se activa si cambió desde el último aviso).
  listUpdatedAt?: Timestamp | null;
};

export type TokenDoc = { exchangeId: string; participantId: string };
export type InviteDoc = { exchangeId: string };
export type ExclusionDoc = { a: string; b: string };
export type AssignmentDoc = {
  receiverId: string;
  plannedWishId: string | null;
  // «Pedirle ideas» (quien regala → quien recibe): última petición (límite de 24 h) y si quien recibe aún no la atiende.
  ideasAskedAt?: Timestamp | null;
  ideasPending?: boolean;
  // «Recordar» (quien recibe → quien regala): último aviso y si quien regala aún no lo ve.
  listNudgedAt?: Timestamp | null;
  listNudgePending?: boolean;
  // Última vez que quien regala abrió «Tu persona» (para las etiquetas «Nuevo» y «Cambió»).
  giverSeenListAt?: Timestamp | null;
};

export type WishDoc = {
  title: string;
  url: string | null;
  imageUrl: string | null;
  store: string | null;
  price: number | null;
  note: string | null;
  favorite: boolean;
  createdAt: Timestamp;
  // Se pone al agregar y al editar; los deseos viejos no lo tienen (se usa createdAt).
  updatedAt?: Timestamp;
};

// giverReadAt / receiverReadAt: última vez que cada lado abrió el hilo.
// unreadGiver / unreadReceiver: mensajes que cada lado aún no lee (el polling solo lee este doc).
// dayKey / dayCount: tope de mensajes por hilo por día.
export type ThreadDoc = {
  giverId: string;
  receiverId: string;
  updatedAt: Timestamp;
  giverReadAt?: Timestamp;
  receiverReadAt?: Timestamp;
  lastMessageAt?: Timestamp;
  unreadGiver?: number;
  unreadReceiver?: number;
  dayKey?: string;
  dayCount?: number;
};
export type MessageDoc = { from: "giver" | "receiver"; text: string; createdAt: Timestamp };

/* ---------- Formas serializables que viajan a componentes ---------- */

export type Exchange = Omit<ExchangeDoc, "eventAt" | "drawnAt" | "createdAt" | "updatedAt" | "timeZone" | "registrationOpen" | "announcedAt"> & {
  id: string;
  eventAt: string; // ISO
  drawnAt: string | null;
  announcedAt: string | null; // ISO; null = aún no avisa al grupo del sorteo
  timeZone: string; // siempre presente (con valor por defecto)
  registrationOpen: boolean;
};

/**
 * Participante tal como viaja a las páginas. Nunca incluye el token: el link personal es la credencial
 * y solo lo conoce su dueño (ver PanelParticipant para lo que sí ve quien organiza).
 */
export type Participant = Omit<ParticipantDoc, "joinedAt" | "nameKey" | "token" | "linkResetAt" | "linkResets" | "assignmentChangedAt" | "listUpdatedAt"> & {
  id: string;
  joinedAt: string;
  linkResetAt: string | null; // ISO
  linkResets: number;
  assignmentChangedAt: string | null; // ISO
  listUpdatedAt: string | null; // ISO
};

/**
 * Fila del panel del organizador. `path`/`link` solo existen para quien organiza (owner) y los asistidos:
 * de quienes se apuntaron solos (self) el organizador nunca recibe el link.
 */
export type PanelParticipant = Participant & { path: string | null; link: string | null };

export type Wish = Omit<WishDoc, "createdAt" | "updatedAt"> & { id: string; createdAt: string; updatedAt: string | null };

/** Fila de «Mis intercambios»: viene del organizador (sesión) o de un link personal guardado en el navegador. */
export type ExchangeSummary = {
  key: string;
  exchangeId: string;
  name: string;
  eventAt: string; // ISO
  timeZone?: string;
  status: ExchangeStatus;
  participantCount: number;
  role: "owner" | "participant";
  href: string;
  revealed?: boolean;
  bought?: boolean;
  wishCount?: number;
  listHref?: string;
  /** Solo los que organizas: «Siguiente paso» (lib/ownerSteps) y cuántos pasos van. */
  nextStep?: OwnerStepKey | null;
  stepsDone?: number;
  stepsTotal?: number;
};
