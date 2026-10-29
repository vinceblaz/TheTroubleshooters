/**
 * Combat dans Foundry (bible §10.1, 10.2, 10.6) : initiative, aide-mémoire des actions dans le tracker,
 * début et fin de combat.
 */
import { SYSTEM_ID } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { initiativeFromTask, adjustInitiative, initiativeGearBonus } from "../domain/combat/initiative.mjs";
import { npcReverses, npcCanCounter } from "../domain/combat/attack.mjs";
import { endOfCombatFor, allCharactersDown } from "../domain/combat/combat-end.mjs";
import { STORY_POINT_GAINS } from "../domain/rules/story-points.mjs";
import { createCardMessage, getCard, updateCardMessage } from "../chat/cards.mjs";
import { evaluateTaskRoll, awardKarmaPoint, rollTask } from "./roll-service.mjs";
import { characterSkillContext, npcSkillContext } from "./roll-context.mjs";
import { defaultRollModeFor } from "./roll-mode.mjs";
import { hasReach, initiativePenaltyOf, statusesOf, combatantOf } from "./combat-actors.mjs";
import { adjustMany } from "./story-point-service.mjs";
import { onTurnChange, applyFearDescriptors } from "./hazard-service.mjs";

const t = key => game.i18n.localize(key);
const ACTIONS = ["move", "free", "main", "bonus"];
const FRESH_TURN = { actions: { move: false, free: false, main: false, bonus: false }, bonusGranted: false, actNow: false, delay: "" };

/* ---------------------------------------------------------------- */
/*  Initiative                                                      */
/* ---------------------------------------------------------------- */

/**
 * Initiative d'un acteur : valeur fixe d'un PNJ, sinon jet de tâche de Vigilance (carte de jet, inversable).
 * @returns {Promise<number|null>}
 */
export async function rollInitiativeFor(actor, { combat, combatant } = {}) {
  if (!actor) return null;
  if (actor.type === "npc" && actor.system.initiative.mode === "fixed") return Number(actor.system.initiative.value) || 0;

  const ctx = actor.type === "character" ? characterSkillContext(actor, "vigilance") : npcSkillContext(actor, { skillName: "Vigilance" });
  const bonus = initiativeGearBonus({ reach: hasReach(actor), protectionPenalty: initiativePenaltyOf(actor) });
  const { roll, task, mods } = await evaluateTaskRoll(ctx, { difficulty: 0, circumstances: 0, gearPips: 0, abilities: 0 });
  const karmaAwarded = await awardKarmaPoint(actor, task);
  const card = {
    kind: "task",
    actorUuid: actor.uuid,
    isCharacter: actor.type === "character",
    skillKey: ctx.skillKey ?? "",
    label: `${t("TTS.Initiative.Label")} — ${ctx.label}`,
    value: ctx.value,
    mods,
    task,
    karmaAwarded,
    initiative: { combatId: combat?.id ?? "", combatantId: combatant?.id ?? "", bonus }
  };
  await createCardMessage(card, { speaker: ChatMessage.getSpeaker({ actor }), rolls: [roll], rollMode: defaultRollModeFor(actor) });
  return adjustInitiative(initiativeFromTask(task), bonus);
}

/* ---------------------------------------------------------------- */
/*  Tracker : pastilles d'actions (rappel, sans verrou — P6)         */
/* ---------------------------------------------------------------- */

export function onRenderCombatTracker(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  const combat = app.viewed ?? game.combat;
  if (!root || !combat) return;
  for (const li of root.querySelectorAll("[data-combatant-id]")) {
    const combatant = combat.combatants.get(li.dataset.combatantId);
    if (!combatant) continue;
    const f = combatant.flags?.[SYSTEM_ID] ?? {};
    const acts = { ...FRESH_TURN.actions, ...(f.actions ?? {}) };
    const box = document.createElement("div");
    box.className = "tts-tracker-actions";
    box.innerHTML = ACTIONS.map(a => `<a class="tts-pip ${acts[a] ? "tts-used" : ""} ${a === "bonus" && f.bonusGranted ? "tts-granted" : ""}"
        data-tts-pip="${a}" data-tooltip="${t(`TTS.Combat.Action.${a}`)}">${t(`TTS.Combat.ActionShort.${a}`)}</a>`).join("")
      + (f.actNow ? `<a class="tts-pip tts-act-now" data-tts-pip="actNow" data-tooltip="${t("TTS.Combat.ActNow")}"><i class="fa-solid fa-bolt"></i></a>` : "")
      + `<a class="tts-pip tts-delay ${f.delay ? "tts-used" : ""}" data-tts-pip="delay" data-tooltip="${foundry.utils.escapeHTML(f.delay || t("TTS.Combat.Delay"))}"><i class="fa-solid fa-hourglass-half"></i></a>`
      + markersFor(combatant.actor);
    if (combatant.isOwner) {
      box.querySelectorAll("[data-tts-pip]").forEach(el => el.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        onPipClick(combatant, el.dataset.ttsPip);
      }));
    }
    (li.querySelector(".token-name") ?? li).appendChild(box);
    if (f.delay) {
      const note = document.createElement("div");
      note.className = "tts-delay-note";
      note.textContent = f.delay;
      (li.querySelector(".token-name") ?? li).appendChild(note);
    }
  }
}

