/**
 * Chaîne d'attaque côté client (bible §10.3) : boîtes de dialogue et dés lancés par le joueur concerné,
 * puis demande au MJ (relais gmOnly) qui revalide et applique.
 */
import { SYSTEM_ID, SYSTEM_PATH } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { poolFormula } from "../domain/dice/pools.mjs";
import { spendStoryPoints } from "../domain/rules/story-points.mjs";
import { GENERIC_INVERT_COST } from "../domain/dice/task-state.mjs";
import { passiveDamageBonuses } from "../domain/rules/activations.mjs";
import { ATTACK_OPTIONS, VLAN_EFFECTS, optionAvailability, optionPips, applyAbsorb, sumDice,
  DEFENSE_RECOVERY_DICE, CATCH_BREATH_DICE, recover } from "../domain/combat/attack.mjs";
import { inRange } from "../domain/combat/weapon.mjs";
import { createAttackState, expectedDamageParts } from "../domain/combat/attack-state.mjs";
import { promptTaskRoll } from "../apps/roll-dialog.mjs";
import { createCardMessage } from "../chat/cards.mjs";
import { evaluateTaskRoll, awardKarmaPoint, rollTask } from "./roll-service.mjs";
import { defaultRollModeFor } from "./roll-mode.mjs";
import { weaponsOf, combatantOf, targetInfo, defenseChoicesOf, soakDiceFor, statusesOf, abilityList, updateKitWeapon } from "./combat-actors.mjs";
import { attackContext, defenseContext } from "./combat-context.mjs";
import { characterSkillContext } from "./roll-context.mjs";
import { rollPool } from "./pool-service.mjs";

const t = key => game.i18n.localize(key);
const gmOnly = { gmOnly: true };

/** Faces de tous les dés d'un jet (explosions comprises). */
export function facesOf(roll) {
  return roll.dice.flatMap(d => d.results.map(r => r.result));
}

/** Lance une réserve, affiche Dice So Nice, renvoie les faces. */
async function rollFaces(n, kind) {
  if (!(n > 0)) return [];
  const roll = await new Roll(poolFormula(n, kind)).evaluate();
  if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);
  return facesOf(roll);
}

async function canAfford(actor, cost) {
  if (actor?.type !== "character" || !cost) return true;
  if (spendStoryPoints(actor.system.storyPoints.value, cost).ok) return true;
  ui.notifications.warn(game.i18n.format("TTS.Notify.NotEnoughStoryPoints", { name: actor.name, cost }));
  return false;
}

/* ---------------------------------------------------------------- */
/*  Lancer une attaque                                              */
/* ---------------------------------------------------------------- */

/**
 * @param {Actor} actor
 * @param {string} ref  « kit:<id> », « unarmed » ou « npc:<index> »
 * @param {{targets?:Actor[]}} [opts]  cibles imposées (contre-attaque) ; sinon jetons ciblés
 */
