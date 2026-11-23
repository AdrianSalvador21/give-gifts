# SPEC 01 — givegifts MVP con Firebase: landing, intercambio por links y sorteo secreto

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-11-23
> **Objetivo:** Implementar en Next.js + Firebase la landing y todo el flujo del intercambio diseñado en el lienzo (crear, unirse por link, listas, sorteo secreto, buzón y paneles), sin correos y desplegado en Vercel.

## 1 · Por qué esta spec existe

El diseño aprobado vive en el lienzo «Give Gifts — Propuestas de identidad» (landing + 19 pantallas + biblioteca de ilustraciones de Regalito). Esta spec lo convierte en producto funcional.

Se tomó una decisión fuerte: **no hay correos**. Todo se comparte con links. Eso obliga a que el acceso de cada participante sea un **link personal fijo** que funciona como llave, y a que todos los avisos («ya se hizo el sorteo», «te falta tu lista») se manden por WhatsApp con mensajes prellenados.

El usuario pidió explícitamente **no dividir** el trabajo en varias specs. Para compensar, el plan está en pasos pequeños y cada uno deja la app funcionando.

Referencias:

- Análisis del producto original: `docs/analisis-gift2gift.md`.
- Diseño: artboards `Main`, `C1`–`C5`, `I1`–`I3`, `O1`–`O4`, `P1`–`P6`, `M1` del lienzo.
- Ilustraciones: `public/illustrations/web/*.webp` (13 archivos).
- Next.js 16 trae cambios: antes de escribir código, leer las guías relevantes en `node_modules/next/dist/docs/` (Server Actions, cookies, `next/font`, `next/image`, redirects) como pide `AGENTS.md`.

## 2 · Alcance

**Entra:**

- Landing en `/` igual al artboard `Main`: nav flotante, hero verde fijo que se oscurece, hoja crema que sube, ilustración puente, sección «Tres pasos», tres secciones con parallax y revelado de tarjetas, fiesta, CTA verde, footer.
- Tokens de diseño (colores, radios, tipografía Inter) y componentes base reutilizables.
- Textos de la interfaz en `messages/es-MX.json` (solo español de México).
- Cuenta del organizador con Firebase Auth: Google, y correo + contraseña (registro, inicio de sesión, «olvidé mi contraseña» con el correo estándar de Firebase).
- Sesión del organizador en servidor con cookie httpOnly (session cookie de Firebase Admin).
- Asistente de creación en 4 pasos (nombre; grupo y tipo de regalos; fecha, hora, lugar y presupuesto; reglas) y pantalla «¡Listo!» para compartir.
- Link de invitación único por intercambio (`/i/{inviteCode}`) para apuntarse solo con nombre.
- Link personal fijo por participante (`/i/{inviteCode}/p/{token}`) que nunca cambia y es la llave de acceso.
- Reconocimiento del dispositivo: si alguien vuelve a abrir el link de invitación desde el mismo navegador, va directo a su página personal.
- Pantalla «¡Ya estás dentro!» con los siguientes pasos y el bloque «Guarda tu link» (copiar y mandárselo por WhatsApp).
- Participantes asistidos: el organizador agrega a alguien solo con su nombre (abuelos, niños) y recibe su link personal para reenviarlo o abrirlo.
- Lista de deseos por participante: agregar por link (título, imagen y precio leídos del Open Graph de la tienda), idea en texto libre, nota, marca «La quiero más», editar y borrar. Incluye el estado vacío.
- Panel del organizador antes y después del sorteo, en móvil y en escritorio: estado, progreso, lista del grupo, copiar el link personal de cada quien, agregar asistidos, quitar participantes antes del sorteo, compartir la invitación y «Avisar al grupo» por WhatsApp.
- Editar el intercambio (con campos restringidos después del sorteo).
- Exclusiones bidireccionales y sorteo manual en servidor: un solo ciclo, sin autoasignación, mínimo 3 personas, imposible de repetir.
- Regla «Ver quién le regala a quién» para el organizador (apagada por defecto).
- Después del sorteo: abrir el sobre (el nombre solo llega del servidor al abrirlo), ver a tu persona y su lista, marcar «Lo voy a regalar» en un deseo, «Ya compré su regalo» y pantalla de confirmación.
- Buzón anónimo entre quien regala y quien recibe, activable en las reglas.
- «Mis intercambios»: los del organizador (por su cuenta) y los del participante anónimo (guardados en ese dispositivo).
- Reglas de Firestore que niegan todo acceso directo desde el cliente.
- Deploy final en Vercel con su dominio `*.vercel.app`.

