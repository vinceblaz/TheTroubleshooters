/**
 * Rendu des cartes de chat à partir de leur état (drapeau flags.thetroubleshooters.card).
 * Une carte est toujours re-rendue intégralement depuis son état : jamais de HTML modifié à la main.
 * Les boutons dépendant de l'acteur (capacités, désavantages) sont calculés au rendu.
 */
import { SYSTEM_ID, SYSTEM_PATH } from "../config.mjs";
import { cardActivations } from "../domain/rules/activations.mjs";
import { canFailForFlaw, hasUnluckyFlaw } from "../domain/rules/flaws.mjs";

const TEMPLATES = {
  task: `${SYSTEM_PATH}/templates/chat/task-card.hbs`,
  opposed: `${SYSTEM_PATH}/templates/chat/opposed-card.hbs`,
  request: `${SYSTEM_PATH}/templates/chat/request-card.hbs`,
  pool: `${SYSTEM_PATH}/templates/chat/pool-card.hbs`,
  spend: `${SYSTEM_PATH}/templates/chat/spend-card.hbs`,
  log: `${SYSTEM_PATH}/templates/chat/log-card.hbs`
};

export const CHAT_PARTIALS = [
  `${SYSTEM_PATH}/templates/chat/task-result.hbs`,
  `${SYSTEM_PATH}/templates/chat/ability-buttons.hbs`
];

const render = (path, data) => foundry.applications.handlebars.renderTemplate(path, data);

/** Boutons d'activation de capacités pour un jet donné (Risque-tout uniquement). */
function abilityButtons(actor, skillKey, task) {
  if (actor?.type !== "character" || !task) return [];
  const abilities = actor.items
    .filter(i => i.type === "ability")
    .map(i => ({ id: i.id, name: i.name, acquired: i.system.acquired, activations: i.system.activations ?? [] }));
  return cardActivations(abilities, { skillKey, task }).map(a => ({
    abilityId: a.abilityId,
    index: a.index,
    type: a.act.type,
    cost: a.act.cost,
    gain: a.act.gain,
    label: `${a.abilityName} : ${game.i18n.localize(`TTS.ActivationType.${a.act.type}`)}`,
    hint: a.act.label
  }));
}

function flawsOf(actor) {
  return actor?.items.filter(i => i.type === "flaw").map(i => ({ id: i.id, name: i.name, special: i.system.special })) ?? [];
}

function taskContext(card) {
  const actor = card.actorUuid ? fromUuidSync(card.actorUuid) : null;
  const flaws = flawsOf(actor);
  const resolved = card.task.status === "resolved";
  return {
    card,
    abilities: abilityButtons(actor, card.skillKey, card.task),
    canFlawFail: card.isCharacter && resolved && card.task.success && canFailForFlaw(flaws),
    unlucky: card.isCharacter && resolved && hasUnluckyFlaw(flaws)
  };
}

function opposedContext(card) {
  const sides = ["a", "b"].map(key => {
    const s = card.opposed[key];
    const actor = s.actorUuid ? fromUuidSync(s.actorUuid) : null;
    return {
      key,
      actorUuid: s.actorUuid,
      name: s.name,
      skillLabel: s.skillLabel,
      task: s.task,
      winner: card.opposed.outcome === key,
      canInvert: Boolean(s.task) && s.isCharacter && s.task.status === "resolved",
      abilities: s.task ? abilityButtons(actor, s.skillKey ?? "", s.task).filter(b => b.type !== "failForPoints") : []
    };
  });
  let outcomeLabel = "";
  if (card.opposed.outcome === "tie") outcomeLabel = game.i18n.localize("TTS.Chat.OpposedTie");
  else if (card.opposed.outcome) outcomeLabel = game.i18n.format("TTS.Chat.OpposedWinner", { name: card.opposed[card.opposed.outcome].name });
  return { card, sides, outcomeLabel };
}

/** Contenu HTML d'une carte. */
export async function renderCard(card) {
  switch (card.kind) {
    case "task": return render(TEMPLATES.task, taskContext(card));
    case "opposed": return render(TEMPLATES.opposed, opposedContext(card));
    case "request": return render(TEMPLATES.request, { card, skillLabel: card.skillLabel, difficultyLabel: card.difficultyLabel });
    case "pool": return render(TEMPLATES.pool, card.view);
    case "spend": return render(TEMPLATES.spend, { card, spend: card.spend });
    case "log": return render(TEMPLATES.log, card);
    default: return "";
  }
}

/**
 * Crée un message portant une carte.
 * @param {object} card
 * @param {{speaker?:object, rolls?:Roll[], rollMode?:string, whisper?:string[]}} opts
 */
export async function createCardMessage(card, { speaker, rolls = [], rollMode, whisper } = {}) {
  const data = {
    speaker: speaker ?? ChatMessage.getSpeaker(),
    content: await renderCard(card),
    rolls,
    flags: { [SYSTEM_ID]: { card } }
  };
  if (whisper) data.whisper = whisper;
  if (rolls.length) data.sound = CONFIG.sounds.dice;
  if (rollMode) ChatMessage.applyRollMode(data, rollMode);
  return ChatMessage.create(data);
}

/** Remplace l'état d'une carte existante et la re-rend. */
export async function updateCardMessage(message, card) {
  return message.update({ content: await renderCard(card), [`flags.${SYSTEM_ID}.card`]: card });
}

export function getCard(message) {
  return message?.getFlag(SYSTEM_ID, "card") ?? null;
}
