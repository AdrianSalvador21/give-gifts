# SPEC 04 — Modos de juego (rondas, roba regalo, vaquita) y modo fiesta en vivo

> **Estado:** Borrador (falta aprobar el diseño)
> **Depende de:** SPEC 01, SPEC 02 y SPEC 03 (usa su `AddToCalendar` y sus avisos)
> **Fecha:** 2026-11-25
> **Objetivo:** Que givegifts sirva para más que el amigo secreto clásico: varias rondas de regalos con su propio sorteo, roba regalo con un tablero en vivo, vaquitas para regalarle a alguien de fuera y una pantalla para la TV de la fiesta que revela quién le regaló a quién.

## 1 · Por qué esta spec existe

Hoy la app cubre muy bien lo que pasa **antes** de la fiesta: sorteo, listas, buzón. **El día de la fiesta** no ofrece nada, y es justo cuando todo el grupo está junto. Ese momento es el que la gente recuerda y comparte. Además, muchos grupos no juegan amigo secreto puro: hacen «uno de broma y uno en serio», juegan a robarse los regalos o juntan para el regalo de la maestra. Hoy todo eso lo llevan en papel o en un grupo de WhatsApp. Ninguna app en español lo resuelve bien.

Decisiones del usuario, tomadas en la sesión de preguntas:

- La spec es **completa y por fases**. Cada fase se puede construir y lanzar por separado.
- **Tipo al crear:** el asistente pregunta «Amigo secreto» (con una o varias rondas) o «Roba regalo». **La vaquita no es un tipo**: se agrega desde el panel a cualquier intercambio.
- **Varios regalos:** son **rondas, cada una con su sorteo**, su presupuesto, su sobre y su lista. Normalmente te toca una persona distinta en cada ronda.
- **Roba regalo:** la app **sortea el orden de turnos** y muestra un **tablero en vivo**. Quien organiza registra cada turno: abrió un regalo nuevo o robó uno. El tablero muestra quién tiene qué, cuántas veces se ha robado cada regalo (tope de 3) y a quién le toca.
- **Vaquita:** es **para alguien de fuera del grupo** (la maestra, el jefe, los abuelos). La app **no maneja dinero**: cada quien dice cuánto pone y marca «Ya pagué», y el encargado confirma.
- **Pantalla de la fiesta:** muestra la **revelación por turnos** (amigo secreto) y el **tablero de roba regalo**.
- **Control:** desde **el celular del organizador**. La TV abre un link de solo lectura y se actualiza con **polling** cada 2–3 s, el mismo patrón que `pollMailbox`.

Decisión propuesta en esta spec (hay que confirmarla al revisar el diseño):

- **La revelación es en cadena.** Empieza alguien al azar. Cuando se revela «Tere le regaló a Juan», le toca entregar a Juan. Como el sorteo es un solo ciclo (`lib/draw.ts`), la cadena pasa por todos sin repetir a nadie.
- Para que nadie se adelante, la fiesta solo se puede iniciar **el día del evento** (desde las 00:00 en la zona del intercambio).
- Cada pareja se ve en la TV y en el control **al mismo tiempo**: quien organiza no puede ver la siguiente antes que los demás.

Referencias:

- Análisis de Gift2Gift: `docs/analisis-gift2gift.md` §10 (mesa de regalos y otros productos que no lanzaron).
- Sorteo actual: `lib/draw.ts`, `app/actions/draw.ts` (`runDraw`, `redoDraw`).
- Polling actual: `app/actions/mailbox.ts` (`pollMailbox`).
- Lienzo de diseño: pendiente (se crea con Claude Design después de esta spec).
- Next.js 16: leer `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (el endpoint de la TV) y las guías de Server Actions antes de escribir código.

## 2 · Orden de las fases

| Fase | Qué entrega | Por qué en este orden |
|---|---|---|
| **1 · Fiesta en vivo (amigo secreto)** | Base del modo fiesta (pantalla de TV, código, polling, control) y revelación en cadena | Le sirve a **todos** los intercambios que ya existen, sin cambiar el asistente. Es lo que más se nota en diciembre. |
| **2 · Roba regalo** | Tipo nuevo en el asistente, sorteo de turnos y tablero en vivo | Reutiliza toda la base de la fase 1. |
| **3 · Rondas** | Varios regalos por persona, cada uno con su sorteo | Toca el sorteo, las asignaciones, las listas y el buzón: es la fase más invasiva. |
| **4 · Vaquita** | Regalo grupal para alguien de fuera | Es independiente de las demás; se puede adelantar si hay demanda de oficinas o escuelas. |

## 3 · Alcance

### 3.1 Base común: el tipo de intercambio

- `ExchangeDoc.mode: "secreto" | "roba"`. Sin el campo cuenta como `"secreto"`, así que no hace falta migrar nada.
- Asistente (fases 2 y 3):
  - El paso 2 («Grupo y tipo de regalos») agrega la pregunta **«¿Cómo van a intercambiar?»**, con dos tarjetas:
    - **Amigo secreto**: «A cada quien le toca alguien en secreto».
    - **Roba regalo**: «Cada quien trae un regalo y en la fiesta se los roban».
  - Amigo secreto, paso 3: el presupuesto se vuelve la **ronda 1**, y aparece «+ Agregar otro regalo (ronda)», con 3 rondas como máximo. Cada ronda tiene un nombre corto (sugerencias: «De broma», «En serio», «Comestible») y su presupuesto.
  - Roba regalo, paso 3: el mismo presupuesto, sin rondas. El paso 4 agrega las reglas del juego (§3.3).
  - El borrador de la SPEC 02 (`gg:borrador-crear:v1`) guarda `mode` y `rounds`. Los borradores viejos se leen como amigo secreto de una ronda.
- Editar (`/organizar/[id]/editar`): el tipo y las rondas se pueden cambiar hasta el sorteo. Después quedan fijos.

### 3.2 Fase 1 — Modo fiesta en vivo (amigo secreto)

- **Control** en `/organizar/[exchangeId]/fiesta`, solo para el dueño y pensado para el celular:
  - **Antes de iniciar**:
    - el **código de pantalla** (6 caracteres sin ambiguos, p. ej. `K7M-Q2P`) con la instrucción «En la TV o la laptop abre **givegifts.mx/tv** y escribe este código», más un QR del link directo;
    - el botón «Iniciar la revelación», activo solo el día del evento y si ya hubo sorteo.
  - **Durante**:
    - quién entrega ahora y el botón grande **«Revelar a quién le regala»**;
    - «Saltar (no vino)» manda a esa persona al final de la cola;
    - «Deshacer» quita la última revelación, con confirmación;
    - el avance, por ejemplo «7 de 12».
  - **Al terminar**: «¡Todos entregaron!» con confeti y el botón «Cerrar la fiesta».
  - «Cambiar código» invalida la pantalla anterior.
- **Pantalla (TV)**:
  - `/tv` tiene un campo para el código, en letras grandes y fácil de usar con el control remoto de una smart TV.
  - `/tv/[code]` es la pantalla de solo lectura, a pantalla completa, con letras grandes y alto contraste.
    - **Espera**: nombre del intercambio, Regalito, cuántas personas son y «Esperando a que empiece…».
    - **Turno**: «Le toca entregar a **Tere**», con una animación de suspenso.
    - **Revelación**: «**Tere** le regaló a **Juan**», con confeti (`components/ui/Confetti.tsx`). A un lado va la lista de parejas ya reveladas.
    - **Final**: todas las parejas y «¡Feliz {intercambio}!».
  - Con rondas (fase 3), la pantalla dice la ronda («Ronda 2 · En serio») y el control elige cuál revelar.
- **Privacidad**:
  - La pantalla y el control solo reciben las parejas **ya reveladas** y quién entrega ahora. La siguiente pareja la calcula el servidor al tocar «Revelar».
  - Quien organiza no ve nada adelantado, aunque tenga apagado «Ver quién le regala a quién». La revelación de la fiesta es justo el momento en que deja de ser secreto.
  - El link de la TV no da acceso a nada más que a esta pantalla. Al cerrar la fiesta, el código deja de servir.
- **Polling**:
  - La TV llama `GET /tv/[code]/estado?v={version}` cada 2,5 s. El servidor lee un solo documento. Si `version` no cambió, responde `204` sin cuerpo; si cambió, devuelve el estado.
  - Cuando la pestaña no está visible, el polling se pausa; en la TV casi siempre está visible.
  - El control usa el mismo endpoint después de cada acción.
- Del panel se llega con la tarjeta «Modo fiesta», que aparece el día del evento o desde el menú de opciones.

### 3.3 Fase 2 — Roba regalo

- **Antes de la fiesta**:
  - No hay listas de deseos, ni sobre, ni buzón (se ocultan en la navegación del participante).
  - El inicio dice «Trae un regalo envuelto de hasta ${presupuesto}», con «Agregar a mi calendario» (SPEC 03) y «Ya compré».
  - El panel sigue igual (invitar, participantes, avisar), pero sin exclusiones.
- **Sortear turnos** reemplaza a «Hacer el sorteo» en `/organizar/[id]/sorteo`:
  - baraja el orden y cierra las inscripciones (mínimo 3 personas, como hoy);
  - cada participante ve en su inicio «Te tocó el turno **4** de 12»;
  - se puede hacer antes de la fiesta o al iniciarla.
- **Reglas** (paso 4 del asistente; se pueden editar hasta iniciar la fiesta):
  - **Máximo de robos por regalo**: 2, **3** (por defecto) o sin límite. Al llegar al tope, el regalo queda **congelado** con su dueño final.
  - **No robar de vuelta**: está **encendida** por defecto. A quien le roban no puede recuperar en ese mismo momento el regalo que le acaban de quitar.
  - **El turno 1 cierra el juego**: está **encendida** por defecto. Al final, quien abrió primero puede hacer un último robo, porque nunca pudo elegir.
- **Durante la fiesta**, desde el control:
  - quién juega ahora, con dos botones: **«Abrió uno nuevo»** y **«Robó»**;
  - «Abrió uno nuevo» pide una descripción corta del regalo (≤ 40 caracteres, p. ej. «Taza de Star Wars») y, si se quiere, un emoji;
  - «Robó» muestra los regalos que se pueden robar, sin los congelados ni el que no se puede regresar;
  - a quien le roban **juega en ese momento** (abre uno nuevo o roba otro); el turno avanza cuando alguien abre uno nuevo;
  - «Deshacer» quita la última acción, cuantas veces haga falta.
- **Tablero (TV)**:
  - arriba: «Turno 5 de 12 · le toca a **Ana**»;
  - una rejilla de regalos con su descripción, quién lo tiene, sus robos en puntitos (●●○) y una marca de congelado;
  - la fila de quienes faltan;
  - una animación corta para cada robo («¡Luis le robó la taza a Ana!»);
  - **al terminar**: «Así quedaron», con cada persona y su regalo.
- La lógica del juego vive en una **función pura** `lib/party/swap.ts` (`reduce(initial, actions) → state`). El estado se calcula repitiendo el log de acciones, así que «deshacer» es quitar la última acción y se puede probar sin Firestore.

### 3.4 Fase 3 — Rondas (varios regalos por persona)

- Se pueden tener de 1 a 3 rondas, cada una con su `name`, su `budget` y su sorteo. Las exclusiones aplican a todas.
- Regla del sorteo: **«Que no te toque la misma persona en dos rondas»**, encendida por defecto.
  - Si no hay forma de cumplirla, el sorteo lo avisa y deja elegir entre **quitar la regla** o quitar exclusiones. Esto pasa, por ejemplo, con 3 personas y 3 rondas.
  - Se implementa pasándole a `draw()` las parejas de las rondas anteriores como prohibidas en una dirección. Ese parámetro de prohibición dirigida es nuevo.
- Un solo botón **«Hacer el sorteo»** sortea todas las rondas en una transacción.
- **Participante**:
  - el inicio tiene una tarjeta por ronda con su estado (sobre cerrado, abierto o ya compré);
  - hay un **sobre por ronda** (`/sobre?ronda=2`);
  - «Tu persona» va por ronda (`/persona?ronda=2`), con pestañas si hay más de una;
  - **«Mi lista»** tiene pestañas por ronda: lo que quieres de broma no es lo que quieres en serio;
  - «Ya compré» es por ronda;
  - el buzón y los avisos de la SPEC 03 son por pareja, o sea por ronda.
- **Panel**: el avance de compras por ronda y, con «Ver quién le regala a quién», el mapa por ronda.
- `redoDraw` y `removeParticipantAfterDraw` reparan **cada ronda** por separado.

### 3.5 Fase 4 — Vaquita

- Desde el panel, «+ Vaquita» se puede crear antes o después del sorteo y funciona en los dos tipos. Hay un máximo de 3 por intercambio.
- **Campos**:
  - **para quién** (texto, p. ej. «Maestra Lupita»);
  - **qué le van a regalar** (título y link opcional; el link se lee con el mismo lector de tiendas, `fetchLinkMetadata`);
  - **meta** (MXN) y **aportación sugerida** (se calcula sola: meta ÷ personas, redondeado, y se puede editar);
  - **encargado** (un participante; por defecto quien organiza);
  - **cómo pagar** (texto libre ≤ 200, p. ej. «Transferencia a la CLABE … a nombre de …»);
  - **fecha límite** (por defecto, la del intercambio).
- **Participante**: tarjeta en el inicio, «Vaquita para la Maestra Lupita · $1,200 de $2,000», que lleva a `/i/[code]/p/[token]/vaquita/[id]`. Ahí:
  - **«Me apunto con $___»**, con la aportación sugerida ya escrita;
  - **«Ya pagué»**;
  - el texto de «cómo pagar», con un botón para copiar;
  - la lista del grupo: nombre y estado («Apuntado», «Pagó», «Confirmado»). **Los montos solo los ven el encargado y quien organiza**.
- **Encargado**:
  - en la misma página, cada aportación tiene «Confirmar que llegó» y se pueden ver los montos;
  - el botón «Recordar a quien falta» abre WhatsApp con un mensaje prellenado. Cada quien sabe quién es el encargado, así que no hay nada secreto.
- La barra de avance cuenta **solo lo confirmado**. Lo marcado como pagado y sin confirmar sale en otro tono.
- **Cerrar la vaquita**: la cierra el encargado o se cierra sola en la fecha límite. Queda en modo solo lectura con el total.
- **La app nunca toca dinero.** La página lo dice: «givegifts no cobra ni guarda dinero; el pago es directo con {encargado}».

**Fuera de alcance (para futuras specs):**

- Que cada participante revele desde su propio celular, o que su celular muestre en vivo «¡Te toca!».
- WebSockets o listeners de Firestore en tiempo real.
- La pantalla de espera con cuenta regresiva y QR, y el avance de la vaquita en la TV (no se eligieron).
- Fotos de los regalos en roba regalo (habría que configurar Storage).
- Vaquita a escondidas para alguien del grupo, y pagos en la app (Mercado Pago o Stripe).
- Más de 3 rondas, o rondas con distinta gente.
- Mezclar roba regalo con rondas.
- Grabar o compartir el resultado de la fiesta como video o imagen.

## 4 · Modelo de datos

Todos los campos nuevos de documentos existentes son opcionales. Un documento sin ellos se comporta como hoy: amigo secreto, una ronda.

```ts
// exchanges/{exchangeId}  — se agregan campos
type ExchangeDoc = {
  // …campos actuales (budget sigue siendo el de la ronda 1, por compatibilidad)
  mode?: "secreto" | "roba";
  rounds?: { id: "r1" | "r2" | "r3"; name: string; budget: number }[]; // solo secreto; sin campo = [{ id: "r1", name: "", budget: budget.amount }]
  swapRules?: { maxSteals: 2 | 3 | null; noStealBack: boolean; firstPlayerFinal: boolean }; // solo roba
  turnOrder?: string[];                // solo roba: participantIds en orden, después de «Sortear turnos»
};