**Fuera de alcance (para futuras specs):**

- Correos de cualquier tipo enviados por nosotros (invitaciones, avisos, recordatorios).
- Sorteo programado por fecha y hora (se quita la opción «Programarlo» del paso 3).
- «No repetir con el año pasado» y duplicar intercambios anteriores.
- Sugerencias de ideas («Sugiéreme 5 ideas», chips de ideas).
- Búsqueda en Amazon, links de afiliado y seguimiento de precios.
- Otros idiomas y rutas por idioma.
- Cuenta o Google para participantes (solo el organizador tiene cuenta).
- Notificaciones push y tiempo real con listeners de Firestore.
- Cancelar o borrar un intercambio, y transferir la organización.
- Dominio propio.
- Apps móviles, tarjetas digitales, stickers, B2B y patrocinios.
- Pruebas automatizadas.

## 3 · Modelo de datos

Todo vive en Firestore. **Solo el servidor (Firebase Admin) lee y escribe.** Los ids son autogenerados salvo donde se indica.

```ts
// users/{uid}  — uid de Firebase Auth del organizador
type UserDoc = {
  displayName: string;
  email: string;
  createdAt: Timestamp;
};

// exchanges/{exchangeId}
type ExchangeDoc = {
  name: string;                       // "Posada de los primos 2026"
  groupType: 'familia' | 'amigos' | 'oficina' | 'escuela' | 'comunidad' | 'otro';
  giftCategory: 'todo' | 'libros' | 'tecnologia' | 'comida' | 'hecho-a-mano' | 'experiencias';
  eventAt: Timestamp;                 // fecha + hora del intercambio
  place: string | null;
  budget: { amount: number; currency: 'MXN' };
  message: string;                    // ≤ 500 caracteres
  ownerUid: string;
  rules: {
    ownerParticipates: boolean;       // default true
    ownerSeesMap: boolean;            // default false
    mailboxEnabled: boolean;          // default true
  };
  inviteCode: string;                 // único: slug del nombre + "-" + 4 caracteres, p. ej. "primos-7qk2"
  status: 'open' | 'drawn';
  drawnAt: Timestamp | null;
  participantCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// exchanges/{exchangeId}/participants/{participantId}
type ParticipantDoc = {
  name: string;                       // único en el intercambio, sin distinguir mayúsculas
  color: 'pasto' | 'sol' | 'cielo' | 'coral' | 'lila' | 'arena'; // color del avatar
  kind: 'owner' | 'self' | 'assisted';
  token: string;                      // 12 caracteres base62 aleatorios; fijo para siempre
  wishCount: number;
  revealed: boolean;                  // ya abrió su sobre
  bought: boolean;                    // ya compró su regalo
  joinedAt: Timestamp;
};

// tokens/{token}  — índice para resolver un link personal en una sola lectura
type TokenDoc = { exchangeId: string; participantId: string };

// invites/{inviteCode}  — índice para resolver el link de invitación
type InviteDoc = { exchangeId: string };

// exchanges/{exchangeId}/exclusions/{exclusionId}
type ExclusionDoc = { a: string; b: string }; // participantIds; se guarda con a < b

// exchanges/{exchangeId}/assignments/{giverParticipantId}
type AssignmentDoc = {
  receiverId: string;
  plannedWishId: string | null;       // «Lo voy a regalar»; nunca se muestra a quien recibe
};

// exchanges/{exchangeId}/participants/{participantId}/wishes/{wishId}
type WishDoc = {
  title: string;                      // requerido, ≤ 120
  url: string | null;
  imageUrl: string | null;
  store: string | null;               // dominio legible: "amazon.com.mx"
  price: number | null;               // MXN
  note: string | null;                // ≤ 200 («Talla M, verde»)
  favorite: boolean;                  // «La quiero más»
  createdAt: Timestamp;
};

// exchanges/{exchangeId}/threads/{threadId}  — un hilo por pareja giver→receiver
type ThreadDoc = {
  giverId: string;                    // solo lo lee el servidor
  receiverId: string;
  updatedAt: Timestamp;
};
// exchanges/{exchangeId}/threads/{threadId}/messages/{messageId}
type MessageDoc = {
  from: 'giver' | 'receiver';         // rol, nunca el id ni el nombre de quien regala
  text: string;                       // ≤ 500
  createdAt: Timestamp;
};
```

