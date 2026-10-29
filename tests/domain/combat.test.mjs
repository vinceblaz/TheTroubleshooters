import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRange, inRange, parseWeaponDescriptors, isRanged } from "../../src/domain/combat/weapon.mjs";
import { initiativeFromTask, adjustInitiative, initiativeGearBonus, canLowerInitiative, compareCombatants } from "../../src/domain/combat/initiative.mjs";
import { optionAvailability, optionPips, weaponGearPips, attackHit, damageParts, sumDice, ammoAfterAttack, combatKarma, soakDice,
  absorbOptions, applyAbsorb, recover, npcReverses, npcCanCounter } from "../../src/domain/combat/attack.mjs";
import { createAttackState, setAttackerTask, setDefense, setDefenseTask, declineDefense, applyKnockout, chooseVlan,
  expectedDamageParts, setDamage, rerollDamage, addBonusDamage, damageTotal, setSoak, chooseAbsorb, markRecovery } from "../../src/domain/combat/attack-state.mjs";
import { endOfCombatFor, allCharactersDown } from "../../src/domain/combat/combat-end.mjs";
import { attackActivations, passiveDamageBonuses, sheetActivations } from "../../src/domain/rules/activations.mjs";
import { createTaskState, invertTask } from "../../src/domain/dice/task-state.mjs";
import { rankCapabilities, characterCapabilities } from "../../src/domain/rules/npc.mjs";
import { flawPenaltyMods } from "../../src/domain/rules/flaws.mjs";

const T = (value, result, pips = 0) => createTaskState({ value, result, pips });

/* ---------- Armes ---------- */

test("plages munitions : 9-0, 7-0, 0, 5-6", () => {
  assert.deepEqual(parseRange("9-0"), [9, 0]);
  assert.deepEqual(parseRange("7-0"), [7, 8, 9, 0]);
  assert.deepEqual(parseRange("0"), [0]);
  assert.deepEqual(parseRange("5-6"), [5, 6]);
  assert.equal(parseRange("abc"), null);
  assert.ok(inRange(0, "9-0") && inRange(9, "9-0") && !inRange(8, "9-0"));
});

test("descripteurs d'arme lus depuis le texte du livre", () => {
  const f = parseWeaponDescriptors("Bruyant, portée courte, munitions (9-0)");
  assert.equal(f.ammo, "9-0");
  assert.ok(f.noisy && f.shortRange && !f.oneShot);
  const k = parseWeaponDescriptors("Aiguisé");
  assert.ok(k.sharp);
  const m = parseWeaponDescriptors("Incendiaire (5-6), lancé, portée courte");
  assert.equal(m.incendiary, "5-6");
  assert.ok(m.thrown);
  const b = parseWeaponDescriptors("Allonge, croche-patte");
  assert.ok(b.reach && b.trip);
  const n = parseWeaponDescriptors("Tir, 4dX, collet, un coup, Non létal, Paralysant, Tranchant, Précis, Fragile");
  assert.ok(n.snare && n.oneShot && n.nonLethal && n.paralyzing && n.cutting && n.precise && n.fragile);
  assert.deepEqual(n.others, ["Tir", "4dX"]);
  assert.equal(parseWeaponDescriptors("munitions (9-0)", { ammo: "8-0" }).ammo, "8-0");   // champ dédié prioritaire
  assert.ok(isRanged({ skill: "shooting" }, {}) && isRanged({ skill: "melee" }, { thrown: true }) && !isRanged({ skill: "melee" }, {}));
});

/* ---------- Initiative ---------- */

test("initiative : exemples du livre (Elektra 57 → 12 ; Éloïse 40 raté → 0 ; agent 72 raté → 2)", () => {
  assert.equal(initiativeFromTask(T(65, 57)), 12);
  assert.equal(initiativeFromTask(T(15, 40)), 0);          // échec, unités 0
  assert.equal(initiativeFromTask(T(45, 72)), 2);
  assert.equal(initiativeFromTask(T(65, 33)), 16);         // Bon Karma : 3+3+10
  assert.equal(initiativeFromTask(T(15, 77)), 0);          // Mauvais Karma : 0
  assert.equal(initiativeFromTask(T(65, 100)), 0);         // 100 : échec, unités 0
});

