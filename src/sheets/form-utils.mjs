/**
 * Utilitaires de formulaire — fonctions pures (testées).
 *
 * Foundry développe les noms « system.attacks.0.name » en objets à clés numériques
 * ({ 0: {...}, 1: {...} }). Les champs ArrayField attendent un tableau : on convertit
 * donc ces objets avant validation, en conservant l'ordre des index.
 */

/** Convertit un objet à clés numériques en tableau trié ; laisse le reste inchangé. */
export function numericObjectToArray(value) {
  if (Array.isArray(value) || value === null || typeof value !== "object") return value;
  const keys = Object.keys(value);
  if (!keys.length || !keys.every(k => /^\d+$/.test(k))) return value;
  return keys.map(Number).sort((a, b) => a - b).map(k => value[k]);
}

/**
 * Applique numericObjectToArray aux chemins donnés d'un objet développé (mutation en place).
 * @param {object} data   données de formulaire développées
 * @param {string[]} paths  chemins pointés, ex. ["system.attacks", "system.skills.secondary"]
 * @returns {object} data
 */
export function normalizeArrayPaths(data, paths) {
  for (const path of paths) {
    const parts = path.split(".");
    let node = data;
    for (let i = 0; i < parts.length - 1 && node; i++) node = node[parts[i]];
    const last = parts.at(-1);
    if (node && last in node) node[last] = numericObjectToArray(node[last]);
  }
  return data;
}

/** Découpe un texte multi-ligne (ou séparé par des virgules) en liste nettoyée. */
export function splitList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  return value.split(/[\n,]/).map(v => v.trim()).filter(Boolean);
}

/** Applique splitList aux chemins donnés (mutation en place). */
export function normalizeListPaths(data, paths) {
  for (const path of paths) {
    const parts = path.split(".");
    let node = data;
    for (let i = 0; i < parts.length - 1 && node; i++) node = node[parts[i]];
    const last = parts.at(-1);
    if (node && last in node) node[last] = splitList(node[last]);
  }
  return data;
}
