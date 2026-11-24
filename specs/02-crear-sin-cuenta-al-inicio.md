# SPEC 02 — Crear un intercambio sin cuenta al inicio: la cuenta se pide en el último paso

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-24
> **Objetivo:** Que cualquiera pueda llenar el asistente de creación sin cuenta y que la cuenta (correo y contraseña o Google) se pida solo en un último paso «Guarda tu intercambio», justo antes de crearlo.

## 1 · Por qué esta spec existe

Hoy `/crear` exige sesión antes de mostrar el asistente: `requireOrganizer` en `app/crear/page.tsx:16` manda a `/entrar` y la acción `createExchange` lo vuelve a exigir en `app/actions/exchanges.ts:22`. Quien llega desde la landing o desde un anuncio choca con un muro de login antes de ver qué va a crear. Eso genera desconfianza y abandono, y contradice la promesa de «sin enredos».

La SPEC 01 decidió que solo el organizador tiene cuenta. Esta spec **no cambia esa decisión**: el organizador sigue necesitando cuenta. Solo cambia **cuándo** se le pide: al final, cuando ya invirtió en llenar los datos y entiende para qué sirve («para volver a ver y editar tu intercambio»).

Referencias:

- Diseño aprobado: lienzo «Crear sin cuenta al inicio», https://claude.ai/artifact/Ch5YBeouTio9n6ALNEce2i. Artboards:
  - «Paso 4 sin sesión · borrador retomado»
  - «Paso 5 · Guarda tu intercambio», que tiene el ajuste `modo` con los estados nueva, existe y webview
  - «Paso 4 con sesión · se crea directo»
  - «Paso 5 · escritorio»

  Copia local de los artboards en el scratchpad de la sesión: `scratchpad/sincuenta/project/*.dc.html`.
- El texto de Regalito «¡ya casi! yo lo cuido» se aprobó tal cual.

## 2 · Alcance

**Entra:**

- `/crear` se abre sin sesión. El asistente de 4 pasos (nombre; grupo y regalos; fecha, hora, lugar y presupuesto; tu nombre, mensaje y reglas) funciona igual que hoy.
- Si no hay sesión, aparece un **paso 5 «Guarda tu intercambio»**. Si ya hay sesión, el paso 5 no existe y el paso 4 crea directo.
- En el paso 5:
  - Resumen del intercambio a la izquierda en escritorio, y arriba en móvil.
  - Botón de Google, oculto en navegadores internos (WhatsApp, Instagram…) con `lib/webview.ts`.
  - Correo y contraseña. El nombre de la cuenta es el «tu nombre» del paso 4; no se vuelve a pedir.
  - La nota «Solo tú necesitas cuenta para administrarlo. Tus invitados entran con el link, sin cuenta».
  - El botón final dice «Crear intercambio».
  - Regalito solo, de frente: en escritorio va parado sobre la tarjeta verde de la invitación, con la nota manuscrita «¡ya casi! yo lo cuido». En móvil va chico (unos 58 px de ancho) junto al título, sin agregar altura.
    - La imagen es un recorte, sin retocar, de la figura de frente de `.claude/skills/regalito-ilustraciones/mascota/regalito-ref.png`. Se exporta a WebP como `public/illustrations/web/14-regalito-solo.webp`.
    - Diseño de referencia: lienzo https://claude.ai/artifact/Ch5YBeouTio9n6ALNEce2i (artboards «Paso 5» y «Paso 5 · escritorio»).
- Si el correo ya tiene cuenta, el mismo formulario cambia a modo «Ya tienes cuenta: escribe tu contraseña para guardarlo ahí». Ofrece «Olvidé mi contraseña» y no pierde nada de lo llenado.
- Antes de mostrar el paso 5, el servidor valida el borrador sin crear nada (`validateExchangeDraft`). Así nadie crea una cuenta y después descubre que un campo estaba mal.
- **Borrador en el navegador:**
  - Lo que se llena se guarda en `localStorage` con la clave `gg:borrador-crear:v1`.
  - Si se recarga o se vuelve a `/crear`, se retoma con un aviso «Retomamos tu borrador · Empezar de nuevo».
  - Se borra al crear el intercambio.
