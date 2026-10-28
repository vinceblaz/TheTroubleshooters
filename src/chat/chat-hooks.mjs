/**
 * Affichage et actions des cartes de chat.
 *  - data-visibility="gm" : réservé au MJ ; "players" : masqué au MJ ;
 *  - data-owner-uuid="…"  : réservé au MJ et aux propriétaires de l'acteur ;
 *  - data-tts-action      : bouton d'action (toujours vérifié côté exécution).
 */
import { SYSTEM_ID } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { getCard } from "./cards.mjs";
import { contextFromChoice, characterSkillContext } from "../services/roll-context.mjs";
import { evaluateTaskRoll, awardKarmaPoint, rollTask } from "../services/roll-service.mjs";
import { defaultRollModeFor } from "../services/roll-mode.mjs";
import { promptTaskRoll } from "../apps/roll-dialog.mjs";
import { spendStoryPoints } from "../domain/rules/story-points.mjs";
import { GENERIC_INVERT_COST } from "../domain/dice/task-state.mjs";

/**
 * Contrôle préalable côté client : le joueur est prévenu tout de suite s'il ne peut pas payer
 * (la règle reste revérifiée par le MJ ou l'auteur lors de l'exécution).
 */
async function canAfford(actorUuid, cost) {
  const actor = await fromUuid(actorUuid);
  if (actor?.type !== "character") return true;
  if (spendStoryPoints(actor.system.storyPoints.value, cost).ok) return true;
  ui.notifications.warn(game.i18n.format("TTS.Notify.NotEnoughStoryPoints", { name: actor.name, cost }));
  return false;
}

function isOwnerOf(uuid) {
  if (game.user.isGM) return true;
  const doc = uuid ? fromUuidSync(uuid) : null;
  return Boolean(doc?.isOwner);
}

/** Hook renderChatMessageHTML (Foundry v13+). */
export function onRenderChatMessage(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || !getCard(message)) return;

  root.querySelectorAll('[data-visibility="gm"]').forEach(el => { if (!game.user.isGM) el.remove(); });
  root.querySelectorAll('[data-visibility="players"]').forEach(el => { if (game.user.isGM) el.remove(); });
  root.querySelectorAll("[data-owner-uuid]").forEach(el => { if (!isOwnerOf(el.dataset.ownerUuid)) el.remove(); });

  // Case d'amélioration déjà cochée : bouton inutile.
  root.querySelectorAll('[data-tts-action="tickImprovement"]').forEach(el => {
    const card = getCard(message);
    const actor = fromUuidSync(card.actorUuid);
    if (actor?.system?.skills?.[el.dataset.skill]?.improvement || !game.settings.get(SYSTEM_ID, "suggestImprovementTick")) el.remove();
  });

  root.querySelectorAll("[data-tts-action]").forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      el.disabled = true;
      onCardAction(message, el).finally(() => { el.disabled = false; });
    });
  });
}

async function onCardAction(message, el) {
  const card = getCard(message);
  const action = el.dataset.ttsAction;
  try {
    switch (action) {
      case "invert":
        if (!(await canAfford(card.actorUuid, GENERIC_INVERT_COST))) return;
        return RelayService.dispatch("taskInvert", { messageId: message.id, actorUuid: card.actorUuid });
      case "proposeFailure":
        return RelayService.dispatch("taskProposeFailure", { messageId: message.id, actorUuid: card.actorUuid });
      case "resolveFailure":
        return RelayService.dispatch("taskResolveFailure", { messageId: message.id, actorUuid: card.actorUuid, accepted: el.dataset.accepted === "true" });
      case "tickImprovement": {
        const actor = await fromUuid(card.actorUuid);
        if (actor?.isOwner) await actor.update({ [`system.skills.${el.dataset.skill}.improvement`]: true });
        return ui.chat?.updateMessage?.(message);
      }
      case "opposedRoll":
        return rollOpposedSide(message, card, el.dataset.side);
      case "opposedInvert": {
        const side = el.dataset.side;
        if (!(await canAfford(card.opposed[side].actorUuid, GENERIC_INVERT_COST))) return;
        return RelayService.dispatch("opposedInvert", { messageId: message.id, actorUuid: card.opposed[side].actorUuid, side });
      }
      case "requestRoll":
        return rollFromRequest(message, card, el.dataset.actorUuid);
      case "ability":
        return useAbility(message, card, el);
      case "flawFail":
        return flawFail(message, card);
      case "unlucky":
        return RelayService.dispatch("taskUnlucky", { messageId: message.id, actorUuid: card.actorUuid });
      case "spendResolve":
        return resolveSpendFromCard(message, card, el.dataset.decision);
    }
  } catch (err) {
    console.error(`${SYSTEM_ID} | action de carte « ${action} »`, err);
    ui.notifications.error(err.message);
  }
}

