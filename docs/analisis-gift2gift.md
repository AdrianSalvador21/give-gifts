# Análisis e ingeniería inversa de Gift2Gift (gift2gift.me)

> Fecha del análisis: 23-nov-2026. Fuentes: recorrido real en Chrome (se creó un intercambio de prueba de punta a punta), lectura de bundles JS / payload RSC / diccionario i18n, correos recibidos, sitemap/robots/llms.txt, App Store / Play Store y búsquedas web.
>
> Convenciones: **[observado]** = lo vi funcionando; **[código]** = sale de bundles/i18n; **[inferencia]** = deducción razonable no verificada.

---

## 0. Resumen ejecutivo

Gift2Gift es un organizador de **intercambios de regalos / amigo secreto** mexicano, gratuito, sin cuentas para participantes. El núcleo es:

1. **Wizard de 5 pasos** para crear el intercambio (nombre → tipo de grupo → categoría → fecha/lugar/presupuesto → organizador + mensaje + método de invitación).
2. **Dos modos**: *link compartido* (la gente se apunta sola y el organizador sortea cuando quiere) o *manual* (el organizador captura nombres+emails y el sorteo ocurre al crear).
3. **Identidad por "capability URL"**: cada participante tiene un `uid` (UUID) que, junto con el `eid` del intercambio, da acceso a su página. No hay login para participantes.
4. **Panel único** `/exchanges/exchange?eid=&uid=` que cambia según rol (admin/participante) y estado (antes/después del sorteo): Resumen · Participantes · Deseos.
5. **Sorteo** manual, con **exclusiones** por pares bidireccionales, mínimo 3 personas, irrepetible; la revelación es un **"raspadito"** (canvas) + correo.
6. **Lista de deseos por intercambio** con búsqueda en Amazon (afiliado `g2gtienda-20`), links de cualquier tienda (scraping de metadatos), notas (talla/color), y **GiftGuru** (sugerencias por categoría+presupuesto).
7. **Engagement post-sorteo**: "Pedirle ideas en secreto" (email anónimo al asignado), "Ya compré mi regalo" (progreso grupal), recordatorios, `.ics` de calendario.
8. Alrededor: listas de deseos permanentes (`/wishes`), tarjetas digitales con audio (`/tarjetas`), stickers, B2B (`/empresas`), patrocinios, blog/guías SEO en 9 idiomas, apps iOS/Android.

Monetización: afiliados de Amazon + patrocinios (slots en la página del intercambio) + B2B (créditos, próximamente) + "Buy me a coffee".

---

## 1. Stack técnico

| Capa | Tecnología | Evidencia |
|---|---|---|
| Framework | **Next.js App Router** (RSC + **Server Actions**) | `self.__next_f`, `createServerReference(...)`, chunks `app/[locale]/(app)/exchanges/create/page-*.js` |
| Hosting | **Vercel** | headers `Server: Vercel`, `X-Vercel-Cache`, `X-Nextjs-Prerender` |
| i18n | **next-intl** con `pathnames` localizados, 9 idiomas / 22 locales país | `pathnames.json`, hreflang, redirects 307/308 |
| DB + Auth | **Supabase** (`@supabase/ssr`, auth-js, Storage bucket `occasion-audio`) | bundle |
| CMS | **Sanity** (blog, guías, landings SEO, FAQ) | `cdn.sanity.io`, `@sanity/preview-kit` |
| Email transaccional | **Postmark** **[observado]** (links envueltos en `track.pstmrk.it`), remitente `Intercambios Gift 2 Gift <hello@gift2gift.me>`. En el bundle también aparece `resend` (posible proveedor previo o secundario) | correos recibidos |
| Analítica | **PostHog** vía proxy `/ingest` (session recording sólo en rutas de app), **Google Ads** gtag `AW-16711415847` | scripts, localStorage |
| UI | Tailwind v4 + tokens estilo **shadcn/ui** (Radix: Dialog, Select, Tabs, Checkbox, RadioGroup), **react-hook-form + zod**, **Framer Motion**, **sonner** (toasts), react-day-picker | bundle, DOM |
| Fuentes | Geist / Geist Mono (UI), **Recoleta** (display/títulos), + 14 fuentes decorativas para tarjetas | `document.fonts` |
| Imágenes de producto | `m.media-amazon.com` | DOM |
| Apps | iOS (`id6758288780`) y Android (`me.gift2gift.app`) | stores |

