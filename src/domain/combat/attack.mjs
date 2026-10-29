/**
 * Attaque, défense, dégâts, encaissement — règles pures (LdB p. 92-95, 100-101, 115).
 */
import { digits, opposedOutcome } from "../dice/percentile.mjs";
import { inRange, isRanged } from "./weapon.mjs";
import { canLowerInitiative } from "./initiative.mjs";

export const ATTACK_OPTIONS = Object.freeze(["base", "vlan", "pan", "rakatakata"]);
export const VLAN_EFFECTS = Object.freeze(["damage", "restrained", "vulnerable"]);
export const PAN_PIPS = 2;
export const PAN_DICE = 1;
export const TRIP_PIPS = 2;
export const RAKATAKATA_DICE = 2;
export const PRECISE_DICE = 2;
export const SHARP_DICE = 1;
export const VLAN_DICE = 1;
export const DEFENSE_RECOVERY_DICE = 1;
export const CATCH_BREATH_DICE = 2;
export const DRUNK_PROTECTION = 1;

/**
 * Une option d'attaque est-elle permise avec cette arme ?
 * @param {string} option
 * @param {{weapon:{skill:string}, flags:object, initiative?:number|null}} ctx  initiative null = hors combat
 * @returns {{ok:boolean, reason?:string}}
 */
export function optionAvailability(option, { weapon, flags = {}, initiative = null } = {}) {
  switch (option) {
    case "base":
      return flags.thrown ? { ok: false, reason: "thrownAimedOnly" } : { ok: true };
    case "vlan":
      if (flags.thrown) return { ok: false, reason: "thrownAimedOnly" };
      return weapon?.skill === "melee" ? { ok: true } : { ok: false, reason: "meleeOnly" };
    case "pan":
      if (!isRanged(weapon, flags)) return { ok: false, reason: "rangedOnly" };
      if (initiative !== null && !canLowerInitiative(initiative)) return { ok: false, reason: "initiativeZero" };
      return { ok: true };
    case "rakatakata":
      if (!flags.ammo || flags.oneShot || flags.thrown) return { ok: false, reason: "needsAmmo" };
      return { ok: true };
    default:
      return { ok: false, reason: "unknown" };
  }
}

/** Pips accordés par l'option elle-même (Pan ! +2). */
export function optionPips(option) {
  return option === "pan" ? PAN_PIPS : 0;
}

/**
 * Descripteurs d'arme à pips, proposés dans la catégorie Matériel (un seul retenu, LdB p. 80) :
 * Croche-patte +2 pour Vlan ! (LdB p. 115).
 */
export function weaponGearPips(flags = {}) {
  return flags.trip ? [{ key: "trip", pips: TRIP_PIPS, option: "vlan" }] : [];
}

/** L'attaque touche-t-elle ? Égalité de réussites : la défense l'emporte (LdB p. 94). */
export function attackHit(attackTask, defenseTask = null) {
  if (!attackTask?.success) return false;
  if (!defenseTask) return true;
  return opposedOutcome(attackTask, defenseTask, { defenderWinsTies: true }) === "a";
}

/** Défense ratée ou absente (Aiguisé). */
export function defenseFailedOrAbsent(defenseTask) {
  return !defenseTask || !defenseTask.success;
}

/**
 * Dés de dégâts, décomposés.
 * @returns {Array<{key:string, dice:number, label?:string}>}
 */
export function damageParts({ weapon, flags = {}, option = "base", rakatakataMode = "single", vlanEffects = [],
  attackTask = null, defenseTask = null, extra = [] } = {}) {
  const extras = (extra ?? []).filter(e => Number(e.dice) > 0).map(e => ({ key: e.key ?? "ability", dice: Number(e.dice), label: e.label ?? "" }));
  if (option === "vlan") return vlanEffects.includes("damage") ? [{ key: "vlan", dice: VLAN_DICE }, ...extras] : [];
  const parts = [{ key: "weapon", dice: Math.max(0, Number(weapon?.damage) || 0) }];
  if (option === "pan") parts.push({ key: "pan", dice: PAN_DICE });
  if (option === "rakatakata" && rakatakataMode === "single") parts.push({ key: "rakatakata", dice: RAKATAKATA_DICE });
  if (flags.sharp && defenseFailedOrAbsent(defenseTask)) parts.push({ key: "sharp", dice: SHARP_DICE });
  if (flags.precise && attackTask?.karma === "good") parts.push({ key: "precise", dice: PRECISE_DICE });
  return [...parts, ...extras].filter(p => p.dice > 0);
}

export const sumDice = parts => (parts ?? []).reduce((a, p) => a + (Number(p.dice) || 0), 0);

/**
 * État de l'arme après l'attaque (LdB p. 92-93, 115).
 * Pan ! ignore munitions (X) mais pas un coup ni lancé ; Rakatakata vide l'arme.
 * Arme vide sur Mauvais Karma (munitions) → enrayée.
 * @returns {{empty:boolean, jammed:boolean, reason:string}}
 */