Cookies:

- `__session`: session cookie de Firebase Admin del organizador (httpOnly, `secure`, 14 días).
- `gg_p_{inviteCode}`: token personal del participante en ese navegador (httpOnly, 1 año). Sirve para reconocer el dispositivo.

Almacenamiento local:

- `localStorage["gg:mis-intercambios:v1"]`: lista `{ inviteCode, token, exchangeName }[]` de los intercambios en los que participa este dispositivo.

Variables de entorno (todas en `.env.local`, que no se versiona, y luego en Vercel):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=          # con \n escapados
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`.env.example` se versiona con estas mismas claves vacías.

Rutas (sin prefijo de idioma):

| Ruta | Pantalla del diseño | Acceso |
|---|---|---|
| `/` | Landing (`Main`) | Público |
| `/entrar` | Inicio de sesión y registro del organizador | Público |
| `/crear` | C1–C4 | Organizador |
| `/crear/listo/[exchangeId]` | C5 | Dueño |
| `/i/[inviteCode]` | I1 (o «intercambio cerrado» después del sorteo) | Público |
| `/i/[inviteCode]/p/[token]` | I3 antes del sorteo; P1/P2 después | Token |
| `/i/[inviteCode]/p/[token]/lista` | P4 / P5 | Token |
| `/i/[inviteCode]/p/[token]/sobre` | P1 | Token, después del sorteo |
| `/i/[inviteCode]/p/[token]/persona` | P2 | Token, después del sorteo |
| `/i/[inviteCode]/p/[token]/compre` | P6 | Token, después del sorteo |
| `/i/[inviteCode]/p/[token]/buzon` | P3 | Token, después del sorteo, buzón activo |
| `/organizar/[exchangeId]` | O1 / O3 y O4 en escritorio | Dueño |
| `/organizar/[exchangeId]/sorteo` | O2 | Dueño |
| `/organizar/[exchangeId]/editar` | Edición | Dueño |
| `/mis-intercambios` | M1 | Público (contenido según sesión y dispositivo) |

## 4 · Plan de implementación

Cada paso termina con una verificación manual con la herramienta de Chrome contra el proyecto real de Firebase.

