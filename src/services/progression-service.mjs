/**
 * Progression (phase 9, bible chap. 15, LdB p. 126-131).
 *  - débriefing (Chef) : coches gratuites ou points d'expérience, jets ou points de récompense, périodes d'intersession ;
 *  - amélioration (joueur) : jets d'expérience, croix de langue et de capacité, entraînement ;
 *  - intersession : convalescence, fréquentations, voyage, achats, artisanat.
 * L'état de la phase de débriefing (usages par cible) est porté par l'acteur : flags.thetroubleshooters.debrief.
 */
import { SYSTEM_ID, THETROUBLESHOOTERS } from "../config.mjs";
import { createCardMessage } from "../chat/cards.mjs";
import { baseMaxVitality } from "../domain/rules/vitality.mjs";
import { freeTicksFor, experienceRoll, pointIncrease, addLanguageCross, addAbilityCross, abilityPrerequisites,
  canUse, recordUse, DOWNTIME_STORY_POINTS } from "../domain/rules/progression.mjs";
import { setCondition } from "./condition-service.mjs";

const t = key => game.i18n.localize(key);
const f = (key, data) => game.i18n.format(key, data);
export const skillLabel = k => t(THETROUBLESHOOTERS.skills[k]?.label ?? k);
export const xpSystem = () => game.settings.get(SYSTEM_ID, "xpSystem");
const SPEAKER = () => ({ alias: t("TTS.Request.Speaker") });

/** État de la phase de débriefing d'un Risque-tout. */
export function debriefOf(actor) {
  return actor.getFlag(SYSTEM_ID, "debrief") ?? { phase: "", uses: {} };
}

const vitalityOf = actor => {
  const s = actor.system.skills;
  return baseMaxVitality({ agility: s.agility.value, melee: s.melee.value, shooting: s.shooting.value });
};

/**
 * Débriefing (Chef) : ouvre une nouvelle phase pour chaque Risque-tout.
 * @param {Array<{actor:Actor, criteria:object, penalty:number}>} rows
 * @param {{rewards?:Array<{label:string, skill:string, actorIds:string[]}>, periods?:number}} opts
 */
export async function grantDebrief(rows, { rewards = [], periods = 0 } = {}) {
  if (!game.user.isGM) return ui.notifications.warn(t("TTS.Progression.GmOnly"));
  const mode = xpSystem();
  const phase = foundry.utils.randomID();
  const lines = [];
  for (const { actor, criteria, penalty } of rows) {
    const n = freeTicksFor(criteria, penalty);
    const mine = rewards.filter(r => r.skill && (r.actorIds ?? []).includes(actor.id)).map(r => ({ skill: r.skill, source: r.label ?? "" }));
    const p = actor.system.progression;
    await actor.update({
      [`system.progression.${mode === "points" ? "xp" : "freeTicks"}`]: n,
      "system.progression.rewardRolls": [...(p.rewardRolls ?? []), ...mine],
      "system.progression.downtimePeriods": (p.downtimePeriods ?? 0) + Math.max(0, Number(periods) || 0)
    });
    await actor.setFlag(SYSTEM_ID, "debrief", { phase, uses: {} });
    const parts = [f(mode === "points" ? "TTS.Progression.GrantXp" : "TTS.Progression.GrantTicks", { count: n })];
    if (mine.length) parts.push(f("TTS.Progression.GrantRewards", { list: mine.map(r => skillLabel(r.skill)).join(", ") }));
    if (periods) parts.push(f("TTS.Progression.GrantPeriods", { count: periods }));
    lines.push({ name: actor.name, text: parts.join(" ; ") });
  }
  await createCardMessage({ kind: "log", title: t("TTS.Progression.DebriefTitle"), reason: t("TTS.Progression.DebriefReason"), lines }, { speaker: SPEAKER() });
  return lines;
}

/** Retire une unité de la source utilisée. Renvoie le patch d'acteur. */
function consumeSource(actor, { source, skill, rewardIndex }) {
  const p = actor.system.progression;
  switch (source) {
    case "ordinary": return { [`system.skills.${skill}.improvement`]: false };
    case "free": return { "system.progression.freeTicks": Math.max(0, p.freeTicks - 1) };
    case "xp": return { "system.progression.xp": Math.max(0, p.xp - 1) };
    case "training": return { "system.progression.downtimePeriods": Math.max(0, p.downtimePeriods - 1) };
    case "reward": case "rewardPoint": {
      const list = [...(p.rewardRolls ?? [])];
      list.splice(rewardIndex, 1);
      return { "system.progression.rewardRolls": list };
    }
  }
  return {};
}

