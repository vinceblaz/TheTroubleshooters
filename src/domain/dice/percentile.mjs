/**
 * Jet de pourcentage et jet de tâche — logique pure (bible §7, LdB p. 21-23, 80-83).
 *
 * Conventions :
 *  - un résultat d% va de 1 à 100 ; « 00 et 0 » vaut 100 et sa dizaine compte pour 10 ;
 *  - le Karma est un double (11, 22… 99) ; 100 n'est pas un double (D-005) ;
 *  - inverser échange dizaines et unités (73 → 37, 7 → 70, 10 → 1) ; 100 reste 100.
 */

/** Difficultés standard (LdB p. 80). */
export const DIFFICULTIES = Object.freeze({
  veryEasy: 5,
  easy: 2,
  average: 0,
  hard: -2,
  veryHard: -5
});

/** Catégories de modificateurs dont un seul est retenu chacune (LdB p. 80). */
export const MODIFIER_CATEGORIES = Object.freeze(["difficulty", "circumstances", "gear", "abilities"]);

/** Chiffres d'un résultat d% : 100 → { tens: 10, units: 0 }. */
export function digits(result) {
  const r = Number(result);
  if (r === 100) return { tens: 10, units: 0 };
  return { tens: Math.floor(r / 10), units: r % 10 };
}

/** Résultat d% à partir des deux d10 (0-9 chacun) ; 0 et 0 → 100. */
export function fromDice(tensDie, unitsDie) {
  const r = Number(tensDie) * 10 + Number(unitsDie);
  return r === 0 ? 100 : r;
}

/** Vrai si le résultat est un double (Karma). */
export function isDouble(result) {
  const r = Number(result);
  if (!Number.isInteger(r) || r < 1 || r > 99) return false;
  const { tens, units } = digits(r);
  return tens === units;
}

/** Inverse un résultat (échange dizaines / unités). 100 reste 100 ; un résultat inversé à 0 devient 100. */
export function invertResult(result) {
  const r = Number(result);
  if (r === 100) return 100;
  const { tens, units } = digits(r);
  return fromDice(units, tens);
}

/**
 * Somme nette des pips (bible §7.2 et D-006).
 *  - difficulty, circumstances, gear, abilities : une valeur chacune (déjà choisie par la boîte de jet) ;
 *  - conditions et flaws : listes dont les valeurs s'additionnent.
 * @returns {number} entier
 */
export function netPips({ difficulty = 0, circumstances = 0, gear = 0, abilities = 0, conditions = [], flaws = [] } = {}) {
  const sum = arr => (arr ?? []).reduce((a, m) => a + (Number(typeof m === "object" ? m.pips : m) || 0), 0);
  return (Number(difficulty) || 0) + (Number(circumstances) || 0) + (Number(gear) || 0) + (Number(abilities) || 0)
    + sum(conditions) + sum(flaws);
}

/**
 * Évalue un jet de tâche.
 * @param {{value:number, result:number, pips?:number, mode?:"pips"|"taskValue"}} p
 * @returns {{success:boolean, auto:"success"|"failure"|null, karma:"good"|"bad"|null, target:number}}
 *   target = valeur comparée (valeur de compétence, ou valeur de tâche en mode optionnel)
 */
export function evaluateTask({ value, result, pips = 0, mode = "pips" }) {
  const v = Number(value) || 0;
  const r = Number(result);
  const p = Math.trunc(Number(pips) || 0);
  let success;
  let auto = null;
  let target = v;

  if (mode === "taskValue") {
    target = v + 5 * p;
    success = r <= target;
  } else {
    const { units } = digits(r);
    if (units !== 0 && p > 0 && units <= p) { success = true; auto = "success"; }
    else if (units !== 0 && p < 0 && units <= -p) { success = false; auto = "failure"; }
    else success = r <= v;
  }

  const karma = isDouble(r) ? (success ? "good" : "bad") : null;
  return { success, auto, karma, target };
}

/**
 * Issue d'un jet en opposition (LdB p. 82).
 * @param {{success:boolean, result:number}} a  premier camp (attaquant ou initiateur)
 * @param {{success:boolean, result:number}} b  second camp (défenseur ou cible)
 * @param {{defenderWinsTies?:boolean}} [opts]  vrai en attaque/défense : égalité de réussites → b
 * @returns {"a"|"b"|"tie"}
 */
export function opposedOutcome(a, b, { defenderWinsTies = false } = {}) {
  if (!a.success && !b.success) return "tie";
  if (a.success && !b.success) return "a";
  if (!a.success && b.success) return "b";
  if (a.result > b.result) return "a";
  if (b.result > a.result) return "b";
  return defenderWinsTies ? "b" : "tie";
}
