/**
 * Charte « Passeport » (phase 10) — logique pure d'affichage.
 * Bande de lecture automatique décorative (format des passeports, 44 caractères par ligne), numéro, cases de Vitalité.
 */

const MRZ_LEN = 44;

/** Majuscules sans accents, lettres et chiffres seulement ; autres caractères → « < ». */
export function mrzText(text = "") {
  return String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "<").replace(/^<+|<+$/g, "");
}

const pad = (s, n) => (s + "<".repeat(n)).slice(0, n);

/** Nom et prénoms : le dernier mot est le nom de famille. */
export function splitName(name = "") {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { surname: parts[0] ?? "", given: "" };
  return { surname: parts.at(-1), given: parts.slice(0, -1).join(" ") };
}

/** Numéro de passeport stable dérivé de l'identifiant du document (« RT 3F9A2C »). */
export function passportNumber(id = "") {
  const clean = mrzText(id).replace(/</g, "");
  return `RT ${(clean + "000000").slice(0, 6)}`;
}

/** Les deux lignes de lecture automatique (décoratives). */
export function mrzLines({ name = "", nationality = "", number = "" } = {}) {
  const { surname, given } = splitName(name);
  const line1 = pad(`P<RT${mrzText(surname)}<<${mrzText(given)}`, MRZ_LEN);
  const nat = pad(mrzText(nationality).replace(/</g, ""), 3);
  const num = pad(mrzText(number).replace(/</g, ""), 9);
  const line2 = pad(`${num}<${nat}<<<<<<<<<<<<<<<<`, MRZ_LEN - 2) + "04";
  return [line1, line2];
}

/** Cases de Vitalité : remplies jusqu'à la valeur, vides jusqu'au maximum. */
export function vitalityBoxes(value = 0, max = 0) {
  const m = Math.max(0, Math.min(12, Number(max) || 0));
  const v = Math.max(0, Math.min(m, Number(value) || 0));
  return Array.from({ length: m }, (_, i) => ({ filled: i < v }));
}
