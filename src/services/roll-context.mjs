/**
 * Contexte d'un jet : valeur, libellé, modificateurs proposés (matériel, conditions).
 * Lecture seule des documents ; aucune écriture.
 */
import { THETROUBLESHOOTERS } from "../config.mjs";
import { conditionModifiers } from "../domain/rules/conditions.mjs";
import { resolveNpcSkill } from "../domain/rules/npc.mjs";
import { flawPenaltyMods } from "../domain/rules/flaws.mjs";
import { dialogActivations } from "../domain/rules/activations.mjs";
import { activeFlawPenalties } from "./flaw-service.mjs";
import { abilitiesOf } from "./ability-service.mjs";

/** L'acteur participe-t-il à un combat commencé ? (Blessé ne s'applique qu'après le combat.) */
export function isInCombat(actor) {
  const combat = game.combat;
  if (!combat?.started) return false;
  return combat.combatants.some(c => c.actor?.id === actor.id);
}

/** Malus de conditions applicables (bloc cumulé, D-006). */
export function conditionModsFor(actor, { skill = "", kind = "skill" } = {}) {
  const statuses = [...(actor.statuses ?? [])];
  return conditionModifiers(statuses, { skill, kind, inCombat: isInCombat(actor) }).map(m => ({
    ...m,
    label: game.i18n.localize(THETROUBLESHOOTERS.conditions[m.condition]?.label ?? m.condition)
  }));
}

/** Descripteurs à pips des kits emportés, proposés dans la catégorie Matériel (un seul retenu). */
export function gearOptionsFor(actor) {
  const options = [];
  for (const kit of actor.items.filter(i => i.type === "kit" && i.system.carried)) {
    (kit.system.descriptors ?? []).forEach((d, i) => {
      const pips = Number(d.pips) || 0;
      if (!pips) return;
      const what = [d.key, d.situation].filter(Boolean).join(" — ");
      options.push({ id: `${kit.id}:${i}`, pips, label: `${kit.name}${what ? ` : ${what}` : ""} (${pips > 0 ? "+" : ""}${pips})` });
    });
  }
  return options;
}

/** Malus de scène des désavantages (bloc cumulé, D-006). */
export function flawModsFor(actor, skillKey = "") {
  return flawPenaltyMods(activeFlawPenalties(actor), skillKey);
}

/** Bonus de capacité proposés (catégorie Capacités, un seul retenu). */
export function abilityOptionsFor(actor, skillKey = "") {
  return dialogActivations(abilitiesOf(actor), skillKey).map(a => {
    const p = a.act.pips;
    const cost = a.act.cost ? ` — ${a.act.cost} PR` : "";
    return {
      id: `${a.abilityId}:${a.index}`,
      pips: p,
      cost: a.act.cost,
      label: `${a.abilityName}${a.act.label ? ` : ${a.act.label}` : ""} (${p > 0 ? "+" : ""}${p}${cost})`
    };
  });
}

/** Contexte d'un jet de compétence d'un Risque-tout. */
export function characterSkillContext(actor, skillKey) {
  const skill = actor.system.skills?.[skillKey];
  if (!skill) throw new Error(`Compétence inconnue : ${skillKey}`);
  return {
    actor,
    skillKey,
    label: game.i18n.localize(THETROUBLESHOOTERS.skills[skillKey].label),
    value: skill.value,
    gearOptions: gearOptionsFor(actor),
    abilityOptions: abilityOptionsFor(actor, skillKey),
    conditionMods: conditionModsFor(actor, { skill: skillKey }),
    flawMods: flawModsFor(actor, skillKey)
  };
}

/**
 * Contexte d'un jet de PNJ.
 * @param {Actor} actor
 * @param {{source:"base"|"specialty"|"skill", index?:number, skillName?:string}} sel
 */
export function npcSkillContext(actor, { source = "base", index, skillName } = {}) {
  const sys = actor.system;
  let value, label;
  if (source === "skill" && Number.isInteger(index) && sys.skills[index]) {
    value = sys.skills[index].value;
    label = sys.skills[index].name;
  } else if (source === "specialty") {
    value = sys.specialty.value;
    label = `${game.i18n.localize("TTS.Npc.Specialty")}${sys.specialty.domain ? ` (${sys.specialty.domain})` : ""}`;
  } else if (skillName) {
    const r = resolveNpcSkill(sys, { skillName });
    value = r.value;
    label = r.source === "skill" ? r.name : `${skillName} → ${game.i18n.localize("TTS.Npc.BaseSkill")}`;
  } else {
    value = sys.baseSkill;
    label = game.i18n.localize("TTS.Npc.BaseSkill");
  }
  return { actor, skillKey: null, label, value, gearOptions: [], abilityOptions: [], conditionMods: conditionModsFor(actor, { skill: "" }), flawMods: [] };
}

/** Choix de compétence adverse pour une opposition : clés pour un Risque-tout, lignes pour un PNJ. */
export function opponentSkillChoices(actor) {
  if (actor.type === "character") {
    return Object.fromEntries(Object.entries(THETROUBLESHOOTERS.skills)
      .map(([k, s]) => [`skill:${k}`, `${game.i18n.localize(s.label)} (${actor.system.skills[k].value} %)`]));
  }
  const sys = actor.system;
  const out = {
    "npc:base": `${game.i18n.localize("TTS.Npc.BaseSkill")} (${sys.baseSkill} %)`,
    "npc:specialty": `${game.i18n.localize("TTS.Npc.Specialty")} (${sys.specialty.value} %)`
  };
  sys.skills.forEach((s, i) => { out[`npc:skill:${i}`] = `${s.name} (${s.value} %)`; });
  return out;
}

/** Contexte d'un jet à partir d'un choix « skill:clé » ou « npc:… ». */
export function contextFromChoice(actor, choice) {
  const [kind, a, b] = String(choice ?? "").split(":");
  if (kind === "skill") return characterSkillContext(actor, a);
  if (kind === "npc") {
    if (a === "skill") return npcSkillContext(actor, { source: "skill", index: Number(b) });
    return npcSkillContext(actor, { source: a });
  }
  return actor.type === "character" ? characterSkillContext(actor, "vigilance") : npcSkillContext(actor, { source: "base" });
}
