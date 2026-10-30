/**
 * Progression d'un Risque-tout (phase 9, LdB p. 126-131) : ouverte depuis la fiche (bouton « Progression »).
 * Coches ordinaires, coches gratuites, jets de récompense (ou points d'expérience et de récompense), intersession.
 */
import { SYSTEM_PATH, THETROUBLESHOOTERS } from "../config.mjs";
import { SKILL_KEYS } from "../domain/rules/skills.mjs";
import { DOWNTIME_ACTIVITIES, REWARD_POINT_UNLOCK, LANGUAGE_FLUENT_CROSSES, MAX_ROLLS_PER_TARGET, increaseRule } from "../domain/rules/progression.mjs";
import { useImprovement, downtimeActivity, debriefOf, xpSystem, skillLabel } from "../services/progression-service.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const t = key => game.i18n.localize(key);

export class ProgressionApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["thetroubleshooters", "tts-app", "tts-progression"],
    window: { title: "TTS.Progression.Title", resizable: true, icon: "fa-solid fa-arrow-trend-up" },
    position: { width: 640, height: 720 },
    actions: { use: ProgressionApp.#onUse, downtime: ProgressionApp.#onDowntime }
  };

  static PARTS = { body: { template: `${SYSTEM_PATH}/templates/apps/progression.hbs`, scrollable: [""] } };

  static open(actor) {
    if (!actor?.isOwner || actor.type !== "character") return;
    return new ProgressionApp({ actor, id: `tts-progression-${actor.id}` }).render({ force: true });
  }

  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.abilityModels = null;
  }

  get title() { return `${t("TTS.Progression.Title")} — ${this.actor.name}`; }

  /** Capacités du compendium (une fois par ouverture). */
  async #models() {
    if (this.abilityModels) return this.abilityModels;
    const pack = game.packs.get("world.tts-abilities");
    const docs = pack ? await pack.getDocuments() : [];
    const world = game.items.filter(i => i.type === "ability");
    this.abilityModels = [...docs, ...world].sort((a, b) => a.name.localeCompare(b.name));
    return this.abilityModels;
  }

  /**
   * Cibles proposées.
   * @param {{skill?:string, linked?:boolean, skillsOnly?:boolean, unlock?:boolean}} p
   *   linked : coche ordinaire ou récompense (la compétence, une langue si Langues, une capacité associée) ;
   *   unlock : point de récompense à 85+ (langues et capacités en plus de la compétence).
   */
  #targets(models, { skill = "", linked = false, rewardPoint = false } = {}) {
    const a = this.actor;
    const out = [];
    const G = { skill: t("TTS.Progression.Group.skills"), language: t("TTS.Progression.Group.languages"), ability: t("TTS.Progression.Group.abilities") };
    const skills = linked || rewardPoint ? [skill] : SKILL_KEYS;
    for (const k of skills) {
      const v = a.system.skills[k].value;
      out.push({ value: `skill:${k}`, label: `${skillLabel(k)} (${v} % — ${increaseRule(v).label})`, group: G.skill });
    }
    const langOk = rewardPoint ? a.system.skills[skill]?.value >= REWARD_POINT_UNLOCK : !linked || skill === "languages";
    if (langOk) {
      for (const l of a.items.filter(i => i.type === "language" && !i.system.fluent)) out.push({ value: `language:${l.id}`, label: `${l.name} (${l.system.crosses}/${LANGUAGE_FLUENT_CROSSES})`, group: G.language });
      out.push({ value: "language:new", label: t("TTS.Progression.NewLanguage"), group: G.language });
    }
    const abilityOk = rewardPoint ? a.system.skills[skill]?.value >= REWARD_POINT_UNLOCK : true;
    if (abilityOk) {
      const owned = a.items.filter(i => i.type === "ability");
      const ownedNames = new Set(owned.map(i => i.name));
      const assoc = list => !linked || (list ?? []).includes(skill);
      for (const i of owned.filter(i => !i.system.acquired && assoc([...(i.system.learnWith ?? [])]))) {
        out.push({ value: `ability:item:${i.id}`, label: `${i.name} (${i.system.crosses}/${i.system.cost})`, group: G.ability });
      }
      for (const m of models.filter(m => !ownedNames.has(m.name) && assoc([...(m.system.learnWith ?? [])]))) {
        out.push({ value: `ability:uuid:${m.uuid}`, label: `${m.name} (${t("TTS.Progression.Cost")} ${m.system.cost})`, group: G.ability });
      }
    }
    return out;
  }

  /** @override */
  async _prepareContext() {
    const a = this.actor;
    const models = await this.#models();
    const mode = xpSystem();
    const p = a.system.progression;
    const debrief = debriefOf(a);
    const ordinary = SKILL_KEYS.filter(k => a.system.skills[k].improvement).map(k => ({
      row: `ord-${k}`, skill: k, label: skillLabel(k), value: a.system.skills[k].value, options: this.#targets(models, { skill: k, linked: true })
    }));
    const rewards = (p.rewardRolls ?? []).map((r, i) => ({
      row: `rw-${i}`, index: i, skill: r.skill, label: skillLabel(r.skill), source: r.source,
      options: this.#targets(models, { skill: r.skill, linked: mode !== "points", rewardPoint: mode === "points" })
    }));
    return {
      points: mode === "points",
      ordinary, rewards,
      freeTicks: p.freeTicks, xp: p.xp, periods: p.downtimePeriods, pendingBonus: p.pendingStartBonus,
      allTargets: this.#targets(models),
      activities: Object.fromEntries(DOWNTIME_ACTIVITIES.map(k => [k, t(`TTS.Progression.Activity.${k}`)])),
      hasPhase: Boolean(debrief.phase),
      usedCount: Object.keys(debrief.uses ?? {}).length,
      maxRolls: MAX_ROLLS_PER_TARGET,
      vitality: a.system.vitality.max,
      nothing: !ordinary.length && !rewards.length && !p.freeTicks && !p.xp && !p.downtimePeriods
    };
  }

  /** Lit la cible choisie sur une ligne. */
  #target(row) {
    const raw = this.element.querySelector(`[name="target-${row}"]`)?.value ?? "";
    const [type, a, b] = raw.split(":");
    if (type === "skill") return { type, key: a };
    if (type === "language") {
      if (a === "new") return { type, name: this.element.querySelector(`[name="newlang-${row}"]`)?.value ?? "" };
      return { type, itemId: a };
    }
    if (type === "ability") return a === "item" ? { type, itemId: b } : { type, uuid: raw.slice("ability:uuid:".length) };
    return null;
  }

  static async #onUse(event, target) {
    const { source, row, skill = "", index } = target.dataset;
    const tg = this.#target(row);
    if (!tg) return ui.notifications.warn(t("TTS.Progression.Refused.no-target"));
    target.disabled = true;
    try {
      await useImprovement(this.actor, { source, skill, rewardIndex: index === undefined ? -1 : Number(index), target: tg });
    } finally {
      this.abilityModels = null;
      this.render();
    }
  }

  static async #onDowntime() {
    const activity = this.element.querySelector('[name="activity"]')?.value;
    if (activity === "training") {
      const tg = this.#target("training");
      if (!tg) return ui.notifications.warn(t("TTS.Progression.Refused.no-target"));
      await useImprovement(this.actor, { source: "training", target: tg });
    } else {
      await downtimeActivity(this.actor, { activity, text: this.element.querySelector('[name="downtimeText"]')?.value ?? "" });
    }
    this.render();
  }

  /** Rafraîchir quand la fiche change (coches cochées ailleurs, octroi du Chef). */
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    this._hook = Hooks.on("updateActor", actor => { if (actor.id === this.actor.id && this.rendered) this.render(); });
  }

  _onClose(options) {
    super._onClose?.(options);
    if (this._hook) Hooks.off("updateActor", this._hook);
  }
}

