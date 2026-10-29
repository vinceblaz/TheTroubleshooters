/**
 * Modèle de données — Actor « npc » (bible §6.3, LdB p. 204-209).
 */
import { NPC_RANKS, rankCapabilities } from "../domain/rules/npc.mjs";
import { clampVitality } from "../domain/rules/vitality.mjs";
import { intField, percentField, stringField, htmlField, boolField, descriptorField } from "./fields.mjs";

const { fields } = foundry.data;

export class NpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rank: stringField("henchman", { choices: NPC_RANKS, blank: false }),
      baseSkill: percentField(35),
      specialty: new fields.SchemaField({
        value: percentField(55),
        domain: stringField()
      }),
      skills: new fields.ArrayField(new fields.SchemaField({
        name: stringField(),
        value: percentField(45),
        kind: stringField("important", { choices: ["important", "flavor"], blank: false })
      })),
      attacks: new fields.ArrayField(new fields.SchemaField({
        name: stringField(),
        value: percentField(45),
        skill: stringField("melee", { choices: ["melee", "shooting"], blank: false }),   // phase 4 : corps-à-corps ou distance
        damage: intField(2, { min: 0, max: 20 }),
        descriptors: stringField(),                    // texte libre lu par parseWeaponDescriptors (phase 4)
        empty: boolField(false),                       // arme vide (munitions, un coup, lancé)
        uses: intField(1, { min: 1, max: 9, nullable: true }),
        range: intField(null, { min: 0, max: 20, nullable: true }),
        counter: boolField(false)
      })),
      defense: intField(null, { min: 0, max: 106, nullable: true }),
      protection: intField(0, { min: 0, max: 10 }),    // dés d'encaissement (dR), ex. « armure 3dR »
      vitality: new fields.SchemaField({
        value: intField(5, { min: 0 }),
        max: intField(5, { min: 0 })
      }),
      initiative: new fields.SchemaField({
        mode: stringField("fixed", { choices: ["fixed", "roll"], blank: false }),
        value: intField(7, { min: 0, max: 30 })
      }),
      descriptors: new fields.ArrayField(descriptorField()),
      counters: new fields.SchemaField({
        reversesLeft: intField(0, { min: 0 })
      }),
      description: htmlField()
    };
  }

  prepareDerivedData() {
    this.vitality.value = clampVitality(this.vitality.value, this.vitality.max);
    this.capabilities = rankCapabilities(this.rank);
  }
}
