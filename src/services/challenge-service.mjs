/**
 * Défis et duels dans le chat (bible chap. 12, LdB p. 84-86).
 * Chaque jet est une carte de jet de tâche ordinaire (inversions, capacités) liée à la carte de défi ou de duel ;
 * le MJ resynchronise la carte à chaque modification du jet.
 */
import { SYSTEM_ID, THETROUBLESHOOTERS } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { createTaskState } from "../domain/dice/task-state.mjs";
import { setChallengeRoll, evaluateChallenge } from "../domain/rules/challenge.mjs";
import { requestExchange, setExchangeRoll, evaluateDuel, skillFor, pipsFor, repeatPenalty } from "../domain/rules/duel.mjs";
import { resolveNpcSkill } from "../domain/rules/npc.mjs";
import { createCardMessage, getCard, updateCardMessage } from "../chat/cards.mjs";
import { rollTask } from "./roll-service.mjs";
import { characterSkillContext, npcSkillContext } from "./roll-context.mjs";

const t = key => game.i18n.localize(key);
const skillLabel = key => t(THETROUBLESHOOTERS.skills[key]?.label ?? key);
const gmOnly = { gmOnly: true };
const RULE = { immutable: [], transitions: {}, maxRolls: 0, requireOwner: true };

/* ---------------------------------------------------------------- */
/*  Publication                                                     */
/* ---------------------------------------------------------------- */

export function publishChallenge(state) {
  return createCardMessage({ kind: "challenge", challenge: state }, { speaker: { alias: t("TTS.Request.Speaker") } });
}

export function publishDuel(state) {
  return createCardMessage({ kind: "duel", duel: state }, { speaker: { alias: t("TTS.Request.Speaker") } });
}

/* ---------------------------------------------------------------- */
/*  Choix de l'acteur qui lance                                     */
/* ---------------------------------------------------------------- */

async function chooseActor(candidates, title) {
  const list = candidates.filter(a => a?.isOwner);
  if (!list.length) { ui.notifications.warn(t("TTS.Challenge.NoActor")); return null; }
  const preferred = game.user.character && list.find(a => a.id === game.user.character.id);
  if (list.length === 1 || (preferred && !game.user.isGM)) return preferred ?? list[0];
  const options = list.map(a => `<option value="${a.uuid}">${foundry.utils.escapeHTML(a.name)}</option>`).join("");
  const uuid = await foundry.applications.api.DialogV2.prompt({
    window: { title },
    content: `<div class="form-group"><label>${t("TTS.Challenge.WhoRolls")}</label><select name="who">${options}</select></div>`,
    ok: { callback: (event, button) => button.form.elements.who.value },
    rejectClose: false
  });
  return uuid ? list.find(a => a.uuid === uuid) : null;
}