// exchanges/{exchangeId}/assignments/{docId}
//   r1 → docId = giverId (igual que hoy). r2/r3 → docId = `${giverId}~${round}`.
type AssignmentDoc = {
  // …campos actuales + los de la SPEC 03
  round?: "r1" | "r2" | "r3";          // sin campo = r1
};
// Lo mismo para ThreadDoc (round?) y WishDoc (round?): sin campo = r1.
// ParticipantDoc.bought / revealed siguen valiendo para r1; para r2/r3:
//   boughtRounds?: string[]; revealedRounds?: string[];

// exchanges/{exchangeId}/party/live  — un solo documento, el que lee la TV
type PartyDoc = {
  kind: "reveal" | "swap";
  status: "lobby" | "live" | "ended";
  screenCode: string;                  // también es el id en screens/{code}
  version: number;                     // +1 en cada acción; el cursor del polling
  // reveal
  round?: "r1" | "r2" | "r3";
  queue?: string[];                    // giverIds pendientes, en orden de cadena
  current?: string | null;             // giverId que entrega ahora
  revealed?: { giverId: string; receiverId: string; at: Timestamp }[];
  // swap
  actions?: SwapAction[];              // log; el estado se calcula con lib/party/swap.ts
  names: Record<string, { name: string; color: AvatarColor }>; // copia para que la TV no lea participantes
  startedAt: Timestamp | null;
  updatedAt: Timestamp;
};
type SwapAction =
  | { t: "open"; by: string; label: string; emoji?: string; at: number }
  | { t: "steal"; by: string; giftId: string; at: number };