/** Rappels de descripteurs de PNJ dans le tracker : commandant (X), contre-attaque (LdB p. 206). */
function markersFor(actor) {
  if (actor?.type !== "npc") return "";
  const norm = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let out = "";
  const cmd = (actor.system.descriptors ?? []).find(d => norm(d.key).startsWith("commandant"));
  if (cmd) {
    const x = String(cmd.value || cmd.key).match(/\d+/)?.[0] ?? "?";
    out += `<span class="tts-pip tts-marker" data-tooltip="${t("TTS.Combat.CommanderHint")}"><i class="fa-solid fa-flag"></i>${x}</span>`;
  }
  if (npcCanCounter(actor.system)) out += `<span class="tts-pip tts-marker" data-tooltip="${t("TTS.Attack.Counter")}"><i class="fa-solid fa-reply"></i></span>`;
  return out;
}

async function onPipClick(combatant, pip) {
  const f = combatant.flags?.[SYSTEM_ID] ?? {};
  if (ACTIONS.includes(pip)) {
    const acts = { ...FRESH_TURN.actions, ...(f.actions ?? {}) };
    return combatant.setFlag(SYSTEM_ID, "actions", { ...acts, [pip]: !acts[pip] });
  }
  if (pip === "actNow") return combatant.setFlag(SYSTEM_ID, "actNow", false);
  if (pip === "delay") {
    const text = await foundry.applications.api.DialogV2.prompt({
      window: { title: t("TTS.Combat.Delay") },
      content: `<div class="form-group"><label>${t("TTS.Combat.DelayPrompt")}</label><input name="delay" type="text" value="${foundry.utils.escapeHTML(f.delay ?? "")}" placeholder="${t("TTS.Combat.DelayPlaceholder")}"></div>`,
      ok: { callback: (event, button) => button.form.elements.delay.value },
      rejectClose: false
    });
    if (text !== null && text !== undefined) return combatant.setFlag(SYSTEM_ID, "delay", String(text).trim());
  }
}

/** Marqueurs posés par une capacité (agir maintenant, action bonus accordée). */
export async function markCombatant(actor, key) {
  const c = combatantOf(actor);
  if (!c?.isOwner) return false;
  await c.setFlag(SYSTEM_ID, key, true);
  return true;
}

/** « Évaluer la situation » (action gratuite) : nouveau jet d'initiative. */
export async function reassessInitiative(actor) {
  const c = combatantOf(actor);
  if (!c) return ui.notifications.warn(t("TTS.Combat.NotInCombat"));
  return c.parent.rollInitiative([c.id]);
}

/* ---------------------------------------------------------------- */
/*  Hooks (MJ responsable uniquement)                               */
/* ---------------------------------------------------------------- */

/** Début du combat : compteurs « inverser (X) » des PNJ. */
export async function onCombatStart(combat) {
  if (!RelayService.isResponsibleGM) return;
  for (const c of combat.combatants) {
    const a = c.actor;
    if (a?.type === "npc") await a.update({ "system.counters.reversesLeft": npcReverses(a.system.descriptors) });
  }
  await applyFearDescriptors(combat);
}

/** Nouveau tour : pastilles, marqueurs et action retardée du combattant actif remis à zéro. */
export async function onUpdateCombat(combat, changed) {
  if (!RelayService.isResponsibleGM || !combat.started) return;
  if (!("turn" in changed) && !("round" in changed)) return;
  const c = combat.combatant;
  if (c) await c.update({ [`flags.${SYSTEM_ID}`]: FRESH_TURN });
  // Conditions de début et de fin de tour (phase 5)
  await onTurnChange(combat, combat.previous?.combatantId ?? null);
}