test("initiative : allonge, malus, plancher, Pan ! interdit à 0", () => {
  assert.equal(initiativeGearBonus({ reach: true }), 2);
  assert.equal(initiativeGearBonus({ reach: true, protectionPenalty: 3 }), -1);
  assert.equal(adjustInitiative(1, -2), 0);
  assert.ok(canLowerInitiative(1) && !canLowerInitiative(0));
});

test("ordre : initiative décroissante, Risque-tout avant PNJ à égalité", () => {
  const list = [
    { name: "Agent", initiative: 7, isCharacter: false },
    { name: "Éloïse", initiative: 7, isCharacter: true },
    { name: "Elektra", initiative: 12, isCharacter: true },
    { name: "Sbire", initiative: null, isCharacter: false }
  ].sort(compareCombatants);
  assert.deepEqual(list.map(c => c.name), ["Elektra", "Éloïse", "Agent", "Sbire"]);
});

/* ---------- Options et dégâts ---------- */

test("options d'attaque : prérequis", () => {
  const pistol = { skill: "shooting", damage: 5 };
  const fAmmo = parseWeaponDescriptors("munitions (9-0)");
  assert.ok(optionAvailability("rakatakata", { weapon: pistol, flags: fAmmo }).ok);
  assert.equal(optionAvailability("rakatakata", { weapon: pistol, flags: parseWeaponDescriptors("un coup, munitions (0)") }).reason, "needsAmmo");
  assert.equal(optionAvailability("pan", { weapon: pistol, flags: fAmmo, initiative: 0 }).reason, "initiativeZero");
  assert.ok(optionAvailability("pan", { weapon: pistol, flags: fAmmo, initiative: null }).ok);       // hors combat
  assert.equal(optionAvailability("vlan", { weapon: pistol, flags: {} }).reason, "meleeOnly");
  assert.equal(optionAvailability("base", { weapon: { skill: "shooting" }, flags: { thrown: true } }).reason, "thrownAimedOnly");
  assert.equal(optionPips("pan"), 2);
  assert.equal(optionPips("vlan"), 0);
  assert.deepEqual(weaponGearPips({ trip: true }), [{ key: "trip", pips: 2, option: "vlan" }]);
  assert.deepEqual(weaponGearPips({}), []);
});

test("touché : réussite sans défense ; égalité de réussites → défense", () => {
  assert.ok(attackHit(T(65, 46)));
  assert.ok(!attackHit(T(65, 70)));
  assert.ok(attackHit(T(65, 46), T(40, 77)));       // défense ratée
  assert.ok(!attackHit(T(65, 30), T(40, 35)));      // défense plus haute
  assert.ok(!attackHit(T(65, 30), T(40, 30)));      // égalité → défenseur
  assert.ok(attackHit(T(65, 33), T(40, 3)));        // exemple du livre : 33 contre 03
});

test("dés de dégâts : arme, Pan !, Rakatakata, Aiguisé, Précis, Vlan !", () => {
  const w = { skill: "shooting", damage: 5 };
  assert.equal(sumDice(damageParts({ weapon: w, option: "pan" })), 6);
  assert.equal(sumDice(damageParts({ weapon: w, option: "rakatakata", rakatakataMode: "single" })), 7);
  assert.equal(sumDice(damageParts({ weapon: w, option: "rakatakata", rakatakataMode: "zone" })), 5);
  const katana = { skill: "melee", damage: 5 };
  assert.equal(sumDice(damageParts({ weapon: katana, flags: { sharp: true }, defenseTask: null })), 6);
  assert.equal(sumDice(damageParts({ weapon: katana, flags: { sharp: true }, defenseTask: T(40, 77) })), 6);
  assert.equal(sumDice(damageParts({ weapon: katana, flags: { sharp: true }, defenseTask: T(40, 30) })), 5);
  assert.equal(sumDice(damageParts({ weapon: katana, flags: { precise: true }, attackTask: T(65, 44) })), 7);
  assert.equal(sumDice(damageParts({ weapon: katana, option: "vlan", vlanEffects: ["restrained", "vulnerable"] })), 0);
  assert.equal(sumDice(damageParts({ weapon: katana, option: "vlan", vlanEffects: ["damage", "vulnerable"] })), 1);
  assert.equal(sumDice(damageParts({ weapon: { skill: "melee", damage: 2 }, extra: [{ dice: 1, label: "Poings d'acier" }] })), 3);
});

