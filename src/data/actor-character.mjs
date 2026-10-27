/**
 * Modèle de données — Actor « character » (bible §6.2).
 */
import { SKILLS } from "../domain/rules/skills.mjs";
import { effectiveMaxVitality, clampVitality } from "../domain/rules/vitality.mjs";
import { extraLanguagesAllowed, carriedKitStatus, DEFAULT_SESSION_STORY_POINTS } from "../domain/rules/character.mjs";
import { intField, skillValueField, stringField, htmlField, boolField } from "./fields.mjs";

const { fields } = foundry.data;

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const skills = {};
    for (const { key } of SKILLS) {
      skills[key] = new fields.SchemaField({
        value: skillValueField(),
        improvement: boolField(false)
      });
    }

    return {
      identity: new fields.SchemaField({
        concept: stringField(),
        nationality: stringField(),
        birthplace: stringField(),
        residence: stringField(),
        age: stringField(),
        height: stringField(),
        weight: stringField(),
        distinctiveFeatures: stringField(),
        biography: htmlField(),
        meeting: htmlField()
      }),
      skills: new fields.SchemaField(skills),
      vitality: new fields.SchemaField({
        value: intField(4, { min: 0 }),
        max: intField(4, { min: 0 }),          // dérivée, recalculée dans prepareDerivedData
        bonus: intField(0)
      }),
      storyPoints: new fields.SchemaField({
        value: intField(DEFAULT_SESSION_STORY_POINTS, { min: 0 })
      }),
      archetype: stringField(),
      team: new fields.SchemaField({
        homeBase: stringField()
      }),
      combat: new fields.SchemaField({
        inCover: boolField(false)
      }),
      progression: new fields.SchemaField({
        freeTicks: intField(0, { min: 0 }),
        xp: intField(0, { min: 0 }),
        downtimePeriods: intField(0, { min: 0 }),
        pendingStartBonus: intField(0, { min: 0 }),
        rewardRolls: new fields.ArrayField(new fields.SchemaField({
          skill: stringField(),
          source: stringField()
        }))
      }),
      notes: htmlField(),
      clues: htmlField()
    };
  }

  prepareDerivedData() {
    const s = this.skills;
    // Épuisé (cumulatif) sera lu depuis les conditions en phase 5.
    const exhaustedLevels = 0;
    this.vitality.max = effectiveMaxVitality(
      { agility: s.agility.value, melee: s.melee.value, shooting: s.shooting.value },
      this.vitality.bonus,
      exhaustedLevels
    );
    this.vitality.value = clampVitality(this.vitality.value, this.vitality.max);

    this.derived = {
      extraLanguagesAllowed: extraLanguagesAllowed(s.languages.value),
      kits: carriedKitStatus(this.parent?.items?.filter(i => i.type === "kit").map(i => i.system) ?? [])
    };
  }
}
