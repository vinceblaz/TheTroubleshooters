/**
 * Dangers et rappels de tour (bible §11.1-11.2, LdB p. 100-103).
 *  - cartes de dégâts de danger : réutilisent la carte d'attaque (encaissement, choix de la cible) ;
 *  - cartes de vérification : chaque personnage lance son jet, puis « Appliquer » lit le jet final
 *    (inversions comprises) et le MJ applique l'issue.
 */
import { THETROUBLESHOOTERS } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { poolFormula, countHits } from "../domain/dice/pools.mjs";
import { createTaskState } from "../domain/dice/task-state.mjs";
import { createHazardState } from "../domain/combat/attack-state.mjs";
import { turnTriggers, fearToApply } from "../domain/rules/conditions.mjs";
import { fallOutcome, fireZoneOutcome, drowningOutcome, poisonOutcome, ambushOutcome, sniperOutcome, rollsSeparately,
  POISONS, FIRE_DICE, AMBUSH_EXTRA_DICE, SNIPER_EXTRA_DICE, SNIPER_PIPS } from "../domain/combat/hazards.mjs";
import { createCardMessage, getCard, updateCardMessage } from "../chat/cards.mjs";
import { rollTask } from "./roll-service.mjs";
import { characterSkillContext, npcSkillContext } from "./roll-context.mjs";
import { targetInfo, statusesOf } from "./combat-actors.mjs";
import { setCondition, conditionLabel } from "./condition-service.mjs";

const t = key => game.i18n.localize(key);
const f = (key, data) => game.i18n.format(key, data);
const gmSpeaker = () => ({ alias: t("TTS.Request.Speaker") });
const skillLabel = key => t(THETROUBLESHOOTERS.skills[key]?.label ?? key);

/* ---------------------------------------------------------------- */
/*  Dégâts de danger                                                */
/* ---------------------------------------------------------------- */

async function rollDamageDice(dice, kind = "dX") {
  const roll = await new Roll(poolFormula(dice, kind)).evaluate();
  if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);
  const faces = roll.dice.flatMap(d => d.results.map(r => r.result));
  return { roll, faces, hits: kind === "d6" ? roll.total : countHits(faces) };
}

/**
 * Inflige des dégâts de danger à des acteurs : un jet par Risque-tout, lieutenant et chef ;
 * un seul jet partagé par les sbires et sous-fifres (LdB p. 102).
 * @param {{kind:string, label:string, actors:Actor[], dice:number, soak?:boolean, sum?:boolean}} p  sum : dégâts « 1d6 » (somme)
 */
export async function inflictHazard({ kind, label, actors, dice, soak = true, sum = false }) {
  if (!(dice > 0) || !actors.length) return;
  let shared = null;
  let sharedShown = false;
  for (const actor of actors) {
    const group = !rollsSeparately(actor);
    const r = group ? (shared ??= await rollDamageDice(dice, sum ? "d6" : "dX")) : await rollDamageDice(dice, sum ? "d6" : "dX");
    const rolls = group && sharedShown ? [] : [r.roll];
    if (group) sharedShown = true;
    const attack = createHazardState({
      kind, label, target: targetInfo(actor), parts: [{ key: kind, dice, label }], faces: r.faces, hits: r.hits, soak
    });
    await createCardMessage({ kind: "attack", attack, primary: false, effects: {}, combatId: "", grouped: group },
      { speaker: gmSpeaker(), rolls });
  }
}

/* ---------------------------------------------------------------- */
/*  Cartes de vérification (chute, incendie, noyade, poison…)        */
/* ---------------------------------------------------------------- */

/**
 * @param {{kind:string, label:string, skill:string, pips?:number, note?:string, actors:Actor[], extra?:object}} p
 */
export async function createHazardCheck({ kind, label, skill, pips = 0, note = "", actors, extra = {} }) {
  if (!actors.length) return ui.notifications.warn(t("TTS.Hazard.NoActors"));
  const card = {
    kind: "hazardCheck",
    hazard: { kind, label, skill, skillLabel: skillLabel(skill), pips, note, ...extra },
    rows: actors.map(a => ({ actorUuid: a.uuid, name: a.name, rollMessageId: "", applied: false, result: "" }))
  };
  return createCardMessage(card, { speaker: gmSpeaker() });
}