export async function startAttack(actor, ref, { targets: forced = null } = {}) {
  if (!actor?.isOwner) return null;
  const weapon = weaponsOf(actor).find(w => w.ref === ref);
  if (!weapon) return null;
  if (weapon.broken) return ui.notifications.warn(t("TTS.Weapon.IsBroken"));
  if (weapon.jammed) return ui.notifications.warn(t("TTS.Weapon.IsJammed"));
  if (weapon.empty) return ui.notifications.warn(t("TTS.Weapon.IsEmpty"));

  const targets = (forced ?? [...game.user.targets].map(tk => tk.actor)).filter(a => a && a.uuid !== actor.uuid);
  const combatant = combatantOf(actor);
  const initiative = combatant ? (Number(combatant.initiative) || 0) : null;
  const options = ATTACK_OPTIONS.map(key => {
    const r = optionAvailability(key, { weapon, flags: weapon.flags, initiative });
    return { key, ok: r.ok, label: t(`TTS.Attack.Options.${key}`), hint: t(r.ok ? `TTS.Attack.OptionHint.${key}` : `TTS.Attack.Unavailable.${r.reason}`) };
  });
  const ctx = attackContext(actor, weapon);
  const choices = await promptTaskRoll(ctx, {
    allowOpposition: false,
    defaultRollMode: defaultRollModeFor(actor),
    attack: { options, targets: targets.map(a => a.name), canZone: options.find(o => o.key === "rakatakata").ok && targets.length > 1 }
  });
  if (!choices) return null;

  const option = options.find(o => o.key === choices.option && o.ok)?.key ?? "base";
  if (choices.gearId === "weapon:trip" && option !== "vlan") Object.assign(choices, { gearPips: 0, gearLabel: "", gearId: "" });
  if (choices.abilityCost && !(await canAfford(actor, choices.abilityCost))) return null;
  ctx.extraMods = optionPips(option) ? [{ label: t(`TTS.Attack.Options.${option}`), pips: optionPips(option) }] : [];

  const zone = option === "rakatakata" && choices.rakatakataMode === "zone";
  const list = zone ? targets : targets.slice(0, 1);
  // Une cible jouée par un joueur doit voir la carte pour se défendre.
  const rollMode = list.some(a => a.hasPlayerOwner) ? CONST.DICE_ROLL_MODES.PUBLIC : choices.rollMode;
  const speaker = ChatMessage.getSpeaker({ actor });
  let primary = true;
  for (const target of (list.length ? list : [null])) {
    const { roll, task, mods } = await evaluateTaskRoll(ctx, choices);
    if (primary && choices.abilityCost && actor.type === "character") {
      await actor.update({ "system.storyPoints.value": spendStoryPoints(actor.system.storyPoints.value, choices.abilityCost).value });
    }
    const karmaAwarded = await awardKarmaPoint(actor, task);
    const attack = createAttackState({
      attacker: {
        actorUuid: actor.uuid, name: actor.name, isCharacter: actor.type === "character", skillKey: ctx.skillKey, label: ctx.label, task, mods,
        weapon: { name: weapon.name, skill: weapon.skill, damage: weapon.damage, kitId: weapon.kitId, weaponIndex: weapon.weaponIndex ?? 0, attackIndex: weapon.attackIndex, unarmed: weapon.unarmed },
        flags: weapon.flags
      },
      target: targetInfo(target),
      option,
      rakatakataMode: zone ? "zone" : "single"
    });
    const card = { kind: "attack", attack, karmaAwarded, combatId: combatant?.parent?.id ?? "", primary, effects: {} };
    const message = await createCardMessage(card, { speaker, rolls: [roll], rollMode });
    await RelayService.dispatch("attackSync", { messageId: message.id, actorUuid: actor.uuid }, gmOnly);
    primary = false;
  }
  return true;
}

/* ---------------------------------------------------------------- */
/*  Boutons de la carte                                             */
/* ---------------------------------------------------------------- */

async function actorOf(uuid) {
  const actor = uuid ? await fromUuid(uuid) : null;
  return actor?.isOwner ? actor : null;
}