**API propia REST** `/api/v1/...` (usada por listas de deseos / app móvil) **[código]**: `lists`, `lists/:id/items`, `items/:id/history` (precio), `refresh-prices`, `share` + `share/rotate`, `invite` + `invite/rotate`, `members/:id`, `lists/from-exchange`, `products/metadata?url=` (scraper), `campaigns/placements` (patrocinios).

**Server Actions** identificadas **[código]**: `getCurrentUser`, `createExchangeViaLink`, `createExchangeManually`, `sendMagicLink`, `signInWithGoogle`, `signInWithApple`, `logoutUser`, `createGiftCardAction`, `createBulkGiftCardAction`, `sendBulkGiftCardEmailsAction`, `startCardAudioUploadAction`, `finishCardAudioUploadAction`, `requestBusinessDemo`, `revalidateSyncTags`. Las acciones del panel (unirse, sortear, agregar deseo, buscar en Amazon, editar, etc.) también son Server Actions: se ven como `POST` a la misma URL de la página **[observado]**.

---

## 2. Mapa de rutas

Route groups: `app/[locale]/(marketing)`, `app/[locale]/(app)`, `app/[locale]/(auth)`.

### 2.1 Producto (app)
| Ruta interna | es-MX | Descripción |
|---|---|---|
| `/exchanges/create` | `/intercambios/crear` | Wizard de creación (cliente) |
| `/exchanges/create/confirmed/link?eid=&gid=&link=` | (sin traducir) | Pantalla "¡Listo! Mándale la invitación" (modo link) |
| `/exchanges/create/confirmed/manual` | | Pantalla "¡Ho-ho-ho! El sorteo está listo" (modo manual) |
| `/exchanges/exchange?eid=` | | **Invitación pública** (postal + formulario de unirse). Tras el sorteo: "Este intercambio ya está cerrado" |
| `/exchanges/exchange?eid=&uid=[&new=true][&src=email][&invite=1][&tab=…]` | | **Panel** del participante/admin |
| `/exchanges/join?eid=`, `/exchanges/admin` | | Variantes/legado |
| `/events` | `/eventos` | "Mis intercambios" (requiere login → redirige a `/iniciar-sesion?next=`) |
| `/wishes`, `/wishes/[id]` | | Listas de deseos permanentes (login) |
| `/tarjetas`, `/tarjetas/nueva?diseno=` | | Tarjetas digitales |
| `/celebraciones` | | Mesa de regalos (login, beta) |
| `/empresa` | | Panel B2B (login) |
| `/login` | `/iniciar-sesion` | Magic link + Google + Apple |
| `/auth/confirm` | | Pantalla intermedia anti-escáner del magic link |
| `/delete-account` | | Borrado de cuenta (requisito de stores) |

### 2.2 Marketing
`/` (landing), `/[slug]` (landings SEO desde Sanity: `intercambio-regalos`, `amigo-secreto`, `intercambio-navideno`, `sorteo-intercambio-regalos`, `intercambio-regalos-oficina`, `intercambio-regalos-familia`, `secret-santa`, `app-intercambio-regalos`, …), `/guias` + `/guias/[slug]`, `/blog` + `/blog/[slug]`, `/guia-de-regalos` + 11 subpáginas, `/preguntas-frecuentes`, `/acerca`, `/precios`, `/contacto`, `/ayuda`, `/empresas`, `/patrocinios` (sólo MX), `/stickers-navidad`, `/legal/{terminos-y-condiciones,politica-de-privacidad,politica-de-cookies}`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, `/robots.txt`.

### 2.3 i18n
- 9 idiomas (es, en, pt, de, fr, it, nl, pl, sv) × país → 22 locales (`es-MX`, `es-AR`, `en-US`, `en-GB`, `pt-BR`, …).
- `/` → 307 a `/es-MX`; idioma por `Accept-Language`, país por geo-IP. **El país decide moneda por defecto, tienda de Amazon y tag de afiliado.**
- Slugs traducidos (`/es-MX/intercambios/crear`, `/de-DE/wichteln/erstellen`, `/fr-FR/echanges/creer`…); las rutas sin traducir redirigen a la traducida.
- El diccionario completo de mensajes (~170 KB) viaja en el RSC de cada página.

---

## 3. Modelo de datos (inferido)

