/**
 * Scène (D-008) : la notion de scène est un fait de contexte posé par le Chef.
 * « Nouvelle scène » retire les effets limités à la scène (malus de désavantage…).
 */
import { SYSTEM_ID } from "../config.mjs";
import { logStoryPoints } from "./story-point-service.mjs";

/** Acteurs concernés : acteurs du monde et acteurs synthétiques des jetons non liés de la scène active. */
function sceneActors() {
  const actors = new Set(game.actors.contents);
  for (const token of canvas?.scene?.tokens ?? []) if (!token.actorLink && token.actor) actors.add(token.actor);
  return [...actors];
}

/** Effets marqués « scène » sur un acteur. */
export function sceneEffects(actor) {
  return actor.effects.filter(e => e.getFlag(SYSTEM_ID, "scene"));
}

/** Retire tous les effets de scène (MJ). */
export async function startNewScene() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("TTS.Init.GmOnly"));
  const rows = [];
  for (const actor of sceneActors()) {
    const ids = sceneEffects(actor).map(e => e.id);
    if (!ids.length) continue;
    await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    rows.push({ name: actor.name, text: game.i18n.format("TTS.Scene.Removed", { count: ids.length }) });
  }
  await logStoryPoints(game.i18n.localize("TTS.Scene.New"), rows.length ? rows : [{ name: "", text: game.i18n.localize("TTS.Scene.NothingToRemove") }]);
}