/** La source est-elle disponible ? */
function sourceAvailable(actor, { source, skill, rewardIndex }) {
  const p = actor.system.progression;
  switch (source) {
    case "ordinary": return Boolean(actor.system.skills[skill]?.improvement);
    case "free": return p.freeTicks > 0;
    case "xp": return p.xp > 0;
    case "training": return p.downtimePeriods > 0;
    case "reward": case "rewardPoint": return Boolean(p.rewardRolls?.[rewardIndex]);
  }
  return false;
}

/**
 * Utilise une coche, un point ou un jet de récompense sur une cible.
 * @param {Actor} actor
 * @param {{source:string, skill?:string, rewardIndex?:number,
 *   target:{type:"skill"|"language"|"ability", key?:string, name?:string, itemId?:string, uuid?:string}}} p
 */
export async function useImprovement(actor, { source, skill = "", rewardIndex = -1, target }) {
  if (!actor?.isOwner) return null;
  const p = actor.system.progression;
  if (source === "reward" || source === "rewardPoint") skill = p.rewardRolls?.[rewardIndex]?.skill ?? "";
  if (!sourceAvailable(actor, { source, skill, rewardIndex })) return warn("no-source");

  // Résolution de la cible (objet possédé, ou modèle du compendium pour une capacité)
  let item = null, model = null;
  if (target.type === "language") {
    item = target.itemId ? actor.items.get(target.itemId) : actor.items.find(i => i.type === "language" && i.name.toLowerCase() === String(target.name ?? "").trim().toLowerCase());
    if (!item && !String(target.name ?? "").trim()) return warn("no-target");
    if (item?.system.fluent) return warn("already-fluent");
    target = { ...target, name: item?.name ?? target.name.trim() };
  }
  if (target.type === "ability") {
    item = target.itemId ? actor.items.get(target.itemId) : null;
    if (!item && target.uuid) model = await fromUuid(target.uuid);
    const src = item ?? model;
    if (!src) return warn("no-target");
    if (item?.system.acquired) return warn("already-acquired");
    item = item ?? actor.items.find(i => i.type === "ability" && i.name === src.name) ?? null;
    if (item?.system.acquired) return warn("already-acquired");
    target = { ...target, name: src.name, learnWith: [...(src.system.learnWith ?? [])], data: src.system };
  }
  if (target.type === "skill" && !actor.system.skills[target.key]) return warn("no-target");

  const debrief = debriefOf(actor);
  const check = canUse(debrief.uses, { source, skill, skillValue: actor.system.skills[skill]?.value ?? 0, target, learnWith: target.learnWith ?? [] });
  if (!check.ok) return warn(check.reason);
  if (target.type === "ability") {
    const skills = Object.fromEntries(Object.entries(actor.system.skills).map(([k, v]) => [k, v.value]));
    const abilityNames = actor.items.filter(i => i.type === "ability" && i.system.acquired !== false).map(i => i.name);
    const pre = abilityPrerequisites(target.data, { skills, abilityNames });
    if (!pre.ok) return warn("prerequisites", { list: pre.missing.map(m => (m.type === "skill" ? `${skillLabel(m.key)} ${m.min}` : m.name)).join(", ") });
  }

  const vitalityBefore = vitalityOf(actor);
  const patch = consumeSource(actor, { source, skill, rewardIndex });
  const rolls = [];
  let text;
  if (target.type === "skill") {
    const value = actor.system.skills[target.key].value;
    let r;
    if (source === "xp" || source === "rewardPoint") {
      const d6 = await new Roll("1d6").evaluate();
      rolls.push(d6);
      r = { ...pointIncrease({ value, d6: d6.total }), success: true };
      text = f("TTS.Progression.PointLine", { skill: skillLabel(target.key), from: value, to: r.newValue, rule: r.rule.label });
    } else {
      const d100 = await new Roll("1d100").evaluate();
      const d6 = await new Roll("1d6").evaluate();
      rolls.push(d100);
      r = experienceRoll({ value, d100: d100.total, d6: d6.total });
      if (r.success && (r.rule.fixed === null || value === 100)) rolls.push(d6);
      text = r.success
        ? f(r.legendary ? "TTS.Progression.Legendary" : "TTS.Progression.ExperienceUp", { skill: skillLabel(target.key), d100: d100.total, from: value, to: r.newValue, rule: r.rule.label })
        : f("TTS.Progression.ExperienceFail", { skill: skillLabel(target.key), d100: d100.total, value });
    }
    patch[`system.skills.${target.key}.value`] = r.newValue;
  }
  await actor.update(patch);

  if (target.type === "language") {
    const next = addLanguageCross(item?.system.crosses ?? 0);
    if (item) await item.update({ "system.crosses": next.crosses, "system.fluent": next.fluent });
    else await actor.createEmbeddedDocuments("Item", [{ name: target.name, type: "language", system: { fluent: next.fluent, native: false, crosses: next.crosses } }]);
    text = f(next.fluent ? "TTS.Progression.LanguageFluent" : "TTS.Progression.LanguageCross", { name: target.name, crosses: next.crosses });
  }
  if (target.type === "ability") {
    const cost = item?.system.cost ?? target.data.cost;
    const next = addAbilityCross(item?.system.crosses ?? 0, cost);
    if (item) await item.update({ "system.crosses": next.crosses, "system.acquired": next.acquired });
    else {
      const data = model.toObject();
      delete data._id;
      foundry.utils.mergeObject(data, { system: { crosses: next.crosses, acquired: next.acquired } });
      await actor.createEmbeddedDocuments("Item", [data]);
    }
    text = f(next.acquired ? "TTS.Progression.AbilityAcquired" : "TTS.Progression.AbilityCross", { name: target.name, crosses: next.crosses, cost });
  }

  await actor.setFlag(SYSTEM_ID, "debrief", { ...debrief, uses: recordUse(debrief.uses, source, target) });
  const lines = [{ text }];
  const vitalityAfter = vitalityOf(actor);
  if (vitalityAfter !== vitalityBefore) lines.push({ text: f("TTS.Progression.VitalityUp", { from: vitalityBefore, to: vitalityAfter }) });
  await createCardMessage({ kind: "log", title: `${actor.name} — ${t(`TTS.Progression.Source.${source}`)}`, lines },
    { speaker: ChatMessage.getSpeaker({ actor }), rolls });
  return { ok: true, text };

  function warn(code, data = {}) {
    ui.notifications.warn(f(`TTS.Progression.Refused.${code}`, data));
    return { ok: false, reason: code };
  }
}

