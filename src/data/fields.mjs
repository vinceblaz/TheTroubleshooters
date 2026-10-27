/**
 * Champs partagés des modèles de données.
 */
import { SKILL_MIN, SKILL_MAX } from "../domain/rules/skills.mjs";

const { fields } = foundry.data;

/** Entier borné, obligatoire, avec valeur initiale. */
export function intField(initial = 0, { min, max, nullable = false } = {}) {
  return new fields.NumberField({ required: true, nullable, integer: true, initial, min, max });
}

/** Valeur de compétence 15..106 (initiale 15). */
export function skillValueField(initial = SKILL_MIN) {
  return intField(initial, { min: SKILL_MIN, max: SKILL_MAX });
}

/** Valeur en pourcentage libre 0..106 (PNJ, attaques). */
export function percentField(initial = 35) {
  return intField(initial, { min: 0, max: SKILL_MAX });
}

/** Texte court. */
export function stringField(initial = "", { choices, blank = true } = {}) {
  return new fields.StringField({ required: true, blank, initial, choices });
}

/** Texte riche. */
export function htmlField() {
  return new fields.HTMLField({ required: true, blank: true, initial: "" });
}

/** Booléen. */
export function boolField(initial = false) {
  return new fields.BooleanField({ required: true, initial });
}

/** Référence de page du livre de base (« LdB p. 62 »). */
export function sourceField() {
  return stringField("");
}

/** Descripteur générique { key, pips, situation, value } (kits, PNJ). */
export function descriptorField() {
  return new fields.SchemaField({
    key: stringField(""),
    pips: intField(0, { min: -9, max: 9 }),
    situation: stringField(""),
    value: stringField("")
  });
}