test("munitions : plage, Pan !, Rakatakata, un coup, lancé, enrayée", () => {
  const f = parseWeaponDescriptors("munitions (9-0)");
  assert.deepEqual(ammoAfterAttack({ flags: f, task: T(65, 21) }), { empty: false, jammed: false, reason: "" });   // exemple : unités 2
  assert.equal(ammoAfterAttack({ flags: f, task: T(65, 30) }).reason, "ammo");
  assert.ok(!ammoAfterAttack({ flags: f, option: "pan", task: T(65, 30) }).empty);
  assert.ok(ammoAfterAttack({ flags: f, task: T(65, 99) }).jammed);              // Mauvais Karma, unités 9
  assert.ok(ammoAfterAttack({ flags: f, option: "rakatakata", task: T(65, 21) }).empty);
  assert.ok(ammoAfterAttack({ flags: { oneShot: true }, option: "pan", task: T(65, 21) }).empty);
  assert.equal(ammoAfterAttack({ flags: { thrown: true }, option: "pan", task: T(65, 21) }).reason, "thrown");
});

test("Karma en combat", () => {
  const minion = rankCapabilities("minion"), boss = rankCapabilities("boss");
  assert.ok(combatKarma({ attackTask: T(65, 44), hit: true, caps: minion }).knockout);
  const k = combatKarma({ attackTask: T(65, 44), hit: true, caps: boss });
  assert.ok(!k.knockout && k.damageReroll);
  assert.ok(combatKarma({ attackTask: T(25, 55), hit: false }).attackerPenalty);
  assert.ok(combatKarma({ attackTask: T(65, 40), defenseTask: T(65, 22), hit: false }).defenderRecovery);
  assert.ok(combatKarma({ attackTask: T(65, 40), defenseTask: T(15, 77), hit: true }).defenderVulnerable);
});

test("encaissement : protection, Saoul, Tranchant", () => {
  assert.equal(soakDice({ protection: 2 }), 2);
  assert.equal(soakDice({ protection: 1, drunkLevels: 2 }), 3);
  assert.equal(soakDice({ protection: 0, cutting: true }), 0);
  assert.equal(soakDice({ protection: 3, cutting: true }), 2);
});

test("choix d'encaissement selon le rang, les conditions et l'arme", () => {
  const keys = o => o.map(x => x.key);
  assert.deepEqual(keys(absorbOptions({ caps: characterCapabilities() })), ["vitality", "wounded", "mortalDanger"]);
  assert.deepEqual(keys(absorbOptions({ caps: characterCapabilities(), statuses: ["wounded"] })), ["vitality", "mortalDanger"]);
  assert.deepEqual(keys(absorbOptions({ caps: rankCapabilities("lieutenant") })), ["vitality", "wounded"]);
  assert.deepEqual(keys(absorbOptions({ caps: rankCapabilities("minion") })), ["vitality"]);
  assert.deepEqual(keys(absorbOptions({ caps: characterCapabilities(), flags: { nonLethal: true } })), ["vitality", "wounded"]);
  assert.deepEqual(keys(absorbOptions({ caps: characterCapabilities(), flags: { paralyzing: true } })), ["vitality", "stunned", "paralyzed"]);
  assert.deepEqual(keys(absorbOptions({ caps: characterCapabilities(), flags: { snare: true } })), ["vitality", "restrained"]);
});

test("application : Vitalité, Hors de combat, mort en Danger de mort", () => {
  assert.deepEqual(applyAbsorb({ choice: "vitality", vitality: 5, loss: 4 }), { vitality: 1, status: null, outOfAction: false, death: false });
  assert.deepEqual(applyAbsorb({ choice: "vitality", vitality: 1, loss: 3 }), { vitality: 0, status: null, outOfAction: true, death: false });
  assert.ok(applyAbsorb({ choice: "vitality", vitality: 1, loss: 3, statuses: ["mortalDanger"] }).death);
  assert.deepEqual(applyAbsorb({ choice: "wounded", vitality: 1, loss: 6 }), { vitality: 1, status: "wounded", outOfAction: false, death: false });
  assert.equal(recover(3, 5, 4), 5);
});

