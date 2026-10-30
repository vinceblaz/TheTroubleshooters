/**
 * Fiche du Risque-tout (Actor « character ») — phase 1 : fiche fonctionnelle sobre.
 * Les jets (phase 2) et la charte graphique (phase 10) viendront ensuite.
 */
import { SYSTEM_PATH, THETROUBLESHOOTERS } from "../config.mjs";
import { SKILLS, SKILL_FAMILIES } from "../domain/rules/skills.mjs";
import { enrich, confirmDeleteItem, itemFromEvent } from "./sheet-helpers.mjs";
import { rollCharacterSkill } from "../services/roll-service.mjs";
import { sheetActivations, ACTIVATION_TYPES } from "../domain/rules/activations.mjs";
import { activateFromSheet } from "../services/ability-service.mjs";
import { triggerFlaw, activeFlawPenalties } from "../services/flaw-service.mjs";
import { proposeSpend } from "../apps/spend-dialog.mjs";
import { startAttack, reloadWeapon, catchBreath, setProne } from "../services/attack-service.mjs";
import { reassessInitiative, pickHealer } from "../services/combat-service.mjs";
import { conditionRows, conditionPanelActions, patchUpWounded } from "../services/condition-service.mjs";
import { kitGroups, acquireKit, useKit } from "../services/equipment-service.mjs";
import { ChargenApp } from "../apps/chargen-app.mjs";
import { ProgressionApp } from "../apps/progression-app.mjs";
import { languagePips } from "../domain/rules/progression.mjs";
import { passportNumber, mrzLines, vitalityBoxes } from "../domain/rules/passport.mjs";
import { weaponsOf, protectionOf, drunkLevelsOf, statusesOf, combatantOf, defenseChoicesOf } from "../services/combat-actors.mjs";

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
      toggleItemFlag: TTSCharacterSheet.#onToggleItemFlag,
      rollSkill: TTSCharacterSheet.#onRollSkill,
      activateAbility: TTSCharacterSheet.#onActivateAbility,
      triggerFlaw: TTSCharacterSheet.#onTriggerFlaw,
      proposeSpend: TTSCharacterSheet.#onProposeSpend,
      removeEffect: TTSCharacterSheet.#onRemoveEffect,
      attack: TTSCharacterSheet.#onAttack,
      reload: TTSCharacterSheet.#onReload,
      catchBreath: TTSCharacterSheet.#onCatchBreath,
      useKit: TTSCharacterSheet.#onUseKit,
      prone: TTSCharacterSheet.#onProne,
      reassess: TTSCharacterSheet.#onReassess,
      toggleStatus: TTSCharacterSheet.#onToggleStatus,
      levelUp: TTSCharacterSheet.#onLevelUp,
      levelDown: TTSCharacterSheet.#onLevelDown,
      exitRoll: TTSCharacterSheet.#onExitRoll,
      patchUp: TTSCharacterSheet.#onPatchUp,
      chargen: TTSCharacterSheet.#onChargen,
      progression: TTSCharacterSheet.#onProgression,
      rollLanguage: TTSCharacterSheet.#onRollLanguage
    }
  };

  /** Bouton d'en-tête « Création » (phase 8). */
  _getHeaderControls() {
    const controls = super._getHeaderControls();
    if (this.document.isOwner) {
      controls.unshift({ icon: "fa-solid fa-arrow-trend-up", label: "TTS.Progression.Open", action: "progression" });
      controls.unshift({ icon: "fa-solid fa-user-plus", label: "TTS.Chargen.Open", action: "chargen" });
    }
    return controls;
  }

  static #onChargen() { ChargenApp.open(this.document); }

  static #onProgression() { ProgressionApp.open(this.document); }

  /** Jet de Langues pour une langue en apprentissage : +1 pip par croix (LdB p. 128). */
  static #onRollLanguage(event, target) {
    const item = itemFromEvent(this.document, target);
    if (!item) return;
    const pips = languagePips(item.system);
    return rollCharacterSkill(this.document, "languages", { extraMods: pips ? [{ label: `${item.name} (${item.system.crosses} ×)`, pips }] : [] });
  }

  static PARTS = {
    header: { template: `${SYSTEM_PATH}/templates/actor/character-header.hbs` },
    tabs: { template: `${SYSTEM_PATH}/templates/shared/tabs.hbs` },
    skills: { template: `${SYSTEM_PATH}/templates/actor/character-skills.hbs`, scrollable: [""] },
    traits: { template: `${SYSTEM_PATH}/templates/actor/character-traits.hbs`, scrollable: [""] },
    combat: { template: `${SYSTEM_PATH}/templates/actor/character-combat.hbs`, scrollable: [""] },
    gear: { template: `${SYSTEM_PATH}/templates/actor/character-gear.hbs`, scrollable: [""] },
    bio: { template: `${SYSTEM_PATH}/templates/actor/character-bio.hbs`, scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "skills", label: "TTS.Tab.Skills" },
        { id: "traits", label: "TTS.Tab.Traits" },
        { id: "combat", label: "TTS.Tab.Combat" },
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

    const abilityRows = items.ability.map(item => ({
      item,
      acts: sheetActivations(item.system).map(({ act, index }) => ({
        index,
        cost: act.cost,
        label: act.label || game.i18n.localize(`TTS.ActivationType.${act.type}`)
      })),
      cardCount: (item.system.activations ?? []).filter(a => ["card", "dialog", "attack"].includes(ACTIVATION_TYPES[a.type]?.where)).length
    }));
    const penalties = activeFlawPenalties(actor).map(p => ({
      ...p,
      skillsLabel: p.skills?.length ? p.skills.map(k => game.i18n.localize(THETROUBLESHOOTERS.skills[k]?.label ?? k)).join(", ") : game.i18n.localize("TTS.Flaw.AllRolls")
    }));

    const statuses = statusesOf(actor);
    const combatant = combatantOf(actor);
    const combat = {
      weapons: weaponsOf(actor).map(w => ({
        ...w,
        skillLabel: game.i18n.localize(THETROUBLESHOOTERS.skills[w.skill]?.label ?? w.skill),
        tags: [w.flags.ammo ? `${game.i18n.localize("TTS.Weapon.Ammo")} ${w.flags.ammo}` : "", ...w.flags.others].filter(Boolean),
        flagTags: Object.entries(w.flags).filter(([k, v]) => v === true).map(([k]) => game.i18n.localize(`TTS.Weapon.Flag.${k}`)),
        usable: !w.empty && !w.jammed && !w.broken
      })),
      protection: protectionOf(actor),
      drunk: drunkLevelsOf(actor),
      defenses: defenseChoicesOf(actor),
      conditions: conditionRows(actor),
      inCombat: Boolean(combatant),
      initiative: combatant?.initiative ?? null,
      prone: statuses.includes("vulnerable")
    };

    const number = passportNumber(actor.id);
    const passport = {
      number,
      mrz: mrzLines({ name: actor.name, nationality: system.identity.nationality, number }),
      vitality: vitalityBoxes(system.vitality.value, system.vitality.max),
      activeStamps: combat.conditions.filter(c => c.active).slice(0, 3)
    };

    return Object.assign(context, {
      actor,
      combat,
      passport,
      gear: kitGroups(actor),
      abilityRows,
      penalties,
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

  /** Jet de compétence (phase 2). */
  static async #onRollSkill(event, target) {
    const key = target.closest("[data-skill]")?.dataset.skill;
    if (key) await rollCharacterSkill(this.document, key);
  }

  static async #onActivateAbility(event, target) {
    const item = itemFromEvent(this.document, target);
    await activateFromSheet(this.document, item, Number(target.dataset.index));
  }

  static async #onTriggerFlaw(event, target) {
    await triggerFlaw(this.document, itemFromEvent(this.document, target));
  }

  static async #onProposeSpend() {
    await proposeSpend(this.document);
  }

  /** Retire un malus de scène (le joueur peut le lever lui-même, le Chef arbitre). */
  static async #onRemoveEffect(event, target) {
    const id = target.closest("[data-effect-id]")?.dataset.effectId;
    if (id) await this.document.deleteEmbeddedDocuments("ActiveEffect", [id]);
  }

  /* Combat (phase 4) */
  static async #onAttack(event, target) {
    const ref = target.closest("[data-weapon-ref]")?.dataset.weaponRef;
    if (ref) await startAttack(this.document, ref);
  }

  static async #onReload(event, target) {
    const ref = target.closest("[data-weapon-ref]")?.dataset.weaponRef;
    if (ref) await reloadWeapon(this.document, ref);
  }

  static async #onUseKit(event, target) {
    await useKit(this.document, itemFromEvent(this.document, target));
  }

  /**
   * Kit déposé depuis un compendium ou le monde : choix de l'origine, achat soumis au Chef (phase 7).
   * @override
   */
  async _onDropItem(event, item) {
    if (item?.type === "kit" && item.parent !== this.document && this.document.isOwner) {
      return acquireKit(this.document, item);
    }
    return super._onDropItem(event, item);
  }

  static async #onCatchBreath() {
    await catchBreath(this.document);
  }

  static async #onProne(event, target) {
    await setProne(this.document, target.dataset.prone === "true");
  }

  static async #onReassess() {
    await reassessInitiative(this.document);
  }

  /** Bascule d'une condition (le Chef arbitre) ; une condition cumulative démarre au niveau 1. */
  static async #onToggleStatus(event, target) {
    await conditionPanelActions.toggleStatus(this.document, target.dataset.status);
  }

  static async #onLevelUp(event, target) {
    await conditionPanelActions.levelUp(this.document, target.dataset.status);
  }

  static async #onLevelDown(event, target) {
    await conditionPanelActions.levelDown(this.document, target.dataset.status);
  }

  /** Jet pour se débarrasser d'une condition (Volonté, Agilité…). */
  static async #onExitRoll(event, target) {
    await conditionPanelActions.exitRoll(this.document, target.dataset.status, target.dataset.skill);
  }

  /** Blessé : un allié tente un jet de Médecine pour ignorer le malus pendant la scène. */
  static async #onPatchUp() {
    const healer = await pickHealer(this.document.uuid);
    if (healer) await patchUpWounded(healer, this.document);
  }

  /** Bascule un booléen d'un Item intégré (kit emporté, signature…). */
  static async #onToggleItemFlag(event, target) {
    const item = itemFromEvent(this.document, target);
    const path = target.dataset.flag;
    if (!item || !path) return;
    await item.update({ [path]: !foundry.utils.getProperty(item, path) });
  }
}
