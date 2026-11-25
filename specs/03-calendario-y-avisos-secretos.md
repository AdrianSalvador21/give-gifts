# SPEC 03 — Agregar al calendario, «Recordarle que actualicé mi lista» y «Pedirle ideas en secreto»

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-25
> **Objetivo:** Que cada quien pueda guardar el intercambio en su calendario con una alarma 3 días antes, y que quien regala y quien recibe puedan avisarse en secreto, sin correos y sin depender del buzón: «actualicé mi lista» y «quiero ideas».

## 1 · Por qué esta spec existe

Hoy la única ayuda para no olvidar la fecha es un link a Google Calendar escondido en «Ya compré» (`components/participant/BoughtView.tsx:81`). Como la app no manda correos, el calendario es el único recordatorio que llega solo. Por eso tiene que estar a la vista y traer una alarma.

El problema más común después del sorteo es «no sé qué regalarle». Gift2Gift lo resuelve con correos: «Pedirle ideas en secreto» y «Recordar a mi amigo secreto». Aquí los dos avisos viven dentro de la app. Quien recibe no sabe quién le regala, así que WhatsApp no sirve: delataría a quien regala. El aviso sale en la página de la otra persona, con un globito como el del buzón.

Decisiones del usuario, tomadas en la sesión de preguntas:

- Calendario: archivo `.ics` (Apple y Outlook) y Google Calendar. La alarma suena **3 días antes**.
- El botón sale en **el inicio del participante** y en **el panel del organizador**. «Ya compré» se queda como está.
- La otra persona se entera con una **tarjeta en su página y un globito**. La tarjeta se quita al atenderla o al cerrarla.
- Cada botón se puede usar **una vez cada 24 h** y **no depende del buzón**: son avisos fijos, sin texto libre.
- «Recordar» solo se activa si la lista **cambió** desde el último aviso.
- «Pedir ideas» es **un solo botón**, sin opciones, y se puede usar aunque la lista ya tenga cosas.
- Quien regala ve el aviso, y además una etiqueta en cada deseo que cambió desde la última vez que vio la lista: **«Nuevo»** si se agregó y **«Cambió»** si se editó (decidido en el diseño).

Referencias:

