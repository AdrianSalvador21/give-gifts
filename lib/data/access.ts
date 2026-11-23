import "server-only";

import { notFound } from "next/navigation";
import { getByToken } from "./exchanges";

/** Resuelve el link personal de la ruta /i/[inviteCode]/p/[token] o muestra 404. */
export async function requireParticipant(params: Promise<{ inviteCode: string; token: string }>) {
  const { inviteCode, token } = await params;
  const found = await getByToken(inviteCode, token);
  if (!found) notFound();
  return { ...found, inviteCode, token, base: `/i/${inviteCode}/p/${token}` };
}
