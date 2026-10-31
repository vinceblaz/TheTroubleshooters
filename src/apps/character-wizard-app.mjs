/**
 * Assistant pas à pas « Nouveau Risque-tout » (macro) — étapes 1 à 6 de la création du livre (LdB p. 32) :
 *  1 choisir un archétype · 2 définir les compétences · 3 choisir deux capacités et un désavantage
 *  4 calculer la Vitalité maximale · 5 choisir ses langues · 6 sélectionner cinq kits de matériel.
 * La fiche n'est créée qu'à la fin, déjà remplie ; les étapes 7 à 10 (accroches, description, rencontre…)
 * se font ensuite sur la fiche. Le brouillon est gardé sur l'utilisateur (on peut fermer et reprendre).
 * Même moteur que l'assistant de la fiche (ChargenApp) : mêmes contrôles, même écriture de la fiche.
 */
import { SYSTEM_ID, SYSTEM_PATH } from "../config.mjs";
import { VITALITY_BASE } from "../domain/rules/vitality.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { ChargenApp } from "./chargen-app.mjs";

const t = key => game.i18n.localize(key);
const f = (key, data) => game.i18n.format(key, data);
export const WIZARD_STEPS = Object.freeze(["archetype", "skills", "traits", "vitality", "languages", "kits"]);

export class CharacterWizardApp extends ChargenApp {
  static DEFAULT_OPTIONS = {
    id: "tts-character-wizard",
    classes: ["tts-chargen-wizard"],
    window: { title: "TTS.Wizard.Title", icon: "fa-solid fa-passport" },
    position: { width: 720, height: 760 },
    actions: { prev: CharacterWizardApp.#onPrev, next: CharacterWizardApp.#onNext, goto: CharacterWizardApp.#onGoto, finish: CharacterWizardApp.#onFinish }
  };

  static PARTS = { body: { template: `${SYSTEM_PATH}/templates/apps/character-wizard.hbs`, scrollable: [""] } };
  static DRAFT_FLAG = "chargenWizard";
  static I18N = { ...ChargenApp.I18N, reset: "TTS.Wizard.Reset", resetPrompt: "TTS.Wizard.ResetPrompt" };

  /** Instance en attente d'une fiche créée par le MJ (joueur sans droit de création). */
  static pending = null;

  /** Instance ouverte (une seule par client). */
  static current = null;

  /**
   * Ouverture depuis la macro ou le bouton du répertoire des acteurs. Toute erreur est signalée à l'écran
   * (et détaillée dans la console) au lieu d'être perdue dans une promesse rejetée.
   */
  static async open() {
    try {
      const app = (CharacterWizardApp.current ??= new CharacterWizardApp());
      await app.render({ force: true });
      return app;
    } catch (err) {
      CharacterWizardApp.current = null;
      CharacterWizardApp.reportError(err);
    }
  }

  static reportError(err) {
    if (err && typeof err === "object") { if (err.ttsReported) return; err.ttsReported = true; }
    console.error(`${SYSTEM_ID} | Nouveau Risque-tout`, err);
    ui.notifications.error(f("TTS.Wizard.OpenError", { error: err?.message ?? String(err) }), { permanent: true });
  }

  /** @override Erreurs de préparation ou de gabarit : signalées, puis relancées pour Foundry. */
  async _renderHTML(context, options) {
    try { return await super._renderHTML(context, options); } catch (err) { CharacterWizardApp.reportError(err); throw err; }
  }

  /** Le brouillon vit sur l'utilisateur : aucune fiche n'existe encore. */
  get draftHolder() { return game.user; }

  get title() { return t("TTS.Wizard.Title"); }

  initialDraft() { return { ...super.initialDraft(), step: 1, name: "", owner: "" }; }

  /** @override */
  async updateDraft(data) {
    const { name, owner, ...rest } = data;
    if (name !== undefined) this.draft.name = name;
    if (owner !== undefined) this.draft.owner = owner;
    await super.updateDraft(rest);
  }

  /** Détail du calcul de la Vitalité (LdB p. 34). */
  #vitality(c) {
    const s = c.skills;
    const combat = Math.max(s.melee, s.shooting);
    const combatLabel = t(s.melee >= s.shooting ? "TTS.Skill.Melee" : "TTS.Skill.Shooting");
    const v = c.derived.vitality;
    const rows = [
      { value: VITALITY_BASE, label: t("TTS.Chargen.VitalityRule.base") },
      { value: 5, label: t("TTS.Chargen.VitalityRule.r45") },
      { value: 6, label: t("TTS.Chargen.VitalityRule.r65") },
      { value: 7, label: t("TTS.Chargen.VitalityRule.both65") }
    ].map(r => ({ ...r, met: r.value === v }));
    return { agility: s.agility, combat, combatLabel, rows };
  }

