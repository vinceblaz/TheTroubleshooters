/**
 * Demande de jet du Chef (bible §7.7) : le Chef choisit les Risque-tout, la compétence et la difficulté,
 * éventuellement secrète. Chaque joueur lance depuis la carte ; la difficulté secrète est appliquée
 * sans être montrée au joueur (issue réelle visible du seul MJ).
 */
import { SYSTEM_PATH, THETROUBLESHOOTERS } from "../config.mjs";
import { DIFFICULTIES } from "../domain/dice/percentile.mjs";
import { createCardMessage } from "../chat/cards.mjs";

const DIFF_KEYS = { veryEasy: "VeryEasy", easy: "Easy", average: "Average", hard: "Hard", veryHard: "VeryHard" };

function difficultyLabel(value) {
  const key = Object.entries(DIFFICULTIES).find(([, v]) => v === value)?.[0] ?? "average";
  return `${game.i18n.localize(`TTS.Roll.Difficulty.${DIFF_KEYS[key]}`)} (${value > 0 ? "+" : ""}${value})`;
}

export async function openRollRequest() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("TTS.Init.GmOnly"));

  const actors = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
  const skills = Object.fromEntries(Object.entries(THETROUBLESHOOTERS.skills).map(([k, s]) => [k, game.i18n.localize(s.label)]));
  const difficulties = Object.fromEntries(Object.values(DIFFICULTIES).map(v => [String(v), difficultyLabel(v)]));

  const content = await foundry.applications.handlebars.renderTemplate(`${SYSTEM_PATH}/templates/dialogs/request-roll.hbs`, {
    actors: actors.map(a => ({ id: a.id, name: a.name })),
    skills,
    difficulties
  });

  const data = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("TTS.Request.Title") },
    classes: ["thetroubleshooters", "tts-dialog"],
    content,
    ok: {
      label: game.i18n.localize("TTS.Request.Send"),
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    },
    rejectClose: false
  });
  if (!data) return;

  const selected = actors.filter(a => data[`actor_${a.id}`]);
  if (!selected.length) return ui.notifications.warn(game.i18n.localize("TTS.Request.NoActor"));

  const difficulty = Number(data.difficulty) || 0;
  const card = {
    kind: "request",
    skillKey: data.skill,
    difficulty,
    hidden: Boolean(data.hidden) && difficulty !== 0,
    rows: selected.map(a => ({ actorUuid: a.uuid, name: a.name, rolled: false })),
    skillLabel: skills[data.skill],
    difficultyLabel: difficultyLabel(difficulty)
  };
  return createCardMessage(card, { speaker: { alias: game.i18n.localize("TTS.Request.Speaker") } });
}
