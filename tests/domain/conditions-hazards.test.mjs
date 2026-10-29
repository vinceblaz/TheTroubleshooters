import { test } from "node:test";
import assert from "node:assert/strict";
import { conditionModifiers, CONDITION_DEFS, conditionLevel, addConditionLevel, removeConditionLevel, autoFailFor,
  preventsDefense, exitOutcome, turnTriggers, fearToApply, ROLL_KINDS } from "../../src/domain/rules/conditions.mjs";
import { fallCheck, fallOutcome, explosionRings, rollsSeparately, fireZoneOutcome, drowningOutcome, poisonOutcome,
  ambushOutcome, sniperOutcome, POISONS, EXPLOSIVES } from "../../src/domain/combat/hazards.mjs";
import { createHazardState, setSoak, chooseAbsorb } from "../../src/domain/combat/attack-state.mjs";
import { createTaskState } from "../../src/domain/dice/task-state.mjs";
import { SKILL_KEYS } from "../../src/domain/rules/skills.mjs";

const T = (value, result) => createTaskState({ value, result });

test("16 conditions définies, sorties sur des compétences connues", () => {
  assert.equal(Object.keys(CONDITION_DEFS).length, 16);
  for (const def of Object.values(CONDITION_DEFS)) for (const k of def.exit?.skills ?? []) assert.ok(SKILL_KEYS.includes(k), k);
  assert.deepEqual(ROLL_KINDS, ["skill", "movement", "sight", "hearing"]);
});

test("nature du jet : Sonné −5 en mouvement, −2 sinon ; Surchargé ; ignorer Blessé (rafistolé)", () => {
  assert.deepEqual(conditionModifiers(["stunned"], { kind: "movement" }), [{ condition: "stunned", pips: -5 }]);
  assert.deepEqual(conditionModifiers(["stunned"], { kind: "sight" }), [{ condition: "stunned", pips: -2 }]);
  assert.deepEqual(conditionModifiers(["encumbered"], { kind: "movement" }), [{ condition: "encumbered", pips: -2 }]);
  assert.deepEqual(conditionModifiers(["wounded"], { skill: "charm", ignore: ["wounded"] }), []);
});

test("niveaux : Saoul ×3 puis Hors de combat ; Épuisé cumulatif ; retrait un par un", () => {
  assert.equal(conditionLevel("drunk", ["drunk"], {}), 1);
  assert.equal(conditionLevel("drunk", ["drunk"], { drunk: 5 }), 3);
  assert.equal(conditionLevel("drunk", [], { drunk: 2 }), 0);
  assert.deepEqual(addConditionLevel("drunk", 2), { level: 3, overflow: null });
  assert.deepEqual(addConditionLevel("drunk", 3), { level: 3, overflow: "outOfAction" });
  assert.deepEqual(addConditionLevel("exhausted", 1), { level: 2, overflow: null });
  assert.deepEqual(addConditionLevel("blinded", 1), { level: 1, overflow: null });
  assert.equal(removeConditionLevel(2), 1);
  assert.equal(removeConditionLevel(0), 0);
});

test("ratés d'office, défense, sorties, tours, peur", () => {
  assert.equal(autoFailFor(["blinded"], "sight"), "blinded");
  assert.equal(autoFailFor(["blinded"], "hearing"), null);
  assert.equal(autoFailFor(["deafened"], "hearing"), "deafened");
  assert.ok(preventsDefense(["drunk"]) && !preventsDefense(["stunned"]));
  assert.deepEqual(exitOutcome("terrified"), { remove: "terrified", add: "frightened" });
  assert.deepEqual(exitOutcome("onFire"), { remove: "onFire", add: null });
  assert.equal(exitOutcome("wounded"), null);
  assert.deepEqual(turnTriggers(["onFire", "terrified", "surprised"], "start"), ["onFire", "terrified"]);
  assert.deepEqual(turnTriggers(["paralyzed", "surprised"], "end"), ["paralyzed", "surprised"]);
  assert.equal(fearToApply([], "frightened"), "frightened");
  assert.equal(fearToApply(["terrified"], "frightened"), null);
  assert.equal(fearToApply(["frightened"], "terrified"), "terrified");
});

