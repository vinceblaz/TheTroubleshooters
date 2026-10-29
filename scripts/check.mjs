/**
 * Contrôles statiques du dépôt (sans Foundry) — `npm run check`.
 *  1. Syntaxe de tous les .mjs (node --check)
 *  2. JSON valides (system.json, lang, catalogues) et catalogues cohérents (seedKey unique, type déclaré)
 *  3. Clés i18n utilisées (gabarits, code, CONFIG) présentes dans lang/fr.json
 *  4. Gabarits référencés par le code présents sur le disque
 *  5. Aucun attribut name dupliqué dans un même document HTML (règle Metro 2033 §259)
 *  6. Blocs Handlebars équilibrés ({{#x}} … {{/x}}, {{else}} dans un bloc) et helpers connus
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

/* 2 bis. Cohérence des catalogues avec le domaine */
const { SKILL_KEYS } = await import(join(ROOT, "src/domain/rules/skills.mjs"));
const { ACTIVATION_TYPE_KEYS } = await import(join(ROOT, "src/domain/rules/activations.mjs"));
const { THETROUBLESHOOTERS: CFG } = await import(join(ROOT, "src/config.mjs"));
const badSkills = (list, where) => (list ?? []).filter(k => !SKILL_KEYS.includes(k)).forEach(k => fail(`${where} : compétence inconnue « ${k} »`));
for (const e of readJSON("data/catalogs/abilities.json")) {
  const sys = e.data.system, w = `abilities.json ${e.seedKey}`;
  badSkills(sys.learnWith, w);
  badSkills(sys.prerequisites.skills.map(p => p.key), w);
  for (const a of sys.activations) {
    if (!ACTIVATION_TYPE_KEYS.includes(a.type)) fail(`${w} : type d'activation inconnu « ${a.type} »`);
    badSkills(a.skills, w);
    if (a.skill) badSkills([a.skill], w);
  }
}
for (const e of readJSON("data/catalogs/flaws.json")) {
  const w = `flaws.json ${e.seedKey}`;
  for (const t of e.data.system.triggers) {
    if (!Object.keys(CFG.flawTriggerModes).includes(t.mode)) fail(`${w} : mode inconnu « ${t.mode} »`);
    badSkills(t.skills, w);
    if (t.condition && !CFG.conditions[t.condition]) fail(`${w} : condition inconnue « ${t.condition} »`);
  }
}
ok("catalogues cohérents avec le domaine (compétences, activations, modes, conditions)");

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
for (const t of ACTIVATION_TYPE_KEYS) used.add(`TTS.ActivationType.${t}`);
for (const t of Object.keys(system.documentTypes.Actor)) used.add(`TYPES.Actor.${t}`);
// Familles de clés construites dynamiquement (combat, phase 4)
{
  const { ATTACK_OPTIONS, VLAN_EFFECTS } = await import(join(ROOT, "src/domain/combat/attack.mjs"));
  const { parseWeaponDescriptors } = await import(join(ROOT, "src/domain/combat/weapon.mjs"));
  const fam = (prefix, keys) => keys.forEach(k => used.add(`${prefix}.${k}`));
  fam("TTS.Attack.Options", ATTACK_OPTIONS);
  fam("TTS.Attack.OptionHint", ATTACK_OPTIONS);
  fam("TTS.Attack.Vlan", VLAN_EFFECTS);
  const attackSrc = readFileSync(join(ROOT, "src/domain/combat/attack.mjs"), "utf8");
  fam("TTS.Attack.Unavailable", [...new Set([...attackSrc.matchAll(/ok: false, reason: "([A-Za-z]+)"/g)].map(m => m[1]))]);
  fam("TTS.Attack.Part", [...new Set([...attackSrc.matchAll(/\{ key: "([A-Za-z]+)", dice:/g)].map(m => m[1])), "ability", "manual"]);
  fam("TTS.Attack.Absorb", [...new Set([...attackSrc.matchAll(/\{ key: "([A-Za-z]+)", status:/g)].map(m => m[1]))]);
  fam("TTS.Weapon.EmptyReason", [...new Set([...attackSrc.matchAll(/empty: true, jammed: [^,]+, reason: "([A-Za-z]+)"/g)].map(m => m[1]))]);
  const stateSrc = readFileSync(join(ROOT, "src/domain/combat/attack-state.mjs"), "utf8");
  fam("TTS.Attack.Refused", [...new Set([...stateSrc.matchAll(/fail\("([a-z-]+)"\)/g)].map(m => m[1]))]);
  fam("TTS.Weapon.Flag", Object.entries(parseWeaponDescriptors("")).filter(([, v]) => typeof v === "boolean").map(([k]) => k));
  fam("TTS.Combat.Action", ["move", "free", "main", "bonus"]);
  fam("TTS.Combat.ActionShort", ["move", "free", "main", "bonus"]);
  fam("TTS.Attack.InvertMode", ["generic", "mortal", "npc"]);
  fam("TTS.Ability.Marked", ["initiative", "bonusAction"]);
}
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

/* 6. Structure Handlebars */
const KNOWN_BLOCKS = new Set(["if", "unless", "each", "with"]);
const KNOWN_HELPERS = new Set(["localize", "eq", "ne", "gt", "lt", "gte", "lte", "and", "or", "not", "concat",
  "checked", "selectOptions", "formInput", "formGroup", "lookup", "numberFormat"]);
for (const f of templates) {
  const src = readFileSync(f, "utf8").replace(/{{!--[\s\S]*?--}}/g, "");
  const stack = [];
  for (const m of src.matchAll(/{{([#/^]?)(>?)\s*([^\s}]+)([^}]*)}}/g)) {
    const [, sigil, partial, word] = m;
    if (partial) continue;
    if (sigil === "#") {
      if (!KNOWN_BLOCKS.has(word)) fail(`${rel(f)} : bloc inconnu {{#${word}}}`);
      stack.push(word);
    } else if (sigil === "/") {
      const open = stack.pop();
      if (open !== word) fail(`${rel(f)} : {{/${word}}} ferme {{#${open ?? "rien"}}}`);
    } else if (word === "else" && !stack.length) fail(`${rel(f)} : {{else}} hors bloc`);
  }
  if (stack.length) fail(`${rel(f)} : bloc(s) non fermé(s) : ${stack.join(", ")}`);
  for (const m of src.matchAll(/\(\s*([a-zA-Z]+)\s/g)) {
    if (!KNOWN_HELPERS.has(m[1])) fail(`${rel(f)} : helper inconnu dans une sous-expression : ${m[1]}`);
  }
}
ok(`${templates.length} gabarits : blocs Handlebars équilibrés`);

if (errors.length) {
  console.error(`\n✘ ${errors.length} problème(s) :\n - ${errors.join("\n - ")}`);
  process.exit(1);
}
console.log("\nTous les contrôles sont verts.");
