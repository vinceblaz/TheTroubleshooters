/**
 * Désavantages — logique pure (LdB p. 74-77, bible chap. 9).
 */

/** Gains standard par mode (LdB p. 75). */
export const FLAW_MODE_GAINS = Object.freeze({ penalty: 3, fail: 3, condition: 3, absent: 6, free: 3 });

/** Gain d'un déclencheur : celui saisi, sinon le gain standard du mode. */
export function triggerGain(trigger) {
  const g = Number(trigger?.gain);
  if (Number.isFinite(g) && g > 0) return g;
  return FLAW_MODE_GAINS[trigger?.mode] ?? 3;
}

/**
 * Malus de désavantage actifs pour un jet (bloc « désavantages », cumulé, D-006).
 * @param {Array<{pips:number, skills?:string[], label:string}>} penalties  malus de scène posés sur l'acteur
 * @param {string} skillKey
 * @returns {Array<{label:string, pips:number}>}
 */
export function flawPenaltyMods(penalties = [], skillKey = "") {
  return penalties
    .filter(p => !(p.skills?.length) || (skillKey && p.skills.includes(skillKey)))
    .map(p => {
      const mod = { label: p.label, pips: Number(p.pips) || 0 };
      if (p.nextRoll) Object.assign(mod, { nextRoll: true, effectId: p.effectId ?? "" });   // malus « prochain jet » (Mauvais Karma en attaque)
      return mod;
    });
}

/** Un acteur peut-il rater un jet au titre d'un désavantage ? (au moins un désavantage) */
export function canFailForFlaw(flaws = []) {
  return flaws.length > 0;
}

/** Désavantage « Malchanceux » présent ? */
export function hasUnluckyFlaw(flaws = []) {
  return flaws.some(f => f.special === "unlucky");
}