/** Le second camp d'une opposition lance son jet (compétence choisie par l'initiateur). */
async function rollOpposedSide(message, card, side) {
  const info = card.opposed[side];
  const actor = await fromUuid(info.actorUuid);
  if (!actor?.isOwner) return;
  const ctx = contextFromChoice(actor, side === "b" ? card.opposed.bChoice : "");
  const choices = await promptTaskRoll(ctx, { allowOpposition: false, defaultRollMode: defaultRollModeFor(actor) });
  if (!choices) return;
  if (choices.abilityCost && !(await canAfford(actor.uuid, choices.abilityCost))) return;
  const { roll, task } = await evaluateTaskRoll(ctx, choices);
  if (choices.abilityCost) await actor.update({ "system.storyPoints.value": actor.system.storyPoints.value - choices.abilityCost });
  if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);
  await awardKarmaPoint(actor, task);
  return RelayService.dispatch("opposedRoll", { messageId: message.id, actorUuid: actor.uuid, side, task, rolls: [roll.total] });
}

/** Un joueur répond à une demande de jet du Chef. */
async function rollFromRequest(message, card, actorUuid) {
  const actor = await fromUuid(actorUuid);
  if (!actor?.isOwner || actor.type !== "character") return;
  const ctx = characterSkillContext(actor, card.skillKey);
  const created = await rollTask(ctx, {
    lockedDifficulty: card.difficulty,
    hidden: card.hidden,
    allowOpposition: false,
    requestMessageId: message.id
  });
  if (created) await RelayService.dispatch("requestMarkRolled", { messageId: message.id, actorUuid });
}

/** Activation de capacité depuis une carte : contrôle du coût côté client, d% local pour les relances. */
async function useAbility(message, card, el) {
  const side = el.dataset.side || null;
  const actorUuid = side ? card.opposed[side].actorUuid : card.actorUuid;
  const actor = await fromUuid(actorUuid);
  if (!actor?.isOwner) return;
  const ability = actor.items.get(el.dataset.abilityId);
  const act = ability?.system.activations?.[Number(el.dataset.index)];
  if (!act) return;
  if (act.type !== "failForPoints" && !(await canAfford(actorUuid, act.cost))) return;
  const request = { messageId: message.id, actorUuid, abilityId: ability.id, index: Number(el.dataset.index), side };
  if (act.type === "reroll" || act.type === "rerollWith") {
    const roll = await new Roll("1d100").evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);
    request.result = roll.total;
    request.rolls = [roll.total];
  }
  return RelayService.dispatch("cardAbility", request);
}

/** Rater un jet réussi au titre d'un désavantage : choix du désavantage s'il y en a plusieurs. */
async function flawFail(message, card) {
  const actor = await fromUuid(card.actorUuid);
  if (!actor?.isOwner) return;
  const flaws = actor.items.filter(i => i.type === "flaw");
  if (!flaws.length) return;
  let flawId = flaws[0].id;
  if (flaws.length > 1) {
    const options = flaws.map(f => `<option value="${f.id}">${foundry.utils.escapeHTML?.(f.name) ?? f.name}</option>`).join("");
    flawId = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("TTS.Chat.FlawFail") },
      content: `<div class="form-group"><label>${game.i18n.localize("TTS.Item.Flaws")}</label><select name="flawId">${options}</select></div>`,
      ok: { callback: (event, button) => button.form.elements.flawId.value },
      rejectClose: false
    });
    if (!flawId) return;
  }
  return RelayService.dispatch("taskFlawFail", { messageId: message.id, actorUuid: card.actorUuid, flawId });
}

/** Décision du Chef sur une dépense ; « Modifier » demande le nouveau coût. */
async function resolveSpendFromCard(message, card, decision) {
  if (!game.user.isGM) return;
  const request = { messageId: message.id, actorUuid: card.spend.actorUuid, decision };
  if (decision === "modify") {
    const data = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("TTS.Spend.Modify") },
      content: `<div class="form-group"><label>${game.i18n.localize("TTS.Spend.NewCost")}</label><input name="cost" type="number" min="0" max="12" value="${card.spend.reserved}"></div>
        <div class="form-group"><label>${game.i18n.localize("TTS.Spend.Note")}</label><input name="note" type="text"></div>`,
      ok: { callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
      rejectClose: false
    });
    if (!data) return;
    request.cost = Number(data.cost) || 0;
    request.note = data.note ?? "";
  }
  return RelayService.dispatch("spendResolve", request);
}
