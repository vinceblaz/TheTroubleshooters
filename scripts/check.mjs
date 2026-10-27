/**
 * Contrôles statiques du dépôt (sans Foundry) — `npm run check`.
 *  1. Syntaxe de tous les .mjs (node --check)
 *  2. JSON valides (system.json, lang, catalogues) et catalogues cohérents (seedKey unique, type déclaré)
 *  3. Clés i18n utilisées (gabarits, code, CONFIG) présentes dans lang/fr.json
 *  4. Gabarits référencés par le code présents sur le disque
 *  5. Aucun attribut name dupliqué dans un même document HTML (règle Metro 2033 §259)
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const errors = [];
const ok = msg => console.log(`  ✔ ${msg}`);
const fail = msg => errors.push(msg);

function walk(dir, ext, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}
const rel = p => relative(ROOT, p);
const readJSON = p => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

/* 1. Syntaxe */
const mjs = [...walk(join(ROOT, "src"), ".mjs"), ...walk(join(ROOT, "tests"), ".mjs"), ...walk(join(ROOT, "scripts"), ".mjs")];
for (const f of mjs) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) fail(`syntaxe : ${rel(f)}\n${r.stderr}`);
}
ok(`${mjs.length} fichiers .mjs contrôlés (syntaxe)`);

/* 2. JSON */
const system = readJSON("system.json");
const fr = readJSON("lang/fr.json");
const itemTypes = Object.keys(system.documentTypes.Item);
for (const f of walk(join(ROOT, "data/catalogs"), ".json")) {
  let entries;
  try { entries = JSON.parse(readFileSync(f, "utf8")); } catch (e) { fail(`JSON invalide : ${rel(f)} — ${e.message}`); continue; }
  const keys = new Set();
  for (const e of entries) {
    if (!e.seedKey) fail(`${rel(f)} : entrée sans seedKey (${e.data?.name})`);
    if (keys.has(e.seedKey)) fail(`${rel(f)} : seedKey dupliqué ${e.seedKey}`);
    keys.add(e.seedKey);
    if (!itemTypes.includes(e.data?.type)) fail(`${rel(f)} : type inconnu « ${e.data?.type} » (${e.seedKey})`);
  }
  ok(`${rel(f)} : ${entries.length} entrées`);
}
for (const p of [...system.esmodules, ...system.styles, ...system.languages.map(l => l.path)]) {
  if (!existsSync(join(ROOT, p))) fail(`system.json référence un fichier absent : ${p}`);
}
ok("system.json : fichiers référencés présents");

/* 3. i18n */
const hasKey = key => key.split(".").reduce((n, k) => (n && typeof n === "object" ? n[k] : undefined), fr) !== undefined;
const used = new Set();
const templates = walk(join(ROOT, "templates"), ".hbs");
const KEY_RE = /["'`]((?:TTS|TYPES)\.[A-Za-z0-9_.]+)["'`]/g;
for (const f of [...templates, ...walk(join(ROOT, "src"), ".mjs")]) {
  for (const m of readFileSync(f, "utf8").matchAll(KEY_RE)) {
    if (!m[1].endsWith(".")) used.add(m[1]);
  }
}
// Libellés générés par CONFIG (skills, familles, rangs, conditions…)
const { THETROUBLESHOOTERS } = await import(join(ROOT, "src/config.mjs"));
const collect = node => {
  if (typeof node === "string") { if (node.startsWith("TTS.")) used.add(node); return; }
  if (node && typeof node === "object") Object.values(node).forEach(collect);
};
collect(THETROUBLESHOOTERS);
for (const t of itemTypes) used.add(`TYPES.Item.${t}`);
for (const t of Object.keys(system.documentTypes.Actor)) used.add(`TYPES.Actor.${t}`);
const missing = [...used].filter(k => !hasKey(k)).sort();
missing.forEach(k => fail(`clé i18n absente de fr.json : ${k}`));
ok(`${used.size} clés i18n vérifiées`);

/* 4. Gabarits référencés */
const TPL_RE = /templates\/[A-Za-z0-9_\-/]+\.hbs/g;
const tplRefs = new Set();
for (const f of [...walk(join(ROOT, "src"), ".mjs"), ...templates]) {
  for (const m of readFileSync(f, "utf8").matchAll(TPL_RE)) tplRefs.add(m[0]);
}
for (const t of ["archetype", "ability", "flaw", "hook", "kit", "language"]) tplRefs.add(`templates/item/parts/${t}.hbs`);
for (const t of tplRefs) if (!existsSync(join(ROOT, t))) fail(`gabarit absent : ${t}`);
ok(`${tplRefs.size} gabarits référencés présents`);

/* 5. Attributs name dupliqués par document */
const NAME_RE = /\bname="([^"{}]+)"/g;
const documents = {
  "fiche Risque-tout": templates.filter(f => /actor[\\/]character-/.test(f)),
  "fiche PNJ": templates.filter(f => /actor[\\/]npc-/.test(f)),
  ...Object.fromEntries(["archetype", "ability", "flaw", "hook", "kit", "language"].map(t => [
    `fiche ${t}`, templates.filter(f => /item[\\/]item-/.test(f) || f.endsWith(`parts${"/"}${t}.hbs`) || f.endsWith(`parts\\${t}.hbs`))
  ]))
};
for (const [label, files] of Object.entries(documents)) {
  const seen = new Map();
  for (const f of files) {
    for (const m of readFileSync(f, "utf8").matchAll(NAME_RE)) {
      if (seen.has(m[1])) fail(`${label} : name="${m[1]}" dupliqué (${rel(seen.get(m[1]))} et ${rel(f)})`);
      else seen.set(m[1], f);
    }
  }
}
ok("attributs name uniques par document");

if (errors.length) {
  console.error(`\n✘ ${errors.length} problème(s) :\n - ${errors.join("\n - ")}`);
  process.exit(1);
}
console.log("\nTous les contrôles sont verts.");