1. **Lectura y dependencias.** Leer en `node_modules/next/dist/docs/` las guías de Server Actions, cookies, `next/font`, `next/image` y redirects. Instalar `firebase`, `firebase-admin`, `zod` y `server-only`. Crear `.env.example`. Verificación: `npm run dev` arranca sin errores.
2. **Clientes de Firebase.** Crear `lib/firebase/client.ts` (SDK web, solo Auth) y `lib/firebase/admin.ts` (Admin con `server-only`, inicialización única y `FIREBASE_ADMIN_PRIVATE_KEY` con `\n` des-escapados). Verificación: una página temporal de servidor lee `exchanges` sin error; se borra al terminar el paso.
3. **Reglas de Firestore.** Crear `firestore.rules` (niega todo), `firestore.indexes.json` y `firebase.json`, y desplegarlas con `firebase deploy --only firestore:rules`. Verificación: una lectura desde el SDK web en la consola del navegador falla con `permission-denied`.
4. **Tokens de diseño y base.** Definir en `app/globals.css` los tokens con `@theme` de Tailwind v4: crema `#F5F1E4`, tinta `#2C2E2A`, pasto `#8ED462`, coral `#FF705D`, cielo `#2BA0FF`, sol `#F5DF16`, lila `#E8C3F7`, arena `#E0DBCE`, gris texto `#6B6D69`, y radios de 14, 20, 28 y 64 px. Cargar Inter con `next/font` en `app/layout.tsx` (`lang="es-MX"`). Crear `messages/es-MX.json` y `lib/i18n.ts` con `t(key)`. Verificación: la página de inicio muestra el fondo crema y Inter.
5. **Componentes base.** Crear `components/ui/`: `DotButton` (botón con círculo y flecha, variantes `pasto`, `coral`, `sol`, `cielo`, `blanco`, `tinta`), `Card`, `Chip`, `TextField`, `StepBar`, `TopBar` (botón de regreso, título y acción) y `Avatar` (iniciales y color). Verificación: una página temporal `/dev/ui` los muestra todos; se borra al final del paso 22.
6. **Landing estática.** Implementar `app/page.tsx` con componentes en `components/landing/`, copiando la estructura y los textos del artboard `Main`, con las imágenes de `public/illustrations/web/` vía `next/image`. Verificación: `/` se ve igual al artboard a 1440 px y a 390 px.
7. **Efectos de la landing.** Agregar `components/landing/ScrollFx.tsx` (cliente) que escribe `--hero`, `--rN` y `--mN` en `document.documentElement` con `requestAnimationFrame`, más las animaciones `bob`, `drift` y `sway`, todas desactivadas con `prefers-reduced-motion`. Verificación: al hacer scroll, el hero se oscurece, la hoja crema sube encima y cada tarjeta se revela con su bloque de color.
8. **Sesión del organizador.** Crear `app/entrar/page.tsx` con Google, correo y contraseña, registro y «olvidé mi contraseña». Crear `app/actions/session.ts` (`createSession(idToken)` y `signOut()`), `lib/auth/session.ts` (`getOrganizer()` y `requireOrganizer()`) y crear `users/{uid}` en el primer inicio de sesión. Verificación: inicias sesión con Google y con correo; al recargar `/mis-intercambios` sigues dentro; al cerrar sesión, sales.
9. **Capa de datos.** Crear `lib/data/types.ts` (tipos del modelo), `lib/data/exchanges.ts` (lecturas tipadas con Admin) y `lib/tokens.ts` (`newToken()` de 12 caracteres base62 con `crypto` y `newInviteCode(name)`). Verificación: `newInviteCode("Posada de los primos")` devuelve algo como `posada-de-los-primos-7qk2`.
10. **Asistente de creación.** Crear `app/crear/page.tsx` (exige organizador; si no hay sesión redirige a `/entrar?next=/crear`) con los 4 pasos de C1–C4 en un componente cliente, validados con `zod` en el cliente y en el servidor. Sin la opción «Programarlo». Crear `createExchange` en `app/actions/exchanges.ts`: crea `exchanges`, `invites`, el participante `owner` con su token y `tokens` (si `ownerParticipates`), y redirige a `/crear/listo/[id]`. Verificación: al crear un intercambio aparecen los documentos en la consola de Firebase.
11. **Pantalla «¡Listo!».** Crear `app/crear/listo/[exchangeId]/page.tsx` (C5) con el link de invitación, «Copiar», «Mandar por WhatsApp» (`https://wa.me/?text=` con mensaje prellenado) e «Ir a mi intercambio». Verificación: el botón de WhatsApp abre el mensaje con el link correcto.
12. **Unirse.** Crear `app/i/[inviteCode]/page.tsx` (I1) y `joinExchange` en `app/actions/participants.ts`: valida el nombre (2–40 caracteres y sin duplicar en el intercambio), crea el participante y `tokens/{token}`, incrementa `participantCount`, pone la cookie `gg_p_{inviteCode}` y redirige a la página personal. Si la cookie existe y su token es válido, redirige directo. Si `status` es `drawn`, muestra «Este intercambio ya está cerrado». Verificación: dos navegadores distintos se apuntan con nombres distintos; al reabrir la invitación en el primero, entra directo a su página.
13. **Página personal antes del sorteo.** Crear `app/i/[inviteCode]/p/[token]/page.tsx` (I3), que resuelve el token con `tokens/{token}` y muestra 404 si no existe. Muestra los pasos, el bloque «Guarda tu link» (copiar y WhatsApp a uno mismo) y guarda la entrada en `gg:mis-intercambios:v1`. Verificación: abrir el link personal en una ventana de incógnito muestra la misma página.
14. **Metadatos de links.** Crear `lib/metadata.ts`: `fetch` en servidor con 5 s de timeout y un User-Agent de navegador, que lee `og:title`, `og:image`, `product:price:amount` y el `<title>` con expresiones regulares. Ante cualquier fallo devuelve el dominio como título. Verificación: con un link de Mercado Libre se obtienen título e imagen; con un link inválido no se rompe.
15. **Lista de deseos.** Crear `app/i/[inviteCode]/p/[token]/lista/page.tsx` (P4 vacía y P5 llena) y en `app/actions/wishes.ts` las acciones `addWish`, `updateWish` y `deleteWish` (máximo 20 deseos; mantienen `wishCount`). Verificación: agregar por link, agregar una idea, poner nota y «La quiero más», editar y borrar; el contador del panel cambia.
16. **Panel del organizador antes del sorteo.** Crear `app/organizar/[exchangeId]/page.tsx` (O1 en móvil, O4 desde 1024 px) con estado, botones y la lista del grupo con «Con lista / Sin lista». Por persona: «Copiar su link» y «Quitar» (solo antes del sorteo y nunca al dueño). Agregar asistidos con `addAssisted(name)`. «Avisar al grupo» abre WhatsApp con un mensaje prellenado. Verificación: agregar un asistido, copiar su link, abrirlo y ver su página; quitar a alguien y que su link dé 404.
17. **Editar.** Crear `app/organizar/[exchangeId]/editar/page.tsx` y `updateExchange`. Antes del sorteo se puede editar todo lo del asistente; después, solo fecha y hora, lugar, mensaje y `mailboxEnabled`. Verificación: tras sortear, el presupuesto aparece deshabilitado y el servidor rechaza cambiarlo.
18. **Algoritmo del sorteo.** Crear `lib/draw.ts` con `draw(participantIds, exclusions)`, que devuelve `Map<giver, receiver>` formando un único ciclo. Primero intenta hasta 2,000 barajados aleatorios y luego una búsqueda en profundidad con orden aleatorio. Si no hay solución, lanza `DrawImpossibleError`. Verificación: un script temporal `scripts/probar-sorteo.mjs` corre 1,000 sorteos de 3, 4 y 7 personas con exclusiones y confirma un solo ciclo, sin autoasignación y sin exclusiones violadas. El script se borra al terminar el paso.
19. **Exclusiones y sorteo.** Crear `app/organizar/[exchangeId]/sorteo/page.tsx` (O2) con `addExclusion`, `removeExclusion` y `runDraw`. `runDraw` corre en una transacción: exige `status == 'open'` y al menos 3 participantes, escribe `assignments`, pone `status = 'drawn'` y `drawnAt`, y crea los `threads` si el buzón está activo. Verificación: con exclusiones imposibles se ve «Con las exclusiones actuales no hay sorteo posible»; con exclusiones válidas, el estado cambia a sorteado y un segundo intento es rechazado.
20. **Panel después del sorteo.** En el mismo panel, mostrar O3: tarjeta «Tu sobre te espera» si el dueño participa, barras de «Abrieron su sobre», «Llenaron su lista» y «Ya compraron», y nombres pendientes. «Recordar» abre WhatsApp con el link personal de esa persona. Si `ownerSeesMap`, cada fila muestra «Le da regalo a: X». Verificación: con `ownerSeesMap` apagado, el panel y el HTML no contienen ninguna asignación.
21. **Sobre, persona y compra.** Crear las páginas `sobre` (P1), `persona` (P2) y `compre` (P6). `revealAssignment` devuelve el nombre de quien recibes solo al pulsar «Abrir mi sobre» y marca `revealed`. `persona` muestra la lista de esa persona con «Lo voy a regalar» (`planGift(wishId)` en el assignment). «Ya compré su regalo» llama a `markBought` y lleva a `compre`. Verificación: antes de pulsar «Abrir mi sobre», el HTML de la página no contiene el nombre; quien recibe nunca ve qué deseo se marcó.
22. **Buzón anónimo.** Crear la página `buzon` (P3) con dos pestañas: «Tu persona» (eres quien regala) y «Tu amigo secreto» (eres quien recibe). Las acciones `listMessages` y `sendMessage` resuelven el hilo en el servidor y nunca exponen `giverId`. La página refresca los mensajes cada 10 s mientras está abierta. Verificación: con dos navegadores, el mensaje de quien regala llega como «Tu amigo secreto» y en ninguna respuesta del servidor aparece su nombre ni su id. Al terminar, borrar `/dev/ui`.
23. **Mis intercambios.** Crear `app/mis-intercambios/page.tsx` (M1). Con sesión de organizador lista sus intercambios (`ownerUid`); además lee `gg:mis-intercambios:v1` del dispositivo. Pestañas «Próximos» y «Pasados» según `eventAt`. Verificación: el organizador ve los que creó; el navegador de un participante ve en los que se apuntó.
24. **Deploy en Vercel.** Conectar el repo a Vercel, cargar las variables de entorno, actualizar `NEXT_PUBLIC_APP_URL`, agregar el dominio `*.vercel.app` a los dominios autorizados de Firebase Auth y desplegar las reglas. Verificación: el flujo completo funciona en la URL de Vercel.

