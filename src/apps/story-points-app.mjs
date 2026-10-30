/**
 * Outil du Chef : points de récit et scène (bible §8.5, D-008).
 * Liste des Risque-tout, mouvements individuels ou groupés, nouvelle session, nouvelle scène.
 */
import { SYSTEM_PATH } from "../config.mjs";
import { STORY_POINT_GAINS } from "../domain/rules/story-points.mjs";
import { adjustStoryPoints, adjustMany, logStoryPoints, startNewSession } from "../services/story-point-service.mjs";
import { startNewScene } from "../services/scene-service.mjs";
import { endOfStory } from "../services/equipment-service.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class StoryPointsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "tts-story-points",
    classes: ["thetroubleshooters", "tts-app", "tts-story-points"],
    window: { title: "TTS.SP.AppTitle", resizable: true, icon: "fa-solid fa-star" },
    position: { width: 520, height: "auto" },
    actions: {
      adjust: StoryPointsApp.#onAdjust,
      group: StoryPointsApp.#onGroup,
      newSession: StoryPointsApp.#onNewSession,
      newScene: StoryPointsApp.#onNewScene,
      wipe: StoryPointsApp.#onWipe,
      endOfStory: StoryPointsApp.#onEndOfStory,
      debrief: () => game.thetroubleshooters.debrief()
    }
  };

  static PARTS = { body: { template: `${SYSTEM_PATH}/templates/apps/story-points.hbs` } };

  static #instance = null;

  /** Ouvre (ou ramène au premier plan) l'outil — MJ uniquement. */
  static open() {
    if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("TTS.Init.GmOnly"));
    StoryPointsApp.#instance ??= new StoryPointsApp();
    return StoryPointsApp.#instance.render({ force: true });
  }

  /** Risque-tout affichés : ceux possédés par un joueur, sinon tous. */
  static characters() {
    const all = game.actors.filter(a => a.type === "character");
    const owned = all.filter(a => a.hasPlayerOwner);
    return owned.length ? owned : all;
  }

  /** @override */
  async _prepareContext() {
    return {
      max: game.settings.get("thetroubleshooters", "maxStoryPoints"),
      rows: StoryPointsApp.characters().map(a => ({ id: a.id, name: a.name, img: a.img, value: a.system.storyPoints.value, bonus: a.system.progression.pendingStartBonus }))
    };
  }

  #selected() {
    const ids = [...this.element.querySelectorAll('input[name="selected"]:checked')].map(i => i.value);
    return ids.map(id => game.actors.get(id)).filter(Boolean);
  }

  static async #onAdjust(event, target) {
    const actor = game.actors.get(target.closest("[data-actor-id]")?.dataset.actorId);
    const delta = Number(target.dataset.delta) || 0;
    if (!actor || !delta) return;
    const row = await adjustStoryPoints(actor, delta, { allowNegative: true });
    await logStoryPoints(game.i18n.localize("TTS.SP.ManualAdjust"), [row], { whisperGM: true });
    this.render();
  }

  static async #onGroup(event, target) {
    const kind = target.dataset.kind;                 // captured | amuse | signature
    const actors = this.#selected();
    if (!actors.length) return ui.notifications.warn(game.i18n.localize("TTS.SP.NoSelection"));
    const gains = { captured: STORY_POINT_GAINS.captured, amuse: STORY_POINT_GAINS.amuseTable, signature: STORY_POINT_GAINS.signatureUnavailable };
    const titles = { captured: "TTS.SP.Captured", amuse: "TTS.SP.Amuse", signature: "TTS.SP.Signature" };
    await adjustMany(actors, gains[kind] ?? 0, game.i18n.localize(titles[kind]));
    this.render();
  }

  static async #onNewSession() {
    const keep = await foundry.applications.api.DialogV2.wait({ classes: ["thetroubleshooters", "tts-dialog"],
      window: { title: game.i18n.localize("TTS.SP.NewSession") },
      content: `<p>${game.i18n.localize("TTS.SP.NewSessionPrompt")}</p>`,
      buttons: [
        { action: "reset", label: game.i18n.localize("TTS.SP.NewSessionReset"), default: true },
        { action: "keep", label: game.i18n.localize("TTS.SP.NewSessionKeep") }
      ],
      rejectClose: false
    });
    if (!keep) return;
    await startNewSession(StoryPointsApp.characters(), { keep: keep === "keep" });
    this.render();
  }

  static async #onNewScene() {
    await startNewScene();
    this.render();
  }

  /** Fin de l'histoire : kits achetés et kits de mission rendus (phase 7). */
  static async #onEndOfStory() {
    await endOfStory(StoryPointsApp.characters());
  }

  /** Meurtre de sang-froid (LdB p. 107) : retire tous les PR des Risque-tout sélectionnés. */
  static async #onWipe() {
    const actors = this.#selected();
    if (!actors.length) return ui.notifications.warn(game.i18n.localize("TTS.SP.NoSelection"));
    const ok = await foundry.applications.api.DialogV2.confirm({ classes: ["thetroubleshooters", "tts-dialog"],
      window: { title: game.i18n.localize("TTS.SP.Wipe") },
      content: `<p>${game.i18n.format("TTS.SP.WipeConfirm", { names: actors.map(a => a.name).join(", ") })}</p>`,
      rejectClose: false
    });
    if (!ok) return;
    const rows = [];
    for (const a of actors) rows.push(await adjustStoryPoints(a, -a.system.storyPoints.value, { allowNegative: true }));
    await logStoryPoints(game.i18n.localize("TTS.SP.Wipe"), rows);
    this.render();
  }
}
