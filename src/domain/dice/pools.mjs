/**
 * Réserves de d6 — logique pure (LdB p. 22).
 *  - dX : dégâts, chaque 4-6 compte 1, chaque 6 ajoute un dé (explosion en chaîne) ;
 *  - dR : encaissement et récupération, chaque 4-6 compte 1, sans explosion ;
 *  - Nd6 : somme simple.
 */

export const HIT_THRESHOLD = 4;

/** Nombre de dés comptant 1 (4, 5 ou 6). */
export function countHits(faces = []) {
  return faces.filter(f => Number(f) >= HIT_THRESHOLD).length;
}

/**
 * Formule Foundry d'une réserve.
 * @param {number} n  nombre de dés
 * @param {"dX"|"dR"|"d6"} kind
 */
export function poolFormula(n, kind) {
  const dice = Math.max(0, Math.floor(Number(n) || 0));
  if (dice === 0) return "0";
  if (kind === "dX") return `${dice}d6x6cs>=${HIT_THRESHOLD}`;
  if (kind === "dR") return `${dice}d6cs>=${HIT_THRESHOLD}`;
  return `${dice}d6`;
}

/**
 * Simule une réserve à partir d'une suite de faces (tests, démonstration).
 * Pour dX, chaque 6 consomme une face supplémentaire de la suite.
 * @returns {{faces:number[], hits:number, explosions:number}}
 */
export function resolvePool(n, kind, faceSequence = []) {
  const seq = [...faceSequence];
  const faces = [];
  let pending = Math.max(0, Math.floor(Number(n) || 0));
  let explosions = 0;
  while (pending > 0 && seq.length) {
    const f = Number(seq.shift());
    faces.push(f);
    pending--;
    if (kind === "dX" && f === 6) { pending++; explosions++; }
  }
  return { faces, hits: countHits(faces), explosions };
}

/** Perte de Vitalité nette après encaissement (jamais négative). */
export function netLoss(damageHits, soakHits) {
  return Math.max(0, (Number(damageHits) || 0) - (Number(soakHits) || 0));
}