test("chute : seuils, pips, issue", () => {
  assert.deepEqual(fallCheck({ height: 1 }), { required: false, pips: 0 });
  assert.deepEqual(fallCheck({ height: 4 }), { required: true, pips: -3 });
  assert.deepEqual(fallCheck({ height: 2, voluntary: true }), { required: false, pips: 0 });
  assert.deepEqual(fallCheck({ height: 5, voluntary: true }), { required: true, pips: -3 });
  assert.equal(fallOutcome({ success: true }), null);
  assert.equal(fallOutcome({ success: false }), "wounded");
  assert.equal(fallOutcome({ success: false, statuses: ["wounded"] }), "outOfAction");
});

test("explosion : anneaux de souffle", () => {
  assert.deepEqual(explosionRings(6), [6, 3]);
  assert.deepEqual(explosionRings(8), [8, 4]);
  assert.deepEqual(explosionRings(12), [12, 6, 3]);
  assert.deepEqual(explosionRings(20), [20, 10, 5, 2]);
  assert.deepEqual(explosionRings(1), [1]);
  assert.equal(EXPLOSIVES.grenade, 6);
  assert.ok(rollsSeparately({ type: "character" }) && rollsSeparately({ type: "npc", system: { rank: "boss" } }));
  assert.ok(!rollsSeparately({ type: "npc", system: { rank: "minion" } }));
});

test("incendie, noyade, poison", () => {
  assert.equal(fireZoneOutcome(false), "onFire");
  assert.equal(fireZoneOutcome(true), null);
  assert.equal(drowningOutcome(false), 1);
  assert.equal(drowningOutcome(true), 0);
  assert.equal(poisonOutcome(T(50, 30), T(75, 80)), "none");          // le poison échoue
  assert.equal(poisonOutcome(T(50, 40), T(75, 20)), "initial");       // endurance plus haute
  assert.equal(poisonOutcome(T(50, 20), T(75, 40)), "prolonged");     // endurance réussie mais battue
  assert.equal(poisonOutcome(T(50, 70), T(75, 40)), "doubled");       // endurance ratée
  assert.equal(POISONS.deadly.strength, 65);
});

test("embuscade et sniper", () => {
  assert.equal(ambushOutcome(T(50, 77)), "outOfAction");
  assert.equal(ambushOutcome(T(50, 70)), "surprisedExtra");
  assert.equal(ambushOutcome(T(50, 30)), "normal");
  assert.equal(ambushOutcome(T(50, 33)), "defend");
  assert.equal(sniperOutcome(T(50, 88)), "alerted");
  assert.equal(sniperOutcome(T(50, 70)), "normal");
  assert.equal(sniperOutcome(T(50, 30)), "bonus");
  assert.equal(sniperOutcome(T(50, 22)), "takedown");
});

test("carte de danger : avec ou sans encaissement", () => {
  const target = { actorUuid: "A", name: "Éloïse", isCharacter: true, caps: {} };
  let s = createHazardState({ kind: "explosion", label: "Grenade", target, parts: [{ key: "explosion", dice: 6 }], faces: [4, 5, 1, 2, 6, 3, 4], hits: 4 });
  assert.equal(s.stage, "soak");
  s = setSoak(s, { dice: 1, faces: [5], hits: 1 }).state;
  assert.equal(s.loss, 3);
  s = chooseAbsorb(s, { choice: "vitality" }).state;
  assert.equal(s.stage, "done");
  const f = createHazardState({ kind: "fire", label: "En feu", target, parts: [{ key: "fire", dice: 1 }], faces: [2], hits: 0, soak: false });
  assert.equal(f.stage, "done");
  const g = createHazardState({ kind: "fire", label: "En feu", target, parts: [{ key: "fire", dice: 1 }], faces: [5], hits: 1, soak: false });
  assert.equal(g.stage, "absorb");
});
