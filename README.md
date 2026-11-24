# givegifts

Organiza intercambios de regalos (amigo secreto) con un solo link: sorteo secreto, exclusiones, listas de deseos y buzón anónimo. Hecho para México (es-MX).

- **Stack:** Next.js 16 (App Router, Cache Components) + Firebase (Auth y Firestore vía Firebase Admin) + Tailwind CSS 4. Se despliega en Vercel.
- **Seguridad:** todo el acceso a datos pasa por el servidor con Firebase Admin. `firestore.rules` niega cualquier lectura o escritura desde el navegador.
- **Especificación:** `specs/01-givegifts-mvp-firebase.md`.

> Esta versión de Next.js trae cambios incompatibles con versiones anteriores. Antes de tocar código, lee la guía que aplique en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## Requisitos

- Node.js 20 o más reciente y npm.
- Un proyecto de Firebase con **Authentication** (proveedores Google y Correo/contraseña) y **Cloud Firestore**.
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm i -g firebase-tools`) para desplegar las reglas.
- Una cuenta de Vercel para producción.

## Arranque local

```bash
npm install
cp .env.example .env.local   # y llena los valores (ver abajo)
npm run dev                  # http://localhost:3000
```

Otros comandos: `npm run build`, `npm run start`, `npm run lint` y `npx tsc --noEmit`.

## Variables de entorno

Van en `.env.local` (nunca se sube al repo) y en Vercel › Settings › Environment Variables. La lista completa está en `.env.example`.

| Variable | Dónde se obtiene | Uso |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Consola de Firebase › Configuración del proyecto › Tus apps (app web) | SDK web, sólo para iniciar sesión |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Igual que arriba (`<proyecto>.firebaseapp.com`) | SDK web |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Igual que arriba | SDK web |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Igual que arriba | SDK web |
| `FIREBASE_ADMIN_PROJECT_ID` | Configuración del proyecto › Cuentas de servicio › Generar nueva clave privada (JSON: `project_id`) | Firebase Admin en el servidor |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Mismo JSON: `client_email` | Firebase Admin |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Mismo JSON: `private_key`, **en una sola línea** con los saltos escritos como `\n` | Firebase Admin |
| `NEXT_PUBLIC_APP_URL` | Tu dominio público, sin diagonal final (p. ej. `https://givegifts.mx`) | Links de invitación y personales, textos de WhatsApp, `metadataBase`, `robots.txt` y `sitemap.xml` |

`NEXT_PUBLIC_APP_URL` es obligatoria en producción: si falta, el build o el arranque fallan con un error claro (ver `lib/env.ts`). En los deploys *Preview* de Vercel se usa `VERCEL_URL` si no la defines. Las variables `NEXT_PUBLIC_*` se incrustan en el build, así que después de cambiarlas en Vercel hay que volver a desplegar.

## Reglas de Firestore

`firestore.rules` niega todo acceso desde el cliente; el servidor usa Firebase Admin, que no pasa por las reglas. Despliégalas cada vez que cambien (y la primera vez):

```bash
firebase login
firebase use give-gifts-7061f      # o tu proyecto (ver .firebaserc)
firebase deploy --only firestore:rules,firestore:indexes
```

Para comprobarlo, una lectura desde el SDK web en la consola del navegador debe fallar con `permission-denied`.

## Despliegue en Vercel

1. Importa el repositorio en Vercel (framework: Next.js; los comandos por defecto funcionan).
2. Carga **todas** las variables de la tabla en *Production* (y en *Preview* si vas a usar previews). Pega `FIREBASE_ADMIN_PRIVATE_KEY` tal cual, con los `\n` escritos.
3. Pon en `NEXT_PUBLIC_APP_URL` el dominio final (el de Vercel o tu dominio propio) y despliega.
4. Agrega ese dominio en Firebase (siguiente sección).
5. Prueba el flujo completo en la URL pública: crear → invitar → tres personas se apuntan → listas → sorteo → abrir sobre → buzón → «ya compré». Pega un link de invitación en WhatsApp para ver la vista previa.

## Dominios autorizados en Firebase Auth

El inicio de sesión con Google sólo funciona en dominios autorizados. En la consola de Firebase › Authentication › Settings › **Authorized domains**, agrega:

- `localhost` (viene por defecto),
- tu dominio de producción (p. ej. `givegifts.mx` y `www.givegifts.mx`),
- el dominio de Vercel (`<proyecto>.vercel.app`) si lo usas.

Si usas un dominio propio, revisa también que «Correo/contraseña» y «Google» estén habilitados en *Sign-in method*.

## Textos legales (antes de lanzar)

`/privacidad` (aviso de privacidad conforme a la LFPDPPP) y `/terminos` ya están escritos, pero tienen marcadores que debes llenar. Todos viven en **`lib/site.ts`**:

| Constante | Marcador | Qué poner |
|---|---|---|
| `CONTACT_EMAIL` | `[CORREO DE CONTACTO]` | Correo que atienda dudas, reportes y solicitudes ARCO |
| `LEGAL.responsable` | `[NOMBRE DEL RESPONSABLE]` | Nombre de la persona física o razón social responsable de los datos |
| `LEGAL.domicilio` | `[DOMICILIO DEL RESPONSABLE]` | Domicilio para oír y recibir notificaciones |
| `LEGAL.updatedAt` | `[FECHA DE ÚLTIMA ACTUALIZACIÓN]` | Fecha de publicación, p. ej. «1 de diciembre de 2026» |
| `LEGAL.retentionDays` | `60` | Días que se guardan los datos después del evento. Debe coincidir con el borrado real de datos |

Después revisa el texto de `app/privacidad/page.tsx` y `app/terminos/page.tsx` (proveedores, cookies y plazos) y, de preferencia, pide a un abogado que lo valide. Para encontrar marcadores pendientes: `git grep -n "\[[A-ZÁÉÍÓÚ ]\{6,\}\]"`.

## Ilustraciones

- Las páginas sólo usan las versiones web en `public/illustrations/web/*.webp`.
- Las fuentes (PNG grandes, versiones `.blanco.png` y `.prompt.txt`) viven en `design/illustrations/` y no se publican.
- Los íconos (`app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`, `public/icons/*`) y las imágenes para compartir (`assets/og/*.png`, usadas por `app/opengraph-image.tsx` y `app/i/[inviteCode]/opengraph-image.tsx`) salen del mismo arte de Regalito.
- Para generar ilustraciones nuevas usa la skill `.claude/skills/regalito-ilustraciones`.

## Estructura

```
app/                 rutas (App Router), server actions en app/actions
  i/[inviteCode]/    invitación pública (con vista previa para WhatsApp)
  i/[…]/p/[token]/   página personal de cada participante (noindex, sin datos en la vista previa)
  organizar/         panel de quien organiza
components/          UI (components/ui), landing y piezas por rol
lib/                 datos (Firebase Admin), sesión, formato, i18n y lib/site.ts
messages/es-MX.json  textos de la interfaz
firestore.rules      reglas (niega todo desde el cliente)
```
