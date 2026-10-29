/**
 * État d'une carte d'attaque — transitions pures (bible §10.3).
 *
 * Étapes : defense → (miss | knockout | vlan | damage) → soak → absorb → done.
 * Tant que les dégâts ne sont pas lancés (`locked` faux), les jets d'attaque et de défense peuvent
 * encore être modifiés (inversion, relance) : l'issue est alors recalculée.
 *
 * {
 *   stage, locked, option, rakatakataMode,
 *   attacker: { actorUuid, name, isCharacter, skillKey, label, task, weapon:{name, skill, damage, kitId, attackIndex}, flags, mods },
 *   target:   { actorUuid, name, isCharacter, rank, caps, canDefend, defenseTask, defenseKey, defenseLabel, declined } | null,
 *   hit, karma, vlanEffects, damage:{parts, dice, faces, hits, rerolls, bonus, karmaRerollUsed}, soak, loss, absorb, recovery, knockout
 * }
 */
import { attackHit, combatKarma, damageParts, sumDice, VLAN_EFFECTS } from "./attack.mjs";
import { netLoss } from "../dice/pools.mjs";

const fail = reason => ({ ok: false, reason });

export function createAttackState({ attacker, target = null, option = "base", rakatakataMode = "single" }) {
  const state = {
    stage: "defense",
    locked: false,
    option,
    rakatakataMode,
    attacker: { mods: [], flags: {}, ...attacker },
    target: target ? { defenseTask: null, defenseKey: "", defenseLabel: "", declined: false, canDefend: false, ...target } : null,
    hit: null,
    karma: null,
    vlanEffects: [],
    damage: null,
    soak: null,
    loss: null,
    absorb: null,
    recovery: null,
    knockout: null
  };
  return advance(state);
}

/** Recalcule l'étape à partir des jets (sans effet si l'état est verrouillé). */
export function advance(state) {
  if (state.locked) return state;
  const a = state.attacker.task;
  const t = state.target;
  if (!a?.success) {
    return { ...state, stage: "miss", hit: false, karma: combatKarma({ attackTask: a, defenseTask: t?.defenseTask ?? null, hit: false }) };
  }
  if (t && t.canDefend && !t.defenseTask && !t.declined) return { ...state, stage: "defense", hit: null, karma: null };
  const hit = attackHit(a, t?.defenseTask ?? null);
  const karma = combatKarma({ attackTask: a, defenseTask: t?.defenseTask ?? null, hit, caps: t?.caps ?? null });
  let stage = "damage";
  if (!hit) stage = "miss";
  else if (karma.knockout) stage = "knockout";
  else if (state.option === "vlan") stage = "vlan";
  return { ...state, stage, hit, karma };
}

/** Le jet d'attaque a changé (inversion, relance) : nouvelle issue. */
export function setAttackerTask(state, task) {
  if (state.locked) return fail("locked");
  return { ok: true, state: advance({ ...state, attacker: { ...state.attacker, task } }) };
}

/** Jet de défense de la cible. */
export function setDefense(state, task, { key = "", label = "" } = {}) {
  if (state.locked || state.stage !== "defense" || !state.target) return fail("not-waiting-defense");
  return { ok: true, state: advance({ ...state, target: { ...state.target, defenseTask: task, defenseKey: key, defenseLabel: label } }) };
}

/** Le jet de défense a changé (inversion, relance). */
export function setDefenseTask(state, task) {
  if (state.locked || !state.target?.defenseTask) return fail("locked");
  return { ok: true, state: advance({ ...state, target: { ...state.target, defenseTask: task } }) };
}

/** La cible renonce à se défendre. */
export function declineDefense(state) {
  if (state.locked || state.stage !== "defense" || !state.target) return fail("not-waiting-defense");
  return { ok: true, state: advance({ ...state, target: { ...state.target, declined: true } }) };
}

/**
 * Cible Hors de combat sans dégâts : Bon Karma contre un sbire ou un sous-fifre,
 * ou capacité (Boxeur, Ceinture noire) contre un sbire touché.
 */
export function applyKnockout(state, { source = "karma", label = "", cost = 0 } = {}) {
  if (state.locked) return fail("locked");
  if (source === "karma" && state.stage !== "knockout") return fail("no-knockout");
  if (source === "ability" && !(state.stage === "damage" && state.hit && state.target?.rank === "minion")) return fail("not-minion");
  return { ok: true, state: { ...state, stage: "done", locked: true, knockout: { source, label, cost } } };
}

