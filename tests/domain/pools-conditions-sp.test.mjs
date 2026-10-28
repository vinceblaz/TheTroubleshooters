import { test } from "node:test";
import assert from "node:assert/strict";
import { countHits, poolFormula, resolvePool, netLoss } from "../../src/domain/dice/pools.mjs";
import { conditionModifiers } from "../../src/domain/rules/conditions.mjs";
import { gainStoryPoints, spendStoryPoints } from "../../src/domain/rules/story-points.mjs";

test("comptage 4-5-6 (LdB p. 22)", () => {
  assert.equal(countHits([1, 4, 3]), 1);             // 3d6 1+4+3 : 1 point si dR
  assert.equal(countHits([3, 6]), 1);                // gilet 2dR : 3 et 6 → 1
});

test("dX : les 6 explosent en chaîne (règle LdB p. 22)", () => {
  const r = resolvePool(5, "dX", [2, 4, 5, 6, 1, 6, 3]);
  assert.deepEqual(r.faces, [2, 4, 5, 6, 1, 6, 3]);
  assert.equal(r.explosions, 2);
  assert.equal(r.hits, 4);
});

test("dR : pas d'explosion", () => {
  const r = resolvePool(2, "dR", [6, 6, 6]);
  assert.deepEqual(r.faces, [6, 6]);
  assert.equal(r.hits, 2);
});

test("formules Foundry", () => {
  assert.equal(poolFormula(5, "dX"), "5d6x6cs>=4");
  assert.equal(poolFormula(2, "dR"), "2d6cs>=4");
  assert.equal(poolFormula(3, "d6"), "3d6");
  assert.equal(poolFormula(0, "dX"), "0");
});

test("perte nette", () => {
  assert.equal(netLoss(4, 1), 3);
  assert.equal(netLoss(1, 3), 0);
});

test("conditions : malus cumulés selon le jet", () => {
  assert.deepEqual(conditionModifiers(["wounded", "drunk"], { skill: "charm" }), [
    { condition: "wounded", pips: -2 }, { condition: "drunk", pips: -2 }
  ]);
  assert.deepEqual(conditionModifiers(["wounded"], { skill: "charm", inCombat: true }), []);
  assert.deepEqual(conditionModifiers(["blinded"], { skill: "search" }), [{ condition: "blinded", pips: -5 }]);
  assert.deepEqual(conditionModifiers(["blinded"], { skill: "charm" }), []);
  assert.deepEqual(conditionModifiers(["stunned"], { skill: "charm" }), [{ condition: "stunned", pips: -2 }]);
  assert.deepEqual(conditionModifiers(["stunned"], { kind: "attack" }), [{ condition: "stunned", pips: -5 }]);
  assert.deepEqual(conditionModifiers(["drunk"], { skill: "charm", levels: { drunk: 3 } }), [{ condition: "drunk", pips: -6 }]);
  assert.deepEqual(conditionModifiers(["onFire", "surprised"], { skill: "charm" }), []);
});

test("points de récit : gain plafonné, dépense", () => {
  assert.deepEqual(gainStoryPoints(10, 9), { value: 12, gained: 2, overflow: 7 });
  assert.deepEqual(gainStoryPoints(4, 1), { value: 5, gained: 1, overflow: 0 });
  assert.deepEqual(spendStoryPoints(1, 2), { ok: false, reason: "insufficient", value: 1 });
  assert.deepEqual(spendStoryPoints(4, 2), { ok: true, value: 2 });
});