```
exchanges
  id (uuid = eid)            name                group_type (office|family|friends|school|community|other)
  category/type (general|books|technology|food|handmade|experiences|…)
  date (date, sin hora)      venue (nullable → "Por definir")
  currency (MXN, USD, …)     max_amount (numeric > 0)       message (≤500)
  creation_method (via-link|manual)                         locale
  organizer_sees_draw (bool, default false)
  status (open|drawn|cancelled/inactive)                    drawn_at, created_at
  market/country (de la URL)

guests  (participantes; el admin también es un guest)
  id (uuid = uid/gid; ES la llave de acceso)                exchange_id
  name, email (único por exchange, case-insensitive)
  is_admin                    email_verified (se marca al abrir links con src=email / OAuth)
  email_bouncing              user_id (nullable, Supabase Auth si entró con Google/Apple/login)
  assisted: bool + helper_email / "que me llegue a mí" (menores o adultos mayores sin correo)
  has_seen_reveal             gift_bought            reminders_unsubscribed

exclusions       exchange_id, guest_a_id, guest_b_id   (par no dirigido)
assignments      exchange_id, giver_id, receiver_id
wishlist_items   guest_id/exchange_id, title, url, image_url, price, currency, store, asin, note, source
idea_requests    exchange_id, from_giver_id, to_receiver_id, sent_at   (cooldown 24 h en "recordar")
notifications/email_log  (para "N de M invitaciones no pudieron entregarse")

-- Fuera del intercambio:
lists, list_items, list_members(role owner|editor), price_history, share_tokens, invite_tokens
gift_cards(design, recipient, sender, stickers json, font, text|audio_path, opens_at, opened_at)
users/profiles, push_tokens, campaigns/placements, business_accounts/credits
```

---

## 4. Flujo de creación (wizard) **[observado + código]**

Página cliente única con estado en `react-hook-form` (`mode: onChange`) y validación `zod`. Cada paso tiene una ilustración de banner distinta y animación `fade+slide` (Framer Motion). A partir del paso 2 aparece un "chip" resumen arriba: `✏️ {nombre} · {icono grupo} {grupo} [Cambiar]` (Cambiar regresa al paso 1). Botones: *Anterior* / *Continuar* (deshabilitado hasta que el paso sea válido) y *Finalizar* en el paso 5.

| Paso | Pregunta | Campos / reglas |
|---|---|---|
| 1 | "¿Qué nombre le quieres dar a tu intercambio de regalos?" | `name` requerido |
| 2 | "¿Con quién vas a hacer el intercambio?" | Tarjetas emoji single-select: 🏢 Oficina, 👨‍👩‍👧‍👦 Familia, 👥 Amigos, 🎓 Escuela, 🏘️ Comunidad, 🤝 Otro |
| 3 | "Categoría de regalos" | Single-select: 🎁 General, 📚 Libros, 💻 Tecnología, 🍫 Comida y Bebidas, ✋ Artesanía, 🎭 Experiencias |
| 4 | "Detalles del intercambio" | **Fecha** (date picker, sólo fechas futuras, sin hora) requerida · **Ubicación** opcional (placeholder cambia según grupo; vacío → "Por definir") · **Moneda** (select con banderas: MXN, USD, EUR, JPY, GBP, AUD, CAD, CHF, PLN, SEK, BRL, COP, ARS, CLP, PEN, GTQ, CRC, PYG, INR; default según país) · **Presupuesto** requerido y > 0 |
| 5 | "Configuración final" | **Administrador**: nombre + email (prellenados y bloqueados si hay sesión) · **Mensaje de bienvenida** (≤500, con default: "¡Hola! Te invito a nuestro intercambio de regalos. Agrega tu lista de deseos para que a quien le toques sepa qué regalarte.") · **Método**: radio *Generar link de invitación* / *Agregar invitados manualmente* |

Modo **manual** en el paso 5: aparece la lista "Participantes (N total)" con el admin "ya incluido" + 2 filas obligatorias (nombre+email), "Agregar otro participante", y un hint "¿No tienes todos los correos? → Usar el link". Validación: ≥2 invitados además del admin, **sin emails duplicados** (incluyendo el del admin; normalizado `lower+trim`).

Payload enviado a la Server Action (schema zod real):
```ts
{ name, group, type, date?: Date, venue?, currency?, max_amount: number>0, message,
  adminName, adminEmail, creationMethod: 'via-link'|'manual',
  exchangeGuests?: {name,email}[], locale?, organizerSeesDraw?: boolean /* default false */ }
```
+ 2 args extra de atribución (UTM / distinct_id de PostHog **[inferencia]**). El servidor responde con `redirect()` (`NEXT_REDIRECT`).