/** Point d'entrée des actions de la carte d'attaque. */
export async function onAttackAction(message, card, el) {
  const s = card.attack;
  const action = el.dataset.ttsAction;
  const req = (actor, extra = {}) => ({ messageId: message.id, actorUuid: actor.uuid, ...extra });

  switch (action) {
    case "atkDefend": {
      const actor = await actorOf(s.target?.actorUuid);
      if (!actor) return;
      const choice = defenseChoicesOf(actor).find(c => c.key === el.dataset.key);
      if (!choice) return;
      const ctx = defenseContext(actor, choice);
      const choices = await promptTaskRoll(ctx, { allowOpposition: false, defaultRollMode: CONST.DICE_ROLL_MODES.PUBLIC });
      if (!choices) return;
      if (choices.abilityCost && !(await canAfford(actor, choices.abilityCost))) return;
      const { roll, task } = await evaluateTaskRoll(ctx, choices);
      if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);
      if (choices.abilityCost) await actor.update({ "system.storyPoints.value": actor.system.storyPoints.value - choices.abilityCost });
      await awardKarmaPoint(actor, task);
      return RelayService.dispatch("attackDefend", req(actor, { task, key: choice.key, label: choice.label, rolls: [roll.total] }), gmOnly);
    }
    case "atkDecline": {
      const actor = await actorOf(s.target?.actorUuid);
      if (actor) return RelayService.dispatch("attackDecline", req(actor), gmOnly);
      return;
    }
    case "atkInvert": {
      const side = el.dataset.side;
      const actor = await actorOf(side === "target" ? s.target?.actorUuid : s.attacker.actorUuid);
      if (!actor) return;
      const mode = el.dataset.mode;
      if (mode === "generic" && !(await canAfford(actor, GENERIC_INVERT_COST))) return;
      return RelayService.dispatch("attackInvert", req(actor, { side, mode }), gmOnly);
    }
    case "atkAbility": return useAttackAbility(message, card, el);
    case "atkVlan": return chooseVlanEffects(message, card);
    case "atkDamage": return rollDamage(message, card);
    case "atkRerollDamage": {
      const actor = await actorOf(s.attacker.actorUuid);
      if (!actor) return;
      const faces = await rollFaces(s.damage.dice, "dX");
      return RelayService.dispatch("attackRerollDamage", req(actor, { faces }), gmOnly);
    }
    case "atkSoak": {
      const actor = await actorOf(s.target?.actorUuid);
      if (!actor) return;
      const faces = await rollFaces(soakDiceFor(actor, s.attacker.flags), "dR");
      return RelayService.dispatch("attackSoak", req(actor, { faces }), gmOnly);
    }
    case "atkAbsorb": {
      const actor = await actorOf(s.target?.actorUuid);
      if (!actor) return;
      const choice = el.dataset.choice;
      if (choice === "vitality") {
        const res = applyAbsorb({ choice, vitality: actor.system.vitality.value, loss: s.loss, statuses: statusesOf(actor) });
        if (res.death) {
          const ok = await foundry.applications.api.DialogV2.confirm({ classes: ["thetroubleshooters", "tts-dialog"],
            window: { title: t("TTS.Attack.DeathTitle") },
            content: `<p>${game.i18n.format("TTS.Attack.DeathConfirm", { name: actor.name })}</p>`,
            rejectClose: false
          });
          if (!ok) return;
        }
      }
      return RelayService.dispatch("attackAbsorb", req(actor, { choice }), gmOnly);
    }
    case "atkRecovery": {
      const actor = await actorOf(s.target?.actorUuid);
      if (!actor) return;
      const faces = await rollFaces(DEFENSE_RECOVERY_DICE, "dR");
      return RelayService.dispatch("attackRecovery", req(actor, { faces }), gmOnly);
    }
    case "atkCounter": {
      if (!game.user.isGM) return;
      const npc = await fromUuid(s.target.actorUuid);
      const attacker = await fromUuid(s.attacker.actorUuid);
      const weapon = weaponsOf(npc).find(w => w.counter) ?? weaponsOf(npc)[0];
      if (!weapon) return ui.notifications.warn(t("TTS.Attack.NoWeapon"));
      const done = await startAttack(npc, weapon.ref, { targets: [attacker] });
      if (done) await RelayService.dispatch("attackCounterDone", { messageId: message.id, actorUuid: npc.uuid }, gmOnly);
      return;
    }
    case "atkIgnite": {
      const roll = await new Roll("1d6").evaluate();
      const range = s.attacker.flags.incendiary;
      const lit = inRange(roll.total, range);
      return roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: await fromUuid(s.attacker.actorUuid) }),
        flavor: `${t("TTS.Attack.Ignite")} (${range}) : ${t(lit ? "TTS.Attack.IgniteYes" : "TTS.Attack.IgniteNo")}`
      });
    }
  }
}

async function useAttackAbility(message, card, el) {
  const s = card.attack;
  const side = el.dataset.side === "target" ? "target" : "attacker";
  const actor = await actorOf(side === "target" ? s.target?.actorUuid : s.attacker.actorUuid);
  if (!actor) return;
  const ability = actor.items.get(el.dataset.abilityId);
  const act = ability?.system.activations?.[Number(el.dataset.index)];
  if (!act || !(await canAfford(actor, act.cost))) return;
  const request = { messageId: message.id, actorUuid: actor.uuid, side, abilityId: ability.id, index: Number(el.dataset.index) };
  if (act.type === "reroll" || act.type === "rerollWith") {
    const roll = await new Roll("1d100").evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);
    request.result = roll.total;
    request.rolls = [roll.total];
  }
  if (act.type === "rerollDamage") request.faces = await rollFaces(s.damage.dice, "dX");
  if (act.type === "bonusDamage") request.faces = await rollFaces(act.dice, "dX");
  return RelayService.dispatch("attackAbility", request, gmOnly);
}

async function chooseVlanEffects(message, card) {
  const actor = await actorOf(card.attack.attacker.actorUuid);
  if (!actor) return;
  const boxes = VLAN_EFFECTS.map(e => `<label class="tts-check-label"><input type="checkbox" name="${e}"> ${t(`TTS.Attack.Vlan.${e}`)}</label>`).join("");
  const effects = await foundry.applications.api.DialogV2.prompt({
    window: { title: t("TTS.Attack.Options.vlan") },
    classes: ["thetroubleshooters", "tts-dialog"],
    content: `<p>${t("TTS.Attack.VlanPrompt")}</p><div class="tts-vlan-choices">${boxes}</div>`,
    ok: { callback: (event, button) => VLAN_EFFECTS.filter(e => button.form.elements[e]?.checked) },
    rejectClose: false
  });
  if (!effects) return;
  if (effects.length !== 2) return ui.notifications.warn(t("TTS.Attack.Refused.two-effects"));
  return RelayService.dispatch("attackVlan", { messageId: message.id, actorUuid: actor.uuid, effects }, gmOnly);
}

