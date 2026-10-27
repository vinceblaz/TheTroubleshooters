/**
 * Vitalité — logique pure.
 * Source : LdB p. 34 (création) et p. 129 (amélioration de la Vitalité), p. 100 (Épuisé).
 *
 * Vitalité de base 4 ;
 *  5 si Agilité OU une compétence de combat ≥ 45 ;
 *  6 si Agilité OU une compétence de combat ≥ 65 ;
 *  7 si Agilité ≥ 65 ET une compétence de combat ≥ 65.
 */

export const VITALITY_BASE = 4;

/**
 * Vitalité maximale « naturelle » d'un personnage.
 * @param {{agility:number, melee:number, shooting:number}} skills
 * @returns {number} 4 à 7
 */
export function baseMaxVitality({ agility = 15, melee = 15, shooting = 15 } = {}) {
  const combat = Math.max(Number(melee) || 0, Number(shooting) || 0);
  const agi = Number(agility) || 0;
  if (agi >= 65 && combat >= 65) return 7;
  if (agi >= 65 || combat >= 65) return 6;
  if (agi >= 45 || combat >= 45) return 5;
  return VITALITY_BASE;
}

/**
 * Vitalité maximale effective : base + bonus, puis moitié (arrondi inférieur)
 * par niveau d'Épuisé (condition cumulative). Jamais inférieure à 0.
 * @param {object} skills  voir baseMaxVitality
 * @param {number} [bonus=0]
 * @param {number} [exhaustedLevels=0]
 * @returns {number}
 */
export function effectiveMaxVitality(skills, bonus = 0, exhaustedLevels = 0) {
  let max = baseMaxVitality(skills) + (Number(bonus) || 0);
  const levels = Math.max(0, Math.floor(Number(exhaustedLevels) || 0));
  for (let i = 0; i < levels; i++) max = Math.floor(max / 2);
  return Math.max(0, max);
}

/**
 * Borne la Vitalité actuelle dans [0, max].
 * @param {number} value
 * @param {number} max
 * @returns {number}
 */
export function clampVitality(value, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return Math.max(0, max);
  return Math.min(Math.max(0, max), Math.max(0, n));
}
