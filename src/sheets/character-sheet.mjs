/**
 * Fiche du Risque-tout (Actor « character ») — phase 1 : fiche fonctionnelle sobre.
 * Les jets (phase 2) et la charte graphique (phase 10) viendront ensuite.
 */
import { SYSTEM_PATH, THETROUBLESHOOTERS } from "../config.mjs";
import { SKILLS, SKILL_FAMILIES } from "../domain/rules/skills.mjs";
import { enrich, confirmDeleteItem, itemFromEvent } from "./sheet-helpers.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const ITEM_GROUPS = ["ability", "flaw", "hook", "kit", "language", "archetype"];

export class TTSCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["thetroubleshooters", "tts-sheet", "tts-character"],
    position: { width: 760, height: 820 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      createItem: TTSCharacterSheet.#onCreateItem,
      editItem: TTSCharacterSheet.#onEditItem,
      deleteItem: TTSCharacterSheet.#onDeleteItem,
      toggleItemFlag: TTSCharacterSheet.#onToggleItemFlag
    }
  };

  static PARTS = {
    header: { template: `${SYSTEM_PATH}/templates/actor/character-header.hbs` },
    tabs: { template: `${SYSTEM_PATH}/templates/shared/tabs.hbs` },
    skills: { template: `${SYSTEM_PATH}/templates/actor/character-skills.hbs`, scrollable: [""] },
    traits: { template: `${SYSTEM_PATH}/templates/actor/character-traits.hbs`, scrollable: [""] },
    gear: { template: `${SYSTEM_PATH}/templates/actor/character-gear.hbs`, scrollable: [""] },
    bio: { template: `${SYSTEM_PATH}/templates/actor/character-bio.hbs`, scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "skills", label: "TTS.Tab.Skills" },
        { id: "traits", label: "TTS.Tab.Traits" },
        { id: "gear", label: "TTS.Tab.Gear" },
        { id: "bio", label: "TTS.Tab.Bio" }
      ],
      initial: "skills"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const system = actor.system;

    const families = SKILL_FAMILIES.map(family => ({
      family,
      label: THETROUBLESHOOTERS.skillFamilies[family],
      skills: SKILLS.filter(s => s.family === family).map(s => ({
        key: s.key,
        label: THETROUBLESHOOTERS.skills[s.key].label,
        value: system.skills[s.key].value,
        improvement: system.skills[s.key].improvement
      }))
    }));

    const items = Object.fromEntries(ITEM_GROUPS.map(t => [t, []]));
    for (const item of [...actor.items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))) {
      if (items[item.type]) items[item.type].push(item);
    }

    return Object.assign(context, {
      actor,
      system,
      source: actor.system._source,
      config: THETROUBLESHOOTERS,
      systemFields: system.schema.fields,
      families,
      items,
      kitStatus: system.derived?.kits ?? { carried: 0, max: 5, over: false },
      extraLanguagesAllowed: system.derived?.extraLanguagesAllowed ?? 0,
      maxStoryPoints: game.settings.get("thetroubleshooters", "maxStoryPoints"),
      tabs: this._prepareTabs("primary"),
      enriched: {
        biography: await enrich(system.identity.biography, actor),
        meeting: await enrich(system.identity.meeting, actor),
        notes: await enrich(system.notes, actor),
        clues: await enrich(system.clues, actor)
      }
    });
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (context.tabs?.[partId]) context.tab = context.tabs[partId];
    return context;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static async #onCreateItem(event, target) {
    const type = target.dataset.type;
    if (!type) return;
    const name = game.i18n.format("TTS.Sheet.NewItem", { type: game.i18n.localize(`TYPES.Item.${type}`) });
    const [item] = await this.document.createEmbeddedDocuments("Item", [{ name, type }]);
    item?.sheet.render(true);
  }

  static #onEditItem(event, target) {
    itemFromEvent(this.document, target)?.sheet.render(true);
  }

  static async #onDeleteItem(event, target) {
    await confirmDeleteItem(itemFromEvent(this.document, target));
  }

  /** Bascule un booléen d'un Item intégré (kit emporté, signature…). */
  static async #onToggleItemFlag(event, target) {
    const item = itemFromEvent(this.document, target);
    const path = target.dataset.flag;
    if (!item || !path) return;
    await item.update({ [path]: !foundry.utils.getProperty(item, path) });
  }
}
