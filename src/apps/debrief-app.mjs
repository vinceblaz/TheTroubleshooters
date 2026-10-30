/**
 * Outil du Chef : débriefing de fin de session (phase 9, LdB p. 126-131).
 * Coches gratuites (ou points d'expérience) par critère, conditions de victoire → jets (ou points) de récompense,
 * fin d'aventure → périodes d'intersession.
 */
import { SYSTEM_PATH, THETROUBLESHOOTERS } from "../config.mjs";
import { SKILL_KEYS } from "../domain/rules/skills.mjs";
import { FREE_TICK_CRITERIA, DOWNTIME_SPANS, freeTicksFor } from "../domain/rules/progression.mjs";
import { grantDebrief, xpSystem } from "../services/progression-service.mjs";
import { StoryPointsApp } from "./story-points-app.mjs";

const { HandlebarsApplicationMixin, ApplicationV2, DialogV2 } = foundry.applications.api;
const t = key => game.i18n.localize(key);
const CRITERIA = Object.keys(FREE_TICK_CRITERIA);

export class DebriefApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "tts-debrief",
    tag: "form",
    classes: ["thetroubleshooters", "tts-app", "tts-debrief"],
    window: { title: "TTS.Progression.DebriefTitle", resizable: true, icon: "fa-solid fa-graduation-cap" },
    position: { width: 760, height: "auto" },
    form: { handler: DebriefApp.#onChange, submitOnChange: true, closeOnSubmit: false },
    actions: { addReward: DebriefApp.#onAddReward, removeReward: DebriefApp.#onRemoveReward, grant: DebriefApp.#onGrant }
  };

  static PARTS = { body: { template: `${SYSTEM_PATH}/templates/apps/debrief.hbs`, scrollable: [""] } };

  static #instance = null;

  static open() {
    if (!game.user.isGM) return ui.notifications.warn(t("TTS.Progression.GmOnly"));
    DebriefApp.#instance ??= new DebriefApp();
    return DebriefApp.#instance.render({ force: true });
  }

  /** Saisie en cours : critères par Risque-tout, récompenses, fin d'aventure. */
  state = { rows: {}, rewards: [], endOfAdventure: false, span: "none" };

  #row(id) {
    return this.state.rows[id] ??= { criteria: { present: true }, penalty: 0 };
  }

  /** @override */
  async _prepareContext() {
    const actors = StoryPointsApp.characters();
    const mode = xpSystem();
    const skillOpts = { "": "—", ...Object.fromEntries(SKILL_KEYS.map(k => [k, t(THETROUBLESHOOTERS.skills[k].label)]).sort((a, b) => a[1].localeCompare(b[1]))) };
    return {
      mode, points: mode === "points",
      criteria: CRITERIA.map(k => ({ key: k, label: t(`TTS.Progression.Criteria.${k}`), value: FREE_TICK_CRITERIA[k], endOnly: k === "bloodless" })),
      rows: actors.map(a => {
        const r = this.#row(a.id);
        return {
          id: a.id, name: a.name, img: a.img, penalty: r.penalty,
          checks: CRITERIA.map(k => ({ key: k, checked: Boolean(r.criteria[k]), disabled: k === "bloodless" && !this.state.endOfAdventure })),
          total: freeTicksFor({ ...r.criteria, bloodless: r.criteria.bloodless && this.state.endOfAdventure }, r.penalty)
        };
      }),
      rewards: this.state.rewards.map((r, i) => ({ ...r, i, actors: actors.map(a => ({ id: a.id, name: a.name, checked: r.actorIds.includes(a.id) })) })),
      skillOpts,
      endOfAdventure: this.state.endOfAdventure,
      spanOpts: Object.fromEntries(Object.entries(DOWNTIME_SPANS).map(([k, n]) => [k, `${t(`TTS.Progression.Span.${k}`)} (${n})`])),
      span: this.state.span
    };
  }

  static async #onChange(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    this.state.endOfAdventure = Boolean(data.endOfAdventure);
    this.state.span = data.span ?? this.state.span;
    for (const [id, r] of Object.entries(data.rows ?? {})) {
      const row = this.#row(id);
      row.criteria = Object.fromEntries(CRITERIA.map(k => [k, Boolean(r.criteria?.[k])]));
      row.penalty = Math.max(0, Number(r.penalty) || 0);
    }
    this.state.rewards = this.state.rewards.map((rw, i) => {
      const d = data.rewards?.[i] ?? {};
      return { label: d.label ?? rw.label, skill: d.skill ?? rw.skill, actorIds: Object.entries(d.actors ?? {}).filter(([, v]) => v).map(([k]) => k) };
    });
    this.render();
  }

  static #onAddReward() {
    this.state.rewards.push({ label: "", skill: "", actorIds: StoryPointsApp.characters().map(a => a.id) });
    this.render();
  }

  static #onRemoveReward(event, target) {
    this.state.rewards.splice(Number(target.dataset.index), 1);
    this.render();
  }

  static async #onGrant() {
    const actors = StoryPointsApp.characters();
    const ok = await DialogV2.confirm({ classes: ["thetroubleshooters", "tts-dialog"], window: { title: t("TTS.Progression.Grant") }, content: `<p>${t("TTS.Progression.GrantPrompt")}</p>`, rejectClose: false });
    if (!ok) return;
    const end = this.state.endOfAdventure;
    await grantDebrief(actors.map(actor => {
      const r = this.#row(actor.id);
      return { actor, criteria: { ...r.criteria, bloodless: end && r.criteria.bloodless }, penalty: r.penalty };
    }), { rewards: end ? this.state.rewards.filter(r => r.skill) : [], periods: end ? DOWNTIME_SPANS[this.state.span] ?? 0 : 0 });
    this.state = { rows: {}, rewards: [], endOfAdventure: false, span: "none" };
    this.close();
  }
}