function contextFor(actor, skill) {
  return actor.type === "character" ? characterSkillContext(actor, skill) : npcSkillContext(actor, { skillName: skillLabel(skill) });
}

export async function onHazardAction(message, card, el) {
  const action = el.dataset.ttsAction;
  const actorUuid = el.dataset.actorUuid;
  const actor = actorUuid ? await fromUuid(actorUuid) : null;
  if (!actor?.isOwner) return;
  if (action === "hzRoll") {
    const h = card.hazard;
    const extraMods = h.pips ? [{ label: h.label, pips: h.pips }] : [];
    const msg = await rollTask(contextFor(actor, h.skill), { allowOpposition: false, extraMods, rollKind: h.rollKind ?? "skill" });
    if (msg) await RelayService.dispatch("hazardRolled", { messageId: message.id, actorUuid, rollMessageId: msg.id }, { gmOnly: true });
    return;
  }
  if (action === "hzApply") return RelayService.dispatch("hazardApply", { messageId: message.id, actorUuid }, { gmOnly: true });
}

/** Applique l'issue d'une vérification (MJ). @returns {Promise<string>} texte affiché sur la carte */
async function applyOutcome(hazard, actor, task) {
  switch (hazard.kind) {
    case "fall": {
      const o = fallOutcome({ success: task.success, statuses: statusesOf(actor) });
      if (o) await setCondition(actor, o, true);
      return o ? conditionLabel(o) : t("TTS.Hazard.NoEffect");
    }
    case "fireZone": {
      const o = fireZoneOutcome(task.success);
      if (o) await setCondition(actor, o, true);
      return o ? conditionLabel(o) : t("TTS.Hazard.NoEffect");
    }
    case "drowning": {
      const dice = drowningOutcome(task.success);
      if (dice) await inflictHazard({ kind: "drowning", label: t("TTS.Hazard.Drowning"), actors: [actor], dice, soak: false });
      return dice ? f("TTS.Hazard.DamageDice", { dice }) : t("TTS.Hazard.NoEffect");
    }
    case "poison": {
      const poison = POISONS[hazard.poison] ?? { strength: hazard.strength, initial: {}, prolonged: {}, duration: "" };
      const roll = await new Roll("1d100").evaluate();
      const poisonTask = createTaskState({ value: hazard.strength ?? poison.strength, result: roll.total });
      const outcome = poisonOutcome(task, poisonTask);
      const parts = [f("TTS.Hazard.PoisonRoll", { result: roll.total, strength: poisonTask.value }), t(`TTS.Hazard.PoisonOutcome.${outcome}`)];
      if (outcome !== "none") {
        if (poison.initial.status) await setCondition(actor, poison.initial.status, true);
        if (poison.initial.damage) await inflictHazard({ kind: "poison", label: hazard.label, actors: [actor], dice: 1, soak: false, sum: true });
      }
      if (outcome === "prolonged" || outcome === "doubled") {
        for (const s of [poison.prolonged.status, ...(poison.prolonged.statuses ?? [])].filter(Boolean)) await setCondition(actor, s, true);
        if (hazard.poison) parts.push(f("TTS.Hazard.PoisonDuration", { effect: t(`TTS.Hazard.PoisonProlonged.${hazard.poison}`), duration: t(`TTS.Hazard.Duration.${poison.duration}`), factor: outcome === "doubled" ? "×2" : "" }));
      }
      return parts.join(" — ");
    }
    case "ambush": {
      const o = ambushOutcome(task);
      if (o === "outOfAction") await setCondition(actor, "outOfAction", true);
      if (o === "surprisedExtra") await setCondition(actor, "surprised", true);
      return f(`TTS.Hazard.Ambush.${o}`, { dice: AMBUSH_EXTRA_DICE });
    }
    case "sniper": {
      const o = sniperOutcome(task);
      const target = hazard.targetUuid ? await fromUuid(hazard.targetUuid) : null;
      if (o === "bonus" && target) await setCondition(target, "surprised", true);
      if (o === "takedown" && target) await setCondition(target, "outOfAction", true);
      return f(`TTS.Hazard.Sniper.${o}`, { pips: SNIPER_PIPS, dice: SNIPER_EXTRA_DICE, target: target?.name ?? "" });
    }
    default:
      return t(task.success ? "TTS.Chat.Success" : "TTS.Chat.Failure");
  }
}

