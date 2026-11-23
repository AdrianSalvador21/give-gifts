# Plantillas de prompt

Escribe los prompts en inglés (el modelo sigue mejor las instrucciones) y deja en español sólo las palabras que deben aparecer escritas en la imagen.

## Ilustración

```text
Create one standalone illustration for the givegifts website (a gift-exchange / Secret Santa app).

Visual DNA:
Hand-drawn ink line art in #2C2E2A with slightly wobbly, imperfect pen lines (not vector, not mechanical, no thick uniform outlines). Objects are filled with FLAT colors from this palette only: grass green #8ED462, coral #FF705D, sky blue #2BA0FF, sun yellow #F5DF16, lilac #E8C3F7, sand #E0DBCE, white #FFFFFF. Fills may slip slightly outside the lines like a marker. No gradients, no shadows, no textures, no glow, no 3D. Lots of empty space: the motif covers about 40-60% of the canvas. {BACKGROUND}

Recurring mascot (must match the reference image exactly):
"Regalito" — a small, almost cubic gift box filled with solid ink #2C2E2A, slightly irregular hand-drawn outline, a small grass-green #8ED462 bow on top, two round white dot eyes, NO mouth, no eyebrows, no cheeks, very thin single-stroke arms and legs. Serious, focused, deadpan, slightly absurd; never cute, never posing, never waving at the viewer. Regalito performs the core action of the scene.

Scene idea:
{IDEA CENTRAL — una frase}

Composition:
{QUÉ SE VE: dónde está Regalito, qué hace, con qué objeto, cómo fluye la acción}

Elements (keep it to these):
{objeto 1} / {objeto 2} / {opcional 3}

Text in image:
{"No text at all." | "Only these handwritten Spanish words: «...», «...»."}

Constraints:
One single idea. No title, no headings, no labels like "step 1". Not an infographic, not a slide, not a UI mockup, not a children's book illustration, not a polished corporate flat illustration, no realistic humans. Fresh composition, do not reuse conveyor belts, fish or card bridges. Clean, witty, a little strange.
```

`{BACKGROUND}`:
- Web (por defecto, con `--transparent`): no escribas nada; el script agrega «fondo blanco vacío» y luego lo recorta.
- Blog/guías: `Pure white background.`

## Hoja de personaje (paso 0)

```text
Character reference sheet for a mascot called "Regalito", on a pure flat white #FFFFFF background (no shadows, no ground, nothing else).
Show the SAME character three times side by side with generous space between them: (1) standing front view, (2) three-quarter view carrying a small coral #FF705D envelope with both thin arms, (3) side view walking.
Regalito: a small, almost cubic gift box filled with solid ink #2C2E2A with a slightly irregular hand-drawn outline; a thin lighter line suggests the lid; a small grass-green #8ED462 bow on top drawn with ink outline (two loops and a knot); two round PURE WHITE dot eyes clearly visible against the black body; NO mouth, no eyebrows, no cheeks; very thin single-stroke ink arms and legs with tiny round feet.
Style: hand-drawn wobbly ink lines, flat color fills only, no gradients, no shadows, no texture, no text, no labels. Deadpan and serious, not cute, not a plush toy, not 3D.
```

## Edición (con `--edit imagen.png`)

Quitar texto:
```text
Edit the provided image. Remove only the handwritten text "{texto}". Fill that area so it matches the surrounding background. Keep everything else exactly the same: mascot, objects, line style, colors, composition.
```

Hacer a Regalito protagonista:
```text
Keep the same idea, palette and simple layout, but make Regalito perform the main action instead of standing beside it. Regalito stays deadpan, mouthless and not cute.
```

Simplificar:
```text
Keep the same idea and style but remove secondary objects: keep only Regalito and {objeto principal}. More empty space.
```