/** Vlan ! : deux effets parmi dégâts 1dX, Prisonnier, Vulnérable. */
export function chooseVlan(state, effects = []) {
  if (state.locked || state.stage !== "vlan") return fail("not-vlan");
  const set = [...new Set(effects)].filter(e => VLAN_EFFECTS.includes(e));
  if (set.length !== 2) return fail("two-effects");
  const next = { ...state, locked: true, vlanEffects: set, stage: set.includes("damage") ? "damage" : "done" };
  return { ok: true, state: next };
}

/** Dés de dégâts attendus pour l'état courant. */
export function expectedDamageParts(state, extra = []) {
  return damageParts({
    weapon: state.attacker.weapon,
    flags: state.attacker.flags,
    option: state.option,
    rakatakataMode: state.rakatakataMode,
    vlanEffects: state.vlanEffects,
    attackTask: state.attacker.task,
    defenseTask: state.target?.defenseTask ?? null,
    extra
  });
}

/** Jet de dégâts (verrouille la carte). */
export function setDamage(state, { parts, faces = [], hits = 0 }) {
  if (state.stage !== "damage" || !state.hit) return fail("not-damage");
  const damage = { parts, dice: sumDice(parts), faces, hits: Number(hits) || 0, rerolls: [], bonus: [], karmaRerollUsed: false };
  return { ok: true, state: { ...state, locked: true, damage, stage: state.target ? "soak" : "done" } };
}

/** Total des dégâts (jet principal + bonus ajoutés après coup). */
export function damageTotal(state) {
  if (!state.damage) return 0;
  return state.damage.hits + state.damage.bonus.reduce((a, b) => a + (Number(b.hits) || 0), 0);
}

/** Relancer les dégâts (Bon Karma une fois, ou capacité) : conserver le nouveau résultat. */
export function rerollDamage(state, { faces = [], hits = 0, source = "karma", label = "", cost = 0 }) {
  if (!state.damage || !["soak", "done"].includes(state.stage) || state.soak) return fail("not-rerollable");
  if (source === "karma" && (!state.karma?.damageReroll || state.damage.karmaRerollUsed)) return fail("no-karma-reroll");
  const damage = {
    ...state.damage,
    faces, hits: Number(hits) || 0,
    karmaRerollUsed: state.damage.karmaRerollUsed || source === "karma",
    rerolls: [...state.damage.rerolls, { source, label, cost, from: state.damage.hits, to: Number(hits) || 0 }]
  };
  return { ok: true, state: { ...state, damage } };
}

/** Dés de dégâts ajoutés après le jet (Uppercut fracassant : +2dX). */
export function addBonusDamage(state, { dice, faces = [], hits = 0, label = "", cost = 0 }) {
  if (!state.damage || !["soak", "done"].includes(state.stage) || state.soak) return fail("not-bonusable");
  const damage = { ...state.damage, bonus: [...state.damage.bonus, { dice, faces, hits: Number(hits) || 0, label, cost }] };
  return { ok: true, state: { ...state, damage } };
}

/** Jet d'encaissement : perte nette ; choix d'encaissement si elle est d'au moins 1. */
export function setSoak(state, { dice = 0, faces = [], hits = 0 }) {
  if (state.stage !== "soak" || state.soak) return fail("not-soak");
  const loss = netLoss(damageTotal(state), hits);
  return { ok: true, state: { ...state, soak: { dice, faces, hits: Number(hits) || 0 }, loss, stage: loss > 0 ? "absorb" : "done" } };
}

/** Choix de la cible (Vitalité, Blessé, Danger de mort ou leurs substituts). */
export function chooseAbsorb(state, absorb) {
  if (state.stage !== "absorb") return fail("not-absorb");
  return { ok: true, state: { ...state, absorb, stage: "done" } };
}

/** Récupération de la défense (Bon Karma) : une fois, après la résolution. */
export function markRecovery(state, { hits = 0, dice = 1 }) {
  if (!state.karma?.defenderRecovery || state.recovery) return fail("no-recovery");
  if (!["miss", "done"].includes(state.stage)) return fail("not-resolved");
  return { ok: true, state: { ...state, recovery: { dice, hits: Number(hits) || 0 } } };
}