- Con sesión iniciada, el paso 4 muestra «Se guardará en tu cuenta {correo} · ¿No eres tú?». «¿No eres tú?» cierra la sesión, conserva el borrador y hace aparecer el paso 5.
- `createExchange` deja de redirigir a `/entrar` cuando no hay sesión. Devuelve el error `auth` y el asistente regresa al paso 5. Cubre el caso de una sesión vencida a mitad del asistente.
- La lógica de autenticación del cliente que hoy vive en `app/entrar/LoginForm.tsx` se mueve a `lib/auth/client.ts`. Así `/entrar` y el paso 5 usan el mismo código.
- El acceso a «Entrar» en la barra de navegación y la página `/entrar` **se quedan** (decisión del usuario), para quien ya tiene cuenta y quiere ver sus intercambios. Su texto pasa a «Entra para ver y editar tus intercambios».
- Textos nuevos en `messages/es-MX.json` bajo `create.s5.*` y `create.draft.*`.

**Fuera de alcance (para futuras specs):**

- Crear el intercambio con una cuenta anónima de Firebase y «reclamarlo» después.
- Terminar sin cuenta con un link secreto de administración.
- Verificar el correo antes de crear o de invitar (punto M12 de la auditoría).
- Cuentas para participantes (sigue la decisión de la SPEC 01).
- Guardar el borrador en el servidor o sincronizarlo entre dispositivos.
- Iniciar sesión con otros proveedores (Apple, Facebook).
- Cambiar el diseño visual del asistente más allá del paso 5 y el aviso del borrador.

## 3 · Modelo de datos

Esta spec **no agrega colecciones ni campos en Firestore**. Reusa `users/{uid}` y `exchanges/{exchangeId}` de la SPEC 01 tal como están.

Lo único nuevo es el borrador en el navegador:

```ts
// localStorage["gg:borrador-crear:v1"]
type CreateDraft = {
  v: 1;
  step: 1 | 2 | 3 | 4 | 5;   // paso donde se quedó
  form: ExchangeFormState;   // el mismo estado que hoy maneja Wizard.tsx
  savedAt: string;           // ISO; un borrador de más de 30 días se descarta
};
```

Contratos nuevos o cambiados:

```ts
// app/actions/exchanges.ts
validateExchangeDraft(input: ExchangeInput): Promise<{ ok: true } | { ok: false; fieldErrors: string[] }>;
// Sin sesión y sin tocar Firestore: solo corre el esquema exchangeInput de lib/validation/exchange.ts.

createExchange(input: ExchangeInput): Promise<ActionResult>;
// Cambia: sin sesión ya no redirige; devuelve { ok: false, error: "auth" }.

// lib/auth/client.ts (solo cliente)
signUpOrSignIn(email, password, displayName): Promise<"ok" | "exists" | ErrorKey>;
signInEmail(email, password): Promise<"ok" | ErrorKey>;
signInGoogle(displayName?): Promise<"ok" | ErrorKey>;
sendReset(email): Promise<"ok" | ErrorKey>;
// Todas terminan llamando createSession(idToken, displayName) de app/actions/session.ts
// y mapean errores con authErrorKey de lib/auth/errors.ts.
```

## 4 · Plan de implementación

Antes de escribir código, leer en `node_modules/next/dist/docs/` las guías de Server Actions, `searchParams` y Cache Components, como pide `AGENTS.md`.

1. **Extraer la autenticación del cliente.**
   - Mover a `lib/auth/client.ts` el registro, el inicio de sesión con correo, Google, «olvidé mi contraseña» y el cierre con `createSession`, que hoy viven en `app/entrar/LoginForm.tsx`.
   - `LoginForm` pasa a usar esas funciones sin cambiar su comportamiento.
   - Prueba manual: entrar y registrarse en `/entrar` sigue funcionando.
2. **Acciones del servidor.**
   - Agregar `validateExchangeDraft` en `app/actions/exchanges.ts`.
   - Cambiar `createExchange` para que, sin sesión, devuelva `{ ok: false, error: "auth" }` en lugar de redirigir.
   - El asistente actual sigue igual, porque la página todavía exige sesión.
