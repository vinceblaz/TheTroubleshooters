/**
 * Fin de combat — logique pure (LdB p. 99, bible §10.6).
 * Vitalité remise au maximum, Danger de mort retiré ; Hors de combat et Blessé persistent.
 */

/** Mise à jour d'un combattant à la fin du combat. */
export function endOfCombatFor({ vitality = 0, max = 0, statuses = [] } = {}) {
  return {
    vitality: Math.max(Number(vitality) || 0, Number(max) || 0),
    removeStatuses: statuses.includes("mortalDanger") ? ["mortalDanger"] : [],
    outOfAction: statuses.includes("outOfAction")
  };
}

/** Tous les Risque-tout du combat sont-ils Hors de combat ? (suggestion « Capturés ! ») */
export function allCharactersDown(characters = []) {
  return characters.length > 0 && characters.every(c => (c.statuses ?? []).includes("outOfAction"));
}
