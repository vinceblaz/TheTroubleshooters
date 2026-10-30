/**
 * Rendu des cartes de chat à partir de leur état (drapeau flags.thetroubleshooters.card).
 * Une carte est toujours re-rendue intégralement depuis son état : jamais de HTML modifié à la main.
 * Les boutons dépendant de l'acteur (capacités, désavantages) sont calculés au rendu.
 */
import { SYSTEM_ID, SYSTEM_PATH } from "../config.mjs";
import { cardActivations, attackActivations } from "../domain/rules/activations.mjs";
import { canFailForFlaw, hasUnluckyFlaw } from "../domain/rules/flaws.mjs";
import { initiativeFromTask, adjustInitiative } from "../domain/combat/initiative.mjs";
import { absorbOptions, applyAbsorb, npcCanCounter, sumDice } from "../domain/combat/attack.mjs";
import { damageTotal, expectedDamageParts } from "../domain/combat/attack-state.mjs";
import { sfxFor, injectSfx } from "./sfx.mjs";
import { statusesOf, capsOf, defenseChoicesOf, soakDiceFor, abilityList } from "../services/combat-actors.mjs";

const TEMPLATES = {
  task: `${SYSTEM_PATH}/templates/chat/task-card.hbs`,
  opposed: `${SYSTEM_PATH}/templates/chat/opposed-card.hbs`,
  request: `${SYSTEM_PATH}/templates/chat/request-card.hbs`,
  pool: `${SYSTEM_PATH}/templates/chat/pool-card.hbs`,
  spend: `${SYSTEM_PATH}/templates/chat/spend-card.hbs`,
  log: `${SYSTEM_PATH}/templates/chat/log-card.hbs`,
  attack: `${SYSTEM_PATH}/templates/chat/attack-card.hbs`,
  combatEnd: `${SYSTEM_PATH}/templates/chat/combat-end-card.hbs`,
  hazardCheck: `${SYSTEM_PATH}/templates/chat/hazard-check-card.hbs`,
  challenge: `${SYSTEM_PATH}/templates/chat/challenge-card.hbs`,
  duel: `${SYSTEM_PATH}/templates/chat/duel-card.hbs`
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
    unlucky: card.isCharacter && resolved && hasUnluckyFlaw(flaws),
    npcReverses: npcReversesLeft(actor, resolved),
    initiativeValue: card.initiative ? adjustInitiative(initiativeFromTask(card.task), card.initiative.bonus) : null,
    exitLabel: card.exit ? exitText(card.exit) : ""
  };
}

/** Libellé d'un jet de sortie de condition (phase 5). */
function exitText(exit) {
  const cond = game.i18n.localize(CONFIG.THETROUBLESHOOTERS?.conditions?.[exit.condition]?.label ?? exit.condition);
  const key = exit.mode === "patchUp" ? "TTS.Condition.PatchUpFor" : (exit.condition === "terrified" ? "TTS.Condition.ExitToFrightened" : "TTS.Condition.ExitFor");
  return game.i18n.format(key, { condition: cond, name: exit.targetName });
}

/** « Inverser (X) » d'un PNJ : jets restants pendant le combat (0 hors combat ou sans descripteur). */
function npcReversesLeft(actor, open = true) {
  if (!open || actor?.type !== "npc") return 0;
  return Number(actor.system.counters?.reversesLeft) || 0;
}

const CARD_TYPES = ["invert", "reroll", "forceSuccess", "rerollWith"];
const tl = key => game.i18n.localize(key);

/** Contexte de rendu de la carte d'attaque : boutons calculés selon l'étape et les acteurs. */
function attackCardContext(card) {
  const s = card.attack;
  const attacker = fromUuidSync(s.attacker.actorUuid);
  const target = s.target ? fromUuidSync(s.target.actorUuid) : null;
  const open = !s.locked;
  const taskButtons = (actor, task, skillKey, side) => {
    if (!open || !task || actor?.type !== "character") return [];
    return abilityButtons(actor, skillKey, task).filter(b => CARD_TYPES.includes(b.type)).map(b => ({ ...b, side }));
  };
  const tStatuses = statusesOf(target);
  const absorb = s.stage === "absorb" && target
    ? absorbOptions({ caps: capsOf(target), statuses: tStatuses, flags: s.attacker.flags }).map(o => {
      const preview = o.key === "vitality" ? applyAbsorb({ choice: "vitality", vitality: target.system.vitality.value, loss: s.loss, statuses: tStatuses }) : null;
      return { key: o.key, label: tl(`TTS.Attack.Absorb.${o.key}`), death: preview?.death, out: preview?.outOfAction && !preview?.death, left: preview?.vitality };
    })
    : [];
  const attackAbilities = attacker?.type === "character"
    ? attackActivations(abilityList(attacker), { stage: s.stage, hit: s.hit, targetRank: s.target?.rank ?? "", damageRolled: Boolean(s.damage), soaked: Boolean(s.soak) })
      .map(a => ({ abilityId: a.abilityId, index: a.index, type: a.act.type, cost: a.act.cost, label: `${a.abilityName} : ${tl(`TTS.ActivationType.${a.act.type}`)}`, hint: a.act.label }))
    : [];
  const ammoNote = card.effects?.ammo?.empty
    ? tl(card.effects.ammo.jammed ? "TTS.Weapon.JammedNow" : `TTS.Weapon.EmptyReason.${card.effects.ammo.reason}`) : "";
  return {
    card,
    s,
    optionLabel: tl(`TTS.Attack.Options.${s.option}`) + (s.option === "rakatakata" ? ` (${tl(s.rakatakataMode === "zone" ? "TTS.Attack.RakatakataZone" : "TTS.Attack.RakatakataSingle")})` : ""),
    open,
    attackerInvert: open && s.attacker.isCharacter,
    attackerMortal: open && statusesOf(attacker).includes("mortalDanger"),
    attackerNpcReverses: open ? npcReversesLeft(attacker) : 0,
    attackerAbilities: taskButtons(attacker, s.attacker.task, s.attacker.skillKey, "attacker"),
    defenseChoices: s.stage === "defense" && target ? defenseChoicesOf(target) : [],
    targetInvert: open && Boolean(s.target?.defenseTask) && s.target?.isCharacter,
    targetNpcReverses: open && s.target?.defenseTask ? npcReversesLeft(target) : 0,
    targetAbilities: taskButtons(target, s.target?.defenseTask, s.target?.isCharacter ? s.target.defenseKey : "", "target"),
    expectedDice: s.stage === "damage" ? sumDice(expectedDamageParts(s)) : 0,
    damageTotal: damageTotal(s),
    karmaReroll: Boolean(s.damage && s.karma?.damageReroll && !s.damage.karmaRerollUsed && !s.soak),
    attackAbilities,
    soakDice: s.stage === "soak" && target ? soakDiceFor(target, s.attacker.flags) : 0,
    absorb,
    absorbLabel: s.absorb ? tl(`TTS.Attack.Absorb.${s.absorb.choice}`) : "",
    canRecover: Boolean(s.karma?.defenderRecovery && !s.recovery && ["miss", "done"].includes(s.stage)),
    canCounter: Boolean(!s.hazard && !card.counterDone && target?.type === "npc" && npcCanCounter(target.system) && !tStatuses.includes("outOfAction") && ["miss", "done"].includes(s.stage)),
    canIgnite: Boolean(s.attacker.flags.incendiary && s.hit),
    ammoNote,
    damageParts: (s.damage?.parts ?? []).map(p => ({ ...p, label: p.label || tl(`TTS.Attack.Part.${p.key}`) }))
  };
}

