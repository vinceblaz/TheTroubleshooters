/**
 * Mutations de la carte d'attaque (bible §10.3) — toujours exécutées par le MJ actif (relais gmOnly) :
 * une attaque modifie des acteurs appartenant à d'autres joueurs (Vitalité, conditions, munitions).
 *
 * Ordre : état revalidé par la logique pure → carte mise à jour → effets sur les acteurs → débit de PR.
 */
import { SYSTEM_ID } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { GENERIC_INVERT_COST, invertTask } from "../domain/dice/task-state.mjs";
import { countHits } from "../domain/dice/pools.mjs";
import { STORY_POINT_GAINS } from "../domain/rules/story-points.mjs";
import { attackActivations, passiveDamageBonuses } from "../domain/rules/activations.mjs";
import { ammoAfterAttack, absorbOptions, applyAbsorb, recover, sumDice, DEFENSE_RECOVERY_DICE } from "../domain/combat/attack.mjs";
import { adjustInitiative, AIMED_SHOT_COST } from "../domain/combat/initiative.mjs";
import { setAttackerTask, setDefense, setDefenseTask, declineDefense, applyKnockout, chooseVlan, expectedDamageParts,
  setDamage, rerollDamage, addBonusDamage, setSoak, chooseAbsorb, markRecovery } from "../domain/combat/attack-state.mjs";
import { statusesOf, capsOf, soakDiceFor, combatantOf, abilityList, updateKitWeapon } from "../services/combat-actors.mjs";
import { getCard, updateCardMessage } from "./cards.mjs";
import { applyCardActivation, prepareSpend, gain } from "./card-handlers.mjs";

const RULE = { immutable: [], transitions: {}, maxRolls: 3, requireOwner: true };
const CARD_TYPES = ["invert", "reroll", "forceSuccess", "rerollWith"];

/* ---------------------------------------------------------------- */
/*  Utilitaires                                                     */
/* ---------------------------------------------------------------- */

function loadCard(message) {
  const card = getCard(message);
  if (card?.kind !== "attack") throw new Error("Carte d'attaque introuvable");
  return foundry.utils.deepClone(card);
}

function roleOf(card, actor) {
  if (!actor) return null;
  if (card.attack.attacker.actorUuid === actor.uuid) return "attacker";
  if (card.attack.target?.actorUuid === actor.uuid) return "target";
  return null;
}

function requireRole(card, actor, role) {
  if (roleOf(card, actor) !== role) throw new Error(game.i18n.localize("TTS.Attack.NotYourTurn"));
}

function unwrap(r) {
  if (!r.ok) {
    const key = `TTS.Attack.Refused.${r.reason}`;
    throw new Error(game.i18n.has(key) ? game.i18n.localize(key) : r.reason);
  }
  return r.state;
}

/** Faces d'un jet de d6 : entiers 1-6 ; pour dX, une face de plus par 6 (explosion). */
function checkFaces(faces, dice, kind = "dX") {
  const list = (faces ?? []).map(Number);
  if (list.some(f => !Number.isInteger(f) || f < 1 || f > 6)) throw new Error("Faces invalides");
  const expected = kind === "dX" ? dice + list.filter(f => f === 6).length : dice;
  if (list.length !== Math.max(0, expected)) throw new Error("Nombre de dés incohérent");
  return { faces: list, hits: countHits(list) };
}

async function setStatus(actor, id, active = true) {
  if (!actor || !id) return;
  if (statusesOf(actor).includes(id) === active) return;
  await actor.toggleStatusEffect(id, { active });
}

async function setNextRollPenalty(actor, messageId, active) {
  if (!actor) return;
  const existing = actor.effects.filter(e => e.getFlag(SYSTEM_ID, "source") === messageId);
  if (!active) {
    if (existing.length) await actor.deleteEmbeddedDocuments("ActiveEffect", existing.map(e => e.id));
    return;
  }
  if (existing.length) return;
  const label = game.i18n.localize("TTS.Attack.NextRollPenalty");
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: label, img: "icons/svg/downgrade.svg",
    flags: { [SYSTEM_ID]: { source: messageId, penalty: { pips: -2, skills: [], label, nextRoll: true } } }
  }]);
}