## 5 · Criterios de aceptación

- [ ] `/` reproduce el artboard `Main` y al hacer scroll el hero se oscurece, la hoja crema sube y las tres tarjetas se revelan con su bloque de color.
- [ ] Con `prefers-reduced-motion` activado, la landing no tiene animaciones.
- [ ] A 390 px de ancho ninguna página tiene scroll horizontal.
- [ ] El organizador puede registrarse e iniciar sesión con Google y con correo y contraseña, y la sesión sobrevive a una recarga.
- [ ] `/crear` sin sesión redirige a `/entrar` y, tras iniciar sesión, vuelve a `/crear`.
- [ ] Crear un intercambio genera un link de invitación `/i/{inviteCode}` que abre la invitación con nombre, fecha, presupuesto y número de apuntados.
- [ ] Apuntarse con un nombre ya usado en ese intercambio muestra un error y no crea un participante.
- [ ] Cada participante tiene un link personal que no cambia nunca y abre su página desde cualquier navegador.
- [ ] Reabrir el link de invitación desde el mismo navegador lleva directo a la página personal.
- [ ] El organizador puede agregar a un participante asistido y copiar su link personal.
- [ ] Un participante puede agregar un deseo por link (con título leído de la tienda), una idea en texto, una nota y la marca «La quiero más».
- [ ] El sorteo con menos de 3 participantes está bloqueado.
- [ ] El sorteo respeta todas las exclusiones y produce un solo ciclo sin autoasignación.
- [ ] Con exclusiones imposibles se muestra «Con las exclusiones actuales no hay sorteo posible» y el estado no cambia.
- [ ] Después del sorteo, el link de invitación muestra «Este intercambio ya está cerrado».
- [ ] Después del sorteo no se puede repetir el sorteo, quitar participantes ni cambiar el presupuesto.
- [ ] El nombre de quien te toca no aparece en el HTML ni en ninguna respuesta del servidor hasta pulsar «Abrir mi sobre».
- [ ] Con «Ver quién le regala a quién» apagado, el organizador no puede ver ninguna asignación salvo la suya.
- [ ] Quien recibe nunca ve qué deseo marcó su amigo secreto con «Lo voy a regalar».
- [ ] «Ya compré su regalo» incrementa «Ya compraron» en el panel del organizador.
- [ ] En el buzón, quien recibe ve los mensajes como «Tu amigo secreto» y ninguna respuesta de red contiene el nombre ni el id de quien regala.
- [ ] Una lectura directa de Firestore desde el navegador falla con `permission-denied`.
- [ ] `/mis-intercambios` muestra al organizador sus intercambios y a un participante los que guardó ese navegador.
- [ ] Todos los botones «WhatsApp», «Avisar al grupo» y «Recordar» abren `wa.me` con un mensaje en español que incluye el link correcto.
- [ ] El repo no contiene ninguna llave real (`git grep` de `FIREBASE_ADMIN_PRIVATE_KEY=` y `AIza` solo encuentra `.env.example` vacío).
- [ ] El flujo completo (crear → invitar → 3 personas se apuntan → listas → sorteo → abrir sobre → buzón → ya compré) funciona en la URL de Vercel.

