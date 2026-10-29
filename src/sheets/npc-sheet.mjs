/**
 * Fiche de personnage secondaire (Actor « npc ») — phase 1.
 */
import { SYSTEM_PATH, THETROUBLESHOOTERS } from "../config.mjs";
import { normalizeArrayPaths } from "./form-utils.mjs";
import { enrich, localizedRecord } from "./sheet-helpers.mjs";
import { rollNpcSkill } from "../services/roll-service.mjs";
import { startAttack } from "../services/attack-service.mjs";
import { conditionRows, conditionPanelActions, patchUpWounded } from "../services/condition-service.mjs";
import { pickHealer } from "../services/combat-service.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const ARRAY_PATHS = ["system.skills", "system.attacks", "system.descriptors"];

export class TTSNpcSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["thetroubleshooters", "tts-sheet", "tts-npc"],
    position: { width: 640, height: 760 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      addRow: TTSNpcSheet.#onAddRow,
      removeRow: TTSNpcSheet.#onRemoveRow,
      rollNpc: TTSNpcSheet.#onRollNpc,
      attack: TTSNpcSheet.#onAttack,
      toggleStatus: TTSNpcSheet.#onToggleStatus,
      levelUp: TTSNpcSheet.#onLevelUp,
      levelDown: TTSNpcSheet.#onLevelDown,
      exitRoll: TTSNpcSheet.#onExitRoll,
      patchUp: TTSNpcSheet.#onPatchUp
    }
  };

  static PARTS = {
    body: { template: `${SYSTEM_PATH}/templates/actor/npc-sheet.hbs`, scrollable: [""] }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    return Object.assign(context, {
      actor,
      system: actor.system,
      systemFields: actor.system.schema.fields,
      config: THETROUBLESHOOTERS,
      rankChoices: localizedRecord(THETROUBLESHOOTERS.npcRanks),
      initiativeChoices: localizedRecord(THETROUBLESHOOTERS.initiativeModes),
      attackSkillChoices: { melee: game.i18n.localize("TTS.Skill.Melee"), shooting: game.i18n.localize("TTS.Skill.Shooting") },
      kindChoices: { important: game.i18n.localize("TTS.Npc.SkillImportant"), flavor: game.i18n.localize("TTS.Npc.SkillFlavor") },
      capabilities: actor.system.capabilities,
      conditions: conditionRows(actor),
      enrichedDescription: await enrich(actor.system.description, actor)
    });
  }

  /** @override — convertit les lignes de tableau en ArrayField. */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    return normalizeArrayPaths(data, ARRAY_PATHS);
  }

  /** Jet de PNJ : compétence de base, spécialité ou ligne de compétence (phase 2). */
  static async #onRollNpc(event, target) {
    const source = target.dataset.source;
    const index = Number(target.closest("[data-index]")?.dataset.index);
    await rollNpcSkill(this.document, { source, index: Number.isInteger(index) ? index : undefined });
  }

  /** Attaque (phase 4) : la cible est le jeton ciblé. */
  static async #onAttack(event, target) {
    const ref = target.closest("[data-weapon-ref]")?.dataset.weaponRef;
    if (ref) await startAttack(this.document, ref);
  }

  /* Panneau des conditions (D-057 amendée : fiches PJ et PNJ) */
  static async #onToggleStatus(event, target) { await conditionPanelActions.toggleStatus(this.document, target.dataset.status); }
  static async #onLevelUp(event, target) { await conditionPanelActions.levelUp(this.document, target.dataset.status); }
  static async #onLevelDown(event, target) { await conditionPanelActions.levelDown(this.document, target.dataset.status); }
  static async #onExitRoll(event, target) { await conditionPanelActions.exitRoll(this.document, target.dataset.status, target.dataset.skill); }
  static async #onPatchUp() {
    const healer = await pickHealer(this.document.uuid);
    if (healer) await patchUpWounded(healer, this.document);
  }

  static async #onAddRow(event, target) {
    const path = target.dataset.path;             // "skills" | "attacks" | "descriptors"
    const rows = foundry.utils.deepClone(this.document.system._source[path] ?? []);
    const blank = {
      skills: { name: game.i18n.localize("TTS.Npc.NewSkill"), value: 45, kind: "important" },
      attacks: { name: game.i18n.localize("TTS.Npc.NewAttack"), value: 45, skill: "melee", damage: 2, descriptors: "", empty: false, uses: 1, range: null, counter: false },
      descriptors: { key: "", pips: 0, situation: "", value: "" }
    }[path];
    if (!blank) return;
    rows.push(blank);
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