/** Contexte de jet : Risque-tout (compétence) ou PNJ (compétence listée, spécialité ou base, au choix du Chef). */
async function contextFor(actor, skill) {
  if (actor.type === "character") return characterSkillContext(actor, skill);
  const listed = resolveNpcSkill(actor.system, { skillName: skillLabel(skill) });
  const choices = {
    ...(listed.source === "skill" ? { skill: `${listed.name} (${listed.value} %)` } : {}),
    specialty: `${t("TTS.Npc.Specialty")} (${actor.system.specialty.value} %)`,
    base: `${t("TTS.Npc.BaseSkill")} (${actor.system.baseSkill} %)`
  };
  const options = Object.entries(choices).map(([k, v]) => `<option value="${k}">${foundry.utils.escapeHTML(v)}</option>`).join("");
  const source = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${actor.name} — ${skillLabel(skill)}` },
    content: `<div class="form-group"><label>${t("TTS.Challenge.NpcSkill")}</label><select name="source">${options}</select></div><p class="hint">${t("TTS.Challenge.NpcSkillHint")}</p>`,
    ok: { callback: (event, button) => button.form.elements.source.value },
    rejectClose: false
  });
  if (!source) return null;
  if (source === "skill") return npcSkillContext(actor, { skillName: skillLabel(skill) });
  return npcSkillContext(actor, { source });
}

/* ---------------------------------------------------------------- */
/*  Actions des cartes                                              */
/* ---------------------------------------------------------------- */

export async function onChallengeDuelAction(message, card, el) {
  const action = el.dataset.ttsAction;
  if (action === "chRoll") return rollChallengeRow(message, card, Number(el.dataset.row));
  if (action === "duRequest") return requestDuelExchange(message, card, el.dataset.side);
  if (action === "duRoll") return rollDuelSide(message, card, el.dataset.side);
}

async function rollChallengeRow(message, card, index) {
  const row = card.challenge.rows[index];
  if (!row || row.rollMessageId) return;
  const assigned = row.actorUuid ? await fromUuid(row.actorUuid) : null;
  const actor = assigned ?? await chooseActor(game.actors.filter(a => a.type === "character"), card.challenge.title || t("TTS.Challenge.Title"));
  if (!actor?.isOwner) return;
  const ctx = await contextFor(actor, row.skill);
  if (!ctx) return;
  const msg = await rollTask(ctx, {
    allowOpposition: false,
    extraMods: row.pips ? [{ label: t("TTS.Challenge.Modifier"), pips: row.pips }] : [],
    cardExtra: { challenge: { messageId: message.id, row: index } }
  });
  if (msg) await RelayService.dispatch("challengeRolled", { messageId: message.id, actorUuid: actor.uuid, row: index, rollMessageId: msg.id }, gmOnly);
}

async function requestDuelExchange(message, card, side) {
  const d = card.duel;
  const members = (await Promise.all(d.sides[side].participants.map(u => fromUuid(u)))).filter(Boolean);
  const actor = members.find(a => a.isOwner);
  if (!actor) return;
  const scope = game.settings.get(SYSTEM_ID, "duelRepeatScope");
  const skills = Object.entries(THETROUBLESHOOTERS.skills).map(([k, s]) => {
    const pen = repeatPenalty(d, side, k, scope);
    return `<option value="${k}">${foundry.utils.escapeHTML(t(s.label))}${pen ? ` (${pen})` : ""}</option>`;
  }).join("");
  const data = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${t("TTS.Duel.Request")} — ${d.sides[side].name}` },
    content: `<div class="form-group"><label>${t("TTS.Duel.Skill")}</label><select name="skill">${skills}</select></div>
      <div class="form-group"><label>${t("TTS.Duel.OppSkill")}</label><select name="oppSkill"><option value="">${t("TTS.Duel.SameSkill")}</option>${skills}</select></div>
      <p class="hint">${t("TTS.Duel.RequestHint")}</p>`,
    ok: { callback: (event, button) => ({ skill: button.form.elements.skill.value, oppSkill: button.form.elements.oppSkill.value }) },
    rejectClose: false
  });
  if (!data?.skill) return;
  return RelayService.dispatch("duelRequest", { messageId: message.id, actorUuid: actor.uuid, side, ...data }, gmOnly);
}

async function rollDuelSide(message, card, side) {
  const d = card.duel;
  const index = d.pending;
  const ex = d.exchanges[index];
  if (!ex || ex[side].rollMessageId) return;
  const members = (await Promise.all(d.sides[side].participants.map(u => fromUuid(u)))).filter(Boolean);
  const actor = await chooseActor(members, d.sides[side].name);
  if (!actor) return;
  const skill = skillFor(ex, side);
  const ctx = await contextFor(actor, skill);
  if (!ctx) return;
  const pips = pipsFor(ex, side);
  const msg = await rollTask(ctx, {
    allowOpposition: false,
    extraMods: pips ? [{ label: t("TTS.Duel.RepeatPenalty"), pips }] : [],
    cardExtra: { duel: { messageId: message.id, index, side } }
  });
  if (msg) await RelayService.dispatch("duelRolled", { messageId: message.id, actorUuid: actor.uuid, side, index, rollMessageId: msg.id }, gmOnly);
}

/* ---------------------------------------------------------------- */
/*  Relais (MJ)                                                     */
/* ---------------------------------------------------------------- */

