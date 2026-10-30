/**
 * Progression et intersession — logique pure (bible chap. 15, LdB p. 126-131).
 *
 * Système des coches (par défaut) : coches ordinaires (une par compétence utilisée), coches gratuites
 * accordées par le Chef, jets de récompense, entraînement d'intersession.
 * Système optionnel en points : points d'expérience et points de récompense.
 */
import { SKILL_MIN, SKILL_MAX } from "./skills.mjs";

export const XP_SYSTEMS = Object.freeze(["ticks", "points"]);

/** Critères des coches gratuites / points d'expérience (LdB p. 127, 131). */
export const FREE_TICK_CRITERIA = Object.freeze({
  present: 1,          // tous les personnages présents
  npcInteraction: 1,   // interaction significative avec les personnages du Chef
  pcInteraction: 1,    // interaction significative entre personnages principaux
  hookedDrag: 1,       // accroché : a entraîné les autres dans l'aventure
  hookedSupport: 1,    // autres : ont fait des accrochés les personnages principaux
  bloodless: 3         // fin d'aventure sans effusion de sang inutile
});

/** Table d'estimation des périodes d'intersession (LdB p. 129). */
export const DOWNTIME_SPANS = Object.freeze({ none: 0, week: 1, month: 2, halfYear: 3, year: 4 });

/** Activités d'intersession (LdB p. 129-130). */
export const DOWNTIME_ACTIVITIES = Object.freeze(["crafting", "convalescence", "purchase", "companionship", "travel", "training"]);
export const DOWNTIME_STORY_POINTS = 2;    // Fréquentations, Voyage : +2 PR à la prochaine session

export const LANGUAGE_FLUENT_CROSSES = 5;  // LdB p. 128
export const MAX_ROLLS_PER_TARGET = 2;     // hors récompenses, par phase de débriefing (LdB p. 127, 130)
export const LEGENDARY_VALUE = SKILL_MAX;  // 106 (LdB p. 127)
export const REWARD_POINT_UNLOCK = 85;     // point de récompense utilisable en croix à 85 ou plus (LdB p. 131)

/** Sources d'un jet d'amélioration. */
export const SOURCES = Object.freeze(["ordinary", "free", "reward", "training", "xp", "rewardPoint"]);

/** Coches gratuites (ou points d'expérience) d'un personnage : somme des critères, moins le retrait du Chef. */
export function freeTicksFor(criteria = {}, penalty = 0) {
  const total = Object.entries(FREE_TICK_CRITERIA).reduce((n, [k, v]) => n + (criteria[k] ? v : 0), 0);
  return Math.max(0, total - Math.max(0, Math.floor(Number(penalty) || 0)));
}

/** Dé d'augmentation selon la valeur (table p. 130) : 1d6, 1d6/2, 1d6/3 (arrondi supérieur) ou +1. */
export function increaseRule(value) {
  const v = Number(value) || 0;
  if (v <= 65) return { divisor: 1, fixed: null, label: "1d6" };
  if (v <= 85) return { divisor: 2, fixed: null, label: "1d6/2" };
  if (v <= 95) return { divisor: 3, fixed: null, label: "1d6/3" };
  return { divisor: 1, fixed: 1, label: "1" };
}

/** Augmentation pour un d6 donné. */
export function increaseAmount(value, d6) {
  const r = increaseRule(value);
  return r.fixed ?? Math.ceil((Number(d6) || 0) / r.divisor);
}

/**
 * Jet d'expérience (LdB p. 127) : d% ≥ valeur → augmentation. Ni inversion, ni Karma.
 * Plafond 100 ; 106 uniquement depuis exactement 100, avec 100 au d% puis 6 au d6 (sinon pas d'augmentation).
 * @returns {{success:boolean, increase:number, newValue:number, legendary:boolean, rule:object}}
 */
export function experienceRoll({ value, d100, d6 }) {
  const v = Math.max(SKILL_MIN, Number(value) || SKILL_MIN);
  const rule = increaseRule(v);
  const success = Number(d100) >= v;
  if (!success || v > 100) return { success: success && v <= 100, increase: 0, newValue: v, legendary: false, rule };
  if (v === 100) {
    const legendary = Number(d6) === 6;
    return { success, increase: legendary ? LEGENDARY_VALUE - 100 : 0, newValue: legendary ? LEGENDARY_VALUE : 100, legendary, rule };
  }
  const newValue = Math.min(100, v + increaseAmount(v, d6));
  return { success, increase: newValue - v, newValue, legendary: false, rule };
}

/** Système en points : un point augmente la compétence selon la même table, sans seuil (plafond 100). */
export function pointIncrease({ value, d6 }) {
  const v = Math.max(SKILL_MIN, Number(value) || SKILL_MIN);
  if (v >= 100) return { increase: 0, newValue: v, rule: increaseRule(v) };
  const newValue = Math.min(100, v + increaseAmount(v, d6));
  return { increase: newValue - v, newValue, rule: increaseRule(v) };
}