// screens/{screenCode}  — índice para resolver la TV en una lectura
type ScreenDoc = { exchangeId: string; expiresAt: Timestamp }; // TTL: 24 h después de cerrar la fiesta

// exchanges/{exchangeId}/potes/{poteId}
type PoteDoc = {
  forWhom: string;                     // ≤ 60
  gift: { title: string; url: string | null; imageUrl: string | null; store: string | null } | null;
  goal: number;                        // MXN
  suggested: number;
  managerId: string;                   // participantId del encargado
  howToPay: string;                    // ≤ 200
  dueAt: Timestamp;
  status: "open" | "closed";
  pledgedTotal: number;                // suma de lo apuntado (para la tarjeta, sin leer aportaciones)
  confirmedTotal: number;
  createdAt: Timestamp;
};
// exchanges/{exchangeId}/potes/{poteId}/pledges/{participantId}
type PledgeDoc = { amount: number; status: "pledged" | "paid" | "confirmed"; updatedAt: Timestamp };
```

- El documento `party/live` tiene como mucho 100 parejas o 100 regalos con sus acciones, muy lejos del límite de 1 MB de Firestore.
- La TV solo lee `screens/{code}` y `party/live`. Nunca lee asignaciones: la pareja revelada la copia el servidor al documento de la fiesta en el momento de revelar.
- La revelación en cadena:
  - `queue` se arma al iniciar, recorriendo el ciclo desde un giver al azar;
  - «Saltar» manda a la persona actual al final de `queue`;
  - «Deshacer» saca la última pareja de `revealed` y la vuelve a poner en `current`.

Rutas nuevas:

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/organizar/[exchangeId]/fiesta` | Control del modo fiesta | Dueño |
| `/tv` | Escribir el código de pantalla | Público |
| `/tv/[code]` | Pantalla de la TV (revelación o tablero) | Código |
| `/tv/[code]/estado` | JSON del estado (route handler, `GET`, `Cache-Control: no-store`) | Código |
| `/i/[inviteCode]/p/[token]/vaquita/[poteId]` | Vaquita del participante y del encargado | Token |

