/**
 * Mutations des cartes de chat, toutes enregistrées dans le relais MJ (D-018).
 * Chaque `apply` revalide l'état avec la logique pure avant d'écrire ;
 * la carte est mise à jour avant les effets irréversibles quand c'est possible.
 */
import { SYSTEM_ID } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { GENERIC_INVERT_COST, invertTask, proposeVoluntaryFailure, resolveVoluntaryFailure,
  rerollTask, forceSuccessTask, rerollWithTask, failForPointsTask } from "../domain/dice/task-state.mjs";
import { computeOutcome, setSideRoll, invertSide } from "../domain/dice/opposed-state.mjs";
import { cardActivations } from "../domain/rules/activations.mjs";
import { resolveSpend } from "../domain/rules/spend.mjs";
import { STORY_POINT_GAINS, gainStoryPoints, spendStoryPoints } from "../domain/rules/story-points.mjs";
import { getCard, updateCardMessage } from "./cards.mjs";

const OWNER_RULE = { immutable: [], transitions: {}, maxRolls: 0, requireOwner: true };

/**
 * Vérifie qu'un Risque-tout peut payer, sans rien écrire. Renvoie la fonction de débit
 * à appeler APRÈS la mise à jour de la carte (ordre imposé, bible §4.5).
 */
function prepareSpend(actor, cost) {
  const r = spendStoryPoints(actor.system.storyPoints.value, cost);
  if (!r.ok) throw new Error(game.i18n.format("TTS.Notify.NotEnoughStoryPoints", { name: actor.name, cost }));
  return () => actor.update({ "system.storyPoints.value": r.value });
}

async function gain(actor, amount) {
  const max = game.settings.get(SYSTEM_ID, "maxStoryPoints");
  const { value } = gainStoryPoints(actor.system.storyPoints.value, amount, max);
  await actor.update({ "system.storyPoints.value": value });
}

function requireCard(message, kind) {
  const card = getCard(message);
  if (!card || card.kind !== kind) throw new Error(`Carte « ${kind} » introuvable`);
  return card;
}

/** Capacités d'un acteur pour la logique pure. */
function abilitiesOf(actor) {
  return actor.items.filter(i => i.type === "ability")
    .map(i => ({ id: i.id, name: i.name, acquired: i.system.acquired, activations: i.system.activations ?? [] }));
}

/**
 * Applique une activation de capacité à un état de jet (revalidée par la logique pure).
 * @returns {{state:object, cost:number, karma:boolean, gain:number}}
 */
function applyActivation(actor, task, skillKey, request) {
  const ability = actor.items.get(request.abilityId);
  const act = ability?.system.activations?.[request.index];
  if (!act) throw new Error("Activation introuvable");
  const allowed = cardActivations(abilitiesOf(actor), { skillKey, task })
    .some(a => a.abilityId === ability.id && a.index === Number(request.index));
  if (!allowed) throw new Error(game.i18n.localize("TTS.Notify.ActivationNotApplicable"));
  const label = ability.name;
  let r;
  switch (act.type) {
    case "invert": r = invertTask(task, { cost: act.cost, source: "ability", by: label }); if (r.ok) r.state.history.at(-1).label = label; break;
    case "reroll": r = rerollTask(task, request.result, { cost: act.cost, label }); break;
    case "forceSuccess": r = forceSuccessTask(task, { cost: act.cost, label }); break;
    case "rerollWith": {
      const value = actor.system.skills[act.skill]?.value ?? 0;
      r = rerollWithTask(task, { value, pips: act.pips, result: request.result, cost: act.cost, label });
      break;
    }
    case "failForPoints": r = failForPointsTask(task, { gain: act.gain || 3, source: "ability", label }); break;
    default: throw new Error("Type d'activation non géré sur une carte");
  }
  if (!r.ok) throw new Error(r.reason);
  return { state: r.state, cost: act.type === "failForPoints" ? 0 : act.cost, karma: Boolean(r.karmaChanged), gain: r.gain ?? 0 };
}

