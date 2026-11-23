#!/usr/bin/env node
// Genera o edita una ilustración con la API de imágenes de OpenAI.
//
// Uso:
//   node generar.mjs --prompt-file p.txt --out public/illustrations/x/01-a.png
//                    [--ref ref.png ...] [--edit base.png] [--transparent]
//                    [--size 1536x1024] [--quality high] [--model gpt-image-2] [--dry-run]
//
// Con --transparent se pide fondo blanco y se recorta localmente (gpt-image-2 no entrega
// transparencia); el original con fondo blanco se guarda como <nombre>.blanco.png.
//
// La llave se lee de OPENAI_API_KEY o de .env.local / .env en el directorio actual.
// Nunca se imprime.

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { quitarFondo } from "./quitar-fondo.mjs";

const API = "https://api.openai.com/v1/images";
const SIZES = new Set(["1024x1024", "1536x1024", "1024x1536", "auto"]);
const QUALITIES = new Set(["low", "medium", "high", "auto"]);

function parseArgs(argv) {
  const args = { ref: [], size: "1536x1024", quality: "high", model: "gpt-image-2" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(`Falta el valor de ${a}`);
      return v;
    };
    switch (a) {
      case "--prompt": args.prompt = next(); break;
      case "--prompt-file": args.promptFile = next(); break;
      case "--out": args.out = next(); break;
      case "--ref": args.ref.push(next()); break;
      case "--edit": args.edit = next(); break;
      case "--size": args.size = next(); break;
      case "--quality": args.quality = next(); break;
      case "--model": args.model = next(); break;
      case "--transparent": args.transparent = true; break;
      case "--dry-run": args.dryRun = true; break;
      case "-h":
      case "--help": usage(0); break;
      default: fail(`Argumento desconocido: ${a}`);
    }
  }
  return args;
}

function usage(code) {
  console.log(
    "Uso: node generar.mjs (--prompt <texto> | --prompt-file <archivo>) --out <archivo.png>\n" +
      "       [--ref <imagen>]... [--edit <imagen>] [--transparent]\n" +
      "       [--size 1024x1024|1536x1024|1024x1536] [--quality low|medium|high] [--model gpt-image-2] [--dry-run]"
  );
  process.exit(code);
}

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  for (const name of [".env.local", ".env"]) {
    const file = path.resolve(process.cwd(), name);
    if (!(await exists(file))) continue;
    const text = await readFile(file, "utf8");
    const m = text.match(/^\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*["']?([^"'\r\n#]+)["']?/m);
    if (m) return m[1].trim();
  }
  return null;
}

// No sobrescribe: si existe, agrega -v2, -v3…
async function freePath(out) {
  if (!(await exists(out))) return out;
  const { dir, name, ext } = path.parse(out);
  for (let v = 2; ; v++) {
    const candidate = path.join(dir, `${name}-v${v}${ext}`);
    if (!(await exists(candidate))) return candidate;
  }
}

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  fail(`Formato no soportado para imagen de entrada: ${file} (usa png, webp o jpg)`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.out) usage(1);
  if (!args.prompt && !args.promptFile) usage(1);
  if (!SIZES.has(args.size)) fail(`--size inválido: ${args.size}`);
  if (!QUALITIES.has(args.quality)) fail(`--quality inválido: ${args.quality}`);

  let prompt = args.prompt ?? (await readFile(args.promptFile, "utf8")).trim();
  if (!prompt) fail("El prompt está vacío");
  const nativeAlpha = /^gpt-image-1(\.5)?$/.test(args.model);
  if (args.transparent && !nativeAlpha) {
    prompt += "\n\nBackground: pure flat white #FFFFFF, completely empty around the motif (no ground, no shadow, no frame) so it can be cut out.";
  }
  const background = args.transparent && nativeAlpha ? "transparent" : "opaque";

  const inputs = [...(args.edit ? [args.edit] : []), ...args.ref];
  for (const f of inputs) if (!(await exists(f))) fail(`No existe la imagen: ${f}`);

  const mode = inputs.length ? "edits" : "generations";
  const out = await freePath(path.resolve(args.out));

  if (args.dryRun) {
    console.log(JSON.stringify({ mode, model: args.model, size: args.size, quality: args.quality, transparent: !!args.transparent, inputs, out }, null, 2));
    return;
  }

  const key = await loadKey();
  if (!key) fail("No encontré OPENAI_API_KEY (variable de entorno, .env.local o .env).");

  let res;
  if (mode === "generations") {
    res = await fetch(`${API}/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: args.model,
        prompt,
        size: args.size,
        quality: args.quality,
        background,
        output_format: "png",
        n: 1,
      }),
    });
  } else {
    const form = new FormData();
    form.append("model", args.model);
    form.append("prompt", prompt);
    form.append("size", args.size);
    form.append("quality", args.quality);
    form.append("background", background);
    form.append("output_format", "png");
    if (/^gpt-image-1/.test(args.model)) form.append("input_fidelity", "high");
    form.append("n", "1");
    for (const f of inputs) {
      const buf = await readFile(f);
      form.append("image[]", new Blob([buf], { type: mimeFor(f) }), path.basename(f));
    }
    res = await fetch(`${API}/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    fail(`La API respondió con error: ${msg}`);
  }
  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) fail("La respuesta no trae imagen.");

  await mkdir(path.dirname(out), { recursive: true });
  const png = Buffer.from(b64, "base64");
  if (args.transparent && !nativeAlpha) {
    const blanco = out.replace(/\.png$/i, ".blanco.png");
    await writeFile(blanco, png);
    await quitarFondo(blanco, out);
  } else {
    await writeFile(out, png);
  }
  await writeFile(out.replace(/\.png$/i, ".prompt.txt"), `# mode: ${mode} · model: ${args.model} · size: ${args.size} · quality: ${args.quality} · transparent: ${!!args.transparent}\n# inputs: ${inputs.join(", ") || "-"}\n\n${prompt}\n`);

  const usage = body.usage ? ` · tokens: ${body.usage.total_tokens}` : "";
  console.log(`OK ${path.relative(process.cwd(), out)}${usage}`);
}

main().catch((err) => fail(err?.message ?? String(err)));