## 6 · Decisiones tomadas y descartadas

- **Sí:** una sola spec. **No:** dividir en 8 specs (lo pidió el usuario). Se compensa con 24 pasos pequeños.
- **Sí:** sin correos; todo se comparte con links y WhatsApp. **No:** Resend, Trigger Email ni Postmark (decisión del usuario).
- **Sí:** solo el organizador tiene cuenta (Google o correo y contraseña). Los participantes no tienen cuenta y su llave es el link personal.
- **No:** Firebase Anonymous Auth para participantes. Al principio se eligió «anónimo + link personal», pero al pasar todo el acceso por el servidor la sesión anónima ya no aporta seguridad. «Anónimo» queda como «sin cuenta, identificado por su link».
- **No:** Google opcional para participantes; el usuario aclaró que solo el organizador necesita cuenta.
- **Sí:** el link personal es fijo (`token` de 12 caracteres, nunca rota). **No:** elegir tu nombre de una lista en un link común, porque permite suplantar a otros.
- **Sí:** toda lectura y escritura pasa por Server Components y Server Actions con Firebase Admin, y las reglas de Firestore niegan todo desde el cliente. **No:** Cloud Functions (requieren el plan Blaze y otro deploy). **No:** sorteo en el cliente (el organizador vería las asignaciones).
- **Sí:** el buzón refresca cada 10 s desde el servidor. **No:** listeners en tiempo real de Firestore, porque exigirían abrir lecturas al cliente y el id de quien regala podría filtrarse por las reglas.
- **Sí:** sorteo de un solo ciclo (A→B→C→A). Evita parejas mutuas y es el comportamiento del producto original.
- **No:** sorteo programado en esta versión (decisión del usuario).
- **Sí:** «Apartar» se convierte en «Lo voy a regalar», visible solo para quien regala. Con una sola persona regalándole a cada quien, «Ya lo apartó alguien» no puede pasar.
- **Sí:** las sugerencias de ideas, «No repetir con el año pasado», Amazon y el seguimiento de precios quedan fuera de alcance (no se eligieron).
- **Sí:** los nombres no se repiten dentro de un intercambio. Evita confusiones en el panel y en el sorteo.
- **Sí:** el organizador puede quitar participantes solo antes del sorteo.
- **Sí:** después del sorteo solo se editan fecha, lugar, mensaje y buzón. Cambiar el presupuesto con regalos ya planeados sería injusto.
- **Sí:** todas las llaves de Firebase (web y Admin) van en `.env.local` y en las variables de Vercel; el repo solo tiene `.env.example` vacío (decisión del usuario).
- **Sí:** se prueba contra el proyecto real de Firebase y con la herramienta de Chrome. **No:** emuladores ni pruebas automatizadas en esta spec (decisión del usuario). El algoritmo del sorteo se valida con un script temporal.
- **Sí:** solo es-MX, pero con los textos en `messages/es-MX.json` para traducir después sin tocar componentes.
- **Sí:** los metadatos de la tienda se leen con `fetch` y expresiones regulares en el servidor. **No:** `cheerio` ni scrapers (dependencias de más para cuatro etiquetas).
- **Sí:** Vercel con dominio `*.vercel.app` como último paso. **No:** dominio propio en esta spec.