export function registerCardHandlers() {
  /* ---- Activation de capacité sur une carte (jet simple ou camp d'opposition) ---- */
  RelayService.register("cardAbility", {
    rule: { ...OWNER_RULE, maxRolls: 1 },
    apply: async ({ message, actor, request }) => {
      const card = getCard(message);
      if (actor?.type !== "character") throw new Error("Acteur non concerné");
      if (card?.kind === "task") {
        if (card.actorUuid !== actor.uuid) throw new Error("Acteur non concerné");
        const res = applyActivation(actor, card.task, card.skillKey, request);
        const debit = res.cost ? prepareSpend(actor, res.cost) : null;
        await updateCardMessage(message, { ...card, task: res.state });
        if (debit) await debit();
        if (res.karma && game.settings.get(SYSTEM_ID, "autoKarmaStoryPoint")) await gain(actor, STORY_POINT_GAINS.karma);
        if (res.gain) await gain(actor, res.gain);
        return;
      }
      if (card?.kind === "opposed") {
        const side = request.side;
        const s = card.opposed[side];
        if (s?.actorUuid !== actor.uuid || !s.task) throw new Error("Acteur non concerné");
        const res = applyActivation(actor, s.task, s.skillKey ?? "", request);
        const debit = res.cost ? prepareSpend(actor, res.cost) : null;
        const opposed = computeOutcome({ ...card.opposed, [side]: { ...s, task: res.state } });
        await updateCardMessage(message, { ...card, opposed: { ...card.opposed, ...opposed } });
        if (debit) await debit();
        if (res.karma && game.settings.get(SYSTEM_ID, "autoKarmaStoryPoint")) await gain(actor, STORY_POINT_GAINS.karma);
        return;
      }
      throw new Error("Carte introuvable");
    }
  });

  /* ---- Rater un jet réussi au titre d'un désavantage (+3 PR, immédiat) ---- */
  RelayService.register("taskFlawFail", {
    rule: OWNER_RULE,
    apply: async ({ message, actor, request }) => {
      const card = requireCard(message, "task");
      if (card.actorUuid !== actor?.uuid) throw new Error("Acteur non concerné");
      const flaw = actor.items.get(request.flawId);
      if (flaw?.type !== "flaw") throw new Error("Désavantage introuvable");
      const r = failForPointsTask(card.task, { gain: STORY_POINT_GAINS.flawMinor, source: "flaw", label: flaw.name });
      if (!r.ok) throw new Error(r.reason);
      await updateCardMessage(message, { ...card, task: r.state });
      await gain(actor, r.gain);
    }
  });

  /* ---- Malchanceux : le Chef inverse le jet, le joueur gagne 3 PR ---- */
  RelayService.register("taskUnlucky", {
    rule: OWNER_RULE,
    apply: async ({ message, actor, user }) => {
      if (!user.isGM) throw new Error(game.i18n.localize("TTS.Init.GmOnly"));
      const card = requireCard(message, "task");
      const r = invertTask(card.task, { cost: 0, source: "unlucky" });
      if (!r.ok) throw new Error(r.reason);
      r.state.history.at(-1).label = game.i18n.localize("TTS.Chat.Unlucky");
      await updateCardMessage(message, { ...card, task: r.state });
      if (actor?.type === "character") await gain(actor, STORY_POINT_GAINS.unlucky);
    }
  });

  /* ---- Décision du Chef sur une dépense de PR ---- */
  RelayService.register("spendResolve", {
    rule: OWNER_RULE,
    apply: async ({ message, actor, user, request }) => {
      if (!user.isGM) throw new Error(game.i18n.localize("TTS.Init.GmOnly"));
      const card = requireCard(message, "spend");
      const r = resolveSpend(card.spend, request.decision, { cost: request.cost, note: request.note ?? "" });
      if (!r.ok) throw new Error(r.reason);
      await updateCardMessage(message, { ...card, spend: r.state });
      if (actor?.type !== "character") return;
      if (r.refund) await gain(actor, r.refund);
      if (r.extra) {
        const left = Math.max(0, actor.system.storyPoints.value - r.extra);
        await actor.update({ "system.storyPoints.value": left });
      }
    }
  });

  /* ---- Jet de tâche : inversion générique (2 PR) ---- */
  RelayService.register("taskInvert", {
    rule: OWNER_RULE,
    apply: async ({ message, actor }) => {
      const card = requireCard(message, "task");
      if (card.actorUuid !== actor?.uuid || actor.type !== "character") throw new Error("Acteur non concerné");
      const r = invertTask(card.task, { cost: GENERIC_INVERT_COST, source: "generic" });
      if (!r.ok) throw new Error(r.reason);
      const debit = prepareSpend(actor, GENERIC_INVERT_COST);
      await updateCardMessage(message, { ...card, task: r.state });
      await debit();
    }
  });

  /* ---- Jet de tâche : proposition d'échec volontaire ---- */
  RelayService.register("taskProposeFailure", {
    rule: OWNER_RULE,
    apply: async ({ message, actor }) => {
      const card = requireCard(message, "task");
      if (card.actorUuid !== actor?.uuid) throw new Error("Acteur non concerné");
      const r = proposeVoluntaryFailure(card.task);
      if (!r.ok) throw new Error(r.reason);
      await updateCardMessage(message, { ...card, task: r.state });
    }
  });

  /* ---- Jet de tâche : décision du Chef sur l'échec volontaire ---- */
  RelayService.register("taskResolveFailure", {
    rule: OWNER_RULE,
    apply: async ({ message, actor, user, request }) => {
      if (!user.isGM) throw new Error(game.i18n.localize("TTS.Init.GmOnly"));
      const card = requireCard(message, "task");
      const r = resolveVoluntaryFailure(card.task, Boolean(request.accepted));
      if (!r.ok) throw new Error(r.reason);
      await updateCardMessage(message, { ...card, task: r.state });   // carte d'abord
      if (r.gain && actor?.type === "character") await gain(actor, r.gain);
    }
  });

  /* ---- Opposition : jet du second camp ---- */
  RelayService.register("opposedRoll", {
    rule: { ...OWNER_RULE, maxRolls: 1 },
    apply: async ({ message, actor, request }) => {
      const card = requireCard(message, "opposed");
      const side = request.side;
      if (card.opposed[side]?.actorUuid !== actor?.uuid) throw new Error("Acteur non concerné");
      const r = setSideRoll(card.opposed, side, request.task);
      if (!r.ok) throw new Error(r.reason);
      await updateCardMessage(message, { ...card, opposed: { ...card.opposed, ...r.state } });
    }
  });

  /* ---- Opposition : inversion d'un camp (2 PR) ---- */
  RelayService.register("opposedInvert", {
    rule: OWNER_RULE,
    apply: async ({ message, actor, request }) => {
      const card = requireCard(message, "opposed");
      const side = request.side;
      if (card.opposed[side]?.actorUuid !== actor?.uuid || actor.type !== "character") throw new Error("Acteur non concerné");
      const r = invertSide(card.opposed, side, { cost: GENERIC_INVERT_COST, source: "generic" });
      if (!r.ok) throw new Error(r.reason);
      const debit = prepareSpend(actor, GENERIC_INVERT_COST);
      await updateCardMessage(message, { ...card, opposed: { ...card.opposed, ...r.state } });
      await debit();
    }
  });

  /* ---- Demande de jet du Chef : marquer un acteur comme ayant lancé ---- */
  RelayService.register("requestMarkRolled", {
    rule: OWNER_RULE,
    apply: async ({ message, actor }) => {
      const card = requireCard(message, "request");
      const rows = card.rows.map(r => (r.actorUuid === actor?.uuid ? { ...r, rolled: true } : r));
      await updateCardMessage(message, { ...card, rows });
    }
  });
}
