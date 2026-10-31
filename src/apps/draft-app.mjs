/**
 * Modèle commun des assistants de création (phase 8) : Risque-tout et personnages secondaires.
 *  - un brouillon conservé sur l'acteur (flags.thetroubleshooters.<DRAFT_FLAG>), modifié à chaque saisie ;
 *  - un état calculé (evaluate) qui fournit erreurs bloquantes et avertissements (le Chef tranche) ;
 *  - « Appliquer » (confirmation) puis « Recommencer ».
 * Les sous-classes définissent DRAFT_FLAG, PARTS, initialDraft(), updateDraft(), evaluate(), applyDraft().
 */
import { SYSTEM_ID } from "../config.mjs";

const { HandlebarsApplicationMixin, ApplicationV2, DialogV2 } = foundry.applications.api;

export class DraftApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["thetroubleshooters", "tts-app", "tts-draft-app"],
    window: { resizable: true },
    form: { handler: DraftApp.#onSubmit, submitOnChange: true, closeOnSubmit: false },
    actions: { apply: DraftApp.#onApply, reset: DraftApp.#onReset }
  };

  /** Clé du drapeau de brouillon sur l'acteur. */
  static DRAFT_FLAG = "draft";
  /** Conserver le brouillon après application (pour revenir sur la création). */
  static KEEP_DRAFT = true;
  /** Clés i18n des confirmations et notifications. */
  static I18N = { apply: "", applyPrompt: "", applied: "", reset: "", resetPrompt: "" };

  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null;
    const saved = this.readSavedDraft();
    this.draft = saved ? foundry.utils.mergeObject(this.initialDraft(), saved, { inplace: false, insertKeys: true }) : this.initialDraft();
  }

  /** @abstract Brouillon de départ. */
  initialDraft() { return {}; }
  /** @abstract Intègre la saisie (objet développé) au brouillon. */
  async updateDraft(_data) {}
  /** @abstract État calculé : { errors:string[], warnings:string[], ... }. */
  async evaluate() { return { errors: [], warnings: [] }; }
  /** @abstract Écrit la fiche. */
  async applyDraft(_state) {}
  /** Texte HTML complémentaire de la confirmation d'application. */
  applyNotice(_state) { return ""; }

  /** Où vit le brouillon : sur l'acteur par défaut (l'assistant pas à pas le garde sur l'utilisateur). */
  get draftHolder() { return this.actor; }
  readSavedDraft() { return this.draftHolder?.getFlag(SYSTEM_ID, this.constructor.DRAFT_FLAG) ?? null; }
  async clearDraft() { await this.draftHolder?.unsetFlag(SYSTEM_ID, this.constructor.DRAFT_FLAG); }

  async saveDraft({ render = true } = {}) {
    await this.draftHolder?.setFlag(SYSTEM_ID, this.constructor.DRAFT_FLAG, this.draft);
    if (render) this.render();
  }

  /** Contexte commun (contrôles et bouton Appliquer) ; les sous-classes l'étendent. */
  async _prepareContext(options) {
    const state = await this.evaluate();
    this.draftState = state;
    return { d: this.draft, c: state, errors: state.errors, warnings: state.warnings, canApply: state.errors.length === 0, i18n: this.constructor.I18N };
  }

  static async #onSubmit(_event, _form, formData) {
    await this.updateDraft(foundry.utils.expandObject(formData.object));
    await this.saveDraft();
  }

  static async #onReset() {
    const L = this.constructor.I18N;
    const ok = await DialogV2.confirm({ classes: ["thetroubleshooters", "tts-dialog"], window: { title: L.reset }, content: `<p>${game.i18n.localize(L.resetPrompt)}</p>`, rejectClose: false });
    if (!ok) return;
    this.draft = this.initialDraft({ reset: true });
    await this.clearDraft();
    this.render();
  }

  static async #onApply() {
    const state = await this.evaluate();
    if (state.errors.length) return ui.notifications.warn(state.errors.join(" ; "));
    const L = this.constructor.I18N;
    const ok = await DialogV2.confirm({ classes: ["thetroubleshooters", "tts-dialog"],
      window: { title: L.apply },
      content: `<p>${game.i18n.localize(L.applyPrompt)}</p>${this.applyNotice(state)}`,
      rejectClose: false
    });
    if (!ok) return;
    await this.applyDraft(state);
    if (!this.constructor.KEEP_DRAFT) await this.clearDraft();
    ui.notifications.info(game.i18n.localize(L.applied));
    this.close();
  }
}
