/**
 * Armes — lecture des descripteurs et plages numériques (LdB p. 92-93, 114-115, 206).
 * Logique pure : le texte libre saisi sur un kit ou une attaque de PNJ devient des drapeaux.
 */

/** Profil « mains nues » toujours disponible pour un Risque-tout (LdB p. 114 : 2dX). */
export const UNARMED = Object.freeze({ name: "", skill: "melee", damage: 2, descriptors: "", ammo: "" });

const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Plage d'unités « 9-0 », « 7-0 », « 0 », « 5-6 ». Le 0 vaut 10 dans une plage qui s'y termine.
 * @returns {number[]|null} unités (0-9) couvertes, ou null si la plage est vide ou illisible
 */
export function parseRange(text) {
  const m = norm(text).match(/^(\d)\s*(?:-\s*(\d))?$/);
  if (!m) return null;
  const a = Number(m[1]);
  if (m[2] === undefined) return [a];
  let b = Number(m[2]);
  const from = a === 0 ? 10 : a;
  if (b === 0) b = 10;
  if (b < from) return null;
  const out = [];
  for (let u = from; u <= b; u++) out.push(u % 10);
  return out;
}

/** Les unités sont-elles dans la plage ? */
export function inRange(units, range) {
  const list = Array.isArray(range) ? range : parseRange(range);
  return Boolean(list?.includes(Number(units) % 10));
}

const FLAG_PATTERNS = [
  ["oneShot", /^un coup$/],
  ["thrown", /^lance$/],
  ["precise", /^precis$/],
  ["sharp", /^aiguise$/],
  ["cutting", /^tranchant$/],
  ["reach", /^allonge$/],
  ["trip", /^croche[- ]?patte$/],
  ["nonLethal", /^non[- ]letal$/],
  ["paralyzing", /^paralysant$/],
  ["snare", /^collet$/],
  ["fragile", /^fragile$/],
  ["shortRange", /^portee courte/],
  ["quickReload", /^rechargement rapide$/],
  ["hardReload", /^rechargement difficile$/],
  ["counter", /^contre(-attaque)?$/],
  ["noisy", /^bruyant$/],
  ["silent", /^silencieux$/],
  ["encumbering", /^encombrant$/]
];

/**
 * Drapeaux d'une arme.
 * @param {string} text  descripteurs séparés par des virgules (« Bruyant, munitions (9-0) »)
 * @param {{ammo?:string}} [extra]  champ « munitions » dédié du kit (prioritaire)
 * @returns {object} { ammo, oneShot, thrown, precise, sharp, cutting, reach, trip, nonLethal, paralyzing,
 *                     snare, fragile, incendiary, shortRange, quickReload, hardReload, counter, noisy, silent,
 *                     encumbering, others:string[] }
 */
export function parseWeaponDescriptors(text = "", { ammo = "" } = {}) {
  const flags = Object.fromEntries(FLAG_PATTERNS.map(([k]) => [k, false]));
  flags.ammo = "";
  flags.incendiary = "";
  flags.others = [];
  for (const raw of String(text ?? "").split(/[,;]/)) {
    const token = norm(raw);
    if (!token) continue;
    const withValue = token.match(/^(munitions|incendiaire)\s*\(([^)]*)\)$/);
    if (withValue) {
      flags[withValue[1] === "munitions" ? "ammo" : "incendiary"] = withValue[2].replace(/\s/g, "");
      continue;
    }
    if (token === "incendiaire") { flags.incendiary = "6"; continue; }
    const hit = FLAG_PATTERNS.find(([, re]) => re.test(token));
    if (hit) flags[hit[0]] = true;
    else flags.others.push(raw.trim());
  }
  if (String(ammo ?? "").trim()) flags.ammo = String(ammo).replace(/\s/g, "");
  if (flags.ammo && !parseRange(flags.ammo)) flags.ammo = "";
  return flags;
}

/** Arme à distance ? (compétence Tir, ou arme lancée) */
export function isRanged(weapon, flags) {
  return weapon?.skill === "shooting" || Boolean(flags?.thrown);
}
