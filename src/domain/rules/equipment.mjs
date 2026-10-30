/**
 * Équipement, kits et gadgets — logique pure (LdB p. 108-116, bible chap. 13).
 */
import { inRange, parseRange } from "../combat/weapon.mjs";

export const KIT_ORIGINS = Object.freeze(["owned", "mission", "purchased", "juryRigged", "found"]);
export const KIT_CATEGORIES = Object.freeze(["standard", "spyTech", "superScience", "ancientLore", "lostLore"]);
/** Kits rendus à la fin de l'histoire (LdB p. 110) : achetés avec des PR et fournis pour la mission. */
export const RETURNED_ORIGINS = Object.freeze(["purchased", "mission"]);
export const EXTRA_SIGNATURE_ABILITY = "Gadget supplémentaire";

const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Nombre de gadgets signature permis : 1, 2 avec Gadget supplémentaire (LdB p. 113). */
export function signatureLimit(abilityNames = []) {
  return 1 + (abilityNames.some(n => norm(n) === norm(EXTRA_SIGNATURE_ABILITY)) ? 1 : 0);
}

/**
 * État des gadgets signature : nombre, maximum, dépassement, signatures sans description.
 * @param {Array<{name:string, signature:boolean, signatureDescription:string}>} kits
 */
export function signatureStatus(kits = [], abilityNames = []) {
  const sig = kits.filter(k => k.signature);
  const max = signatureLimit(abilityNames);
  return {
    count: sig.length, max, over: sig.length > max,
    missingDescription: sig.filter(k => !String(k.signatureDescription ?? "").trim()).map(k => k.name)
  };
}

/**
 * Prérequis d'un kit (« Pilote », « Vieille fortune ou Nouveau riche ») : contrôle indicatif (règle d'or :
 * le Chef tranche). Les alternatives sont séparées par « ou » ; plusieurs exigences par « , » ou « et ».
 * @returns {{ok:boolean, missing:string[]}}
 */
export function checkPrerequisites(text = "", { abilityNames = [] } = {}) {
  const owned = new Set(abilityNames.map(norm));
  const groups = String(text ?? "").split(/\s*(?:,|\bet\b)\s*/).map(g => g.trim()).filter(Boolean);
  const missing = groups.filter(g => !g.split(/\s+ou\s+/).some(alt => owned.has(norm(alt))));
  return { ok: missing.length === 0, missing };
}

/** Kits à rendre en fin d'histoire. */
export function kitsToReturn(kits = []) {
  return kits.filter(k => RETURNED_ORIGINS.includes(k.origin));
}

/** Usage d'un kit bricolé (1 ou 2 usages, LdB p. 111) : usages restants et mise hors d'usage. */
export function useJuryRigged(uses) {
  const left = Math.max(0, (Number(uses) || 0) - 1);
  return { uses: left, broken: left === 0 };
}

/** Usages d'un gadget bricolé selon le résultat du défi (Excellent : deux fois). */
export function juryRiggedUses(result) {
  return result === "excellent" ? 2 : 1;
}

/**
 * Descripteur de gadget (LdB p. 116) : « Peu fiable (9-0) », « Dangereux (9-0, 4dX) », « Très dangereux (0, 8dX) »,
 * « Fatigant », « Assourdissant », « Fumigène », « Illégal ».
 * @returns {{type:string, range?:string, dice?:number}|null}
 */
export function parseGadgetDescriptor(text = "") {
  const t = norm(text);
  const args = (t.match(/\(([^)]*)\)/)?.[1] ?? "").split(",").map(x => x.trim()).filter(Boolean);
  const range = args.find(a => parseRange(a.replace(/\s/g, ""))) ?? "";
  const dice = Number(args.find(a => /dx$/.test(a))?.replace(/dx$/, "")) || 0;
  if (t.startsWith("tres dangereux")) return { type: "veryDangerous", range: range || "0", dice: dice || 8 };
  if (t.startsWith("dangereux")) return { type: "dangerous", range: range || "9-0", dice: dice || 4 };
  if (t.startsWith("peu fiable")) return { type: "unreliable", range: range || "9-0" };
  if (t.startsWith("fatigant")) return { type: "tiring" };
  if (t.startsWith("assourdissant")) return { type: "deafening" };
  if (t.startsWith("fumigene")) return { type: "smoke" };
  if (t.startsWith("illegal")) return { type: "illegal" };
  return null;
}