3. **Borrador en el navegador.**
   - Crear `app/crear/draft.ts` con leer, guardar y borrar `gg:borrador-crear:v1`. Todo va dentro de `try/catch`: si `localStorage` falla, se trabaja en memoria.
   - En `app/crear/Wizard.tsx`: guardar en cada cambio de paso y de campo, retomar al montar con el aviso «Retomamos tu borrador · Empezar de nuevo», y borrar al crear.
   - Si llega `?nombre=` desde la landing y hay borrador, gana el borrador y el aviso ofrece «Empezar de nuevo».
4. **Componente del paso 5.**
   - Crear `app/crear/AccountStep.tsx` con el resumen, Google (oculto en webviews), correo y contraseña, el modo «ya tienes cuenta», «olvidé mi contraseña» y la nota de los invitados.
   - Usa `lib/auth/client.ts` y los componentes de `components/ui` (`Alert`, `DotButton`, `Card`).
   - Todavía no se conecta al asistente.
5. **Conectar el paso 5 al asistente.**
   - `app/crear/page.tsx` usa `getOrganizer()` en lugar de `requireOrganizer` y pasa `organizer: { email, name } | null` a `Wizard`.
   - Si `organizer` es `null`:
     - El riel y la barra muestran 5 pasos.
     - «Continuar» en el paso 4 llama `validateExchangeDraft` y, si pasa, va al paso 5.
     - En el paso 5, al autenticarse, se llama `createExchange`.
   - Si `createExchange` responde `auth`, el asistente vuelve al paso 5.
   - Si responde con errores de campo, vuelve al primer paso con error, igual que hoy.
6. **Caso con sesión.**
   - El paso 4 muestra «Se guardará en tu cuenta {correo} · ¿No eres tú?».
   - «¿No eres tú?» llama `signOut`, conserva el borrador, refresca la ruta y deja visible el paso 5.
7. **Textos.**
   - Agregar `create.s5.*` y `create.draft.*` en `messages/es-MX.json`.
   - Cambiar el texto de `/entrar` a «Entra para ver y editar tus intercambios».
   - Quitar el aviso «Necesitas una cuenta para crear intercambios», que ya no aplica.
   - Revisar que la landing y el paso 5 digan lo mismo: tus invitados no necesitan cuenta.

## 5 · Criterios de aceptación

- [ ] Sin sesión, abrir `/crear` muestra el paso 1 del asistente y no redirige a `/entrar`.
- [ ] Sin sesión, el asistente muestra 5 pasos en la barra y en el riel. Con sesión muestra 4.
- [ ] Un campo inválido en los pasos 1–4 se marca antes de llegar al paso 5. No se crea ninguna cuenta con datos inválidos.
- [ ] Recargar la página en el paso 3 retoma el paso 3 con lo ya llenado y el aviso «Retomamos tu borrador».
- [ ] «Empezar de nuevo» vacía el formulario y vuelve al paso 1.
- [ ] Con un correo nuevo y una contraseña válida, «Crear intercambio» crea la cuenta y el intercambio, y lleva a `/crear/listo/{id}`.
- [ ] La cuenta nueva usa como nombre el «tu nombre» del paso 4.
- [ ] Con un correo que ya tiene cuenta, el formulario cambia a «Ya tienes cuenta» sin perder datos. Con la contraseña correcta, el intercambio se crea en esa cuenta.
- [ ] Con una contraseña incorrecta se muestra un error y el borrador sigue intacto.
- [ ] «Olvidé mi contraseña» manda el correo de Firebase y muestra la confirmación.
- [ ] Con Google, el intercambio se crea en la cuenta de Google y lleva a `/crear/listo/{id}`.
- [ ] En un navegador interno (user agent de WhatsApp) el botón de Google no aparece y el correo sí.
- [ ] El paso 5 muestra la nota de que los invitados no necesitan cuenta.
- [ ] Después de crear, `gg:borrador-crear:v1` ya no existe en `localStorage`.
- [ ] Con sesión iniciada, el paso 4 muestra «Se guardará en tu cuenta {correo}» y crea directo, sin paso 5.
- [ ] «¿No eres tú?» cierra la sesión, conserva lo llenado y muestra el paso 5.
- [ ] Si la sesión vence a mitad del asistente, crear lleva al paso 5 en lugar de fallar o redirigir.
- [ ] `/entrar` y el link «Entrar» de la barra de navegación siguen funcionando para iniciar sesión e ir a «Mis intercambios».
- [ ] Llamar `createExchange` sin sesión devuelve `{ ok: false, error: "auth" }` y no escribe nada en Firestore.
- [ ] Con `localStorage` bloqueado (ventana privada) el asistente funciona completo; solo no se retoma al recargar.
- [ ] `npx tsc --noEmit`, `npx eslint` y `npx next build` pasan sin errores.
- [ ] El recorrido completo se ve correcto a 390×844 y 1440×900, sin errores en la consola.