/**
 * Activité d'intersession (hors entraînement, qui passe par useImprovement avec la source « training »).
 * @param {Actor} actor
 * @param {{activity:string, text?:string}} p
 */
export async function downtimeActivity(actor, { activity, text = "" }) {
  if (!actor?.isOwner) return null;
  const p = actor.system.progression;
  if (!(p.downtimePeriods > 0)) {
    ui.notifications.warn(t("TTS.Progression.Refused.no-period"));
    return null;
  }
  const patch = { "system.progression.downtimePeriods": p.downtimePeriods - 1 };
  const lines = [];
  if (activity === "convalescence") {
    const wounded = actor.statuses?.has("wounded");
    if (wounded) await setCondition(actor, "wounded", false);
    lines.push({ text: t(wounded ? "TTS.Progression.Downtime.convalescenceDone" : "TTS.Progression.Downtime.convalescenceNone") });
  } else if (activity === "companionship" || activity === "travel") {
    patch["system.progression.pendingStartBonus"] = (p.pendingStartBonus ?? 0) + DOWNTIME_STORY_POINTS;
    lines.push({ text: f("TTS.Progression.Downtime.bonus", { count: DOWNTIME_STORY_POINTS }) });
  } else {
    lines.push({ text: t(`TTS.Progression.Downtime.${activity}Hint`) });
  }
  if (text.trim()) lines.push({ text: `« ${text.trim()} »` });
  await actor.update(patch);
  await createCardMessage({ kind: "log", title: `${actor.name} — ${t(`TTS.Progression.Activity.${activity}`)}`, reason: t("TTS.Progression.DowntimeTitle"), lines },
    { speaker: ChatMessage.getSpeaker({ actor }) });
  return { ok: true };
}
