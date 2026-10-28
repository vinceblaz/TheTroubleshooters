/**
 * Orchestration des jets de tâche (bible §7) : boîte de dialogue → d% → état pur → carte.
 */
import { SYSTEM_ID } from "../config.mjs";
import { netPips } from "../domain/dice/percentile.mjs";
import { createTaskState } from "../domain/dice/task-state.mjs";
import { createOpposedState } from "../domain/dice/opposed-state.mjs";
import { gainStoryPoints, spendStoryPoints } from "../domain/rules/story-points.mjs";
import { promptTaskRoll } from "../apps/roll-dialog.mjs";
import { createCardMessage } from "../chat/cards.mjs";
import { defaultRollModeFor } from "./roll-mode.mjs";
import { characterSkillContext, npcSkillContext, opponentSkillChoices, contextFromChoice } from "./roll-context.mjs";


/** Cibles possibles d'une opposition : jetons ciblés par l'utilisateur. */
function targetOpponents(actor) {
  return [...game.user.targets]
    .map(t => t.actor)
    .filter(a => a && a.id !== actor.id)
    .slice(0, 1)
    .map(a => ({ uuid: a.uuid, name: a.name, choices: opponentSkillChoices(a) }));
}

/**
 * Lance un d% et construit l'état du jet à partir des choix de la boîte de dialogue.
 * @returns {Promise<{roll:Roll, task:object, mods:Array}>}
 */
export async function evaluateTaskRoll(ctx, choices, { hiddenPips = 0 } = {}) {
  const mods = [];
  if (choices.difficulty && !hiddenPips) mods.push({ label: game.i18n.localize("TTS.Roll.Difficulty.Label"), pips: choices.difficulty });
  if (choices.circumstances) mods.push({ label: game.i18n.localize("TTS.Roll.Circumstances"), pips: choices.circumstances });
  if (choices.gearPips) mods.push({ label: choices.gearLabel || game.i18n.localize("TTS.Roll.Gear"), pips: choices.gearPips });
  if (choices.abilities) mods.push({ label: choices.abilityLabel || game.i18n.localize("TTS.Roll.Abilities"), pips: choices.abilities });
  for (const m of ctx.conditionMods) mods.push({ label: m.label, pips: m.pips });
  for (const m of ctx.flawMods ?? []) mods.push({ label: m.label, pips: m.pips });

  const pips = netPips({
    difficulty: hiddenPips ? 0 : choices.difficulty,
    circumstances: choices.circumstances,
    gear: choices.gearPips,
    abilities: choices.abilities,
    conditions: ctx.conditionMods,
    flaws: ctx.flawMods ?? []
  });

  const roll = await new Roll("1d100").evaluate();
  const task = createTaskState({
    value: ctx.value,
    pips,
    hiddenPips,
    mode: game.settings.get(SYSTEM_ID, "modifierMode"),
    result: roll.total
  });
  return { roll, task, mods };
}

/** Crédite +1 PR sur Karma (réglage), pour un Risque-tout uniquement. */
export async function awardKarmaPoint(actor, task) {
  if (!task.karma || actor?.type !== "character") return false;
  if (!game.settings.get(SYSTEM_ID, "autoKarmaStoryPoint")) return false;
  const max = game.settings.get(SYSTEM_ID, "maxStoryPoints");
  const { value, gained } = gainStoryPoints(actor.system.storyPoints.value, 1, max);
  if (gained) await actor.update({ "system.storyPoints.value": value });
  return gained > 0;
}

/**
 * Jet de tâche complet depuis une fiche.
 * @param {object} ctx   contexte (roll-context.mjs)
 * @param {{lockedDifficulty?:number, hidden?:boolean, allowOpposition?:boolean}} [opts]
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollTask(ctx, opts = {}) {
  const actor = ctx.actor;
  const choices = await promptTaskRoll(ctx, {
    lockedDifficulty: opts.lockedDifficulty,
    hiddenDifficulty: opts.hidden,
    opponents: opts.allowOpposition === false ? [] : targetOpponents(actor),
    defaultRollMode: defaultRollModeFor(actor)
  });
  if (!choices) return null;

  // Bonus de capacité payant (ex. Bonne réputation, 2 PR) : contrôlé avant le jet, débité après.
  if (choices.abilityCost && actor.type === "character") {
    const r = spendStoryPoints(actor.system.storyPoints.value, choices.abilityCost);
    if (!r.ok) {
      ui.notifications.warn(game.i18n.format("TTS.Notify.NotEnoughStoryPoints", { name: actor.name, cost: choices.abilityCost }));
      return null;
    }
  }

  const hiddenPips = opts.hidden ? (Number(opts.lockedDifficulty) || 0) : 0;
  const { roll, task, mods } = await evaluateTaskRoll(ctx, choices, { hiddenPips });
  if (choices.abilityCost && actor.type === "character") {
    await actor.update({ "system.storyPoints.value": spendStoryPoints(actor.system.storyPoints.value, choices.abilityCost).value });
  }
  const karmaAwarded = await awardKarmaPoint(actor, task);
  const speaker = ChatMessage.getSpeaker({ actor });

  if (choices.opposed && choices.opponentUuid) {
    const opponent = await fromUuid(choices.opponentUuid);
    if (opponent) {
      const oppCtx = contextFromChoice(opponent, choices.opponentChoice);
      const card = {
        kind: "opposed",
        opposed: {
          ...createOpposedState({
            a: { actorUuid: actor.uuid, name: actor.name, skillLabel: ctx.label, task },
            b: { actorUuid: opponent.uuid, name: opponent.name, skillLabel: oppCtx.label }
          }),
          bChoice: choices.opponentChoice
        }
      };
      card.opposed.a.isCharacter = actor.type === "character";
      card.opposed.a.skillKey = ctx.skillKey ?? "";
      card.opposed.b.skillKey = oppCtx.skillKey ?? "";
      card.opposed.b.isCharacter = opponent.type === "character";
      card.opposed.a.mods = mods;
      return createCardMessage(card, { speaker, rolls: [roll], rollMode: choices.rollMode });
    }
  }

  const card = {
    kind: "task",
    actorUuid: actor.uuid,
    isCharacter: actor.type === "character",
    skillKey: ctx.skillKey ?? "",
    label: ctx.label,
    value: ctx.value,
    mods,
    task,
    karmaAwarded,
    requestMessageId: opts.requestMessageId ?? ""
  };
  return createCardMessage(card, { speaker, rolls: [roll], rollMode: choices.rollMode });
}

/** API publique : jet de compétence d'un Risque-tout. */
export function rollCharacterSkill(actor, skillKey, opts) {
  return rollTask(characterSkillContext(actor, skillKey), opts);
}

/** API publique : jet de PNJ (base, spécialité ou compétence listée). */
export function rollNpcSkill(actor, selection, opts) {
  return rollTask(npcSkillContext(actor, selection), opts);
}