async function rollDamage(message, card) {
  const s = card.attack;
  const actor = await actorOf(s.attacker.actorUuid);
  if (!actor) return;
  const passives = passiveDamageBonuses(abilityList(actor));
  const parts = expectedDamageParts(s);
  const content = await foundry.applications.handlebars.renderTemplate(`${SYSTEM_PATH}/templates/dialogs/damage-roll.hbs`, {
    parts: parts.map(p => ({ ...p, label: p.label || t(`TTS.Attack.Part.${p.key}`) })),
    passives: passives.map(p => ({ abilityId: p.abilityId, index: p.index, dice: p.act.dice, label: `${p.abilityName}${p.act.label ? ` : ${p.act.label}` : ""}`, checked: s.attacker.weapon.unarmed })),
    total: sumDice(parts)
  });
  const data = await foundry.applications.api.DialogV2.prompt({
    window: { title: t("TTS.Attack.DamageRoll") },
    classes: ["thetroubleshooters", "tts-dialog"],
    content,
    ok: {
      label: t("TTS.Roll.Roll"),
      callback: (event, button) => ({
        manual: Number(button.form.elements.manual?.value) || 0,
        passives: [...button.form.querySelectorAll('input[name="passive"]:checked')].map(i => ({ abilityId: i.dataset.abilityId, index: Number(i.dataset.index) }))
      })
    },
    rejectClose: false
  });
  if (!data) return;
  const extra = data.passives.map(p => passives.find(x => x.abilityId === p.abilityId && x.index === p.index)).filter(Boolean).map(p => ({ dice: p.act.dice }));
  const dice = Math.max(0, sumDice(expectedDamageParts(s, extra)) + Math.max(-9, Math.min(9, Math.trunc(data.manual))));
  const faces = await rollFaces(dice, "dX");
  return RelayService.dispatch("attackDamage", { messageId: message.id, actorUuid: actor.uuid, passives: data.passives, manual: data.manual, faces }, gmOnly);
}

/* ---------------------------------------------------------------- */
/*  Actions hors carte                                              */
/* ---------------------------------------------------------------- */

/** Jet de récupération NdR appliqué à la Vitalité (Reprendre son souffle, capacités). */
export async function rollRecovery(actor, dice, label) {
  if (!actor?.isOwner) return null;
  const { hits } = await rollPool(dice, "dR", { flavor: label, actor });
  const v = actor.system.vitality;
  await actor.update({ "system.vitality.value": recover(v.value, v.max, hits) });
  return hits;
}

/** Reprendre son souffle (action principale) : 2dR. */
export function catchBreath(actor) {
  return rollRecovery(actor, CATCH_BREATH_DICE, t("TTS.Combat.CatchBreath"));
}

/** Recharger : jet de la compétence de combat si rechargement difficile ; une arme enrayée ne se recharge pas. */
export async function reloadWeapon(actor, ref) {
  if (!actor?.isOwner) return;
  const weapon = weaponsOf(actor).find(w => w.ref === ref);
  if (!weapon) return;
  if (weapon.jammed) return ui.notifications.warn(t("TTS.Weapon.IsJammed"));
  if (weapon.flags.hardReload && actor.type === "character") {
    const msg = await rollTask(characterSkillContext(actor, weapon.skill), { allowOpposition: false });
    const task = msg?.getFlag(SYSTEM_ID, "card")?.task;
    if (!task?.success) return;
  }
  if (weapon.kitId) await updateKitWeapon(actor.items.get(weapon.kitId), weapon.weaponIndex ?? 0, { empty: false });
  else if (Number.isInteger(weapon.attackIndex)) {
    const attacks = foundry.utils.deepClone(actor.system._source.attacks);
    attacks[weapon.attackIndex].empty = false;
    await actor.update({ "system.attacks": attacks });
  }
  ui.notifications.info(game.i18n.format(weapon.flags.quickReload ? "TTS.Weapon.ReloadedQuick" : "TTS.Weapon.Reloaded", { name: weapon.name }));
}

/** Tomber à terre / se relever (Vulnérable). */
export async function setProne(actor, prone) {
  if (!actor?.isOwner) return;
  if (statusesOf(actor).includes("vulnerable") !== prone) await actor.toggleStatusEffect("vulnerable", { active: prone });
}

