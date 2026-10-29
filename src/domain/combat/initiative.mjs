/**
 * Initiative — logique pure (LdB p. 90-91).
 *
 * Jet de tâche de Vigilance (compétence de base pour un PNJ sans Vigilance) :
 *   échec + Mauvais Karma → 0 ; échec → unités ; réussite → dizaines + unités ; réussite + Bon Karma → +10.
 * Allonge : +2 (LdB p. 115). Plancher 0. Une option ou capacité qui réduit l'initiative est interdite à 0.
 */
import { digits } from "../dice/percentile.mjs";

export const REACH_BONUS = 2;
export const AIMED_SHOT_COST = 2;

/** Initiative tirée d'un état de jet de tâche. */
export function initiativeFromTask(task) {
  if (!task) return 0;
  const { tens, units } = digits(task.result);
  if (!task.success) return task.karma === "bad" ? 0 : units;
  return tens + units + (task.karma === "good" ? 10 : 0);
}

/** Ajoute un modificateur à une initiative (plancher 0). */
export function adjustInitiative(value, delta = 0) {
  return Math.max(0, (Number(value) || 0) + (Number(delta) || 0));
}

/** Modificateur d'équipement : Allonge +2, malus de protection saisi sur le kit. */
export function initiativeGearBonus({ reach = false, protectionPenalty = 0 } = {}) {
  return (reach ? REACH_BONUS : 0) - Math.max(0, Number(protectionPenalty) || 0);
}

/** Peut-on réduire l'initiative (Pan !, capacités) ? Interdit à 0 (LdB p. 91). */
export function canLowerInitiative(value) {
  return (Number(value) || 0) >= 1;
}

/**
 * Ordre du tracker : initiative décroissante, Risque-tout avant PNJ à égalité, puis ordre manuel puis nom.
 * @param {{initiative:number|null, isCharacter:boolean, order?:number, name?:string}} a
 */
export function compareCombatants(a, b) {
  const ia = Number.isFinite(a.initiative) ? a.initiative : -Infinity;
  const ib = Number.isFinite(b.initiative) ? b.initiative : -Infinity;
  if (ia !== ib) return ib - ia;
  if (a.isCharacter !== b.isCharacter) return a.isCharacter ? -1 : 1;
  const oa = Number(a.order) || 0, ob = Number(b.order) || 0;
  if (oa !== ob) return oa - ob;
  return String(a.name ?? "").localeCompare(String(b.name ?? ""));
}
