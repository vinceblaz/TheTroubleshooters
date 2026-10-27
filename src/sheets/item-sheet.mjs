/**
 * Fiche d'Item commune — un gabarit de corps par type.
 * Phase 1 : champs simples, listes en texte, lignes de descripteurs et de déclencheurs.
 * Les activations structurées des capacités arrivent en phase 3.
 */
import { SYSTEM_PATH, THETROUBLESHOOTERS } from "../config.mjs";
import { SKILL_KEYS } from "../domain/rules/skills.mjs";
import { normalizeArrayPaths, normalizeListPaths } from "./form-utils.mjs";
import { enrich, localizedRecord } from "./sheet-helpers.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export const ITEM_BODY_PARTIALS = Object.fromEntries(
  ["archetype", "ability", "flaw", "hook", "kit", "language"]
    .map(t => [t, `${SYSTEM_PATH}/templates/item/parts/${t}.hbs`])
);

/** Champs saisis en lignes de tableau (objets à clés numériques → tableaux). */
const ARRAY_PATHS = ["system.skills.secondary", "system.skills.tertiary", "system.descriptors", "system.triggers"];
/** Champs saisis en texte, une entrée par ligne. */
const LIST_PATHS = ["system.abilities", "system.flaws", "system.kits", "system.suggestedHooks", "system.prerequisites.abilities"];

const BLANK_ROWS = {
  descriptors: { key: "", pips: 0, situation: "", value: "" },
  triggers: { label: "", gain: 3, mode: "penalty", skills: [], condition: "" }
};

export class TTSItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["thetroubleshooters", "tts-sheet", "tts-item"],
    position: { width: 580, height: 680 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      addRow: TTSItemSheet.#onAddRow,
      removeRow: TTSItemSheet.#onRemoveRow
    }
  };

  static PARTS = {
    header: { template: `${SYSTEM_PATH}/templates/item/item-header.hbs` },
    body: { template: `${SYSTEM_PATH}/templates/item/item-body.hbs`, scrollable: [""] }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    const system = item.system;
    const skillChoices = Object.fromEntries(SKILL_KEYS.map(k => [k, game.i18n.localize(THETROUBLESHOOTERS.skills[k].label)]));
    const lines = arr => (arr ?? []).join("\n");

    return Object.assign(context, {
      item,
      system,
      config: THETROUBLESHOOTERS,
      systemFields: system.schema.fields,
      bodyPartial: ITEM_BODY_PARTIALS[item.type],
      skillChoices,
      skillChoicesWithBlank: { "": "—", ...skillChoices },
      skillOptions: SKILL_KEYS.map(k => ({ value: k, label: skillChoices[k] })),
      learnWithValues: system.learnWith ? [...system.learnWith] : [],
      combatSkillChoices: { melee: skillChoices.melee, shooting: skillChoices.shooting },
      kitCategoryChoices: localizedRecord(THETROUBLESHOOTERS.kitCategories),
      kitOriginChoices: localizedRecord(THETROUBLESHOOTERS.kitOrigins),
      flawModeChoices: localizedRecord(THETROUBLESHOOTERS.flawTriggerModes),
      listText: {
        abilities: lines(system.abilities),
        flaws: lines(system.flaws),
        kits: lines(system.kits),
        suggestedHooks: lines(system.suggestedHooks),
        prerequisiteAbilities: lines(system.prerequisites?.abilities)
      },
      prerequisiteSkills: (system.prerequisites?.skills ?? []).map(p => ({ label: skillChoices[p.key] ?? p.key, min: p.min })),
      enrichedDescription: await enrich(system.description ?? "", item)
    });
  }

  /** @override */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    normalizeArrayPaths(data, ARRAY_PATHS);
    return normalizeListPaths(data, LIST_PATHS);
  }

  static async #onAddRow(event, target) {
    const path = target.dataset.path;
    const blank = BLANK_ROWS[path];
    if (!blank) return;
    const rows = foundry.utils.deepClone(this.document.system._source[path] ?? []);
    rows.push(foundry.utils.deepClone(blank));
    await this.document.update({ [`system.${path}`]: rows });
  }

  static async #onRemoveRow(event, target) {
    const path = target.dataset.path;
    const index = Number(target.closest("[data-index]")?.dataset.index);
    const rows = foundry.utils.deepClone(this.document.system._source[path] ?? []);
    if (!Number.isInteger(index) || index < 0 || index >= rows.length) return;
    rows.splice(index, 1);
    await this.document.update({ [`system.${path}`]: rows });
  }
}
