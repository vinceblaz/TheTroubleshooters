/**
 * Modificateurs de jets dus aux conditions — logique pure (LdB p. 100-101, D-006).
 *
 * Les malus des conditions forment un bloc hors des 4 catégories et s'additionnent.
 * Familles de jets : "all" (tous les jets), "attack", "defense", "movement", ou une liste de compétences.
 * Phase 2 : jets de compétence hors combat. Les familles de combat sont exploitées en phase 4,
 * les niveaux cumulatifs (Saoul ×3, Épuisé) et les jets de sortie en phase 5.
 */

export const CONDITION_MODIFIERS = Object.freeze({
  wounded:    [{ family: "all", pips: -2, outsideCombatOnly: true }],
  drunk:      [{ family: "all", pips: -2, perLevel: true }],
  stunned:    [{ family: "attack", pips: -5 }, { family: "movement", pips: -5 }, { family: "others", pips: -2 }],
  terrified:  [{ family: "all", pips: -2 }],
  frightened: [{ family: "attack", pips: -2 }],
  blinded:    [{ family: ["search", "investigation"], pips: -5 }, { family: "attack", pips: -5 }, { family: "defense", pips: -5 }],
  encumbered: [{ family: "attack", pips: -2 }, { family: "movement", pips: -2 }],
  vulnerable: [{ family: "defense", pips: -2 }]
});

/**
 * Liste des malus applicables à un jet.
 * @param {string[]} statuses  identifiants de conditions actives
 * @param {{skill?:string, kind?:"skill"|"attack"|"defense"|"movement", inCombat?:boolean, levels?:Record<string,number>}} ctx
 * @returns {Array<{condition:string, pips:number}>}
 */
export function conditionModifiers(statuses = [], { skill = "", kind = "skill", inCombat = false, levels = {} } = {}) {
  const out = [];
  for (const id of statuses) {
    for (const rule of CONDITION_MODIFIERS[id] ?? []) {
      if (rule.outsideCombatOnly && inCombat) continue;
      if (!appliesTo(rule.family, { skill, kind })) continue;
      const level = rule.perLevel ? Math.max(1, Number(levels[id]) || 1) : 1;
      out.push({ condition: id, pips: rule.pips * level });
    }
  }
  return out;
}

function appliesTo(family, { skill, kind }) {
  if (family === "all") return true;
  if (Array.isArray(family)) return family.includes(skill);
  if (family === "others") return kind === "skill";   // « autres jets » de Sonné : hors attaque et mouvement
  return family === kind;
}
