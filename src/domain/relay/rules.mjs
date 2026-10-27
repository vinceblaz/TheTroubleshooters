/**
 * Relais MJ — règles de validation pures (bible §4.5, D-018).
 *
 * Une carte interactive porte un état (objet plat). Un joueur demande une transition ;
 * le MJ actif valide la demande AVANT d'appliquer quoi que ce soit.
 *
 * Une règle de relais :
 *   {
 *     type: "exemple",
 *     immutable: ["actorUuid", "roll"],          // champs que la demande ne peut pas modifier
 *     transitions: { pending: ["resolved"] },    // états autorisés depuis chaque état
 *     maxRolls: 1,                               // nombre maximal de jets portés par la demande
 *     requireOwner: true                         // le demandeur doit posséder l'acteur concerné
 *   }
 */

/**
 * @param {object} rule
 * @param {object} current   état actuel stocké sur la carte (doit contenir `state`)
 * @param {object} request   { userId, isOwner, changes:{...}, rolls?:[] }
 * @returns {{ok:true, next:object} | {ok:false, reason:string}}
 */
export function validateRelayRequest(rule, current, request) {
  if (!rule || !current || !request) return fail("missing-input");
  if (rule.requireOwner && !request.isOwner) return fail("not-owner");

  const changes = request.changes ?? {};
  for (const key of rule.immutable ?? []) {
    if (key in changes && !deepEqual(changes[key], current[key])) return fail(`immutable:${key}`);
  }

  if ("state" in changes && changes.state !== current.state) {
    const allowed = rule.transitions?.[current.state] ?? [];
    if (!allowed.includes(changes.state)) return fail(`transition:${current.state}->${changes.state}`);
  }

  const rolls = request.rolls ?? [];
  if (Number.isInteger(rule.maxRolls) && rolls.length > rule.maxRolls) return fail("too-many-rolls");

  return { ok: true, next: { ...current, ...changes } };
}

function fail(reason) {
  return { ok: false, reason };
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => deepEqual(a[k], b[k]));
}
