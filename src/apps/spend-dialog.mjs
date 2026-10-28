/**
 * Proposition de dépense de points de récit soumise au Chef (bible §8.4) :
 * indice (1-4), élément mineur (2), élément majeur (6), kit (coût du kit) ou autre.
 * Les PR sont réservés (débités) à la proposition et rendus en cas de refus ou de modification.
 */
import { SYSTEM_PATH } from "../config.mjs";
import { SPEND_TYPES, createSpend, defaultSpendCost } from "../domain/rules/spend.mjs";
import { spendStoryPoints } from "../domain/rules/story-points.mjs";
import { createCardMessage } from "../chat/cards.mjs";

export const SPEND_LABELS = {
  clue: "TTS.Spend.Type.Clue",
  minor: "TTS.Spend.Type.Minor",
  major: "TTS.Spend.Type.Major",
  kit: "TTS.Spend.Type.Kit",
  other: "TTS.Spend.Type.Other"
};

export async function proposeSpend(actor) {
  if (actor?.type !== "character" || !actor.isOwner) return;
  const types = Object.fromEntries(Object.keys(SPEND_TYPES).map(t => [t, `${game.i18n.localize(SPEND_LABELS[t])} (${defaultSpendCost(t)} PR)`]));
  const content = await foundry.applications.handlebars.renderTemplate(`${SYSTEM_PATH}/templates/dialogs/spend.hbs`, {
    types, current: actor.system.storyPoints.value
  });
  const data = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("TTS.Spend.Title") },
    classes: ["thetroubleshooters", "tts-dialog"],
    content,
    ok: {
      label: game.i18n.localize("TTS.Spend.Propose"),
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    },
    rejectClose: false
  });
  if (!data) return;

  const cost = data.cost === null || data.cost === "" || data.cost === undefined ? undefined : Number(data.cost);
  const spend = createSpend({ type: data.type, cost, description: data.description ?? "", actorUuid: actor.uuid, actorName: actor.name });
  const check = spendStoryPoints(actor.system.storyPoints.value, spend.reserved);
  if (!check.ok) {
    ui.notifications.warn(game.i18n.format("TTS.Notify.NotEnoughStoryPoints", { name: actor.name, cost: spend.reserved }));
    return;
  }
  spend.typeLabel = game.i18n.localize(SPEND_LABELS[spend.type]);
  // Carte d'abord, débit ensuite (ordre imposé, bible §4.5).
  await createCardMessage({ kind: "spend", spend }, { speaker: ChatMessage.getSpeaker({ actor }) });
  await actor.update({ "system.storyPoints.value": check.value });
}