test("descripteurs de PNJ : inverser (X), contre-attaque", () => {
  assert.equal(npcReverses([{ key: "chef" }, { key: "inverser (4)", value: "" }]), 4);
  assert.equal(npcReverses([{ key: "Inverser", value: "2" }]), 2);
  assert.equal(npcReverses([]), 0);
  assert.ok(npcCanCounter({ descriptors: [{ key: "contre-attaque" }], attacks: [] }));
  assert.ok(npcCanCounter({ descriptors: [], attacks: [{ counter: true }] }));
  assert.ok(!npcCanCounter({ descriptors: [], attacks: [] }));
});

/* ---------- Carte d'attaque ---------- */

const pistol = { name: "Beretta", skill: "shooting", damage: 5 };
const attacker = task => ({ actorUuid: "A", name: "Éloïse", isCharacter: true, skillKey: "shooting", task, weapon: pistol, flags: parseWeaponDescriptors("munitions (9-0)") });
const boss = defend => ({ actorUuid: "B", name: "Agent X", isCharacter: false, rank: "boss", caps: rankCapabilities("boss"), canDefend: defend });

test("carte : attaque ratée puis inversée → attente de défense", () => {
  let s = createAttackState({ attacker: attacker(T(40, 71)), target: boss(true) });
  assert.equal(s.stage, "miss");
  s = setAttackerTask(s, invertTask(s.attacker.task).state).state;   // 71 → 17
  assert.equal(s.stage, "defense");
  s = setDefense(s, T(55, 12), { key: "npc" }).state;
  assert.equal(s.stage, "damage");
  assert.ok(s.hit);
});

test("carte : défense refusée, dégâts, Bon Karma relance, encaissement, Blessé", () => {
  let s = createAttackState({ attacker: attacker(T(40, 22)), target: boss(true) });
  s = declineDefense(s).state;
  assert.equal(s.stage, "damage");
  assert.ok(s.karma.damageReroll);
  const parts = expectedDamageParts(s);
  assert.equal(parts[0].dice, 5);
  s = setDamage(s, { parts, faces: [1, 2, 4, 3, 2], hits: 1 }).state;
  assert.ok(s.locked);
  assert.ok(!setAttackerTask(s, T(40, 11)).ok);                      // verrouillé après les dégâts
  s = rerollDamage(s, { faces: [6, 5, 4, 4, 6, 1, 4], hits: 6, source: "karma" }).state;
  assert.ok(!rerollDamage(s, { faces: [], hits: 0, source: "karma" }).ok);   // une seule fois
  s = addBonusDamage(s, { dice: 2, faces: [5, 1], hits: 1, label: "Uppercut" }).state;
  assert.equal(damageTotal(s), 7);
  s = setSoak(s, { dice: 1, faces: [4], hits: 1 }).state;
  assert.equal(s.loss, 6);
  assert.equal(s.stage, "absorb");
  s = chooseAbsorb(s, { choice: "wounded", status: "wounded" }).state;
  assert.equal(s.stage, "done");
});

test("carte : sbire Hors de combat sur Bon Karma ; capacité contre un sbire", () => {
  const minion = { actorUuid: "M", name: "Sbire", isCharacter: false, rank: "minion", caps: rankCapabilities("minion"), canDefend: false };
  let s = createAttackState({ attacker: attacker(T(60, 44)), target: minion });
  assert.equal(s.stage, "knockout");
  s = applyKnockout(s, { source: "karma" }).state;
  assert.ok(s.locked && s.stage === "done");
  let t = createAttackState({ attacker: attacker(T(60, 35)), target: minion });
  assert.equal(t.stage, "damage");
  assert.ok(applyKnockout(t, { source: "ability", label: "Boxeur", cost: 1 }).ok);
  const henchman = { ...minion, rank: "henchman", caps: rankCapabilities("henchman") };
  assert.ok(!applyKnockout(createAttackState({ attacker: attacker(T(60, 35)), target: henchman }), { source: "ability" }).ok);
});