**Prellenado desde marketing**: el formulario "Ponle nombre a tu intercambio" de la landing/landings guarda el nombre en `sessionStorage["g2g:create-name"]` y navega a `/intercambios/crear?from=home[&group=office]`; el wizard arranca en el paso 2 (o 3 si viene `group`).

**Analítica fina del wizard**: eventos por paso (`create_exchange_set_name`, `set_group`, `set_category`, `set_details`), evento de abandono con `step`, `seconds_on_step`, `submit_attempts`, campos llenos/validos, y resultado del submit (`sent|error|invalid` con `invalid_fields`). Muy útil replicarlo.

---

## 5. Post-creación

### 5.1 Pantalla de confirmación (modo link) **[observado]**
URL: `/exchanges/create/confirmed/link?eid=…&gid={uid admin}&link=…`
- Título "¡Listo! Mándale la invitación a tu grupo".
- **Tarjeta tipo postal** (sello rojo "Gift2Gift", matasellos con la fecha "24-DIC"): "ORGANIZADOR X TE INVITA A", nombre del intercambio, mensaje en cursiva, 📅 fecha, 🎁 "Hasta $500", "1 persona ya se apuntó".
- **Cuenta regresiva de 48 h "PARA JUNTAR AL GRUPO"** — es urgencia de marketing; el correo aclara "El link no vence".
- CTAs: **Compartir invitación** (Web Share API), **WhatsApp**, **Copiar link**; "Faltan N personas para poder hacer el sorteo"; "Ir a mi intercambio de regalos"; "Agregar gente manualmente"; "Mientras tanto, llena tu lista de deseos"; "Agregar a mi calendario" (.ics).
- Bloque viral "¿Te gustó? ¡Compártelo con tu gente!" (Crear intercambio / Mandar una tarjeta / Crear lista de deseos / Twitter / WhatsApp / Buy me a coffee) — se repite en todas las páginas de app.

### 5.2 Correo al organizador **[observado]** — "🎁 Gracias por crear "{name}" en Gift2Gift"
Link de invitación, botón "Invitar a mi grupo", "Ir al Panel del Intercambio" (`?eid&uid&src=email`), próximos pasos (mínimo 3 personas contándote), "¡Guarda este correo! Contiene enlaces importantes". **Es la única forma de recuperar el panel si no hay sesión.**

---

## 6. Panel del intercambio `/exchanges/exchange?eid&uid`

Cabecera: badge (👑 Administrador | 👋 Participante), nombre, "Organizado por {avatar iniciales} {nombre}".
Admin: 3 botones de acción **Invitar · Sortear · Gestionar** (tras el sorteo sólo queda *Gestionar*). Tabs: **Resumen · Participantes · Deseos**. Al entrar por primera vez sale un modal de pasos ("Tus siguientes pasos — Llevas 1 de 3" para admin; "¡Ya estás dentro! … 1 Te uniste, 2 Llena tu lista, 3 Espera el sorteo, 4 Compra tu regalo antes del {fecha}" para participante).

### 6.1 Resumen (antes del sorteo)
- Admin: tarjeta ámbar "Faltan N personas para sortear" + countdown + "Invitar"; con ≥3: "Ya son N. ¡Ya puedes sortear!" + "Hacer el sorteo".
- **Progreso grupal**: "X de N ya llenaron su lista", avatares con check, "Aún sin lista: A, B y N más", "¡Solo faltas tú!" + "Llenar mi lista".
- **Más Detalles**: Mensaje, Fecha, Ubicación, Categoría • Presupuesto (`MXN $500.00`), "Agregar a mi calendario".
- **Tu Persona Asignada**: "Se revelará cuando se haga el sorteo".

### 6.2 Modal **Invitar** (admin)
Link copiable (`/es-MX/exchanges/exchange?eid=`), Compartir, WhatsApp. Sección "O AGRÉGALO TÚ": Nombre + Correo ("Le llega el correo del sorteo, como a todos") + checkbox **"Es menor o adulto mayor y no tiene correo"** → cambia a "Correo de quien le ayuda" + checkbox **"Que me llegue a mí"** (participación asistida: el resultado llega al email del tutor).

### 6.3 Modal **Gestionar** = "Editar Intercambio"
Nombre, Fecha, Ubicación, Moneda+Presupuesto, Mensaje, checkbox **"Quiero ver quién le da a quién"** ("Si lo marcas, después del sorteo verás en la lista de participantes a quién le regala cada quien. Si no, nadie lo ve, ni tú."), link rojo **Cancelar intercambio**, Cancelar/Guardar. *Grupo y categoría no se editan aquí* **[observado]**. Al activar el checkbox después del sorteo, el mapa no apareció en la lista **[observado]** → probablemente sólo tiene efecto si se marca antes de sortear (o es un bug).

