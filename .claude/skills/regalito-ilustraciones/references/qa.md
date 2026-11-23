# Revisión (QA)

## Debe cumplir

- Regalito aparece, es idéntico a la hoja de referencia (cuerpo tinta, moño verde, dos ojos blancos, **sin boca**) y hace la acción central.
- Trazo a mano, rellenos planos de la paleta, sin degradados ni sombras.
- Fondo correcto (transparente para web, blanco para blog) sin manchas ni bordes sucios.
- Una sola idea, entendible en un segundo; se siente un poco rara e ingeniosa.
- Motivo ≤ 60 % del lienzo, con aire suficiente.
- Texto: ninguno, o 1–3 palabras en español bien escritas.

## Señales de falla → regenerar o editar

| Problema | Arreglo |
|---|---|
| Regalito tiene boca o sonríe | Regenerar reforzando «NO mouth» y pasando `--ref` |
| Regalito decora en una esquina | Prompt «hacer protagonista» |
| Se ve tierno / infantil / juguete | Reforzar «deadpan, not cute, not a plush toy» |
| Parece infografía o diapositiva | Quitar flechas, marcos, rejillas y títulos |
| Demasiados objetos | Prompt «simplificar» |
| Colores fuera de paleta, degradados o sombras | Repetir la paleta con hex y «flat fills only» |
| Fondo no transparente / con recuadro | Repetir con `--transparent` y «nothing behind the motif» |
| Texto con errores | `--edit` para borrarlo o regenerar sin texto |

## Criterio final

Primero debe parecer «un poco raro», y en el siguiente segundo, obvio. Si se ve como un tutorial, no pasa.