const skillName = key => tl(CONFIG.THETROUBLESHOOTERS?.skills?.[key]?.label ?? key);

/** Carte de défi (phase 6). */
function challengeContext(card) {
  const c = card.challenge;
  return {
    card, c,
    rows: c.rows.map(r => ({ ...r, skillLabel: skillName(r.skill), result: r.task?.result ?? null, oppResult: r.oppositionTask?.result ?? null })),
    rolled: c.rows.filter(r => r.task).length,
    resultLabel: c.result ? tl(`TTS.Challenge.Result.${c.result}`) : "",
    outcomeText: c.result ? c.outcomes?.[c.result] ?? "" : "",
    gadgetBuilt: ["excellent", "good", "limited"].includes(c.result)
  };
}

/** Carte de duel (phase 6). */
function duelContext(card) {
  const d = card.duel;
  const nameOf = uuid => fromUuidSync(uuid)?.name ?? "?";
  const sides = ["a", "b"].map(key => ({
    key, ...d.sides[key], score: d.score[key], owners: d.sides[key].participants.join(","),
    names: d.sides[key].participants.map(nameOf).join(", "), winner: d.winner === key
  }));
  const exchanges = d.exchanges.map((ex, i) => ({
    n: i + 1, byName: d.sides[ex.by].name, skillLabel: skillName(ex.skill), oppLabel: ex.oppSkill !== ex.skill ? skillName(ex.oppSkill) : "",
    pips: ex.pips,
    sides: ["a", "b"].map(k => ({ key: k, name: d.sides[k].name, who: ex[k].actorUuid ? nameOf(ex[k].actorUuid) : "", result: ex[k].task?.result ?? null, success: ex[k].task?.success, skill: skillName(k === ex.by ? ex.skill : ex.oppSkill) })),
    winnerName: ex.winner ? d.sides[ex.winner].name : "", tie: ex.winner === null, describerName: ex.describer ? d.sides[ex.describer].name : "",
    pending: i === d.pending
  }));
  const pending = d.pending !== null ? d.exchanges[d.pending] : null;
  return {
    card, d, sides, exchanges,
    turnSide: d.turn ? sides.find(s => s.key === d.turn) : null,
    rollSides: pending ? sides.filter(s => !pending[s.key].rollMessageId) : [],
    winnerSide: d.winner ? sides.find(s => s.key === d.winner) : null
  };
}

function combatEndContext(card) {
  return { card, rows: card.rows.map(r => ({ ...r })) };
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

/** Contenu HTML d'une carte, avec son onomatopée éventuelle (charte, phase 10). */
export async function renderCard(card) {
  const html = await renderCardBody(card);
  const sfx = sfxFor(card);
  return sfx ? injectSfx(html, sfx, game.i18n.localize(`TTS.Sfx.${sfx.key}`)) : html;
}

async function renderCardBody(card) {
  switch (card.kind) {
    case "task": return render(TEMPLATES.task, taskContext(card));
    case "opposed": return render(TEMPLATES.opposed, opposedContext(card));
    case "request": return render(TEMPLATES.request, { card, skillLabel: card.skillLabel, difficultyLabel: card.difficultyLabel });
    case "pool": return render(TEMPLATES.pool, card.view);
    case "spend": return render(TEMPLATES.spend, { card, spend: card.spend });
    case "log": return render(TEMPLATES.log, card);
    case "attack": return render(TEMPLATES.attack, attackCardContext(card));
    case "combatEnd": return render(TEMPLATES.combatEnd, combatEndContext(card));
    case "hazardCheck": return render(TEMPLATES.hazardCheck, { card, hazard: card.hazard, rows: card.rows });
    case "challenge": return render(TEMPLATES.challenge, challengeContext(card));
    case "duel": return render(TEMPLATES.duel, duelContext(card));
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
