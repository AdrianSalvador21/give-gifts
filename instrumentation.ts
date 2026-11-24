import type { Instrumentation } from "next";

/** Quita el token de los links personales (/i/{código}/p/{token}) antes de registrar una ruta. */
function redactPath(path: string): string {
  return path.replace(/\/p\/[0-9A-Za-z]{12}(?=\/|$|\?|#)/g, "/p/[token]").replace(/\?.*$/, "");
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // R4: falla al arrancar en producción si falta la URL pública (también se valida en next.config.ts al hacer build).
  const { assertAppUrl } = await import("./lib/env");
  assertAppUrl();
}

/**
 * Errores del servidor (render, Server Actions, Route Handlers, Proxy) a los logs de Vercel en una sola línea JSON.
 * No se registran headers (traen cookies de sesión) ni el token de la URL.
 * Para mandar a Sentry u otro servicio, agrégalo aquí.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err as { message?: string; name?: string; digest?: string; stack?: string };
  console.error(
    JSON.stringify({
      level: "error",
      source: "onRequestError",
      message: error?.message ?? String(err),
      name: error?.name,
      digest: error?.digest,
      stack: error?.stack?.split("\n").slice(0, 6).join("\n"),
      method: request.method,
      path: redactPath(request.path),
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
    }),
  );
};