export function registerHazardHandlers() {
  const rule = { immutable: [], transitions: {}, maxRolls: 0, requireOwner: true };
  const load = message => {
    const card = foundry.utils.deepClone(getCard(message));
    if (card?.kind !== "hazardCheck") throw new Error("Carte introuvable");
    return card;
  };

  RelayService.register("hazardRolled", {
    rule,
    apply: async ({ message, actor, request }) => {
      const card = load(message);
      const row = card.rows.find(r => r.actorUuid === actor?.uuid);
      if (!row || row.rollMessageId) throw new Error(t("TTS.Hazard.AlreadyRolled"));
      row.rollMessageId = request.rollMessageId;
      await updateCardMessage(message, card);
    }
  });

  RelayService.register("hazardApply", {
    rule,
    apply: async ({ message, actor }) => {
      const card = load(message);
      const row = card.rows.find(r => r.actorUuid === actor?.uuid);
      if (!row?.rollMessageId || row.applied) throw new Error(t("TTS.Hazard.NothingToApply"));
      const roll = getCard(game.messages.get(row.rollMessageId));
      if (roll?.kind !== "task" || roll.actorUuid !== actor.uuid) throw new Error("Jet introuvable");
      row.applied = true;
      row.success = Boolean(roll.task.success);
      row.result = "…";
      await updateCardMessage(message, card);
      row.result = await applyOutcome(card.hazard, actor, roll.task);
      await updateCardMessage(message, card);
    }
  });
}

/* ---------------------------------------------------------------- */
/*  Rappels de début et de fin de tour (MJ, appelé par le tracker)   */
/* ---------------------------------------------------------------- */

/**
 * Fin du tour du combattant précédent : Surpris disparaît ; Paralysé → jet d'Endurance.
 * Début du tour du combattant actif : En feu → 1dX (Hors de combat et En feu → Blessé) ;
 * Terrifié → jet de Volonté s'il est dans la zone de la source.
 */
export async function onTurnChange(combat, previousId) {
  const prev = previousId ? combat.combatants.get(previousId)?.actor : null;
  if (prev) {
    const end = turnTriggers(statusesOf(prev), "end");
    if (end.includes("surprised")) await setCondition(prev, "surprised", false);
    if (end.includes("paralyzed")) {
      await createHazardCheck({ kind: "paralyzed", label: conditionLabel("paralyzed"), skill: "endurance", note: t("TTS.Hazard.ParalyzedNote"), actors: [prev] });
    }
  }
  const cur = combat.combatant?.actor;
  if (!cur) return;
  const start = turnTriggers(statusesOf(cur), "start");
  if (start.includes("onFire")) {
    if (statusesOf(cur).includes("outOfAction")) await setCondition(cur, "wounded", true);
    await inflictHazard({ kind: "onFire", label: conditionLabel("onFire"), actors: [cur], dice: FIRE_DICE, soak: false });
  }
  if (start.includes("terrified")) {
    await createHazardCheck({ kind: "terrified", label: conditionLabel("terrified"), skill: "willpower", note: t("TTS.Hazard.TerrifiedNote"), actors: [cur] });
  }
}

/** Début du combat : Effrayant / Terrifiant d'un adversaire → condition sur les Risque-tout (LdB p. 206). */
export async function applyFearDescriptors(combat) {
  const norm = v => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const npcs = combat.combatants.map(c => c.actor).filter(a => a?.type === "npc");
  const keys = npcs.flatMap(a => (a.system.descriptors ?? []).map(d => norm(d.key)));
  const wanted = keys.some(k => k.startsWith("terrifiant")) ? "terrified" : (keys.some(k => k.startsWith("effrayant")) ? "frightened" : null);
  if (!wanted) return;
  for (const c of combat.combatants) {
    const a = c.actor;
    if (a?.type !== "character") continue;
    const apply = fearToApply(statusesOf(a), wanted);
    if (!apply) continue;
    if (apply === "terrified") await setCondition(a, "frightened", false);
    await setCondition(a, apply, true);
  }
}