### 6.4 Tab **Participantes**
- Admin ve email de todos. Por fila: avatar con iniciales (color por persona), nombre, email, estados: "🎁 Ya llenó su lista de deseos", "🎁 Ya tiene su regalo", "👁 Ya vio a quién le tocó", "✏️ Correo sin verificar — puedes corregirlo si tiene un error", "Su correo está rebotando — pídele que lo corrija", "Su correo está verificado y no puede cambiarse".
- Acciones admin antes del sorteo: **Editar** (inline, sólo el email), **Copiar invitación** (link personal con uid), **Eliminar**. Después del sorteo: **Editar**, **Reenviar** (re-envía el correo), **Copiar invitación** (no se puede eliminar).
- Participante ve sólo nombres (+ "Ya llenó su lista").
- Con `organizerSeesDraw`: "Le da regalo a: {name}" vs "🤫 sorpresa" **[código]**.

### 6.5 Tab **Deseos** (mi lista en este intercambio)
1. **Buscar Productos** en Amazon del país (≥4 caracteres, 10 resultados con imagen/título/precio/"Agregar").
2. **Agregar Enlace Externo**: URL de cualquier tienda (Amazon, Mercado Libre, Shein…) → "El título y la imagen se obtendrán automáticamente".
3. **Mi Lista de Deseos (N)**: cada ítem con "Agregar nota" (chips Talla/Color/Modelo/"Cualquiera me sirve", p. ej. "Talla 26 MX, de preferencia blancos"), "Ver en Amazon" (link con `?tag=g2gtienda-20&linkCode=…`), "Eliminar".
4. **GiftGuru** (si la lista está vacía): "¡Deja que GiftGuru llene tu lista con sugerencias perfectas! — Llenar por mí — Basado en los detalles de tu intercambio".
5. Tras el sorteo: **"¿Lista actualizada? → Recordar a mi amigo secreto"** (email al giver; cooldown 24 h).

### 6.6 Sorteo (modal "Hacer el sorteo") **[observado]**
- "N participantes"; si <3: "Se necesitan al menos 3 participantes (actualmente: N)" y botón deshabilitado.
- **Exclusiones (opcional)**: "Elige dos personas que nunca deban tocarse — parejas, o hermanos que ya se regalan entre ellos." Dos selects (`Elige a alguien` ↔ `y a alguien más`, el segundo excluye al ya elegido) + "Añadir" → chips `Participante Uno ↔ Participante Dos ✕`. Exclusiones viven sólo en el modal (sin persistencia previa visible).
- **"✨ Realizar sorteo ahora"** → toast "¡Sorteo realizado exitosamente! 4 participantes fueron notificados".
- Errores: "Con las exclusiones actuales no hay sorteo posible", "El sorteo ya se realizó", "N de M invitaciones no pudieron entregarse".
- **Algoritmo** [código + verificado]: un **único ciclo hamiltoniano** (A→B→C→D→A), sin auto-asignación ni pares mutuos, respetando exclusiones; intentos aleatorios y luego búsqueda acotada. En la prueba (exclusión Uno↔Dos) salió OP→PD→PT→PU→OP ✔.
- Tras sortear, el link público muestra **"Este intercambio ya está cerrado"** (no se aceptan más personas). No hay re-sorteo.

### 6.7 Resumen (después del sorteo)
- "✅ Sorteo completado — Todos los participantes han sido asignados".
- Progreso de **compras**: "Nadie ha comprado su regalo todavía" / "1 de 4 ya compró su regalo" + "Aún no compran: …" + botón **"Ya compré mi regalo"** → "Ya compraste tu regalo. El grupo ya lo ve. [Deshacer]". Progreso de revelación: "N ya saben a quién le regalan. ¿Y tú?" + "Descubrir a mi asignado".
- **Tu Persona Asignada**: "Tu sorteo ya está listo — Raspa la tarjeta para descubrir a quién le das regalo." → **raspadito en `<canvas>`** (textura roja metálica, "🖐 Raspa para descubrir", accesible con Enter). Al raspar suficiente se limpia y muestra tarjeta "Le das regalo a: **{nombre}**". ⚠️ El nombre ya viene en el DOM debajo del canvas.
- **Lista de deseos de {asignado}**: si está vacía → "¿Qué te regalo? … Pídele ideas: le mandamos un correo sin decirle que eres tú" → **"Pedirle ideas en secreto"** → "¡Listo! Le avisamos a X sin revelar quién eres". Buscador "Busca algo para {nombre}". **"Los infalibles — Regalos que casi nunca fallan para este presupuesto"** (8 productos de Amazon dentro del rango, "Comprar", "Más sugerencias").
- Banda de GiftGuru [código]: techo +15 % y piso −30 % del presupuesto; caché 7 días.

