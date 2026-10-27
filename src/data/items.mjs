/**
 * Modèles de données — Items (bible §6.4).
 */
import { SKILL_KEYS } from "../domain/rules/skills.mjs";
import { intField, stringField, htmlField, boolField, sourceField, descriptorField } from "./fields.mjs";

const { fields } = foundry.data;

const skillKeyField = (initial = "") => stringField(initial, { choices: ["", ...SKILL_KEYS] });

/** Archétype (LdB p. 38-45). */
export class ArchetypeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      skills: new fields.SchemaField({
        primary: skillKeyField(),
        secondary: new fields.ArrayField(skillKeyField(), { initial: ["", "", "", ""] }),
        tertiary: new fields.ArrayField(skillKeyField(), { initial: ["", "", "", "", "", ""] })
      }),
      abilities: new fields.ArrayField(stringField()),       // uuids ou noms des 5 capacités proposées
      flaws: new fields.ArrayField(stringField()),           // 3 désavantages proposés
      vitality: intField(5, { min: 4, max: 7 }),
      extraLanguages: intField(0, { min: 0, max: 5 }),
      kits: new fields.ArrayField(stringField()),            // 3 kits (« A | B » pour un choix exclusif)
      suggestedHooks: new fields.ArrayField(stringField()),
      ignorePrerequisites: boolField(true),
      description: htmlField(),
      source: sourceField()
    };
  }
}

/** Capacité (LdB p. 60-73). Les activations sont structurées en phase 3. */
export class AbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      level: intField(0, { min: 0, max: 9 }),
      prerequisites: new fields.SchemaField({
        skills: new fields.ArrayField(new fields.SchemaField({
          key: skillKeyField(),
          min: intField(65, { min: 0, max: 106 })
        })),
        abilities: new fields.ArrayField(stringField())
      }),
      learnWith: new fields.SetField(stringField("", { choices: SKILL_KEYS, blank: false })),
      cost: intField(5, { min: 1, max: 12 }),
      crosses: intField(0, { min: 0, max: 12 }),
      acquired: boolField(true),
      specialization: stringField(),
      activations: new fields.ArrayField(new fields.ObjectField()),
      description: htmlField(),
      source: sourceField()
    };
  }
}

/** Désavantage (LdB p. 74-77). */
export class FlawData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      triggers: new fields.ArrayField(new fields.SchemaField({
        label: stringField(),
        gain: intField(3, { min: 0, max: 9 }),
        mode: stringField("penalty", { choices: ["penalty", "fail", "condition", "absent", "free"], blank: false }),
        skills: new fields.ArrayField(stringField()),
        condition: stringField()
      })),
      target: stringField(),
      description: htmlField(),
      source: sourceField()
    };
  }
}

/** Accroche scénaristique (LdB p. 46-49) — aucune mécanique (règle d'or). */
export class HookData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: htmlField(),
      source: sourceField()
    };
  }
}

/** Kit de matériel (LdB p. 108-125), y compris armes, protections et véhicules. */
export class KitData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      storyPointCost: intField(1, { min: 0, max: 12 }),
      contents: stringField(),
      prerequisites: stringField(),                   // texte en phase 1, structuré si besoin plus tard
      category: stringField("standard", { choices: ["standard", "spyTech", "superScience", "ancientLore", "lostLore"], blank: false }),
      descriptors: new fields.ArrayField(descriptorField()),
      hasWeapon: boolField(false),
      weapon: new fields.SchemaField({
        skill: stringField("shooting", { choices: ["melee", "shooting"], blank: false }),
        damage: intField(5, { min: 0, max: 20 }),
        descriptors: stringField(),
        ammo: stringField(),                          // plage munitions (X), ex. « 9-0 »
        empty: boolField(false),
        jammed: boolField(false)
      }),
      hasProtection: boolField(false),
      protection: new fields.SchemaField({
        dice: intField(1, { min: 0, max: 10 }),
        initiativePenalty: intField(0, { min: 0, max: 10 })
      }),
      carried: boolField(true),
      signature: boolField(false),
      signatureDescription: stringField(),
      origin: stringField("owned", { choices: ["owned", "mission", "purchased", "juryRigged", "found"], blank: false }),
      uses: intField(null, { min: 0, max: 9, nullable: true }),
      description: htmlField(),
      source: sourceField()
    };
  }
}

/** Langue (LdB p. 27, 128). */
export class LanguageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      fluent: boolField(true),
      native: boolField(false),
      crosses: intField(0, { min: 0, max: 5 })
    };
  }

  prepareDerivedData() {
    if (this.crosses >= 5) this.fluent = true;
  }
}
