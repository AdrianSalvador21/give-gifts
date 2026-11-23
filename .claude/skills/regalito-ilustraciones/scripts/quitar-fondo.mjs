#!/usr/bin/env node
// Quita el fondo blanco de una ilustración y la deja transparente.
//
// Rellena desde los bordes sólo los píxeles casi blancos conectados con el exterior,
// así se conservan los blancos internos (ojos, papeles, nubes con contorno).
// Los píxeles del borde del dibujo se "des-multiplican" contra el blanco para
// que el antialias no deje halo.
//
// Con --huecos N también vuelve transparentes los huecos blancos encerrados (entre piernas,
// dentro de un moño) de al menos N píxeles. Los blancos chicos o delgados sobre oscuro (ojos, brillos de la tapa) se quedan.
// Ojo: también vaciaría rellenos blancos grandes a propósito (sobres, nubes), así que es opcional.
//
// Uso: node quitar-fondo.mjs entrada.png salida.png [--tolerancia 18] [--huecos 40]

import sharp from "sharp";

export async function quitarFondo(entrada, salida, { tolerancia = 18, huecos = 0 } = {}) {
  const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const umbral = 255 - tolerancia;
  const esFondo = (i) => {
    const o = i * 4;
    return data[o] >= umbral && data[o + 1] >= umbral && data[o + 2] >= umbral;
  };

  // 0 = sin visitar, 1 = fondo, 2 = dibujo
  const marca = new Uint8Array(n);
  const pila = new Int32Array(n);
  let tope = 0;
  const empujar = (i) => {
    if (marca[i] === 0 && esFondo(i)) {
      marca[i] = 1;
      pila[tope++] = i;
    }
  };
  for (let x = 0; x < w; x++) { empujar(x); empujar((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { empujar(y * w); empujar(y * w + w - 1); }
  while (tope > 0) {
    const i = pila[--tope];
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) empujar(i - 1);
    if (x < w - 1) empujar(i + 1);
    if (y > 0) empujar(i - w);
    if (y < h - 1) empujar(i + w);
  }

  // Huecos encerrados: componentes casi blancas que el relleno desde los bordes no alcanzó.
  if (huecos > 0) {
    const comp = new Int32Array(n);
    for (let semilla = 0; semilla < n; semilla++) {
      if (marca[semilla] !== 0 || !esFondo(semilla)) continue;
      let largo = 0, minX = w, maxX = 0, minY = h, maxY = 0;
      marca[semilla] = 2;
      pila[tope++] = semilla;
      while (tope > 0) {
        const i = pila[--tope];
        comp[largo++] = i;
        const x = i % w, y = (i / w) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
          if (j >= 0 && marca[j] === 0 && esFondo(j)) { marca[j] = 2; pila[tope++] = j; }
        }
      }
      // Cómo es lo que rodea al hueco (a 4 px, para saltar el antialias y el trazo):
      // relleno negro de la caja = blanco dibujado (ojos, brillos); color o trazo suelto = hueco de fondo.
      let oscuros = 0, cuenta = 0;
      for (let k = 0; k < largo; k++) {
        const i = comp[k], x = i % w, y = (i / w) | 0;
        for (const j of [x > 3 ? i - 4 : -1, x < w - 4 ? i + 4 : -1, y > 3 ? i - 4 * w : -1, y < h - 4 ? i + 4 * w : -1]) {
          if (j < 0 || esFondo(j) || marca[j] === 2) continue;
          const o = j * 4;
          const lum = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
          const sat = Math.max(data[o], data[o + 1], data[o + 2]) - Math.min(data[o], data[o + 1], data[o + 2]);
          if (lum < 90 && sat < 45) oscuros++;
          cuenta++;
        }
      }
      const sobreOscuro = cuenta > 0 && oscuros / cuenta > 0.75;
      // Ojos (chicos) y brillos (delgados) sobre la caja se quedan; un hueco grande entre piernas no.
      const dibujado = sobreOscuro && (largo < 400 || Math.min(maxX - minX, maxY - minY) < 6);
      if (largo >= huecos && !dibujado) for (let k = 0; k < largo; k++) marca[comp[k]] = 1;
    }
  }

  // Banda de 2 px alrededor del fondo: des-multiplicar contra blanco.
  // `frente` = píxeles ya marcados (fondo o banda); cada pasada crece 1 px usando una copia.
  const banda = new Uint8Array(n);
  let frente = new Uint8Array(n);
  for (let i = 0; i < n; i++) frente[i] = marca[i] === 1 ? 1 : 0;
  for (let pasada = 0; pasada < 2; pasada++) {
    const siguiente = frente.slice();
    for (let i = 0; i < n; i++) {
      if (frente[i]) continue;
      const x = i % w;
      const y = (i / w) | 0;
      if ((x > 0 && frente[i - 1]) || (x < w - 1 && frente[i + 1]) || (y > 0 && frente[i - w]) || (y < h - 1 && frente[i + w])) {
        banda[i] = 1;
        siguiente[i] = 1;
      }
    }
    frente = siguiente;
  }

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (marca[i] === 1) {
      data[o + 3] = 0;
      continue;
    }
    if (banda[i]) {
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const a = Math.max(0, Math.min(1, (255 - Math.min(r, g, b)) / 255 + 0.15));
      if (a <= 0.02) { data[o + 3] = 0; continue; }
      data[o] = Math.round(Math.max(0, Math.min(255, (r - 255 * (1 - a)) / a)));
      data[o + 1] = Math.round(Math.max(0, Math.min(255, (g - 255 * (1 - a)) / a)));
      data[o + 2] = Math.round(Math.max(0, Math.min(255, (b - 255 * (1 - a)) / a)));
      data[o + 3] = Math.round(a * 255);
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(salida);
}

const esCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (esCli) {
  const [entrada, salida, ...resto] = process.argv.slice(2);
  if (!entrada || !salida) {
    console.log("Uso: node quitar-fondo.mjs entrada.png salida.png [--tolerancia 18] [--huecos 40]");
    process.exit(1);
  }
  const k = resto.indexOf("--tolerancia");
  const tolerancia = k >= 0 ? Number(resto[k + 1]) : 18;
  const hq = resto.indexOf("--huecos");
  const huecos = hq >= 0 ? Number(resto[hq + 1]) : 0;
  quitarFondo(entrada, salida, { tolerancia, huecos })
    .then(() => console.log(`OK ${salida}`))
    .catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