---

## 7. Flujo de invitación / unirse **[observado]**

1. El invitado abre `/es-MX/exchanges/exchange?eid=…` (preview OG para WhatsApp).
2. Ve la **postal** (igual a la de confirmación) con "N personas ya se apuntaron", countdown "APÚNTATE YA", y formulario **Nombre completo + email → "Me apunto"**, u **"Apuntarse con Google" / "Apuntarse con Apple"**. "Tu email solo se usará para enviarte tu asignación".
3. Redirige a `…&uid={nuevo}&new=true` + modal "¡Ya estás dentro!".
4. Correo "Ya estás en «{exchange}» 🎁" con resumen, adjunto **`intercambio.ics`** (Gmail lo detecta como evento), "Llenar mi lista", "Ver el intercambio", link personal en texto plano.

**Hallazgo importante**: si alguien se "apunta" con un email ya inscrito, **no se duplica: lo lleva al `uid` existente** (no cambia el nombre). Como no hay verificación previa, **cualquiera que conozca el link del intercambio y el email de otro participante puede entrar a su página** (y después del sorteo, ver su asignación). Es un punto débil a corregir en la réplica (magic link / OTP antes de mostrar la página existente).

---

## 8. Correos transaccionales **[observado]**

Remitente `Intercambios Gift 2 Gift <hello@gift2gift.me>`; links con tracking de Postmark; todos incluyen el link personal en texto (fallback) y footer "Gift2Gift© México".

| Disparador | Asunto | Contenido clave |
|---|---|---|
| Crear (link) | 🎁 Gracias por crear "{name}" en Gift2Gift | link invitación, panel admin, próximos pasos |
| Unirse | Ya estás en «{name}» 🎁 | presupuesto/fecha, `.ics`, llenar lista, ver intercambio |
| Sorteo | 🎁 ¡El sorteo ya se realizó! Descubre a quién le regalarás | **checklist personalizado "Llevas X de 5"** (✓ estás dentro, ✓ sorteo, 3 mira quién te tocó [+ estado de su lista], 4 llena tu lista [o ✓ "Tu lista ya tiene 1 idea"], 5 compra tu regalo), `.ics`, CTA "Mira quién te tocó". **No revela el nombre** en el correo |
| Pedir ideas | 🤫 Alguien de "{name}" quiere saber qué regalarte | 3 pasos para llenar la lista, link de baja "No quiero recibir más recordatorios de este intercambio" |
| Otros [código] | reenvío, recordatorio de lista actualizada (al giver), recordatorios N días antes, aviso al admin cuando alguien se une (push), anuncios del organizador ("Avisar") | |

`.ics`: evento de todo el día con alarma un día antes ("Mañana es el intercambio. ¿Ya compraste tu regalo?").

---

## 9. Autenticación y "Mis intercambios"
- Participantes y organizadores **no necesitan cuenta**: el acceso es `eid+uid` (capability URL). `src=email` marca el correo como verificado **[inferencia]**.
- Cuenta opcional (Supabase Auth): **magic link** (un uso, 1 h, PKCE mismo navegador, pantalla `/auth/confirm` para evitar que escáneres corporativos consuman el token), **Google**, **Apple**. Sin contraseña.
- `/eventos` ("Mis intercambios") y `/wishes` requieren sesión: tabs Próximos/Pasados, grupos "Como Administrador"/"Como Participante", estado por tarjeta ("Sorteo Completado", "Esperando participantes"…). Se asocian por email verificado **[inferencia]**.

---

## 10. Otros productos (resumen; detalle en el informe crudo)

