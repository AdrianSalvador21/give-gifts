---
name: regalito-ilustraciones
description: Genera ilustraciones de marca para givegifts (landing, estados vacíos, onboarding, correos, blog/guías) con la mascota «Regalito»: una cajita de regalo sólida con ojitos y sin boca, trazo a mano y rellenos planos de la paleta. Úsala cuando pidan ilustraciones, assets, imágenes, dibujos, «una ilustración para…», shot list de ilustraciones o regenerar/editar una ilustración existente. Genera con la API de imágenes de OpenAI (gpt-image-2) mediante scripts/generar.mjs.
---

# Regalito — ilustraciones de givegifts

Adaptación de la skill **Ian Xiaohei Illustrations** (MIT, ver `NOTICE.md`) a la marca givegifts: mismo espíritu (trazo a mano, mucho aire, una sola idea por imagen, la mascota hace la acción principal), pero con mascota propia, color plano de la paleta y fondo transparente para que los assets se monten sobre la landing.

La meta no es una ilustración comercial ni una infografía: es una escena **clara, un poco absurda y limpia** que explique una idea del producto (sortear, invitar, apartar un deseo, guardar un secreto…) en un segundo.

## Lee antes de generar (según haga falta, no todo de golpe)

- `references/estilo.md` — ADN visual, paleta exacta, qué sí y qué no.
- `references/regalito.md` — la mascota: forma, personalidad, acciones, prohibiciones.
- `references/composicion.md` — tipos de escena y cómo inventar metáforas nuevas.
- `references/prompt-plantilla.md` — plantilla del prompt y de edición.
- `references/qa.md` — revisión después de cada imagen.

## Requisitos

- `OPENAI_API_KEY` en el entorno o en `.env.local` del proyecto. **Nunca** imprimas, registres ni copies la llave a otro archivo.
- Node 18+ (el script usa `fetch`/`FormData` nativos).
- Modelo por defecto `gpt-image-2` (mejor trazo y mejor apego al estilo). No entrega transparencia: con `--transparent` el script pide fondo blanco y lo recorta localmente con `scripts/quitar-fondo.mjs` (usa `sharp`, ya en devDependencies), guardando también `<nombre>.blanco.png`. `gpt-image-1` ya no existe; `gpt-image-1.5` sí da transparencia nativa pero sale con halos y peor estilo.
- Costo: revisa el precio vigente del modelo; calcula del orden de centavos de dólar por imagen en calidad `high`. Avisa al usuario antes de lotes de más de 6 imágenes.

## Flujo

### 0. Hoja de referencia de la mascota (una sola vez)

Si no existe `mascota/regalito-ref.png` (recortada) y `mascota/regalito-ref.blanco.png` (fondo blanco, la que se pasa con `--ref`), genérala primero con el prompt de «Hoja de personaje» de `references/prompt-plantilla.md`, muéstrasela al usuario (léela con Read) y **espera su aprobación** antes de generar más. Todas las imágenes posteriores se generan pasando esa hoja con `--ref` para que Regalito sea siempre el mismo.

### 1. Entender el encargo

Identifica dónde vivirá la imagen (sección de la landing, estado vacío de la app, correo, guía), qué idea debe explicar y en qué tamaño se mostrará.

### 2. Shot list (si son varias o el usuario pide planear)

Por imagen: ubicación · idea central · tipo de escena · qué hace Regalito · 2–4 objetos · texto en imagen (normalmente ninguno). Por defecto 1–6 imágenes. Si el usuario sólo pidió planear, entrega la lista y detente.

### 3. Generar cada imagen por separado

1. Escribe el prompt con la plantilla en un archivo temporal del scratchpad.
2. Ejecuta:
   ```bash
   node .claude/skills/regalito-ilustraciones/scripts/generar.mjs \
     --prompt-file <ruta-prompt.txt> \
     --out design/illustrations/<conjunto>/<NN-nombre>.png \
     --ref .claude/skills/regalito-ilustraciones/mascota/regalito-ref.blanco.png \
     --transparent --size 1536x1024 --quality high
   ```
   - `--transparent` por defecto para assets web (se montan sobre crema `#F5F1E4` o verde `#8ED462`). Usa fondo blanco sólo para guías/blog.
   - `--size`: `1536x1024` (horizontal), `1024x1024` (cuadrado, estados vacíos/íconos grandes), `1024x1536` (vertical, móvil).
   - El script nunca sobrescribe: si el archivo existe crea `-v2`, `-v3`… y guarda el prompt junto a la imagen (`.prompt.txt`).
3. Abre la imagen con Read y revísala contra `references/qa.md`.
4. Si falla: ajusta el prompt (o usa `--edit <imagen>` con el prompt de edición) y repite. Máximo 3 intentos por imagen; si sigue fallando, entrégala marcada como «a revisar».

### 4. Entrega

- Fuentes (PNG grandes, `.blanco.png` y `.prompt.txt`) en `design/illustrations/<conjunto>/` (`01-…png`, `02-…png`). Esa carpeta **no** se publica: nunca guardes fuentes ni prompts en `public/`.
- Para usarla en la web, exporta una versión WebP recortada y ligera a `public/illustrations/web/<NN-nombre>.webp` (con un script de `sharp`, ya en devDependencies: `sharp(src).trim().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 })`). Las páginas sólo deben referenciar `public/illustrations/web/*.webp`.
- Para cada imagen: para qué sirve, ruta, si quedó firme u opcional.
- No borres versiones anteriores salvo que el usuario lo pida.

## Reglas de texto dentro de la imagen

El producto se publica en 9 idiomas, así que **por defecto las ilustraciones no llevan texto**. Sólo agrega 1–3 palabras en español escritas a mano cuando la idea no se entienda sin ellas (y avisa que esa imagen no es traducible). Nunca títulos, nunca párrafos.
