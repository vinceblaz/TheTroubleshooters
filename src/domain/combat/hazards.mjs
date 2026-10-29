/**
 * Autres dangers — logique pure (LdB p. 102-103) : chute, explosion, incendie, noyade, poison,
 * tir de sniper et attaque par-derrière.
 */
import { opposedOutcome } from "../dice/percentile.mjs";

export const FIRE_DICE = 1;
export const DROWNING_DICE = 1;
export const AMBUSH_EXTRA_DICE = 4;
export const SNIPER_PIPS = 2;
export const SNIPER_EXTRA_DICE = 2;
export const THICK_CLOTHES_PIPS = 2;
export const DROWNING_PIPS = { surprised: -2, normal: 0, prepared: 2 };
export const EXPLOSION_MIN_SPREAD = 5;

/** Explosifs de la table (LdB p. 102). */
export const EXPLOSIVES = Object.freeze({
  grenade: 6, dynamite: 8, trap: 8, launcher: 9, timeBomb: 10
});

/** Poisons de la table (LdB p. 103) : force, effet initial, effet prolongé, durée. */
export const POISONS = Object.freeze({
  sleeping:      { strength: 75, initial: { status: "stunned", note: "1d6 rounds" }, prolonged: { status: "outOfAction", note: "sleep" }, duration: "1d6h" },
  paralytic:     { strength: 75, initial: { status: "stunned", note: "1d6 rounds" }, prolonged: { status: "paralyzed" }, duration: "1d6h" },
  deadly:        { strength: 65, initial: { damage: "1d6" }, prolonged: { damagePerTurn: 1 }, duration: "1d6r" },
  hallucinogenic:{ strength: 50, initial: { status: "stunned", note: "1d6 rounds" }, prolonged: { statuses: ["stunned", "drunk"] }, duration: "1d6h" }
});

/**
 * Chute : jet d'Agilité au-delà de 1 m (2 m si le saut est volontaire), −1 pip par mètre supplémentaire.
 * @returns {{required:boolean, pips:number}}
 */
export function fallCheck({ height = 0, voluntary = false } = {}) {
  const threshold = voluntary ? 2 : 1;
  const h = Math.max(0, Number(height) || 0);
  if (h <= threshold) return { required: false, pips: 0 };
  return { required: true, pips: -Math.floor(h - threshold) };
}

/** Chute ratée : Blessé, ou Hors de combat si la personne était déjà Blessée. */
export function fallOutcome({ success, statuses = [] } = {}) {
  if (success) return null;
  return statuses.includes("wounded") ? "outOfAction" : "wounded";
}

/**
 * Anneaux d'une explosion : zone (dégâts pleins), zones adjacentes (moitié, arrondi inférieur),
 * puis moitié à nouveau tant que l'anneau précédent atteignait au moins 5dX.
 * @returns {number[]} dés par anneau (0 = zone de l'explosion)
 */
export function explosionRings(dice) {
  const d = Math.max(0, Math.floor(Number(dice) || 0));
  if (!d) return [];
  const rings = [d, Math.floor(d / 2)];
  while (rings.at(-1) >= EXPLOSION_MIN_SPREAD) rings.push(Math.floor(rings.at(-1) / 2));
  return rings.filter(n => n > 0);
}

/** Sbires et sous-fifres sont traités en groupe (un seul jet de dégâts). */
export function rollsSeparately(actor) {
  return actor?.type === "character" || !["minion", "henchman", "extra"].includes(actor?.rank ?? actor?.system?.rank);
}

/** Incendie : jet d'Agilité raté → En feu. Noyade : jet d'Endurance raté → 1dX. */
export function fireZoneOutcome(success) { return success ? null : "onFire"; }
export function drowningOutcome(success) { return success ? 0 : DROWNING_DICE; }

/**
 * Poison : opposition Endurance contre la force du poison.
 * @returns {"none"|"initial"|"prolonged"|"doubled"}
 */
export function poisonOutcome(enduranceTask, poisonTask) {
  if (!poisonTask?.success) return "none";
  if (!enduranceTask?.success) return "doubled";
  return opposedOutcome(poisonTask, enduranceTask, { defenderWinsTies: true }) === "b" ? "initial" : "prolonged";
}

/**
 * Embuscade ou sniper contre un Risque-tout : jet de Vigilance (LdB p. 103).
 * @returns {"outOfAction"|"surprisedExtra"|"normal"|"defend"}
 */
export function ambushOutcome(task) {
  if (task.karma === "bad") return "outOfAction";
  if (!task.success) return "surprisedExtra";
  return task.karma === "good" ? "defend" : "normal";
}

/**
 * Sniper d'un Risque-tout contre un PNJ : jet de Furtivité (LdB p. 103).
 * @returns {"alerted"|"normal"|"bonus"|"takedown"}
 */
export function sniperOutcome(task) {
  if (task.karma === "bad") return "alerted";
  if (!task.success) return "normal";
  return task.karma === "good" ? "takedown" : "bonus";
}