async function setWeaponState(actor, weapon, { empty, jammed }) {
  if (!actor) return;
  if (weapon.kitId) {
    const kit = actor.items.get(weapon.kitId);
    const idx = weapon.weaponIndex ?? 0;
    const current = idx ? kit?.system.extraWeapons?.[idx - 1] : kit?.system.weapon;
    if (kit) await updateKitWeapon(kit, idx, { empty, jammed: jammed || Boolean(current?.jammed) });
  } else if (Number.isInteger(weapon.attackIndex) && actor.type === "npc") {
    const attacks = foundry.utils.deepClone(actor.system._source.attacks);
    if (attacks[weapon.attackIndex]) {
      attacks[weapon.attackIndex].empty = empty;
      await actor.update({ "system.attacks": attacks });
    }
  }
}

/**
 * Effets découlant de l'état (idempotents, mémorisés dans card.effects) :
 * Hors de combat sur Bon Karma, munitions, malus « prochain jet », Pan ! (−2 initiative),
 * défenseur Vulnérable, arme Fragile cassée.
 */
function planEffects(card, messageId, attacker, target) {
  const e = { ...(card.effects ?? {}) };
  const actions = [];
  if (card.attack.stage === "knockout") card.attack = unwrap(applyKnockout(card.attack, { source: "karma" }));
  const s = card.attack;
  const w = s.attacker.weapon;

  if (card.primary && (w.kitId || Number.isInteger(w.attackIndex))) {
    const ammo = ammoAfterAttack({ flags: s.attacker.flags, option: s.option, task: s.attacker.task });
    if (!e.ammo || e.ammo.empty !== ammo.empty || e.ammo.jammed !== ammo.jammed) {
      e.ammo = ammo;
      actions.push(() => setWeaponState(attacker, w, ammo));
    }
  }
  const wantPenalty = Boolean(s.karma?.attackerPenalty);
  if (wantPenalty !== Boolean(e.penalty)) {
    e.penalty = wantPenalty;
    actions.push(() => setNextRollPenalty(attacker, messageId, wantPenalty));
  }
  if (card.primary && s.option === "pan" && card.combatId && !e.pan) {
    e.pan = true;
    actions.push(async () => {
      const c = combatantOf(attacker, game.combats.get(card.combatId));
      if (c) await c.update({ initiative: adjustInitiative(c.initiative, -AIMED_SHOT_COST) });
    });
  }
  if (s.karma?.defenderVulnerable && target && !e.vulnerable) {
    e.vulnerable = true;
    actions.push(() => setStatus(target, "vulnerable", true));
  }
  if (s.knockout && target && !e.knockout) {
    e.knockout = true;
    actions.push(() => setStatus(target, "outOfAction", true));
  }
  if (card.primary && s.attacker.flags.fragile && s.attacker.task.karma && ["done", "miss"].includes(s.stage) && !e.fragile && w.kitId) {
    e.fragile = true;
    actions.push(async () => updateKitWeapon(attacker?.items.get(w.kitId), w.weaponIndex ?? 0, { broken: true }));
  }
  card.effects = e;
  return actions;
}

/** Enregistre la carte puis applique les effets et les opérations demandées (débit en dernier). */
async function commit(message, card, { actions = [], after = [] } = {}) {
  const attacker = await fromUuid(card.attack.attacker.actorUuid);
  const target = card.attack.target ? await fromUuid(card.attack.target.actorUuid) : null;
  const effectActions = planEffects(card, message.id, attacker, target);
  await updateCardMessage(message, card);
  for (const fn of [...effectActions, ...actions, ...after]) await fn({ attacker, target });
}

/* ---------------------------------------------------------------- */
/*  Flux                                                            */
/* ---------------------------------------------------------------- */