- **Listas de deseos permanentes** (`/wishes`, login): listas con emoji ("Para mí", "Bebé", mascota), búsqueda Amazon / pegar link, **seguimiento de precio diario con historial y push de baja de precio**, colaboradores (owner/editor vía link de invitación rotatable), link público de sólo lectura (rotatable), "Compartidas conmigo", convertir la lista de un intercambio pasado en lista permanente.
- **Tarjetas digitales** (`/tarjetas`): ~120 diseños por familias (Navidad, viaje, trabajo, humor, Halloween, Muertos…). Editor de 4 pasos: diseño+destinatario → decorar (stickers arrastrables con rotar/escalar, titular, firma, 14 fuentes, "modo VHS", frente/reverso) → mensaje escrito **o audio ≤60 s** (MediaRecorder → Supabase Storage) → **cuándo se abre** (inmediato o fecha/hora; antes muestra sobre cerrado con countdown). Pide login al final. Estado "la abrió el…". Envío masivo B2B por CSV (≤300).
- **Stickers de Navidad**: 10 PNG + ZIP, instrucciones WhatsApp.
- **Empresas** (`/empresas`): tarjetas masivas programadas con tracking de apertura, intercambio de oficina, formulario de demo; panel `/empresa` con créditos (próximamente).
- **Patrocinios** (`/patrocinios`): 3 slots en la página del intercambio (bajo el nombre, en la tarjeta del asignado "Patrocinado por", junto a la lista) servidos por `/api/v1/campaigns/placements`.
- **En el código, sin lanzar**: mesa de regalos (Cumpleaños/Baby shower/Boda, apartar regalos sin cuenta), quiniela del bebé, video de cumpleaños colaborativo, muro de deseos a Santa, perfil con preferencias de regalo, integración ChatGPT App.

---

## 11. Landing y marketing