- Análisis de Gift2Gift: `docs/analisis-gift2gift.md` §5.1, §6.5, §6.7 y §8 (`.ics`, «Pedir ideas», «Recordar»).
- Diseño aprobado: lienzo «Calendario y avisos secretos», https://claude.ai/artifact/QSEetjRmL22aeaHTLqrmvR. Artboards: «Inicio · me pidieron ideas», «Hoja · Agregar a mi calendario», «Mi lista · Avisarle que ya está», «Mi lista · estados del botón», «Tu persona · lista vacía → pedir ideas», «Inicio · tu persona actualizó su lista», «Tu persona · deseos «Nuevo»» y «Panel del organizador · escritorio».
- Next.js 16: antes de escribir código, leer `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (route handlers y `RouteContext`).

## 2 · Alcance

**Entra:**

- **Agregar a mi calendario**
  - Un botón «Agregar a mi calendario» abre una hoja (`Dialog`) con dos opciones: «Apple o Outlook (.ics)» y «Google Calendar».
  - El `.ics` lo genera un route handler y trae:
    - el nombre del intercambio, la fecha y la hora (3 horas, igual que `calendarHref`), el lugar y el presupuesto;
    - el link para volver: el personal para el participante, el del panel para quien organiza;
    - una alarma `VALARM` 3 días antes: «Faltan 3 días para {intercambio}. ¿Ya tienes el regalo?».
  - El link de Google lleva el mismo texto y el mismo link en la descripción. Google no acepta alarmas en un link: la hoja lo dice en una línea.
  - Dónde sale:
    - en el inicio del participante (`HomeView`), en la tarjeta de la fecha, antes y después del sorteo;
    - en el panel del organizador, en la línea de detalles (`app/organizar/[exchangeId]/page.tsx:161`).
  - En los navegadores internos (WhatsApp, Instagram…; `lib/webview.ts`), la opción `.ics` muestra la nota «Si no se abre, abre esta página en Safari o Chrome».
- **Recordarle a quien me regala que actualicé mi lista** (lo usa quien recibe)
  - Sale en «Mi lista» (`ListView`) después del sorteo, como tarjeta arriba de la rejilla: «¿Ya está tu lista? Avísale a quien te regala».
  - Se activa solo si se cumplen tres cosas:
    - la lista cambió (agregar, editar o borrar) después del último aviso o, si no hay aviso, después del sorteo;
    - pasaron 24 h desde el último aviso;
    - el intercambio no ha pasado.
  - Desactivado, el botón explica por qué: «Cambia algo de tu lista para volver a avisar» o «Podrás avisar otra vez mañana a las {hora}».
  - Al enviar: «¡Listo! Le avisamos sin decirle nada más». Si había una petición de ideas pendiente, se marca como atendida.
- **Pedirle ideas en secreto** (lo usa quien regala)
  - Sale en «Tu persona» (`PersonView`), debajo de «Preguntarle algo» o en su lugar si el buzón está apagado: «Pedirle ideas en secreto».
  - Con la lista vacía es el botón principal de la tarjeta de lista vacía. Con lista, es secundario.
  - Se puede usar una vez cada 24 h y hasta la fecha del intercambio. Al enviar: «¡Listo! Le avisamos a {nombre} sin decirle que eres tú». Después, el botón dice «Podrás pedir otra vez mañana a las {hora}».
- **Avisos en la página de la otra persona**
  - Quien recibe una petición de ideas ve una tarjeta en su inicio: «Alguien quiere ideas para tu regalo», con el texto «Agrega cosas a tu lista y avísale cuando esté» y el botón «Llenar mi lista».
    - La misma tarjeta sale en «Mi lista», con el botón «Avisarle que ya está».
    - Se quita al mandar «Recordar» o al cerrarla con ✕.
  - Quien regala y recibió un «Recordar» ve una tarjeta en su inicio: «Tu persona actualizó su lista», con el botón «Ver su lista».
    - Se quita al abrir «Tu persona» o al cerrarla con ✕.
    - Si todavía no abre su sobre, la tarjeta lleva al sobre.
  - En «Tu persona», cada deseo agregado desde la última visita lleva la etiqueta «Nuevo» y cada deseo editado lleva «Cambió».
  - Globito (`UnreadBadge` con valor 1): en el atajo «Editar mi lista» para quien recibe y en «Ver a mi persona» para quien regala. Se suma a los globitos del buzón en el inicio.
  - **Quien organiza y participa** no tiene inicio personal: `app/i/[inviteCode]/p/[token]/page.tsx:24` lo manda al panel. Las mismas dos tarjetas salen arriba en su panel.
- Privacidad:
  - El servidor nunca manda el id ni el nombre de quien regala a quien recibe; solo «hay una petición pendiente».
  - Quien organiza no ve estos avisos de nadie más, aunque tenga activo «Ver quién le regala a quién».
- Eventos de analítica (`trackEvent`): `calendar_added` (con `kind: "ics" | "google"` y `role: "participant" | "owner"`), `ideas_requested`, `list_nudged`.
- Los textos nuevos van en `messages/es-MX.json`, en los grupos `calendar.*` y `nudge.*`.

**Fuera de alcance (para futuras specs):**

- Que el calendario se actualice solo si cambia la fecha (suscripción `webcal://`). Si el organizador cambia la fecha, hay que volver a agregarlo.
- Cambiar la pantalla «Ya compré» (se queda con su link de Google).
- Avisos con texto libre o con chips de lo que se quiere saber (para eso está el buzón).
- Globitos en «Mis intercambios».
- Notificaciones push, correos o SMS.
- Avisarle al organizador o a todo el grupo.

## 3 · Modelo de datos

Los cambios son campos opcionales: los documentos viejos siguen funcionando sin migración.