/** Fin du combat : Vitalité au maximum, Danger de mort retiré, carte de bilan (LdB p. 99). */
export async function onDeleteCombat(combat) {
  if (!RelayService.isResponsibleGM || !combat.started) return;
  const actors = [...new Map(combat.combatants.filter(c => c.actor).map(c => [c.actor.uuid, c.actor])).values()];
  const rows = [];
  for (const a of actors) {
    const end = endOfCombatFor({ vitality: a.system.vitality.value, max: a.system.vitality.max, statuses: statusesOf(a) });
    const update = { "system.vitality.value": end.vitality };
    if (a.type === "npc") update["system.counters.reversesLeft"] = 0;
    await a.update(update);
    for (const s of end.removeStatuses) await a.toggleStatusEffect(s, { active: false });
    rows.push({ actorUuid: a.uuid, name: a.name, isCharacter: a.type === "character", outOfAction: end.outOfAction, treated: false, result: "" });
  }
  const characters = actors.filter(a => a.type === "character").map(a => ({ statuses: statusesOf(a) }));
  await createCardMessage({ kind: "combatEnd", rows, allDown: allCharactersDown(characters), captured: false },
    { speaker: { alias: t("TTS.Request.Speaker") } });
}

/* ---------------------------------------------------------------- */
/*  Carte de fin de combat                                          */
/* ---------------------------------------------------------------- */

export async function pickHealer(excludeUuid) {
  const candidates = game.actors.filter(a => a.type === "character" && a.isOwner && a.uuid !== excludeUuid && !statusesOf(a).includes("outOfAction"));
  if (!candidates.length) { ui.notifications.warn(t("TTS.Combat.NoHealer")); return null; }
  const preferred = game.user.character && candidates.find(a => a.id === game.user.character.id);
  if (preferred || candidates.length === 1) return preferred ?? candidates[0];
  const options = candidates.map(a => `<option value="${a.id}">${foundry.utils.escapeHTML(a.name)}</option>`).join("");
  const id = await foundry.applications.api.DialogV2.prompt({
    window: { title: t("TTS.Combat.Medicine") },
    content: `<div class="form-group"><label>${t("TTS.Combat.Healer")}</label><select name="healer">${options}</select></div>`,
    ok: { callback: (event, button) => button.form.elements.healer.value },
    rejectClose: false
  });
  return id ? game.actors.get(id) : null;
}

export async function onCombatEndAction(message, card, el) {
  const action = el.dataset.ttsAction;
  if (action === "endMedicine") {
    const targetUuid = el.dataset.actorUuid;
    const healer = await pickHealer(targetUuid);
    if (!healer) return;
    const roll = await rollTask(characterSkillContext(healer, "medicine"), { allowOpposition: false });
    if (!roll) return;
    return RelayService.dispatch("combatEndMedicine", { messageId: message.id, actorUuid: healer.uuid, targetUuid, rollMessageId: roll.id }, { gmOnly: true });
  }
  if (action === "endCaptured" && game.user.isGM) {
    const pcs = [];
    for (const r of card.rows.filter(x => x.isCharacter)) { const a = await fromUuid(r.actorUuid); if (a) pcs.push(a); }
    await adjustMany(pcs, STORY_POINT_GAINS.captured, t("TTS.SP.Captured"));
    return updateCardMessage(message, { ...card, captured: true });
  }
}

export function registerCombatHandlers() {
  /* Jet de Médecine réussi : la cible n'est plus Hors de combat (une tentative par personnage) */
  RelayService.register("combatEndMedicine", {
    rule: { immutable: [], transitions: {}, maxRolls: 0, requireOwner: true },
    apply: async ({ message, request }) => {
      const card = foundry.utils.deepClone(getCard(message));
      if (card?.kind !== "combatEnd") throw new Error("Carte introuvable");
      const row = card.rows.find(r => r.actorUuid === request.targetUuid);
      if (!row?.outOfAction || row.treated) throw new Error(t("TTS.Combat.AlreadyTreated"));
      const rollCard = getCard(game.messages.get(request.rollMessageId));
      const healer = await fromUuid(request.actorUuid);
      if (rollCard?.kind !== "task" || rollCard.actorUuid !== healer?.uuid || rollCard.skillKey !== "medicine") throw new Error("Jet de Médecine introuvable");
      const success = Boolean(rollCard.task.success);
      Object.assign(row, { treated: true, result: game.i18n.format(success ? "TTS.Combat.MedicineSuccess" : "TTS.Combat.MedicineFailure", { healer: healer.name }) });
      await updateCardMessage(message, card);
      if (success) {
        const target = await fromUuid(row.actorUuid);
        if (target && statusesOf(target).includes("outOfAction")) await target.toggleStatusEffect("outOfAction", { active: false });
      }
    }
  });
}