/**
 * Effets déclenchés par l'utilisation d'un gadget lors d'un jet (unités du d%).
 * @param {Array<{key:string}>} descriptors
 * @returns {Array<{type:string, dice?:number, range?:string}>}
 */
export function gadgetTriggers(descriptors = [], units) {
  const out = [];
  for (const d of descriptors) {
    const g = parseGadgetDescriptor(d.key ?? d);
    if (!g) continue;
    if (["unreliable", "dangerous", "veryDangerous"].includes(g.type)) {
      if (inRange(units, g.range)) out.push(g);
    } else if (g.type !== "illegal") out.push(g);
  }
  return out;
}

/* ---------------------------------------------------------------- */
/*  Fabrication de gadgets (LdB p. 112)                              */
/* ---------------------------------------------------------------- */

/** Compétences du défi de fabrication ; « search » peut être remplacé par « contacts ». */
export const GADGET_SKILLS = Object.freeze(["resources", "electronics", "engineering", "science", "search"]);

/** Malus appliqué à toutes les tâches selon la catégorie. */
export function gadgetGlobalPips(category = "standard") {
  if (category === "spyTech" || category === "ancientLore") return -2;
  if (category === "superScience" || category === "lostLore") return -5;
  return 0;
}

/**
 * Jetons de pips à répartir sur les tâches : −2 par descripteur positif voulu, +2 par descripteur limitant ajouté,
 * +2 pour la modification d'un kit existant, +2 par tâche à laquelle on consacre plus de temps.
 * @returns {number[]}
 */
export function gadgetTokens({ positive = 0, limiting = 0, modification = false, extraTime = 0 } = {}) {
  return [
    ...Array(Math.max(0, positive)).fill(-2),
    ...Array(Math.max(0, limiting)).fill(2),
    ...(modification ? [2] : []),
    ...Array(Math.max(0, extraTime)).fill(2)
  ];
}

/**
 * Contrôle de la répartition : somme des pips des lignes = malus global × lignes + somme des jetons.
 * @returns {{ok:boolean, expected:number, actual:number}}
 */
export function gadgetBalance(rowPips = [], { category = "standard", tokens = [] } = {}) {
  const expected = gadgetGlobalPips(category) * rowPips.length + tokens.reduce((a, b) => a + b, 0);
  const actual = rowPips.reduce((a, b) => a + (Number(b) || 0), 0);
  return { ok: expected === actual, expected, actual };
}

/** Le gadget est-il fabriqué ? (Excellent, Bon, Limité ; pas Mauvais ni Désastreux) */
export function gadgetBuilt(result) {
  return ["excellent", "good", "limited"].includes(result);
}

/**
 * Descripteurs saisis en texte (« Volant, Bonne impression : +2 pips, Peu fiable (9-0) ») → lignes de kit.
 * Les virgules à l'intérieur des parenthèses sont conservées.
 * @returns {Array<{key:string, pips:number, situation:string, value:string}>}
 */
export function parseKitDescriptors(text = "") {
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of String(text ?? "")) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === ";") && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
  }
  parts.push(cur);
  return parts.map(p => p.trim()).filter(Boolean).map(p => {
    const m = p.match(/^(.*?)\s*:\s*([+−-]\s*\d+)\s*pips?$/i);
    return m
      ? { key: m[1].trim(), pips: Number(m[2].replace(/[−\s]/g, x => (x === "−" ? "-" : ""))), situation: "", value: "" }
      : { key: p, pips: 0, situation: "", value: "" };
  });
}
