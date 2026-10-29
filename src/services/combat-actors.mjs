/**
 * Lecture des acteurs pour le combat (armes, protection, défense, rang) — aucune écriture.
 * Ne dépend que de la configuration et du domaine (importable depuis le rendu des cartes).
 */
import { THETROUBLESHOOTERS } from "../config.mjs";
import { parseWeaponDescriptors, UNARMED } from "../domain/combat/weapon.mjs";
import { soakDice } from "../domain/combat/attack.mjs";
import { characterCapabilities } from "../domain/rules/npc.mjs";

export const skillLabel = key => game.i18n.localize(THETROUBLESHOOTERS.skills[key]?.label ?? key);

/** Statuts actifs d'un acteur (identifiants de conditions). */
export function statusesOf(actor) {
  return [...(actor?.statuses ?? [])];
}

/** Combattant de l'acteur dans le combat actif (ou null). */
export function combatantOf(actor, combat = game.combat) {
  if (!actor || !combat) return null;
  return combat.combatants.find(c => c.actor?.uuid === actor.uuid) ?? null;
}

/**
 * Armes utilisables.
 *  - Risque-tout : kits emportés avec profil d'arme, puis « Mains nues » (2dX) ;
 *  - PNJ : lignes d'attaque.
 */
export function weaponsOf(actor) {
  if (!actor) return [];
  if (actor.type === "character") {
    const list = actor.items
      .filter(i => i.type === "kit" && i.system.hasWeapon && i.system.carried)
      .map(kit => {
        const w = kit.system.weapon;
        return {
          ref: `kit:${kit.id}`, name: kit.name, img: kit.img, skill: w.skill, damage: w.damage,
          value: actor.system.skills[w.skill]?.value ?? 0, descriptors: w.descriptors,
          flags: parseWeaponDescriptors(w.descriptors, { ammo: w.ammo }),
          empty: w.empty, jammed: w.jammed, broken: w.broken, kitId: kit.id, attackIndex: null, unarmed: false
        };
      });
    list.push({
      ref: "unarmed", name: game.i18n.localize("TTS.Weapon.Unarmed"), img: "icons/svg/combat.svg", skill: UNARMED.skill,
      damage: UNARMED.damage, value: actor.system.skills.melee.value, descriptors: "",
      flags: parseWeaponDescriptors(""), empty: false, jammed: false, broken: false, kitId: null, attackIndex: null, unarmed: true
    });
    return list;
  }
  return (actor.system.attacks ?? []).map((a, i) => ({
    ref: `npc:${i}`, name: a.name, img: "icons/svg/sword.svg", skill: a.skill ?? "melee", damage: a.damage, value: a.value,
    descriptors: a.descriptors, flags: parseWeaponDescriptors(a.descriptors), empty: a.empty, jammed: false, broken: false,
    kitId: null, attackIndex: i, unarmed: false, counter: a.counter
  }));
}

/** Dés de protection portés (kits emportés ; champ du PNJ). */
export function protectionOf(actor) {
  if (actor?.type === "character") {
    return actor.items.filter(i => i.type === "kit" && i.system.hasProtection && i.system.carried)
      .reduce((a, k) => a + (Number(k.system.protection.dice) || 0), 0);
  }
  return Number(actor?.system?.protection) || 0;
}

/** Malus d'initiative des protections emportées (saisi sur le kit). */
export function initiativePenaltyOf(actor) {
  if (actor?.type !== "character") return 0;
  return actor.items.filter(i => i.type === "kit" && i.system.hasProtection && i.system.carried)
    .reduce((a, k) => a + (Number(k.system.protection.initiativePenalty) || 0), 0);
}

/** Une arme à allonge est-elle emportée ? */
export function hasReach(actor) {
  return weaponsOf(actor).some(w => w.flags.reach);
}

/** Niveaux de Saoul (cumul en phase 5 ; 1 si le statut est posé). */
export function drunkLevelsOf(actor) {
  return statusesOf(actor).includes("drunk") ? 1 : 0;
}

/** Dés d'encaissement contre une arme donnée. */
export function soakDiceFor(actor, flags = {}) {
  return soakDice({ protection: protectionOf(actor), drunkLevels: drunkLevelsOf(actor), cutting: Boolean(flags.cutting) });
}

/** Ce que le rang autorise (Risque-tout : Blessé et Danger de mort). */
export function capsOf(actor) {
  return actor?.type === "character" ? characterCapabilities() : { ...(actor?.system?.capabilities ?? {}) };
}

/**
 * Défenses possibles (LdB p. 94) : Corps-à-corps ; Agilité si à couvert ; score de défense d'un PNJ.
 * Saoul, Paralysé, Hors de combat : aucune défense.
 */
export function defenseChoicesOf(actor) {
  if (!actor) return [];
  const st = statusesOf(actor);
  if (["drunk", "paralyzed", "outOfAction"].some(s => st.includes(s))) return [];
  if (actor.type === "character") {
    const out = [{ key: "melee", label: skillLabel("melee"), value: actor.system.skills.melee.value }];
    if (actor.system.combat?.inCover) out.push({ key: "agility", label: `${skillLabel("agility")} (${game.i18n.localize("TTS.Combat.InCover")})`, value: actor.system.skills.agility.value });
    return out;
  }
  const d = actor.system.defense;
  return d === null || d === undefined ? [] : [{ key: "npc", label: game.i18n.localize("TTS.Npc.Defense"), value: d }];
}

/** Résumé de la cible porté par la carte d'attaque. */
export function targetInfo(actor) {
  if (!actor) return null;
  const choices = defenseChoicesOf(actor);
  return {
    actorUuid: actor.uuid,
    name: actor.name,
    isCharacter: actor.type === "character",
    rank: actor.type === "npc" ? actor.system.rank : "",
    caps: capsOf(actor),
    canDefend: choices.length > 0
  };
}


/** Capacités sous forme simple pour la logique pure. */
export function abilityList(actor) {
  return (actor?.items ?? []).filter(i => i.type === "ability")
    .map(i => ({ id: i.id, name: i.name, acquired: i.system.acquired, activations: i.system.activations ?? [] }));
}
