/**
 * Règles diverses du personnage — logique pure.
 */

export const MAX_CARRIED_KITS = 5;               // LdB p. 109
export const DEFAULT_SESSION_STORY_POINTS = 4;   // LdB p. 104
export const DEFAULT_MAX_STORY_POINTS = 12;      // LdB p. 104

/**
 * Nombre de langues supplémentaires accordées à la création selon la compétence Langues.
 * Source : LdB p. 34 — 45 → 1, 65+ → 2.
 * @param {number} languagesSkill
 * @returns {0|1|2}
 */
export function extraLanguagesAllowed(languagesSkill) {
  const v = Number(languagesSkill) || 0;
  if (v >= 65) return 2;
  if (v >= 45) return 1;
  return 0;
}

/**
 * Compte les kits emportés et signale le dépassement (simple avertissement, P6).
 * @param {Array<{carried?:boolean}>} kits
 * @returns {{carried:number, max:number, over:boolean}}
 */
export function carriedKitStatus(kits = [], max = MAX_CARRIED_KITS) {
  const carried = kits.filter(k => k?.carried).length;
  return { carried, max, over: carried > max };
}

/**
 * Borne une réserve de points de récit dans [0, max].
 * @returns {{value:number, overflow:number}} overflow = quantité écrêtée au-delà du plafond
 */
export function clampStoryPoints(value, max = DEFAULT_MAX_STORY_POINTS) {
  const n = Math.round(Number(value));
  const v = Number.isFinite(n) ? n : 0;
  if (v > max) return { value: max, overflow: v - max };
  return { value: Math.max(0, v), overflow: 0 };
}