test("carte : Vlan ! deux effets, sans dégâts", () => {
  const club = { name: "Bâton", skill: "melee", damage: 3 };
  let s = createAttackState({ attacker: { ...attacker(T(60, 35)), weapon: club, flags: { trip: true } }, target: boss(false), option: "vlan" });
  assert.equal(s.stage, "vlan");
  assert.ok(!chooseVlan(s, ["damage"]).ok);
  s = chooseVlan(s, ["restrained", "vulnerable"]).state;
  assert.equal(s.stage, "done");
  assert.ok(s.locked);
});

test("carte : défense gagnante avec Bon Karma → récupération une fois", () => {
  let s = createAttackState({ attacker: attacker(T(50, 30)), target: boss(true) });
  s = setDefense(s, T(55, 44)).state;
  assert.equal(s.stage, "miss");
  assert.ok(s.karma.defenderRecovery);
  s = markRecovery(s, { hits: 1 }).state;
  assert.ok(!markRecovery(s, { hits: 1 }).ok);
  // la défense inversée reste modifiable tant que rien n'est verrouillé
  assert.ok(setDefenseTask(s, T(55, 4)).ok);
});

test("carte sans cible : dégâts puis fin", () => {
  let s = createAttackState({ attacker: attacker(T(50, 30)), target: null });
  assert.equal(s.stage, "damage");
  s = setDamage(s, { parts: expectedDamageParts(s), faces: [4, 4, 1, 1, 1], hits: 2 }).state;
  assert.equal(s.stage, "done");
});

test("activations de combat sur la carte", () => {
  const boxeur = { id: "b", name: "Boxeur", activations: [
    { type: "invert", cost: 1, skills: ["melee"] }, { type: "recovery", cost: 1, dice: 1, skills: [] },
    { type: "knockoutMinion", cost: 1, skills: [] }, { type: "reroll", cost: 2, skills: ["melee"] }] };
  const champion = { id: "c", name: "Champion de boxe", activations: [{ type: "rerollDamage", cost: 2, skills: [] }] };
  const uppercut = { id: "u", name: "Uppercut fracassant", activations: [
    { type: "bonusDamage", cost: 0, dice: 1, skills: [] }, { type: "bonusDamage", cost: 1, dice: 2, skills: [] }] };
  const all = [boxeur, champion, uppercut];
  assert.deepEqual(attackActivations(all, { stage: "damage", hit: true, targetRank: "minion" }).map(a => a.act.type), ["knockoutMinion"]);
  assert.deepEqual(attackActivations(all, { stage: "damage", hit: true, targetRank: "boss" }), []);
  assert.deepEqual(attackActivations(all, { stage: "soak", hit: true, damageRolled: true }).map(a => a.act.type), ["rerollDamage", "bonusDamage"]);
  assert.deepEqual(attackActivations(all, { stage: "absorb", hit: true, damageRolled: true, soaked: true }), []);
  assert.deepEqual(passiveDamageBonuses(all).map(a => a.act.dice), [1]);
  assert.deepEqual(sheetActivations(boxeur).map(a => a.act.type), ["recovery"]);
});

test("fin de combat et malus « prochain jet »", () => {
  assert.deepEqual(endOfCombatFor({ vitality: 1, max: 6, statuses: ["mortalDanger", "wounded"] }), { vitality: 6, removeStatuses: ["mortalDanger"], outOfAction: false });
  assert.ok(allCharactersDown([{ statuses: ["outOfAction"] }, { statuses: ["outOfAction", "wounded"] }]));
  assert.ok(!allCharactersDown([{ statuses: ["outOfAction"] }, { statuses: [] }]));
  assert.ok(!allCharactersDown([]));
  assert.deepEqual(flawPenaltyMods([{ label: "Mauvais Karma", pips: -2, skills: [], nextRoll: true, effectId: "e1" }], "melee"),
    [{ label: "Mauvais Karma", pips: -2, nextRoll: true, effectId: "e1" }]);
});
