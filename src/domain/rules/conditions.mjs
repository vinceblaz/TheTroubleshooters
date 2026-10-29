/**
 * Modificateurs de jets dus aux conditions — logique pure (LdB p. 100-101, D-006).
 *
 * Les malus des conditions forment un bloc hors des 4 catégories et s'additionnent.
 * Familles de jets : "all" (tous les jets), "attack", "defense", "movement", ou une liste de compétences.
 * Phase 2 : jets de compétence hors combat ; phase 4 : familles attaque et défense ;
 * phase 5 : nature du jet (mouvement, vue, ouïe), niveaux cumulatifs, sorties et fins de condition.
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
export function conditionModifiers(statuses = [], { skill = "", kind = "skill", inCombat = false, levels = {}, ignore = [] } = {}) {
  const out = [];
  for (const id of statuses) {
    if (ignore.includes(id)) continue;
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
  if (family === "others") return ["skill", "sight", "hearing"].includes(kind);   // « autres jets » de Sonné : hors attaque et mouvement
  return family === kind;
}

/* ------------------------------------------------------------------ */
/*  Phase 5 : définitions complètes (LdB p. 100-101)                   */
/* ------------------------------------------------------------------ */

/** Natures de jet déclarées dans la boîte de jet (règle d'or : le joueur et le Chef jugent). */
export const ROLL_KINDS = Object.freeze(["skill", "movement", "sight", "hearing"]);

/**
 * Définition de chaque condition.
 *  - max : niveaux cumulables (1 = binaire) ; overflow : condition posée au niveau max + 1 (Saoul ×4 → Hors de combat) ;
 *  - exit : jet pour s'en débarrasser { skills[], action, becomes? } ;
 *  - ends : moment de fin automatique ("turnEnd", "combatEnd") ou rappel ("scene", "source", "rest"…) ;
 *  - noDefense, autoFail (nature de jet ratée d'office), turnStart / turnEnd (traitement par le tracker).
 */
export const CONDITION_DEFS = Object.freeze({
  blinded:      { max: 1, autoFail: "sight", ends: "scene" },
  wounded:      { max: 1, ends: "healing", patchUp: true },
  mortalDanger: { max: 1, ends: "combatEnd" },
  frightened:   { max: 1, exit: { skills: ["willpower"], action: "main" }, ends: "roll" },
  onFire:       { max: 1, exit: { skills: ["agility"], action: "main" }, ends: "roll", turnStart: "onFire" },
  exhausted:    { max: 9, ends: "rest" },
  outOfAction:  { max: 1, ends: "medicine" },
  paralyzed:    { max: 1, ends: "source", turnEnd: "paralyzed" },
  restrained:   { max: 1, exit: { skills: ["melee", "strength", "agility"], action: "main" }, ends: "roll" },
  drunk:        { max: 3, overflow: "outOfAction", noDefense: true, ends: "time" },
  stunned:      { max: 1, exit: { skills: ["willpower"], action: "main" }, ends: "scene" },
  deafened:     { max: 1, autoFail: "hearing", ends: "scene" },
  encumbered:   { max: 1, ends: "drop" },
  surprised:    { max: 1, ends: "turnEnd" },
  terrified:    { max: 1, exit: { skills: ["willpower"], action: "main", becomes: "frightened" }, ends: "roll", turnStart: "terrified" },
  vulnerable:   { max: 1, ends: "standUp" }
});

/** Niveau actuel d'une condition (statut présent : au moins 1). */
export function conditionLevel(id, statuses = [], levels = {}) {
  if (!statuses.includes(id)) return 0;
  const max = CONDITION_DEFS[id]?.max ?? 1;
  return Math.min(max, Math.max(1, Number(levels[id]) || 1));
}

/**
 * Ajoute un niveau. Au-delà du maximum : la condition de débordement (Saoul ×4 → Hors de combat).
 * @returns {{level:number, overflow:string|null}}
 */
export function addConditionLevel(id, current = 0) {
  const def = CONDITION_DEFS[id] ?? { max: 1 };
  const next = (Number(current) || 0) + 1;
  if (next > def.max) return { level: def.max, overflow: def.overflow ?? null };
  return { level: next, overflow: null };
}

/** Retire un niveau (les conditions cumulatives disparaissent une par une, LdB p. 100). */
export function removeConditionLevel(current = 0) {
  return Math.max(0, (Number(current) || 0) - 1);
}

/** Jet de cette nature raté d'office ? (Aveuglé : vue ; Sourd : ouïe) */
export function autoFailFor(statuses = [], kind = "skill") {
  return statuses.find(id => CONDITION_DEFS[id]?.autoFail && CONDITION_DEFS[id].autoFail === kind) ?? null;
}

/** Une condition interdit-elle la défense ? (Saoul) */
export function preventsDefense(statuses = []) {
  return statuses.some(id => CONDITION_DEFS[id]?.noDefense);
}

/** Effet d'un jet de sortie réussi : retirer la condition, ou la remplacer (Terrifié → Effrayé). */
export function exitOutcome(id) {
  const exit = CONDITION_DEFS[id]?.exit;
  if (!exit) return null;
  return { remove: id, add: exit.becomes ?? null };
}

/** Conditions à traiter au début / à la fin d'un tour. */
export function turnTriggers(statuses = [], moment = "start") {
  const key = moment === "start" ? "turnStart" : "turnEnd";
  const out = statuses.filter(id => CONDITION_DEFS[id]?.[key]);
  if (moment === "end" && statuses.includes("surprised")) out.push("surprised");
  return out;
}

/** Effrayé et Terrifié ne se cumulent pas : Terrifié remplace Effrayé (LdB p. 207). */
export function fearToApply(statuses = [], wanted = "frightened") {
  if (statuses.includes("terrified")) return null;
  if (wanted === "frightened" && statuses.includes("frightened")) return null;
  return wanted;
}
