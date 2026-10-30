/**
 * Assistant de création de personnage secondaire (LdB p. 205-209) — même modèle que la création de Risque-tout.
 *  - part du modèle générique du rang (ou de la fiche existante) ;
 *  - les repères du livre sont des avertissements : rien ne bloque, le Chef des Opérations tranche.
 */
import { SYSTEM_ID, SYSTEM_PATH } from "../config.mjs";
import { NPC_RANKS } from "../domain/rules/npc.mjs";
import { npcReverses } from "../domain/combat/attack.mjs";
import { NPC_TEMPLATES, draftFromTemplate, parseNpcDescriptors, formatNpcDescriptors, checkNpc, swapRankDescriptor } from "../domain/rules/npc-gen.mjs";
import { DraftApp } from "./draft-app.mjs";

const { DialogV2 } = foundry.applications.api;
const t = key => game.i18n.localize(key);
const RANK_LABEL = { extra: "TTS.NpcRank.Extra", minion: "TTS.NpcRank.Minion", henchman: "TTS.NpcRank.Henchman", lieutenant: "TTS.NpcRank.Lieutenant", boss: "TTS.NpcRank.Boss" };
const num = (v, fallback = 0) => (v === null || v === "" || v === undefined || !Number.isFinite(Number(v)) ? fallback : Number(v));

export class NpcGenApp extends DraftApp {
  static DEFAULT_OPTIONS = {
    classes: ["tts-npcgen"],
    window: { title: "TTS.NpcGen.Title", icon: "fa-solid fa-user-secret" },
    position: { width: 700, height: 780 },
    actions: {
      loadTemplate: NpcGenApp.#onLoadTemplate,
      addAttack: NpcGenApp.#onAddRow, removeAttack: NpcGenApp.#onRemoveRow,
      addSkill: NpcGenApp.#onAddRow, removeSkill: NpcGenApp.#onRemoveRow
    }
  };

  static PARTS = { body: { template: `${SYSTEM_PATH}/templates/apps/npc-gen.hbs`, scrollable: [""] } };
  static DRAFT_FLAG = "npcgen";
  static KEEP_DRAFT = false;   // après application, la fiche fait foi
  static I18N = { apply: "TTS.NpcGen.Apply", applyPrompt: "TTS.NpcGen.ApplyPrompt", applied: "TTS.NpcGen.Applied",
    reset: "TTS.NpcGen.Reset", resetPrompt: "TTS.NpcGen.ResetPrompt" };

  /** @param {Actor} actor */
  static open(actor) {
    if (!actor?.isOwner || actor.type !== "npc") return;
    return new NpcGenApp({ actor, id: `tts-npcgen-${actor.id}` }).render({ force: true });
  }

  /** Crée un PNJ vierge puis ouvre l'assistant (macro « Nouveau personnage secondaire »). */
  static async createAndOpen() {
    if (!game.user.isGM) return ui.notifications.warn(t("TTS.NpcGen.GmOnly"));
    const actor = await Actor.create({ name: t("TTS.NpcGen.NewName"), type: "npc" });
    if (actor) NpcGenApp.open(actor);
  }

  get title() { return `${t("TTS.NpcGen.Title")} — ${this.actor.name}`; }

  /**
   * Brouillon de départ : la fiche existante si elle est déjà remplie, sinon le modèle de son rang.
   * « Recommencer » repart toujours du modèle du rang.
   */
  initialDraft({ reset = false } = {}) {
    const s = this.actor.system;
    const blank = !s.attacks?.length && !s.skills?.length;
    const d = reset || blank ? draftFromTemplate(s.rank) : {
      rank: s.rank, baseSkill: s.baseSkill, specialty: { value: s.specialty.value, domain: s.specialty.domain },
      defense: s.defense, protection: s.protection, vitality: s.vitality.max,
      initiative: { mode: s.initiative.mode, value: s.initiative.value },
      descriptors: formatNpcDescriptors(s.descriptors),
      attacks: s.attacks.map(a => ({ name: a.name, value: a.value, damage: a.damage, skill: a.skill, descriptors: a.descriptors, uses: a.uses ?? 1, range: a.range ?? null, counter: a.counter })),
      skills: s.skills.map(x => ({ name: x.name, value: x.value, kind: x.kind }))
    };
    if (reset || blank) d.specialty.domain = s.specialty.domain ?? "";
    return { name: this.actor.name, ...d };
  }