const taskOf = id => getCard(game.messages.get(id))?.task ?? null;

function loadCard(message, kind) {
  const card = foundry.utils.deepClone(getCard(message));
  if (card?.kind !== kind) throw new Error("Carte introuvable");
  return card;
}

function unwrap(r) {
  if (!r.ok) {
    const key = `TTS.Challenge.Refused.${r.reason}`;
    throw new Error(game.i18n.has(key) ? t(key) : r.reason);
  }
  return r.state;
}

export function registerChallengeHandlers() {
  RelayService.register("challengeRolled", {
    rule: RULE,
    apply: async ({ message, actor, request }) => {
      const card = loadCard(message, "challenge");
      const row = card.challenge.rows[request.row];
      if (!row) throw new Error("Ligne introuvable");
      if (row.actorUuid && row.actorUuid !== actor.uuid) throw new Error(t("TTS.Challenge.NotAssigned"));
      const roll = getCard(game.messages.get(request.rollMessageId));
      if (roll?.kind !== "task" || roll.actorUuid !== actor.uuid) throw new Error("Jet introuvable");
      let oppositionTask = null;
      if (row.opposition) {
        const r = await new Roll("1d100").evaluate();
        oppositionTask = createTaskState({ value: row.opposition.value, result: r.total });
      }
      card.challenge.rows[request.row] = { ...row, actorUuid: actor.uuid, name: actor.name };
      card.challenge = unwrap(setChallengeRoll(card.challenge, request.row, { task: roll.task, oppositionTask, rollMessageId: request.rollMessageId }));
      await updateCardMessage(message, card);
    }
  });

  RelayService.register("challengeSync", {
    rule: { ...RULE, requireOwner: false },
    apply: async ({ message }) => {
      const card = loadCard(message, "challenge");
      const rows = card.challenge.rows.map(r => (r.rollMessageId ? { ...r, task: taskOf(r.rollMessageId) ?? r.task } : r));
      card.challenge = evaluateChallenge({ ...card.challenge, rows });
      await updateCardMessage(message, card);
    }
  });

  RelayService.register("duelRequest", {
    rule: RULE,
    apply: async ({ message, actor, user, request }) => {
      const card = loadCard(message, "duel");
      const side = request.side;
      if (!user.isGM && !card.duel.sides[side]?.participants.includes(actor.uuid)) throw new Error(t("TTS.Duel.NotYourSide"));
      card.duel = unwrap(requestExchange(card.duel, { side, skill: request.skill, oppSkill: request.oppSkill, scope: game.settings.get(SYSTEM_ID, "duelRepeatScope") }));
      await updateCardMessage(message, card);
    }
  });

  RelayService.register("duelRolled", {
    rule: RULE,
    apply: async ({ message, actor, request }) => {
      const card = loadCard(message, "duel");
      const side = request.side;
      if (!card.duel.sides[side]?.participants.includes(actor.uuid)) throw new Error(t("TTS.Duel.NotYourSide"));
      const roll = getCard(game.messages.get(request.rollMessageId));
      if (roll?.kind !== "task" || roll.actorUuid !== actor.uuid) throw new Error("Jet introuvable");
      card.duel = unwrap(setExchangeRoll(card.duel, request.index, side, { actorUuid: actor.uuid, task: roll.task, rollMessageId: request.rollMessageId }));
      await updateCardMessage(message, card);
    }
  });

  RelayService.register("duelSync", {
    rule: { ...RULE, requireOwner: false },
    apply: async ({ message }) => {
      const card = loadCard(message, "duel");
      const exchanges = card.duel.exchanges.map(ex => ({
        ...ex,
        a: ex.a.rollMessageId ? { ...ex.a, task: taskOf(ex.a.rollMessageId) ?? ex.a.task } : ex.a,
        b: ex.b.rollMessageId ? { ...ex.b, task: taskOf(ex.b.rollMessageId) ?? ex.b.task } : ex.b
      }));
      card.duel = evaluateDuel({ ...card.duel, exchanges });
      await updateCardMessage(message, card);
    }
  });
}