Acciones nuevas (Server Actions, todas pasan por `guard` y por una transacción que sube `version`):

- `startParty`, `revealNext`, `skipCurrent`, `undoLast`, `endParty` y `rotateScreenCode`, en `app/actions/party.ts` (dueño);
- `drawTurns`, `swapOpen` y `swapSteal`, también en `app/actions/party.ts` (dueño);
- `createPote`, `updatePote`, `closePote`, `pledge`, `markPaid` y `confirmPledge`, en `app/actions/potes.ts` (participante o encargado, según la acción).

Límites nuevos en `RATE_LIMITS`:

- `tvCode`: 30 intentos de código por IP por hora, contra quien quiera adivinar códigos;
- `pledge`: 30 por link personal por hora.

## 5 · Plan de implementación

Cada fase termina con una verificación manual en Chrome contra el proyecto real de Firebase. Para la fiesta se usan dos ventanas: el control en móvil y la TV en escritorio, a pantalla completa.

**Fase 1 — Fiesta en vivo (amigo secreto)**

1. Crear `PartyDoc` y `ScreenDoc`, con el generador de código en `lib/tokens.ts` y la política TTL en `firestore.indexes.json`.
2. Crear `/tv`, `/tv/[code]` (estado de espera) y `/tv/[code]/estado`, con `204` cuando no hay cambios. Verificación: con un código válido la TV carga, con uno inválido sale un error amable, y el límite `tvCode` funciona.
3. Crear el control `/organizar/[id]/fiesta` con `startParty` (solo el día del evento y con sorteo hecho) y `rotateScreenCode`. Verificación: al iniciar, la TV pasa a «Le toca entregar a…» en menos de 3 s.
4. Crear `revealNext`, `skipCurrent`, `undoLast` y `endParty`, con las animaciones de la TV. Verificación: una cadena completa de 5 personas pasa por todos sin repetir; «Deshacer» y «Saltar» funcionan; ni el HTML ni el JSON de la TV traen parejas sin revelar.
5. Agregar la tarjeta «Modo fiesta» en el panel y la entrada en el menú. Revisar en móvil y en una TV de 1080p.

