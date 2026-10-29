/**
 * Applications du Chef : composer un défi (LdB p. 84, 87) et lancer un duel (LdB p. 85).
 */
import { SYSTEM_PATH, THETROUBLESHOOTERS } from "../config.mjs";
import { CHALLENGE_PRESETS, CHALLENGE_RESULTS, createChallenge, MIN_ROWS, MAX_ROWS } from "../domain/rules/challenge.mjs";
import { createDuel, DEFAULT_TARGET } from "../domain/rules/duel.mjs";
import { publishChallenge, publishDuel } from "../services/challenge-service.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const t = key => game.i18n.localize(key);
const skillChoices = () => Object.fromEntries(Object.entries(THETROUBLESHOOTERS.skills).map(([k, s]) => [k, t(s.label)]));
const actorsOf = types => game.actors.filter(a => types.includes(a.type)).map(a => ({ uuid: a.uuid, name: a.name, type: a.type }));

/* ---------------------------------------------------------------- */
/*  Défi                                                            */
/* ---------------------------------------------------------------- */

export class ChallengeApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "tts-challenge",
    tag: "form",
    classes: ["thetroubleshooters", "tts-app", "tts-challenge-app"],
    window: { title: "TTS.Challenge.AppTitle", resizable: true, icon: "fa-solid fa-list-check" },
    position: { width: 640, height: "auto" },
    form: { closeOnSubmit: false },
    actions: { loadPreset: ChallengeApp.#onLoadPreset, publish: ChallengeApp.#onPublish, setCount: ChallengeApp.#onSetCount }
  };

  static PARTS = { body: { template: `${SYSTEM_PATH}/templates/apps/challenge.hbs` } };

  static #instance = null;
  #draft = { title: "", count: 4, rows: Array.from({ length: MAX_ROWS }, () => ({ skill: "investigation", pips: 0, actorUuid: "", oppLabel: "", oppValue: "" })), outcomes: {} };

  static open() {
    if (!game.user.isGM) return ui.notifications.warn(t("TTS.Init.GmOnly"));
    ChallengeApp.#instance ??= new ChallengeApp();
    return ChallengeApp.#instance.render({ force: true });
  }

  /** @override */
  async _prepareContext() {
    return {
      draft: this.#draft,
      rows: this.#draft.rows.slice(0, this.#draft.count).map((r, i) => ({ ...r, i })),
      counts: { 3: "3", 4: "4", 5: "5" },
      skills: skillChoices(),
      participants: { "": t("TTS.Challenge.AnyCharacter"), ...Object.fromEntries(actorsOf(["character"]).map(a => [a.uuid, a.name])) },
      presets: Object.fromEntries(Object.keys(CHALLENGE_PRESETS).map(k => [k, t(`TTS.Challenge.Preset.${k}`)])),
      results: CHALLENGE_RESULTS.map(k => ({ key: k, label: t(`TTS.Challenge.Result.${k}`), text: this.#draft.outcomes[k] ?? "" }))
    };
  }

  /** Lit le formulaire dans le brouillon (conservé entre deux rendus). */
  #read() {
    const d = new foundry.applications.ux.FormDataExtended(this.element).object;
    this.#draft.title = d.title ?? "";
    for (let i = 0; i < this.#draft.count; i++) {
      const r = this.#draft.rows[i];
      r.skill = d[`skill${i}`] || r.skill;
      r.pips = Number(d[`pips${i}`]) || 0;
      r.actorUuid = d[`actor${i}`] ?? "";
      r.oppLabel = d[`oppLabel${i}`] ?? "";
      r.oppValue = d[`oppValue${i}`] ?? "";
    }
    for (const k of CHALLENGE_RESULTS) this.#draft.outcomes[k] = d[`outcome_${k}`] ?? "";
    return d;
  }

  static async #onSetCount(event, target) {
    this.#read();
    this.#draft.count = Math.min(MAX_ROWS, Math.max(MIN_ROWS, Number(target.dataset.count) || 4));
    this.render();
  }

  static async #onLoadPreset() {
    const d = this.#read();
    const list = CHALLENGE_PRESETS[d.preset];
    if (!list) return;
    this.#draft.count = list.length;
    list.forEach((skill, i) => Object.assign(this.#draft.rows[i], { skill, pips: 0, oppLabel: "", oppValue: "" }));
    if (!this.#draft.title) this.#draft.title = t(`TTS.Challenge.Preset.${d.preset}`);
    this.render();
  }

  static async #onPublish() {
    this.#read();
    const rows = [];
    for (const r of this.#draft.rows.slice(0, this.#draft.count)) {
      const actor = r.actorUuid ? await fromUuid(r.actorUuid) : null;
      const value = Number(r.oppValue);
      rows.push({
        skill: r.skill, pips: r.pips, actorUuid: actor?.uuid ?? "", name: actor?.name ?? "",
        opposition: Number.isFinite(value) && value > 0 ? { label: r.oppLabel || t("TTS.Challenge.Opposition"), value } : null
      });
    }
    const res = createChallenge({ title: this.#draft.title, rows, outcomes: this.#draft.outcomes });
    if (!res.ok) return ui.notifications.warn(t("TTS.Challenge.Refused.row-count"));
    await publishChallenge(res.state);
  }
}

/* ---------------------------------------------------------------- */
/*  Duel                                                            */
/* ---------------------------------------------------------------- */

export class DuelApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "tts-duel",
    tag: "form",
    classes: ["thetroubleshooters", "tts-app", "tts-duel-app"],
    window: { title: "TTS.Duel.AppTitle", resizable: true, icon: "fa-solid fa-people-arrows" },
    position: { width: 560, height: "auto" },
    form: { closeOnSubmit: false },
    actions: { publish: DuelApp.#onPublish }
  };

  static PARTS = { body: { template: `${SYSTEM_PATH}/templates/apps/duel.hbs` } };

  static #instance = null;

  static open() {
    if (!game.user.isGM) return ui.notifications.warn(t("TTS.Init.GmOnly"));
    DuelApp.#instance ??= new DuelApp();
    return DuelApp.#instance.render({ force: true });
  }

  /** @override */
  async _prepareContext() {
    const controlled = new Set((canvas?.tokens?.controlled ?? []).map(tk => tk.actor?.uuid));
    const targeted = new Set([...game.user.targets].map(tk => tk.actor?.uuid));
    // Acteurs du monde, plus les acteurs des jetons sélectionnés ou ciblés (PNJ non liés)
    const extra = [...(canvas?.tokens?.controlled ?? []), ...game.user.targets].map(tk => tk.actor).filter(Boolean)
      .map(a => ({ uuid: a.uuid, name: a.name, type: a.type }));
    const all = [...new Map([...actorsOf(["character", "npc"]), ...extra].map(a => [a.uuid, a])).values()];
    return {
      target: DEFAULT_TARGET,
      actorsA: all.map(a => ({ ...a, selected: controlled.has(a.uuid) })),
      actorsB: all.map(a => ({ ...a, selected: targeted.has(a.uuid) }))
    };
  }

  static async #onPublish() {
    const form = this.element;
    const pick = name => [...form.querySelectorAll(`select[name="${name}"] option:checked`)].map(o => o.value);
    const d = new foundry.applications.ux.FormDataExtended(form).object;
    const a = pick("participantsA"), b = pick("participantsB");
    if (!a.length || !b.length) return ui.notifications.warn(t("TTS.Duel.NeedSides"));
    const nameOr = (n, list, def) => n || (list.length === 1 ? fromUuidSync(list[0])?.name : "") || def;
    const state = createDuel({
      target: Number(d.target) || DEFAULT_TARGET,
      first: d.first === "b" ? "b" : "a",
      sides: {
        a: { name: nameOr(d.nameA, a, t("TTS.Duel.SideA")), goal: d.goalA ?? "", participants: a },
        b: { name: nameOr(d.nameB, b, t("TTS.Duel.SideB")), goal: d.goalB ?? "", participants: b }
      }
    });
    await publishDuel(state);
  }
}