## 7 · Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Un link personal se reenvía a otra persona y esa persona ve el sobre | Es el costo de no usar correos. El bloque «Guarda tu link» avisa que es personal. El organizador puede quitar al participante antes del sorteo. |
| Alguien pierde su link personal | El organizador lo copia desde el panel y se lo reenvía. El mismo navegador lo recupera con la cookie `gg_p_{inviteCode}`. |
| Las tiendas (sobre todo Amazon) bloquean el `fetch` de metadatos | Timeout de 5 s. Si falla, se usa el dominio como título y la persona puede editarlo. El deseo se guarda igual. |
| Dos clics simultáneos en «Sortear» | `runDraw` corre en una transacción que exige `status == 'open'`. |
| Exclusiones que hacen imposible el sorteo | El algoritmo detecta que no hay ciclo y devuelve un error claro sin cambiar el estado. |
| `FIREBASE_ADMIN_PRIVATE_KEY` mal formateada en Vercel | `lib/firebase/admin.ts` reemplaza `\\n` por saltos de línea y falla con un mensaje explícito si falta la variable. |
| Costos de Firestore por el refresco del buzón cada 10 s | Solo refresca con la pestaña visible (`visibilitychange`) y lee un máximo de 50 mensajes. |
| Next.js 16 cambia APIs respecto a versiones anteriores | El paso 1 obliga a leer las guías de `node_modules/next/dist/docs/` antes de escribir código. |

## Lo que **no** entra en esta spec

- Correos de cualquier tipo.
- Sorteo programado.
- «No repetir con el año pasado» y duplicar intercambios.
- Sugerencias de ideas, búsqueda en Amazon, afiliados y seguimiento de precios.
- Otros idiomas.
- Cuentas o Google para participantes.
- Notificaciones push y tiempo real.
- Cancelar o borrar intercambios.
- Dominio propio.
- Apps, tarjetas, stickers, B2B y patrocinios.
- Pruebas automatizadas.

Cada uno, si llega, va en su propia spec.