  /** @override */
  async updateDraft(data) {
    const d = this.draft;
    // Lignes fusionnées par index : une ligne absente de la saisie garde sa valeur.
    const rows = (src, list) => list.map((row, i) => ({ ...row, ...(src?.[i] ?? src?.[String(i)] ?? {}) }));
    if (data.rank && data.rank !== d.rank) data.descriptors = swapRankDescriptor(data.descriptors ?? d.descriptors, data.rank);
    Object.assign(d, {
      name: data.name ?? d.name,
      rank: data.rank ?? d.rank,
      baseSkill: num(data.baseSkill, d.baseSkill),
      specialty: { value: num(data.specialty?.value, d.specialty.value), domain: data.specialty?.domain ?? d.specialty.domain },
      defense: data.defense === undefined ? d.defense : (data.defense === null || data.defense === "" ? null : num(data.defense)),
      protection: num(data.protection, d.protection),
      vitality: num(data.vitality, d.vitality),
      initiative: { mode: data.initiative?.mode ?? d.initiative.mode, value: num(data.initiative?.value, d.initiative.value) },
      descriptors: data.descriptors ?? d.descriptors
    });
    if (data.attacks) d.attacks = rows(data.attacks, d.attacks).map((a, i) => ({ ...a,
      value: num(a.value, 45), damage: num(a.damage, 2), uses: num(a.uses, 1) || 1, counter: Boolean(a.counter),
      range: a.range === undefined ? d.attacks[i]?.range ?? null : (a.range === null || a.range === "" ? null : num(a.range)) }));
    if (data.skills) d.skills = rows(data.skills, d.skills).map(x => ({ ...x, value: num(x.value, 45) }));
  }

  /** @override */
  async evaluate() {
    const warnings = checkNpc(this.draft).map(w => game.i18n.format(`TTS.NpcGen.Warn.${w.code}`, w.data ?? {}));
    return { errors: [], warnings, reverses: npcReverses(parseNpcDescriptors(this.draft.descriptors)) };
  }

  /** @override */
  async _prepareContext(options) {
    const base = await super._prepareContext(options);
    const d = this.draft;
    const tpl = NPC_TEMPLATES[d.rank];
    return {
      ...base,
      rankChoices: Object.fromEntries(NPC_RANKS.map(r => [r, t(RANK_LABEL[r])])),
      initiativeChoices: { fixed: t("TTS.Initiative.Fixed"), roll: t("TTS.Initiative.Roll") },
      attackSkillChoices: { melee: t("TTS.Skill.Melee"), shooting: t("TTS.Skill.Shooting") },
      kindChoices: { important: t("TTS.Npc.SkillImportant"), flavor: t("TTS.Npc.SkillFlavor") },
      attackRows: d.attacks.map((a, i) => ({ ...a, i })),
      skillRows: d.skills.map((s, i) => ({ ...s, i })),
      templateSource: tpl?.source ?? "",
      rankHint: t(`TTS.NpcGen.RankHint.${d.rank}`),
      isFixed: d.initiative.mode === "fixed"
    };
  }

  /** @override */
  async applyDraft() {
    const d = this.draft;
    // Les notes de situation saisies sur la fiche sont conservées pour les descripteurs inchangés.
    const notes = new Map(this.actor.system.descriptors.map(x => [formatNpcDescriptors([x]), x.situation]));
    const descriptors = parseNpcDescriptors(d.descriptors).map(x => ({ ...x, situation: notes.get(x.key) ?? "" }));
    await this.actor.update({
      name: d.name?.trim() || this.actor.name,
      "system.rank": d.rank,
      "system.baseSkill": d.baseSkill,
      "system.specialty": { value: d.specialty.value, domain: d.specialty.domain },
      "system.defense": d.defense,
      "system.protection": d.protection,
      "system.vitality.max": d.vitality,
      "system.vitality.value": d.vitality,
      "system.initiative": { mode: d.initiative.mode, value: d.initiative.value },
      "system.descriptors": descriptors,
      "system.attacks": d.attacks.map(a => ({ name: a.name, value: a.value, skill: a.skill, damage: a.damage, descriptors: a.descriptors,
        empty: false, uses: a.uses || 1, range: a.range ?? null, counter: Boolean(a.counter) })),
      "system.skills": d.skills.map(s => ({ name: s.name, value: s.value, kind: s.kind })),
      "system.counters.reversesLeft": npcReverses(descriptors)
    });
  }

  static async #onLoadTemplate() {
    const label = t(RANK_LABEL[this.draft.rank]);
    const ok = await DialogV2.confirm({ classes: ["thetroubleshooters", "tts-dialog"], window: { title: t("TTS.NpcGen.LoadTemplate") },
      content: `<p>${game.i18n.format("TTS.NpcGen.LoadTemplatePrompt", { rank: label })}</p>`, rejectClose: false });
    if (!ok) return;
    const domain = this.draft.specialty.domain;
    this.draft = { name: this.draft.name, ...draftFromTemplate(this.draft.rank) };
    this.draft.specialty.domain = domain;
    await this.saveDraft();
  }

  static async #onAddRow(event, target) {
    const which = target.dataset.action === "addAttack" ? "attacks" : "skills";
    const spe = this.draft.specialty.value;
    this.draft[which].push(which === "attacks"
      ? { name: "", value: spe, damage: 4, skill: "melee", descriptors: "", uses: 1, counter: false }
      : { name: "", value: spe, kind: "important" });
    await this.saveDraft();
  }

  static async #onRemoveRow(event, target) {
    const which = target.dataset.action === "removeAttack" ? "attacks" : "skills";
    this.draft[which].splice(Number(target.dataset.index), 1);
    await this.saveDraft();
  }
}