```ts
// exchanges/{exchangeId}/assignments/{giverParticipantId}  — se agregan campos
type AssignmentDoc = {
  receiverId: string;
  plannedWishId: string | null;
  // «Pedirle ideas»: quien regala → quien recibe
  ideasAskedAt?: Timestamp | null;    // última petición (para el límite de 24 h)
  ideasPending?: boolean;             // quien recibe aún no la atiende ni la cierra
  // «Recordar»: quien recibe → quien regala
  listNudgedAt?: Timestamp | null;    // último aviso (24 h y «la lista cambió desde entonces»)
  listNudgePending?: boolean;         // quien regala aún no lo ve ni lo cierra
  // Para la etiqueta «Nuevo»
  giverSeenListAt?: Timestamp | null; // última vez que quien regala abrió «Tu persona»
};

// exchanges/{exchangeId}/participants/{participantId}  — se agrega
type ParticipantDoc = {
  // …campos actuales
  listUpdatedAt?: Timestamp | null;   // agregar, editar o borrar un deseo
};

// exchanges/{exchangeId}/participants/{participantId}/wishes/{wishId}  — se agrega
type WishDoc = {
  // …campos actuales
  updatedAt?: Timestamp;              // se pone en addWish y updateWish; los viejos usan createdAt
};
```

- Quien recibe encuentra «su» asignación con `assignments.where("receiverId", "==", me.id).limit(1)`, el mismo patrón que `getThreadSnap`. Firestore indexa los campos simples solo, así que no hace falta un índice nuevo.
- `redoDraw` y `removeParticipantAfterDraw` reescriben las asignaciones con `set`. Los avisos pendientes de una pareja que ya no existe desaparecen solos, y está bien que así sea.
- `Participant` (la forma que viaja a las páginas) agrega `listUpdatedAt: string | null`. `Wish` agrega `updatedAt: string | null`.

Rutas nuevas (route handlers, sin página):

| Ruta | Devuelve | Acceso |
|---|---|---|
| `/i/[inviteCode]/p/[token]/calendario` | `text/calendar`, adjunto `{slug}.ics`, con el link personal | Token (`getByToken`) |
| `/organizar/[exchangeId]/calendario` | Igual, con el link del panel | Dueño (`ownedExchange`) |

El `.ics`:

- `METHOD:PUBLISH`, `UID:{exchangeId}@givegifts`, `DTSTART`/`DTEND` en UTC (`…Z`) para no tener que escribir `VTIMEZONE`.
- `SUMMARY`, `LOCATION`, `DESCRIPTION` (presupuesto + link) y `URL`.
- `BEGIN:VALARM` / `TRIGGER:-P3D` / `ACTION:DISPLAY`.
- Las líneas se escapan (`,` `;` `\n`) y se cortan a 75 octetos (RFC 5545).
- Cabeceras `Cache-Control: private, no-store` y `X-Robots-Tag: noindex`.

Acciones nuevas (Server Actions, todas pasan por `guard`):

```ts
// app/actions/nudges.ts
askForIdeas(inviteCode, token): Promise<{ ok: true; nextAt: string } | { ok: false; error: "not-found" | "not-drawn" | "not-revealed" | "cooldown" | "past" | "generic" }>
nudgeGiver(inviteCode, token):  Promise<{ ok: true; nextAt: string } | { ok: false; error: "not-found" | "not-drawn" | "unchanged" | "cooldown" | "past" | "generic" }>
dismissNudge(inviteCode, token, kind: "ideas" | "list"): Promise<{ ok: true } | { ok: false; error: "generic" }>
markListSeen(inviteCode, token): Promise<void>   // la llama «Tu persona» al montarse; actualiza giverSeenListAt y quita listNudgePending
```

- `askForIdeas` y `nudgeGiver` revisan el límite de 24 h dentro de una transacción sobre la asignación, así que dos clics seguidos no mandan dos avisos.
- `nudgeGiver` compara `listUpdatedAt > (listNudgedAt ?? drawnAt)`.
- Lectura para las páginas (`lib/data/nudges.ts`): `getNudges(exchangeId, me)` devuelve:

  ```ts
  {
    ideasPending: boolean;       // me pidieron ideas
    listNudgePending: boolean;   // mi persona actualizó su lista
    canAsk: { ok: boolean; nextAt: string | null };
    canNudge: { ok: boolean; reason: "unchanged" | "cooldown" | null; nextAt: string | null };
  }
  ```

  Lee dos documentos: mi asignación como quien regala y la asignación donde recibo.

