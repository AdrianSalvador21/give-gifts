import { NextResponse, type NextRequest } from "next/server";

// I7: con Cache Components, un notFound() dentro de la página llega después de mandar el shell (HTTP 200).
// Para que un link personal inválido dé un 404 de verdad, se revisa aquí, antes de que empiece la respuesta:
// formato del token y que exista tokens/{token} (1 lectura, con caché en memoria de los válidos).
// La página sigue verificando todo (que el token sea de ese código de invitación, etc.).

export const config = {
  matcher: ["/i/:inviteCode/p/:token", "/i/:inviteCode/p/:token/:rest*"],
};

const TOKEN = /^[0-9A-Za-z]{12}$/;
const INVITE = /^[a-z0-9-]{6,40}$/;
const VALID_TTL_MS = 10 * 60 * 1000;
const known = new Map<string, number>(); // token → vence (solo positivos: un token nuevo no debe quedar «negado»)

function remember(token: string) {
  if (known.size > 5000) known.clear();
  known.set(token, Date.now() + VALID_TTL_MS);
}

async function tokenExists(token: string): Promise<boolean> {
  const until = known.get(token);
  if (until && until > Date.now()) return true;
  const { adminDb } = await import("@/lib/firebase/admin");
  const snap = await adminDb().collection("tokens").doc(token).get();
  if (snap.exists) remember(token);
  return snap.exists;
}

/** Reescribe a una ruta que no existe: Next responde con app/not-found.tsx y status 404. */
function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/_link-no-encontrado", request.url));
}

export async function proxy(request: NextRequest) {
  // Solo navegaciones (GET/HEAD). Las Server Actions (POST) validan el token por su cuenta.
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();
  const [, , inviteCode, , token] = request.nextUrl.pathname.split("/");
  if (!INVITE.test(inviteCode ?? "") || !TOKEN.test(token ?? "")) return notFound(request);
  try {
    if (!(await tokenExists(token))) return notFound(request);
  } catch (err) {
    // Si Firestore falla, se deja pasar: la página decide (mejor un 200 con «no encontrado» que tumbar los links).
    console.error("[proxy]", err);
  }
  return NextResponse.next();
}