/** Croix de langue : courante à 5 croix. */
export function addLanguageCross(crosses = 0) {
  const c = Math.min(LANGUAGE_FLUENT_CROSSES, (Number(crosses) || 0) + 1);
  return { crosses: c, fluent: c >= LANGUAGE_FLUENT_CROSSES };
}

/** Bonus d'une langue en apprentissage : +1 pip par croix tant qu'elle n'est pas courante (LdB p. 128). */
export function languagePips({ fluent = false, crosses = 0 } = {}) {
  return fluent ? 0 : Math.max(0, Number(crosses) || 0);
}

/** Croix de capacité : acquise quand les croix atteignent le coût. */
export function addAbilityCross(crosses = 0, cost = 1) {
  const c = Math.min(Number(cost) || 1, (Number(crosses) || 0) + 1);
  return { crosses: c, acquired: c >= (Number(cost) || 1) };
}

/**
 * Prérequis d'une capacité (compétences minimales, capacités acquises).
 * @param {{prerequisites?:{skills?:Array<{key:string,min:number}>, abilities?:string[]}}} ability  données system
 * @param {{skills:Record<string,number>, abilityNames:string[]}} who
 */
export function abilityPrerequisites(ability, { skills = {}, abilityNames = [] } = {}) {
  const missing = [];
  for (const p of ability?.prerequisites?.skills ?? []) if (p.key && (skills[p.key] ?? 0) < p.min) missing.push({ type: "skill", key: p.key, min: p.min });
  const owned = new Set(abilityNames.map(n => String(n).toLowerCase()));
  for (const n of ability?.prerequisites?.abilities ?? []) if (n && !owned.has(String(n).toLowerCase())) missing.push({ type: "ability", name: n });
  return { ok: missing.length === 0, missing };
}

/** Clé de suivi d'une cible (« skill:agility », « language:Grec », « ability:Maître judoka »). */
export function targetKey(target) {
  const id = target.type === "skill" ? target.key : String(target.name ?? "").trim().toLowerCase();
  return `${target.type}:${id}`;
}

const count = (uses, key) => uses?.[key] ?? {};

/**
 * Une source peut-elle viser cette cible pendant la phase de débriefing ?
 *  - coche ordinaire : la compétence elle-même, une langue si la compétence est Langues, une capacité associée ;
 *  - une coche ordinaire et une coche gratuite (ou entraînement) au plus par cible, deux jets au total ;
 *  - jets de récompense : liés à une compétence, ignorent la limite ;
 *  - points : 1 point d'expérience par cible ; point de récompense : sa compétence, ou une langue / capacité
 *    (une seule) si la compétence est à 85 ou plus.
 * @param {object} uses  { [targetKey]: { ordinary, free, training, xp, rewardPoint } }
 * @param {{source:string, skill?:string, skillValue?:number, target:{type:string, key?:string, name?:string}, learnWith?:string[]}} p
 * @returns {{ok:boolean, reason?:string}}
 */
export function canUse(uses, { source, skill = "", skillValue = 0, target, learnWith = [] }) {
  if (!SOURCES.includes(source)) return { ok: false, reason: "unknown-source" };
  const linked = source === "ordinary" || source === "reward";
  if (linked) {
    if (target.type === "skill" && target.key !== skill) return { ok: false, reason: "wrong-skill" };
    if (target.type === "language" && skill !== "languages") return { ok: false, reason: "needs-languages" };
    if (target.type === "ability" && !learnWith.includes(skill)) return { ok: false, reason: "not-associated" };
  }
  if (source === "reward") return { ok: true };
  const u = count(uses, targetKey(target));
  if (source === "rewardPoint") {
    if (target.type === "skill") return target.key === skill ? { ok: true } : { ok: false, reason: "wrong-skill" };
    if (skillValue < REWARD_POINT_UNLOCK) return { ok: false, reason: "reward-point-locked" };
    return (u.rewardPoint ?? 0) < 1 ? { ok: true } : { ok: false, reason: "already-used" };
  }
  if (source === "xp") return (u.xp ?? 0) < 1 ? { ok: true } : { ok: false, reason: "already-used" };
  const rolls = (u.ordinary ?? 0) + (u.free ?? 0) + (u.training ?? 0);
  if (rolls >= MAX_ROLLS_PER_TARGET) return { ok: false, reason: "two-rolls" };
  if (source === "ordinary" && (u.ordinary ?? 0) >= 1) return { ok: false, reason: "already-used" };
  if (source === "free" && (u.free ?? 0) >= 1) return { ok: false, reason: "already-used" };
  return { ok: true };
}

/** Enregistre l'usage (copie). */
export function recordUse(uses = {}, source, target) {
  const key = targetKey(target);
  const cur = { ...(uses[key] ?? {}) };
  cur[source] = (cur[source] ?? 0) + 1;
  return { ...uses, [key]: cur };
}
