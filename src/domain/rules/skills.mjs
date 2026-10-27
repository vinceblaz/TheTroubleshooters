/**
 * Compétences — logique pure (aucune dépendance Foundry).
 * Source : LdB p. 50-52 (28 compétences, 5 familles, valeurs 15 à 106).
 */

export const SKILL_MIN = 15;
export const SKILL_MAX = 106;
export const SKILL_START_MAX = 85;

/** Familles de compétences (LdB p. 50-51). */
export const SKILL_FAMILIES = Object.freeze(["basic", "social", "research", "action", "combat"]);

/** Liste ordonnée des 28 compétences : clé de code → famille. */
export const SKILLS = Object.freeze([
  { key: "agility", family: "basic" },
  { key: "bureaucracy", family: "research" },
  { key: "charm", family: "social" },
  { key: "contacts", family: "social" },
  { key: "melee", family: "combat" },
  { key: "electronics", family: "research" },
  { key: "endurance", family: "basic" },
  { key: "investigation", family: "research" },
  { key: "strength", family: "basic" },
  { key: "search", family: "research" },
  { key: "stealth", family: "action" },
  { key: "engineering", family: "research" },
  { key: "languages", family: "social" },
  { key: "mechanics", family: "action" },
  { key: "medicine", family: "research" },
  { key: "sleightOfHand", family: "basic" },
  { key: "driving", family: "action" },
  { key: "resources", family: "basic" },
  { key: "science", family: "research" },
  { key: "humanities", family: "research" },
  { key: "security", family: "action" },
  { key: "performance", family: "social" },
  { key: "status", family: "social" },
  { key: "survival", family: "action" },
  { key: "shooting", family: "combat" },
  { key: "deception", family: "social" },
  { key: "vigilance", family: "basic" },
  { key: "willpower", family: "basic" }
].map(s => Object.freeze(s)));

export const SKILL_KEYS = Object.freeze(SKILLS.map(s => s.key));

/** Compétences de combat (Vitalité, défense). */
export const COMBAT_SKILLS = Object.freeze(SKILLS.filter(s => s.family === "combat").map(s => s.key));

/**
 * Borne une valeur de compétence dans [15, 106] et l'arrondit à l'entier.
 * Une valeur non numérique retombe sur le minimum.
 * @param {*} value
 * @returns {number}
 */
export function clampSkill(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return SKILL_MIN;
  return Math.min(SKILL_MAX, Math.max(SKILL_MIN, n));
}

/** @returns {boolean} vrai si la clé désigne l'une des 28 compétences. */
export function isSkillKey(key) {
  return SKILL_KEYS.includes(key);
}

/**
 * Regroupe les clés de compétences par famille, dans l'ordre de SKILLS.
 * @returns {Record<string, string[]>}
 */
export function skillsByFamily() {
  const out = Object.fromEntries(SKILL_FAMILIES.map(f => [f, []]));
  for (const s of SKILLS) out[s.family].push(s.key);
  return out;
}
