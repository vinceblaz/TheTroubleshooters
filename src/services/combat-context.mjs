/**
 * Contextes des boîtes de jet d'attaque et de défense (bible §10.3).
 */
import { weaponGearPips } from "../domain/combat/attack.mjs";
import { gearOptionsFor, abilityOptionsFor, conditionModsFor, flawModsFor } from "./roll-context.mjs";
import { skillLabel } from "./combat-actors.mjs";

/** Contexte de la boîte de jet d'attaque (malus de conditions de la famille « attaque »). */
export function attackContext(actor, weapon) {
  const isChar = actor.type === "character";
  const skillKey = isChar ? weapon.skill : "";
  const gear = isChar ? gearOptionsFor(actor) : [];
  for (const g of weaponGearPips(weapon.flags)) {
    gear.push({ id: `weapon:${g.key}`, pips: g.pips, label: `${weapon.name} : ${game.i18n.localize(`TTS.Weapon.Flag.${g.key}`)} (+${g.pips})` });
  }
  return {
    actor,
    skillKey,
    label: isChar ? `${weapon.name} — ${skillLabel(weapon.skill)}` : weapon.name,
    value: weapon.value,
    gearOptions: gear,
    abilityOptions: isChar ? abilityOptionsFor(actor, skillKey) : [],
    conditionMods: conditionModsFor(actor, { skill: skillKey, kind: "attack" }),
    flawMods: flawModsFor(actor, skillKey)
  };
}

/** Contexte d'un jet de défense. */
export function defenseContext(actor, choice) {
  const isChar = actor.type === "character";
  const skillKey = isChar ? choice.key : "";
  return {
    actor,
    skillKey,
    label: `${game.i18n.localize("TTS.Attack.Defense")} — ${choice.label}`,
    value: choice.value,
    gearOptions: isChar ? gearOptionsFor(actor) : [],
    abilityOptions: isChar ? abilityOptionsFor(actor, skillKey) : [],
    conditionMods: conditionModsFor(actor, { skill: skillKey, kind: "defense" }),
    flawMods: flawModsFor(actor, skillKey)
  };
}