## 6 · Decisiones tomadas y descartadas

- **Sí:** el intercambio se guarda en Firestore solo al final, ya con la cuenta. No quedan intercambios sin dueño ni datos huérfanos (decisión del usuario).
- **No:** crear al instante con Firebase Anonymous Auth y «reclamar» después. Es más flexible, pero si nunca se reclama el organizador pierde el acceso, y obliga a fusionar cuentas cuando el correo ya existe.
- **Sí:** la cuenta es obligatoria en el último paso (decisión del usuario). Sin cuenta no hay una forma segura de volver a administrar el intercambio.
- **No:** «Continuar sin cuenta» con un link secreto de administración. Es otra llave que se puede perder o reenviar por error, como pasaba con los links personales (R1 de la auditoría).
- **Sí:** si el correo ya existe, se pide la contraseña en el mismo paso. **No:** mandar a `/entrar` y volver (decisión del usuario).
- **Sí:** «Entrar» se queda en la barra de navegación para quien ya tiene cuenta (decisión del usuario).
- **Sí:** sin verificación de correo por ahora (decisión del usuario). Se puede agregar en otra spec si aparece spam.
- **Sí:** un paso 5 visible «Guarda tu intercambio». **No:** una ventana sobre el paso 4, porque se siente como un muro sorpresa.
- **Sí:** con sesión iniciada, el paso 5 no existe y se crea directo.
- **Sí:** el borrador vive en `localStorage` con clave versionada `gg:borrador-crear:v1`. **No:** guardarlo en el servidor, porque exigiría un documento sin dueño y limpieza.
- **Sí:** el nombre de la cuenta es el «tu nombre» del paso 4. **No:** pedirlo dos veces.
- **Sí:** se valida en el servidor antes del paso 5 (`validateExchangeDraft`). Así no se crea una cuenta para luego fallar por un campo.
- **Sí:** `createExchange` sigue exigiendo sesión y verifica la cookie en el servidor. La seguridad no cambia; solo cambia el momento en que se pide la cuenta.
- **Sí:** se extrae `lib/auth/client.ts` para que `/entrar` y el paso 5 no dupliquen la lógica ni el mapeo de errores.

## 7 · Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` bloqueado o lleno | Toda lectura y escritura va en `try/catch`. El asistente funciona en memoria y solo se pierde el retomar al recargar. |
| Se crea la cuenta y la sesión, pero `createExchange` falla (red, Firestore) | El asistente se queda en el último paso con un error y «Reintentar». Como ya hay sesión, reintentar crea directo sin pedir cuenta otra vez. |
| Doble clic en «Crear intercambio» crea dos intercambios | El botón se desactiva mientras corre la acción (`useTransition`), como hoy en el paso 4. |
| El popup de Google se bloquea | Se reusa el mapeo de `lib/auth/errors.ts` (`auth/popup-blocked`, etc.) y el formulario de correo queda disponible. |
| Alguien usa una computadora compartida con un borrador ajeno | El aviso «Retomamos tu borrador · Empezar de nuevo» deja claro de dónde viene y permite descartarlo. El borrador no incluye correo ni contraseña. |
| Abuso: crear muchas cuentas para hacer spam de intercambios | Firebase Auth ya limita la creación de cuentas por IP. Si se vuelve un problema, se activa la verificación de correo en otra spec. |
| Un borrador viejo con una fecha ya pasada | Se descarta si tiene más de 30 días. Si la fecha ya pasó, la validación del paso 3 la marca como inválida. |

## Lo que **no** entra en esta spec

- Cuenta anónima de Firebase y reclamar el intercambio después.
- Link secreto de administración para terminar sin cuenta.
- Verificación de correo.
- Cuentas para participantes.
- Borrador guardado en el servidor o entre dispositivos.
- Otros proveedores de inicio de sesión.

Cada una de esas, si llega, va en su propia spec.