export function registerAttackHandlers() {
  const reg = (type, apply) => RelayService.register(type, { rule: RULE, apply });

  /* Effets initiaux après la création de la carte */
  reg("attackSync", async ({ message, actor }) => {
    const card = loadCard(message);
    requireRole(card, actor, "attacker");
    await commit(message, card);
  });

  /* Défense */
  reg("attackDefend", async ({ message, actor, request }) => {
    const card = loadCard(message);
    requireRole(card, actor, "target");
    card.attack = unwrap(setDefense(card.attack, request.task, { key: request.key ?? "", label: request.label ?? "" }));
    await commit(message, card);
  });

  reg("attackDecline", async ({ message, actor }) => {
    const card = loadCard(message);
    requireRole(card, actor, "target");
    card.attack = unwrap(declineDefense(card.attack));
    await commit(message, card);
  });

  /* Inversion : 2 PR, gratuite en Danger de mort (attaque), ou « inverser (X) » d'un PNJ */
  reg("attackInvert", async ({ message, actor, user, request }) => {
    const card = loadCard(message);
    const side = request.side === "target" ? "target" : "attacker";
    requireRole(card, actor, side);
    const task = side === "attacker" ? card.attack.attacker.task : card.attack.target?.defenseTask;
    if (!task) throw new Error("Aucun jet à inverser");
    let cost = 0, source = request.mode, after = [];
    if (request.mode === "generic") {
      if (actor.type !== "character") throw new Error("Acteur non concerné");
      cost = GENERIC_INVERT_COST;
      after.push(prepareSpend(actor, cost));
    } else if (request.mode === "mortal") {
      if (side !== "attacker" || !statusesOf(actor).includes("mortalDanger")) throw new Error(game.i18n.localize("TTS.Attack.Refused.notMortal"));
    } else if (request.mode === "npc") {
      if (!user.isGM || actor.type !== "npc" || !(actor.system.counters.reversesLeft > 0)) throw new Error(game.i18n.localize("TTS.Attack.Refused.noReverse"));
      after.push(() => actor.update({ "system.counters.reversesLeft": actor.system.counters.reversesLeft - 1 }));
    } else throw new Error("Mode inconnu");
    const r = invertTask(task, { cost, source });
    if (!r.ok) throw new Error(r.reason);
    r.state.history.at(-1).label = game.i18n.localize(`TTS.Attack.InvertMode.${request.mode}`);
    card.attack = unwrap(side === "attacker" ? setAttackerTask(card.attack, r.state) : setDefenseTask(card.attack, r.state));
    await commit(message, card, { after });
  });

  /* Capacités : sur les jets (inverser, relancer…) ou sur l'attaque (sbire, dégâts) */
  reg("attackAbility", async ({ message, actor, request }) => {
    const card = loadCard(message);
    const side = request.side === "target" ? "target" : "attacker";
    requireRole(card, actor, side);
    if (actor.type !== "character") throw new Error("Acteur non concerné");
    const ability = actor.items.get(request.abilityId);
    const act = ability?.system.activations?.[Number(request.index)];
    if (!act) throw new Error("Activation introuvable");
    const s = card.attack;
    const after = [];

    if (CARD_TYPES.includes(act.type)) {
      const task = side === "attacker" ? s.attacker.task : s.target?.defenseTask;
      const skillKey = side === "attacker" ? s.attacker.skillKey : (s.target?.isCharacter ? s.target.defenseKey : "");
      if (!task || s.locked) throw new Error(game.i18n.localize("TTS.Attack.Refused.locked"));
      const res = applyCardActivation(actor, task, skillKey, request);
      if (res.cost) after.push(prepareSpend(actor, res.cost));
      if (res.karma && game.settings.get(SYSTEM_ID, "autoKarmaStoryPoint")) after.push(() => gain(actor, STORY_POINT_GAINS.karma));
      card.attack = unwrap(side === "attacker" ? setAttackerTask(s, res.state) : setDefenseTask(s, res.state));
      return commit(message, card, { after });
    }

    if (side !== "attacker") throw new Error("Acteur non concerné");
    const allowed = attackActivations(abilityList(actor), {
      stage: s.stage, hit: s.hit, targetRank: s.target?.rank ?? "", damageRolled: Boolean(s.damage), soaked: Boolean(s.soak)
    }).some(a => a.abilityId === ability.id && a.index === Number(request.index));
    if (!allowed) throw new Error(game.i18n.localize("TTS.Notify.ActivationNotApplicable"));
    if (act.cost) after.push(prepareSpend(actor, act.cost));
    if (act.type === "knockoutMinion") card.attack = unwrap(applyKnockout(s, { source: "ability", label: ability.name, cost: act.cost }));
    else if (act.type === "rerollDamage") {
      const { faces, hits } = checkFaces(request.faces, s.damage.dice);
      card.attack = unwrap(rerollDamage(s, { faces, hits, source: "ability", label: ability.name, cost: act.cost }));
    } else if (act.type === "bonusDamage") {
      const { faces, hits } = checkFaces(request.faces, act.dice);
      card.attack = unwrap(addBonusDamage(s, { dice: act.dice, faces, hits, label: ability.name, cost: act.cost }));
    } else throw new Error("Type d'activation non géré");
    await commit(message, card, { after });
  });

  /* Vlan ! : deux effets */
  reg("attackVlan", async ({ message, actor, request }) => {
    const card = loadCard(message);
    requireRole(card, actor, "attacker");
    card.attack = unwrap(chooseVlan(card.attack, request.effects ?? []));
    const effects = card.attack.vlanEffects;
    await commit(message, card, {
      actions: [async ({ target }) => {
        if (effects.includes("restrained")) await setStatus(target, "restrained", true);
        if (effects.includes("vulnerable")) await setStatus(target, "vulnerable", true);
      }]
    });
  });

  /* Jet de dégâts : dés recalculés ici (arme, option, descripteurs, bonus gratuits choisis, ajustement manuel) */
  reg("attackDamage", async ({ message, actor, request }) => {
    const card = loadCard(message);
    requireRole(card, actor, "attacker");
    if (card.attack.stage !== "damage") throw new Error(game.i18n.localize("TTS.Attack.Refused.not-damage"));
    const passives = passiveDamageBonuses(abilityList(actor));
    const extra = (request.passives ?? []).map(p => passives.find(x => x.abilityId === p.abilityId && x.index === Number(p.index)))
      .filter(Boolean).map(p => ({ key: "ability", dice: p.act.dice, label: p.abilityName }));
    const manual = Math.max(-9, Math.min(9, Math.trunc(Number(request.manual) || 0)));
    const parts = expectedDamageParts(card.attack, extra);
    if (manual) parts.push({ key: "manual", dice: manual });
    const dice = Math.max(0, sumDice(parts));
    const { faces, hits } = checkFaces(request.faces, dice);
    card.attack = unwrap(setDamage(card.attack, { parts, faces, hits }));
    card.attack.damage.dice = dice;
    await commit(message, card);
  });

  /* Bon Karma : relancer les dégâts une fois */
  reg("attackRerollDamage", async ({ message, actor, request }) => {
    const card = loadCard(message);
    requireRole(card, actor, "attacker");
    const { faces, hits } = checkFaces(request.faces, card.attack.damage?.dice ?? 0);
    card.attack = unwrap(rerollDamage(card.attack, { faces, hits, source: "karma" }));
    await commit(message, card);
  });

  /* Encaissement */
  reg("attackSoak", async ({ message, actor, request }) => {
    const card = loadCard(message);
    requireRole(card, actor, "target");
    const dice = soakDiceFor(actor, card.attack.attacker.flags);
    const { faces, hits } = checkFaces(request.faces, dice, "dR");
    card.attack = unwrap(setSoak(card.attack, { dice, faces, hits }));
    await commit(message, card);
  });

  /* Choix : Vitalité, Blessé, Danger de mort (ou substituts selon l'arme) */
  reg("attackAbsorb", async ({ message, actor, request }) => {
    const card = loadCard(message);
    requireRole(card, actor, "target");
    const statuses = statusesOf(actor);
    const options = absorbOptions({ caps: capsOf(actor), statuses, flags: card.attack.attacker.flags });
    const chosen = options.find(o => o.key === request.choice);
    if (!chosen) throw new Error(game.i18n.localize("TTS.Attack.Refused.badChoice"));
    const res = applyAbsorb({ choice: chosen.key === "vitality" ? "vitality" : chosen.status, vitality: actor.system.vitality.value, loss: card.attack.loss, statuses });
    card.attack = unwrap(chooseAbsorb(card.attack, { choice: chosen.key, ...res }));
    await commit(message, card, {
      actions: [async () => {
        if (chosen.key === "vitality") await actor.update({ "system.vitality.value": res.vitality });
        if (res.status) await setStatus(actor, res.status, true);
        if (res.outOfAction) await setStatus(actor, "outOfAction", true);
      }]
    });
  });

  /* Récupération de la défense (Bon Karma) */
  reg("attackRecovery", async ({ message, actor, request }) => {
    const card = loadCard(message);
    requireRole(card, actor, "target");
    const { hits } = checkFaces(request.faces, DEFENSE_RECOVERY_DICE, "dR");
    card.attack = unwrap(markRecovery(card.attack, { hits, dice: DEFENSE_RECOVERY_DICE }));
    await commit(message, card, {
      actions: [() => actor.update({ "system.vitality.value": recover(actor.system.vitality.value, actor.system.vitality.max, hits) })]
    });
  });

  /* Contre-attaque effectuée : bouton retiré */
  reg("attackCounterDone", async ({ message, user }) => {
    if (!user.isGM) throw new Error(game.i18n.localize("TTS.Init.GmOnly"));
    const card = loadCard(message);
    card.counterDone = true;
    await updateCardMessage(message, card);
  });
}