## 4 · Plan de implementación

Cada paso deja la app funcionando y termina con una verificación manual en Chrome contra el proyecto real de Firebase.

1. **Calendario: generador y rutas.**
   - Crear `lib/calendar.ts` con `buildIcs({ uid, title, startIso, place, description, url })` y `googleCalendarHref(...)`, que reemplaza a `calendarHref` y le agrega `details`.
   - Crear los dos route handlers `calendario/route.ts`.
   - Verificación: el `.ics` se descarga, se abre en el Calendario de macOS/iOS y en Outlook con la alarma de 3 días, y el link de Google abre el evento con la descripción.
2. **Calendario: interfaz.**
   - Crear el componente `components/ui/AddToCalendar.tsx` (botón + `Dialog` con las dos opciones y la nota de webview). Cada opción manda `calendar_added`.
   - Colocarlo en la tarjeta de la fecha de `HomeView` y en los detalles del panel.
   - Verificación: se ve en móvil y en escritorio, antes y después del sorteo; en el navegador interno de WhatsApp sale la nota.
3. **Datos de los avisos.**
   - Agregar `updatedAt` a los deseos y `listUpdatedAt` al participante en `addWish`, `updateWish` y `deleteWish`.
   - Agregar los campos a los tipos y a `toParticipant` / `toWish`.
   - Crear `lib/data/nudges.ts` con `getNudges`.
   - Verificación: al agregar, editar o borrar un deseo se actualizan las marcas en Firestore.
4. **«Pedirle ideas en secreto».**
   - Crear `askForIdeas` y el botón en `PersonView`: principal con la lista vacía, secundario con lista, y con su estado de espera.
   - Crear la tarjeta «Alguien quiere ideas» en el inicio y en «Mi lista», y `dismissNudge("ideas")`.
   - Verificación con dos navegadores: la persona A pide y la persona B ve la tarjeta y el globito, sin ningún dato de A en el HTML ni en el payload RSC. Un segundo intento dentro de 24 h falla con `cooldown`.
5. **«Recordarle que actualicé mi lista».**
   - Crear `nudgeGiver`, la tarjeta en `ListView` con sus estados (`unchanged`, `cooldown`) y la tarjeta «Tu persona actualizó su lista» en el inicio de quien regala.
   - Crear `markListSeen`, las etiquetas «Nuevo» y «Cambió» en `PersonView` y `dismissNudge("list")`.
   - Verificación: B edita su lista y avisa. A ve la tarjeta y las etiquetas «Nuevo» y «Cambió» en lo que cambió. Al recargar «Tu persona», la etiqueta desaparece. Si B avisa sin haber cambiado nada, falla con `unchanged`.
6. **Organizador que participa y casos borde.**
   - Mostrar las dos tarjetas en el panel cuando el owner participa.
   - Ocultar los botones cuando la fecha ya pasó.
   - Revisar `redoDraw` y quitar a alguien después del sorteo.
   - Verificación: el flujo completo con el owner como quien regala y como quien recibe. Con el buzón apagado, todo funciona igual.
7. **Textos y cierre.**
   - Revisar todos los textos en `messages/es-MX.json`.
   - Correr `npm run lint` y `npx tsc --noEmit`.
   - Hacer un recorrido completo en móvil y en escritorio.

## 5 · Criterios de aceptación

- Desde el inicio o el panel, el evento se agrega a Apple Calendar u Outlook con una alarma 3 días antes, y a Google Calendar con el mismo texto. El evento trae el link para volver a la página.
- Quien regala puede pedir ideas una vez cada 24 h hasta la fecha del intercambio. Quien recibe ve «Alguien quiere ideas» sin ningún dato de quién fue.
- Quien recibe puede avisar que actualizó su lista solo si la cambió, y una vez cada 24 h. Quien regala ve el aviso y las etiquetas «Nuevo» y «Cambió» en lo que cambió.
- Todo funciona con el buzón apagado, y no se manda ni un correo.
- Quien organiza no puede saber, desde su panel, quién pidió ideas ni a quién.