  /** @override */
  async _prepareContext(options) {
    try { return await this.#wizardContext(options); } catch (err) { CharacterWizardApp.reportError(err); throw err; }
  }

  async #wizardContext(options) {
    const ctx = await super._prepareContext(options);
    const step = Math.min(Math.max(1, this.draft.step || 1), WIZARD_STEPS.length);
    const stepErrors = ctx.c.errorSteps.filter(e => e.step === step).map(e => e.text);
    const blocked = new Set(ctx.c.errorSteps.map(e => e.step));
    const players = game.user.isGM ? game.users.filter(u => !u.isGM) : [];
    return {
      ...ctx,
      wizard: true,
      step,
      section: WIZARD_STEPS[step - 1],
      steps: WIZARD_STEPS.map((key, i) => ({ n: i + 1, key, label: t(`TTS.Chargen.Step.${key[0].toUpperCase()}${key.slice(1)}`), current: i + 1 === step, done: i + 1 < step, blocked: blocked.has(i + 1) })),
      stepErrors,
      isFirst: step === 1,
      isLast: step === WIZARD_STEPS.length,
      canNext: stepErrors.length === 0,
      canFinish: ctx.c.errors.length === 0 && Boolean(this.draft.name?.trim()),
      vitality: this.#vitality(ctx.c),
      ownerOptions: players.length ? { "": t("TTS.NewCharacter.NoOwner"), ...Object.fromEntries(players.map(u => [u.id, u.name])) } : null,
      warnings: step === WIZARD_STEPS.length ? ctx.warnings : ctx.warnings.filter(w => !w.includes(t("TTS.Chargen.Warn.hookTaken")))
    };
  }

  async #goto(step) {
    this.draft.step = Math.min(Math.max(1, step), WIZARD_STEPS.length);
    await this.saveDraft();
  }

  static async #onPrev() { await this.#goto((this.draft.step || 1) - 1); }

  static async #onNext() {
    const state = await this.evaluate();
    const step = this.draft.step || 1;
    const errs = state.errorSteps.filter(e => e.step === step);
    if (errs.length) return ui.notifications.warn(errs.map(e => e.text).join(" ; "));
    await this.#goto(step + 1);
  }

  static async #onGoto(event, target) {
    const n = Number(target.dataset.step);
    const state = await this.evaluate();
    // On ne saute pas une étape qui bloque : on s'arrête à la première étape en erreur.
    const firstBlocked = Math.min(...state.errorSteps.map(e => e.step), Infinity);
    await this.#goto(Math.min(n, firstBlocked));
  }

  /** Fin : crée la fiche (directement, ou par le MJ) puis l'écrit avec le moteur de l'assistant. */
  static async #onFinish() {
    const state = await this.evaluate();
    if (state.errors.length) return ui.notifications.warn(state.errors.join(" ; "));
    const name = this.draft.name?.trim();
    if (!name) return ui.notifications.warn(t("TTS.Wizard.NameRequired"));
    const owner = game.user.isGM && this.draft.owner ? game.users.get(this.draft.owner) : null;
    if (game.user.isGM || game.user.can("ACTOR_CREATE")) {
      const data = { name, type: "character" };
      if (owner) data.ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, [owner.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER };
      const actor = await Actor.create(data);
      if (!actor) return;
      await this.finishOn(actor);
      if (owner && !owner.character) await owner.update({ character: actor.id });
      if (owner) ui.notifications.info(f("TTS.NewCharacter.CreatedFor", { name: actor.name, user: owner.name }));
      return;
    }
    if (!game.users.activeGM) return ui.notifications.warn(t("TTS.Relay.NoGM"));
    CharacterWizardApp.pending = this;
    await RelayService.dispatch("characterCreate", { name, wizard: true }, { gmOnly: true });
    ui.notifications.info(t("TTS.Wizard.Requested"));
  }

  /** Écrit le brouillon sur la fiche créée, efface le brouillon et ouvre la fiche. */
  async finishOn(actor) {
    this.actor = actor;
    const state = await this.evaluate();
    await this.applyDraft(state);
    await this.clearDraft();
    CharacterWizardApp.pending = null;
    ui.notifications.info(f("TTS.Wizard.Created", { name: actor.name }));
    if (this.rendered) await this.close();
    if (actor.isOwner && (!game.user.isGM || !this.draft.owner)) actor.sheet?.render(true);
  }
}
