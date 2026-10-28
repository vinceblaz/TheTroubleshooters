import { test } from "node:test";
import assert from "node:assert/strict";
import { digits, fromDice, isDouble, invertResult, netPips, evaluateTask, opposedOutcome } from "../../src/domain/dice/percentile.mjs";

test("chiffres d'un d% ; 100 a une dizaine de 10", () => {
  assert.deepEqual(digits(73), { tens: 7, units: 3 });
  assert.deepEqual(digits(7), { tens: 0, units: 7 });
  assert.deepEqual(digits(100), { tens: 10, units: 0 });
  assert.equal(fromDice(0, 0), 100);
  assert.equal(fromDice(0, 9), 9);
});

test("Karma : doubles 11 à 99, 100 exclu (D-005)", () => {
  for (const d of [11, 22, 33, 44, 55, 66, 77, 88, 99]) assert.ok(isDouble(d), d);
  assert.ok(!isDouble(100));
  assert.ok(!isDouble(10));
  assert.ok(!isDouble(1));
});

test("inversion (LdB p. 82)", () => {
  assert.equal(invertResult(73), 37);
  assert.equal(invertResult(29), 92);
  assert.equal(invertResult(100), 100);
  assert.equal(invertResult(7), 70);
  assert.equal(invertResult(10), 1);
  assert.equal(invertResult(40), 4);   // Éloïse, LdB p. 18 : 40 → 04
});

test("somme des pips : catégories + conditions et désavantages cumulés", () => {
  assert.equal(netPips({ difficulty: -2, gear: 2 }), 0);
  assert.equal(netPips({ difficulty: 2, conditions: [{ pips: -2 }, { pips: -2 }] }), -2);
  assert.equal(netPips({ circumstances: -5, flaws: [-2] }), -7);
});

test("jet standard", () => {
  assert.deepEqual(evaluateTask({ value: 65, result: 57 }), { success: true, auto: null, karma: null, target: 65 });
  assert.equal(evaluateTask({ value: 45, result: 73 }).success, false);   // Paul, Vigilance 73 (LdB p. 17)
  assert.equal(evaluateTask({ value: 15, result: 9 }).success, true);     // Frida, Fouille 09 avec 15
});

test("exemples du livre : pips", () => {
  // Ingénierie 45, +2 pips, 81 → réussite automatique (unités 1) — LdB p. 80
  assert.deepEqual(evaluateTask({ value: 45, result: 81, pips: 2 }), { success: true, auto: "success", karma: null, target: 45 });
  // Pilotage 75, −2 pips, 12 → échec automatique (unités 2) — LdB p. 80
  assert.deepEqual(evaluateTask({ value: 75, result: 12, pips: -2 }), { success: false, auto: "failure", karma: null, target: 75 });
  // Passe-passe 65, −2 pips, 47 → réussite (unités 7) — LdB p. 17
  assert.equal(evaluateTask({ value: 65, result: 47, pips: -2 }).success, true);
  // un 0 aux unités n'est jamais affecté
  assert.equal(evaluateTask({ value: 15, result: 80, pips: 5 }).success, false);
  assert.equal(evaluateTask({ value: 90, result: 40, pips: -5 }).success, true);
});

test("exemple du livre : Pilotage 75 à −2, 66 → réussite et Bon Karma (LdB p. 16)", () => {
  assert.deepEqual(evaluateTask({ value: 75, result: 66, pips: -2 }), { success: true, auto: null, karma: "good", target: 75 });
});

test("Mauvais Karma sur échec", () => {
  assert.equal(evaluateTask({ value: 45, result: 77 }).karma, "bad");
});

test("100 : échec sauf compétence ≥ 100", () => {
  assert.equal(evaluateTask({ value: 85, result: 100 }).success, false);
  assert.equal(evaluateTask({ value: 100, result: 100 }).success, true);
  assert.equal(evaluateTask({ value: 100, result: 100 }).karma, null);
});

test("mode valeur de tâche : ±5 % par pip", () => {
  assert.deepEqual(evaluateTask({ value: 45, result: 54, pips: 2, mode: "taskValue" }), { success: true, auto: null, karma: null, target: 55 });
  assert.equal(evaluateTask({ value: 45, result: 81, pips: 2, mode: "taskValue" }).success, false);
});

test("opposition (LdB p. 82)", () => {
  const s = r => ({ success: true, result: r }), f = r => ({ success: false, result: r });
  assert.equal(opposedOutcome(f(80), f(90)), "tie");
  assert.equal(opposedOutcome(s(20), f(90)), "a");
  assert.equal(opposedOutcome(f(20), s(10)), "b");
  assert.equal(opposedOutcome(s(82), s(49)), "a");             // Éloïse 82 contre Vigilance 49 (LdB p. 83)
  assert.equal(opposedOutcome(s(40), s(40)), "tie");
  assert.equal(opposedOutcome(s(40), s(40), { defenderWinsTies: true }), "b");
});