**Fase 2 — Roba regalo**

6. Crear `lib/party/swap.ts` (la función pura) con sus casos: robo, tope de robos, «no robar de vuelta», cierre del turno 1 y deshacer. Revisarlos a mano con un script de `node` en el scratchpad, porque la SPEC 01 dejó fuera las pruebas automatizadas.
7. Agregar `mode` y `swapRules` en el asistente (pasos 2 y 4), en el borrador, en `validateExchangeDraft`, en `createExchange` y en editar.
8. Ocultar listas, sobre y buzón en modo roba. Crear el inicio con «Te tocó el turno N». Crear `drawTurns` en `/sorteo`.
9. Crear `swapOpen` y `swapSteal` en el control y el tablero en la TV. Verificación: una partida completa de 6 personas, con un regalo congelado y el cierre del turno 1.

**Fase 3 — Rondas**

10. Agregar a `draw()` las prohibiciones dirigidas. Crear `runDraw` para varias rondas en una transacción, con el error `impossible-rounds` y la opción de quitar la regla.
11. Agregar `round` en asignaciones, hilos y deseos. Cambiar `getMyAssignment`, `planGift`, `markBought`, el buzón y los avisos de la SPEC 03 para que reciban la ronda (si no viene, es `r1`).
12. Crear en el participante las tarjetas por ronda, el sobre y «Tu persona» con `?ronda=`, y las pestañas en «Mi lista».
13. Crear en el panel el avance por ronda, el mapa por ronda y la reparación de `redoDraw` y `removeParticipantAfterDraw` ronda por ronda.
14. Agregar las rondas al asistente (paso 3) y a editar. Hacer que la revelación de la fiesta deje elegir la ronda. Verificación: 4 personas y 2 rondas sin que se repita la persona; los intercambios viejos se ven igual que hoy.

**Fase 4 — Vaquita**

15. Crear `PoteDoc` y `PledgeDoc`, y `createPote` / `updatePote` / `closePote` desde el panel.
16. Crear la página de la vaquita del participante (apuntarse y «Ya pagué») y la vista del encargado (confirmar, ver montos y recordar por WhatsApp).
17. Agregar la tarjeta en el inicio y en el panel, y el cierre automático en la fecha límite (se revisa al leer; no hace falta cron). Verificación: quien no es encargado ni organiza nunca recibe los montos en el payload.

**Cierre de cada fase:** correr `npm run lint` y `npx tsc --noEmit`, revisar los textos en `messages/es-MX.json` (`party.*`, `tv.*`, `swap.*`, `rounds.*`, `pote.*`) y hacer el recorrido en móvil y en escritorio.

## 6 · Criterios de aceptación

- **Fase 1:** el día del evento, quien organiza abre la fiesta en su celular y la TV muestra, una a una y en cadena, todas las parejas, con confeti, sin que nadie (ni quien organiza) vea antes una pareja sin revelar.
- **Fase 2:** se puede crear un roba regalo, sortear turnos y jugar la partida completa desde el celular. La TV muestra en todo momento quién tiene qué, los robos de cada regalo y a quién le toca. Un error se corrige con «Deshacer».
- **Fase 3:** un amigo secreto puede tener 2 o 3 rondas, cada una con su presupuesto, su sobre y su lista, y por defecto nadie repite persona. Los intercambios existentes no cambian.
- **Fase 4:** cualquier intercambio puede tener una vaquita para alguien de fuera. Cada quien se apunta y marca que pagó, el encargado confirma, y la barra avanza solo con lo confirmado. La app nunca pide ni guarda datos de pago de nadie que no sea el encargado.