export function ammoAfterAttack({ flags = {}, option = "base", task } = {}) {
  const units = task ? digits(task.result).units : null;
  const bad = task?.karma === "bad";
  if (option === "rakatakata") return { empty: true, jammed: bad, reason: "rakatakata" };
  if (flags.thrown) return { empty: true, jammed: false, reason: "thrown" };
  if (flags.oneShot) return { empty: true, jammed: false, reason: "oneShot" };
  if (option !== "pan" && flags.ammo && units !== null && inRange(units, flags.ammo)) return { empty: true, jammed: bad, reason: "ammo" };
  return { empty: false, jammed: false, reason: "" };
}

/**
 * Effets du Karma en combat (LdB p. 94-95).
 * @param {{attackTask:object, defenseTask?:object|null, hit:boolean, caps?:{goodKarmaKnocksOut:boolean}}} p
 */
export function combatKarma({ attackTask, defenseTask = null, hit = false, caps = null } = {}) {
  const aGood = attackTask?.karma === "good";
  const knockout = Boolean(hit && aGood && caps?.goodKarmaKnocksOut);
  return {
    knockout,                                            // sbire / sous-fifre Hors de combat sans dégâts
    damageReroll: Boolean(hit && aGood && !knockout),    // ignorer le jet de dégâts et le refaire
    attackerPenalty: attackTask?.karma === "bad",        // −2 pips au prochain jet de l'attaquant
    defenderRecovery: defenseTask?.karma === "good",     // récupération 1dR après les dégâts
    defenderVulnerable: defenseTask?.karma === "bad"     // renversé : Vulnérable
  };
}

/** Dés d'encaissement : protection + Saoul (1d6 par niveau) − 1 si Tranchant (plancher 0). */
export function soakDice({ protection = 0, drunkLevels = 0, cutting = false } = {}) {
  const total = Math.max(0, Number(protection) || 0) + DRUNK_PROTECTION * Math.max(0, Number(drunkLevels) || 0);
  return Math.max(0, total - (cutting ? 1 : 0));
}

/**
 * Choix offerts à la cible quand la perte est d'au moins 1 (LdB p. 95, 115, D-007).
 * @param {{caps:{canTakeWounded:boolean, canTakeMortalDanger:boolean}, statuses?:string[], flags?:object}} p
 * @returns {Array<{key:string, status:string|null}>}
 */
export function absorbOptions({ caps, statuses = [], flags = {} } = {}) {
  const has = s => statuses.includes(s);
  const out = [{ key: "vitality", status: null }];
  if (caps?.canTakeWounded && !has("wounded")) {
    if (flags.paralyzing) { if (!has("stunned")) out.push({ key: "stunned", status: "stunned" }); }
    else if (flags.snare) { if (!has("restrained")) out.push({ key: "restrained", status: "restrained" }); }
    else out.push({ key: "wounded", status: "wounded" });
  }
  if (caps?.canTakeMortalDanger && !has("mortalDanger") && !flags.snare && !flags.nonLethal) {
    if (flags.paralyzing) { if (!has("paralyzed")) out.push({ key: "paralyzed", status: "paralyzed" }); }
    else out.push({ key: "mortalDanger", status: "mortalDanger" });
  }
  return out;
}

/**
 * Applique le choix d'encaissement.
 * À 0 Vitalité : Hors de combat, ou mort si la cible est en Danger de mort (LdB p. 95-96).
 * @returns {{vitality:number, status:string|null, outOfAction:boolean, death:boolean}}
 */
export function applyAbsorb({ choice, vitality, loss, statuses = [] } = {}) {
  if (choice !== "vitality") return { vitality: Number(vitality) || 0, status: choice, outOfAction: false, death: false };
  const v = Math.max(0, (Number(vitality) || 0) - Math.max(0, Number(loss) || 0));
  const zero = v === 0;
  const death = zero && statuses.includes("mortalDanger");
  return { vitality: v, status: null, outOfAction: zero, death };
}

/** Récupération (dR) : Vitalité augmentée, plafonnée au maximum. */
export function recover(current, max, hits) {
  return Math.min(Math.max(0, Number(max) || 0), (Number(current) || 0) + Math.max(0, Number(hits) || 0));
}

/** Valeur X d'un descripteur « inverser (X) » d'un PNJ (0 si absent). */
export function npcReverses(descriptors = []) {
  for (const d of descriptors ?? []) {
    const key = String(d.key ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (!key.startsWith("inverser")) continue;
    const n = Number(String(d.value ?? "").match(/\d+/)?.[0] ?? key.match(/\d+/)?.[0]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** Le PNJ porte-t-il le descripteur « contre-attaque » ou une attaque marquée « contre » ? */
export function npcCanCounter(npc) {
  const desc = (npc?.descriptors ?? []).some(d => /^contre/.test(String(d.key ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()));
  return desc || (npc?.attacks ?? []).some(a => a.counter);
}
