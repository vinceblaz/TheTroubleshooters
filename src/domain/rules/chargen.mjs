/**
 * Création de personnage — logique pure (LdB p. 32-39, bible chap. 14).
 */
import { SKILL_KEYS, SKILL_MIN } from "./skills.mjs";
import { baseMaxVitality } from "./vitality.mjs";
import { extraLanguagesAllowed } from "./character.mjs";

export const ARCHETYPE_VALUES = Object.freeze([75, 65, 65, 65, 65, 45, 45, 45, 45, 45, 45]);
export const START_CAP = 85;
export const TRANSFER_STEP = 10;
export const MAX_TRANSFERS = 2;
export const MAX_REPLACEMENTS = 2;
export const START_ABILITIES = 2;
export const START_FLAWS = 1;
export const ARCHETYPE_KITS = 3;
export const FREE_KITS = 2;
export const BASE_LANGUAGES = Object.freeze(["Français", "Anglais"]);

/** Compétences d'un archétype : 75 / 65 ×4 / 45 ×6, le reste à 15. */
export function skillsFromArchetype({ primary = "", secondary = [], tertiary = [] } = {}) {
  const out = Object.fromEntries(SKILL_KEYS.map(k => [k, SKILL_MIN]));
  for (const k of tertiary) if (k in out) out[k] = 45;
  for (const k of secondary) if (k in out) out[k] = 65;
  if (primary in out) out[primary] = 75;
  return out;
}

/** Répartition atypique : 11 compétences choisies dans l'ordre des valeurs (75, 65×4, 45×6). */
export function skillsFromList(keys = []) {
  return skillsFromArchetype({ primary: keys[0], secondary: keys.slice(1, 5), tertiary: keys.slice(5, 11) });
}

/** La répartition respecte-t-elle 75 / 65 ×4 / 45 ×6 (avant personnalisation) ? */
export function checkDistribution(skills) {
  const vals = Object.values(skills).filter(v => v > SKILL_MIN).sort((a, b) => b - a);
  return JSON.stringify(vals) === JSON.stringify(ARCHETYPE_VALUES);
}

/**
 * Personnalisation (LdB p. 34) appliquée dans l'ordre : transferts de ±10 (deux au plus), remplacements de
 * compétences (deux au plus, vers une compétence absente de la liste), échanges de valeurs (accord du Chef).
 * Plafond 85 au départ ; jamais sous 15.
 * @returns {{ok:boolean, skills:object, errors:string[]}}
 */
export function customizeSkills(base, { transfers = [], replacements = [], swaps = [] } = {}) {
  const s = { ...base };
  const errors = [];
  if (transfers.length > MAX_TRANSFERS) errors.push("too-many-transfers");
  if (replacements.length > MAX_REPLACEMENTS) errors.push("too-many-replacements");
  for (const { from, to } of transfers) {
    if (!(from in s) || !(to in s) || from === to) { errors.push("bad-transfer"); continue; }
    s[from] -= TRANSFER_STEP;
    s[to] += TRANSFER_STEP;
  }
  for (const { from, to } of replacements) {
    if (!(from in s) || !(to in s) || s[from] <= SKILL_MIN || s[to] > SKILL_MIN) { errors.push("bad-replacement"); continue; }
    s[to] = s[from];
    s[from] = SKILL_MIN;
  }
  for (const { a, b } of swaps) {
    if (!(a in s) || !(b in s) || a === b) { errors.push("bad-swap"); continue; }
    [s[a], s[b]] = [s[b], s[a]];
  }
  if (Object.values(s).some(v => v > START_CAP)) errors.push("over-cap");
  if (Object.values(s).some(v => v < SKILL_MIN)) errors.push("under-min");
  return { ok: errors.length === 0, skills: s, errors: [...new Set(errors)] };
}

/** Vitalité et langues supplémentaires recalculées depuis les compétences (LdB p. 34). */
export function derivedFromSkills(skills) {
  return {
    vitality: baseMaxVitality({ agility: skills.agility, melee: skills.melee, shooting: skills.shooting }),
    extraLanguages: extraLanguagesAllowed(skills.languages)
  };
}

/**
 * Langues de départ (LdB p. 33) : français et anglais d'office, langue maternelle selon l'origine.
 * @param {{origin:"french"|"english"|"other", native?:string, extra?:string[]}} p
 * @returns {Array<{name:string, native:boolean}>}
 */
export function startingLanguages({ origin = "french", native = "", extra = [] } = {}) {
  const out = [
    { name: BASE_LANGUAGES[0], native: origin === "french" },
    { name: BASE_LANGUAGES[1], native: origin === "english" }
  ];
  if (origin === "other" && native.trim()) out.push({ name: native.trim(), native: true });
  for (const l of extra) if (l?.trim() && !out.some(o => o.name.toLowerCase() === l.trim().toLowerCase())) out.push({ name: l.trim(), native: false });
  return out;
}

/**
 * Choix des capacités et désavantages (étape 3 et personnalisation).
 *  - 2 capacités de la liste ; personnalisation : une remplacée hors liste, et une 3e contre un 2e désavantage ;
 *  - niveau 0-1 : prérequis ignorés ; niveau 2+ : prérequis exigés (avertissement, le Chef tranche).
 * @param {{abilities:Array<{name:string, level:number, inList:boolean, prereqOk:boolean}>, flaws:Array<{name:string, inList:boolean}>}} p
 * @returns {{ok:boolean, errors:string[], warnings:string[]}}
 */
export function checkTraits({ abilities = [], flaws = [] } = {}) {
  const errors = [], warnings = [];
  const extraAbility = abilities.length > START_ABILITIES;
  if (abilities.length < START_ABILITIES) errors.push("abilities-count");
  if (abilities.length > START_ABILITIES + 1) errors.push("abilities-count");
  if (flaws.length < START_FLAWS || flaws.length > START_FLAWS + 1) errors.push("flaws-count");
  if (extraAbility && flaws.length < START_FLAWS + 1) errors.push("third-ability-needs-flaw");
  const outOfList = abilities.filter(a => !a.inList);
  if (outOfList.length > (extraAbility ? 2 : 1)) warnings.push("abilities-out-of-list");
  for (const a of abilities) if (a.level >= 2 && !a.prereqOk) warnings.push(`prereq:${a.name}`);
  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Kits de départ : 3 de l'archétype (un par ligne, au choix pour les lignes « A | B ») + 2 libres ; un seul signature.
 * @param {{archetypeKits:string[], picks:string[], free:string[], signature:string}} p
 */
export function checkKits({ archetypeKits = [], picks = [], free = [], signature = "" } = {}) {
  const errors = [];
  archetypeKits.forEach((line, i) => {
    const options = line.split("|").map(x => x.trim());
    if (!options.includes(picks[i])) errors.push(`pick:${i}`);
  });
  if (free.filter(Boolean).length > FREE_KITS) errors.push("free-count");
  const all = [...picks, ...free].filter(Boolean);
  if (signature && !all.includes(signature)) errors.push("signature");
  return { ok: errors.length === 0, errors, kits: all };
}

/** Accroches déjà prises par d'autres personnages (avertissement, non bloquant). */
export function hookConflicts(chosen = [], takenByOthers = []) {
  const taken = new Set(takenByOthers);
  return chosen.filter(h => taken.has(h));
}