**Header**: logo, Blog, Guías, FAQs, Acerca de, toggle dark/light, selector de país (🌐 MX México), "Ver mis intercambios", CTA "Crear intercambio gratis".
**Banner de temporada** (motor de campañas por mercado y fecha): "🪅 Ya vienen las posadas — Organizar intercambio ✕". Catálogo con prioridad, `showFrom`, `eventDate`, `graceDays`, colores; temporadas por país (posadas, reyes, thanksgiving, sinterklaas, nikolaus, diwali…) y campañas de rebajas (Buen Fin, Black Friday, Hot Sale, Prime Day) con estados *upcoming*/*live*.
**Secciones de la home**: Hero (ilustración navideña full-bleed, badge "Feliz Navidad 2026", H1 "Organiza tu intercambio de regalos", input "Ponle nombre…" + "Empezar", "Gratis · Sin cuentas · Listo en 2 minutos", badges de apps) → Cómo funciona (3 pasos) → ¿Por qué Gift2Gift? (8 features) → Números (220k intercambios, 1.7M participantes, 920k regalos, 9 idiomas) → Listas de deseos todo el año (mockup de teléfono + push) → "Para cada ocasión" (6 guías) → Tarjetas navideñas → Stickers → FAQ (acordeón) → Footer (links SEO, apps, legales, aviso de afiliados, llms.txt).
**SEO**: contenido en Sanity, JSON-LD (Organization, WebSite, Service, SoftwareApplication, FAQPage, Article, BreadcrumbList), OG por idioma, hreflang completo, sitemap de 270 URLs, `robots.txt` que bloquea URLs con `uid`/`gid` y páginas de app, amigable con bots de IA, `llms.txt`. Landings con año en el título ("…2026") y datos propios ("México 2025: 20,292 intercambios, 123,883 invitados").

**Diseño visual**: fondo crema cálido (`#F8F5F0` aprox.), primario rojo carmesí (`~#C8102E`/gradiente a rosa), verde pino en banners, tarjetas blancas con borde sutil y radio grande, botones pill, títulos serif (Recoleta), cuerpo Geist, ilustraciones editoriales con grano. Dark mode soportado.

---

## 12. Bugs, fricciones y debilidades detectadas

1. **Acceso sin verificación**: re-unirse con un email existente devuelve su `uid` → suplantación trivial (ver §7).
2. **El nombre del asignado está en el DOM** debajo del raspadito (visible con inspeccionar / lectores).
3. Capability URLs con `uid` en query string → se filtran en historial, capturas, analytics (lo mitigan con robots y "no cites URLs con uid").
4. Modal de sorteo con **scroll horizontal roto** al añadir una exclusión (el contenido se desplaza fuera de vista).
5. Modal "Editar intercambio" más alto que el viewport en desktop (título cortado).
6. "Quiero ver quién le da a quién" activado post-sorteo no surtió efecto visible.
7. La cuenta regresiva de 48 h contradice "el link no vence" → confunde.
8. Exclusiones no se pueden definir en modo manual, ni persistirse antes de abrir el modal; no hay re-sorteo ni "quitar a alguien" post-sorteo (si alguien se baja, el intercambio se rompe).
9. Fecha sin hora; ubicación texto libre sin mapa.
10. Sin chat/preguntas anónimas bidireccionales (sólo el "pedir ideas" unidireccional).
11. Inconsistencias de copy/números (llms.txt 100k vs home 220k; Play Store dice que el organizador no ve asignaciones).

---

## 13. Recomendaciones para la réplica (paridad + extensiones)

### 13.1 Paridad mínima (MVP)
1. Wizard 5 pasos con los mismos campos/validaciones (zod compartido cliente/servidor) y prellenado desde la landing.
2. Modos *link* y *manual*; mínimo 3; emails únicos por intercambio.
3. Panel único por rol/estado con tabs Resumen/Participantes/Deseos y los modales Invitar/Sortear/Gestionar.
4. Algoritmo de sorteo de ciclo único con exclusiones + detección de imposibilidad.
5. Revelación tipo raspadito + correo; progreso de listas/compras; "Ya compré".
6. Lista de deseos por intercambio: búsqueda en tienda (Amazon PA-API / Creators API con tag de afiliado por país), pegar link con scraper (Open Graph / JSON-LD), notas.
7. Correos transaccionales (Resend/Postmark + React Email) con `.ics` adjunto y link personal.
8. i18n con rutas localizadas (next-intl), moneda por país, SEO técnico (sitemap, hreflang, JSON-LD, robots que bloquee tokens).

### 13.2 Mejoras de seguridad/arquitectura
- **Tokens de acceso separados del id**: `participant.access_token` (aleatorio, rotable) en vez de usar el UUID de la fila; idealmente en path (`/i/{token}`) o canjeado por cookie httpOnly en la primera visita.
- Al re-unirse con email existente → enviar magic link/OTP en lugar de redirigir.
- El nombre del asignado se pide al servidor **sólo** al completar el raspado (endpoint que además registra `revealed_at`).
- RLS en Supabase por exchange/participant; rate limiting en unirse/buscar.

### 13.3 Extensiones sugeridas (diferenciadores)
- **Chat anónimo bidireccional** giver↔receiver (preguntas "¿talla?" sin revelar identidad) y anuncios del organizador.
- **Sorteo programado** (fecha/hora) y **cierre automático de inscripciones**.
- **Re-sorteo controlado** / reemplazo de participante post-sorteo (re-cablear el ciclo sólo en el tramo afectado).
- Exclusiones persistentes (y en modo manual), **exclusiones históricas** ("no repetir con quien te tocó el año pasado") y plantillas/reutilizar grupo de un año a otro.
- Co-organizadores, organizador que no participa, participantes asistidos mejorados.
- Fecha **con hora**, ubicación con mapa / link de videollamada (intercambios remotos con envío a domicilio y dirección privada sólo visible al giver).
- Múltiples rondas / temas (p. ej. "algo rojo"), dinámicas (roba-regalos, ruleta), modo "regalo grupal" (vaquita).
- Wishlist con prioridad, rango de precio, "ya lo compraron" (reservas anónimas para evitar duplicados), seguimiento de precio.
- PWA + Web Push en lugar de (o antes de) apps nativas.
- Panel del organizador con métricas (quién vio, quién compró, rebotes) y recordatorios automáticos configurables.

---

## 14. Datos del intercambio de prueba creado

- Nombre: **Prueba Analisis Navidad** (Amigos · Libros · 24-dic-2026 · MXN $500), modo link, **ya sorteado**.
- `eid` y `uid`: omitidos a propósito (son llaves de acceso al intercambio real).
- Organizador: cuenta personal del autor (correo y `uid` omitidos).
- Participantes: Uno, Dos y Tres (alias de correo del organizador); exclusión Uno↔Dos.
- Acciones hechas: 1 deseo (libro), "Pedirle ideas en secreto" a Dos, "Ya compré mi regalo" (organizador), toggle "ver quién le da a quién".
- Se puede **cancelar** desde Gestionar → "Cancelar intercambio" si se quiere limpiar.

## 15. Material crudo
En el scratchpad de la sesión (temporal) quedaron: HTML/RSC de todas las páginas públicas, `messages.es-MX.json` / `messages.en-US.json` (diccionario completo de textos, incluye features no lanzadas), `pathnames.json` (rutas localizadas de los 22 locales), 77 chunks JS y CSS combinado.
