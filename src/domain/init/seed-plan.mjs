/**
 * Plan d'initialisation idempotent des compendiums — logique pure (D-017).
 *
 * Compare un catalogue source (entrées portant `seedKey`) aux documents déjà présents
 * dans un compendium (portant le même `seedKey` en drapeau) et en déduit
 * les créations, mises à jour et entrées inchangées. Rien n'est jamais supprimé :
 * une entrée présente dans le compendium mais absente du catalogue est seulement signalée.
 */

/**
 * @param {Array<{seedKey:string, data:object}>} catalog
 * @param {Array<{id:string, seedKey:string, data:object}>} existing
 * @returns {{create:object[], update:Array<{id:string, data:object}>, unchanged:string[], orphans:string[], duplicates:string[]}}
 */
export function planSeed(catalog = [], existing = []) {
  const plan = { create: [], update: [], unchanged: [], orphans: [], duplicates: [] };

  const seen = new Set();
  for (const entry of catalog) {
    if (!entry?.seedKey) continue;
    if (seen.has(entry.seedKey)) plan.duplicates.push(entry.seedKey);
    seen.add(entry.seedKey);
  }

  const byKey = new Map();
  for (const doc of existing) if (doc?.seedKey) byKey.set(doc.seedKey, doc);

  const handled = new Set();
  for (const entry of catalog) {
    if (!entry?.seedKey || handled.has(entry.seedKey)) continue;
    handled.add(entry.seedKey);
    const doc = byKey.get(entry.seedKey);
    if (!doc) plan.create.push(entry.data);
    else if (isSubsetEqual(entry.data, doc.data)) plan.unchanged.push(entry.seedKey);
    else plan.update.push({ id: doc.id, data: entry.data });
  }

  for (const key of byKey.keys()) if (!handled.has(key)) plan.orphans.push(key);
  return plan;
}

/** Vrai si chaque valeur de `source` est égale dans `target` (les champs en plus dans target sont ignorés). */
export function isSubsetEqual(source, target) {
  if (source === target) return true;
  if (Array.isArray(source)) {
    return Array.isArray(target) && source.length === target.length
      && source.every((v, i) => isSubsetEqual(v, target[i]));
  }
  if (source && typeof source === "object") {
    if (!target || typeof target !== "object") return false;
    return Object.keys(source).every(k => isSubsetEqual(source[k], target[k]));
  }
  return false;
}

/**
 * Comparaison sémantique de versions "1.2.3" (les segments manquants valent 0).
 * @returns {-1|0|1}
 */
export function compareVersions(a, b) {
  const pa = String(a ?? "0").split(".").map(n => parseInt(n, 10) || 0);
  const pb = String(b ?? "0").split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** L'initialisation doit-elle être (re)proposée ? */
export function needsInitialization(initializedVersion, systemVersion) {
  if (!initializedVersion) return true;
  return compareVersions(initializedVersion, systemVersion) < 0;
}
