import { test } from "node:test";
import assert from "node:assert/strict";
import { createTaskState, invertTask, proposeVoluntaryFailure, resolveVoluntaryFailure } from "../../src/domain/dice/task-state.mjs";
import { createOpposedState, setSideRoll, invertSide } from "../../src/domain/dice/opposed-state.mjs";

test("état initial", () => {
  const s = createTaskState({ value: 65, pips: 0, result: 28 });
  assert.equal(s.success, true);
  assert.equal(s.originalResult, 28);
  assert.equal(s.apparent, null);
});

test("inversion : Agilité 15, 40 → 04 réussite (LdB p. 18)", () => {
  const s = createTaskState({ value: 15, result: 40 });
  assert.equal(s.success, false);
  const r = invertTask(s, { cost: 1, source: "ability" });
  assert.ok(r.ok);
  assert.equal(r.state.result, 4);
  assert.equal(r.state.success, true);
  assert.deepEqual(r.state.history.map(h => [h.type, h.from, h.to, h.cost]), [["invert", 40, 4, 1]]);
});

test("inversion réévaluée avec les pips : 28 → 82 avec +2 pips = réussite auto (LdB p. 83)", () => {
  const s = createTaskState({ value: 65, pips: 2, result: 28 });
  const r = invertTask(s);
  assert.equal(r.state.result, 82);
  assert.equal(r.state.success, true);
  assert.equal(r.state.auto, "success");
  assert.equal(r.state.history[0].cost, 2);
});

test("le Karma ne change pas à l'inversion", () => {
  const s = createTaskState({ value: 50, result: 77 });
  assert.equal(s.karma, "bad");
  assert.equal(invertTask(s).state.karma, "bad");
});

test("modificateur secret du Chef : issue réelle et issue apparente", () => {
  // Fouille 65, 41 : réussite apparente ; avec −2 secret… 41 a des unités à 1 → échec réel
  const s = createTaskState({ value: 65, pips: 0, hiddenPips: -2, result: 41 });
  assert.equal(s.success, false);
  assert.equal(s.auto, "failure");
  assert.deepEqual(s.apparent, { success: true, auto: null, target: 65 });
});

test("échec volontaire : proposition puis validation (+2 PR) ou refus", () => {
  const s = createTaskState({ value: 65, result: 30 });
  const p = proposeVoluntaryFailure(s);
  assert.equal(p.state.status, "pendingFailure");
  assert.equal(invertTask(p.state).ok, false);
  const yes = resolveVoluntaryFailure(p.state, true);
  assert.equal(yes.gain, 2);
  assert.equal(yes.state.success, false);
  assert.equal(yes.state.status, "failedVoluntarily");
  const no = resolveVoluntaryFailure(p.state, false);
  assert.equal(no.state.status, "resolved");
  assert.equal(no.state.success, true);
});

test("échec volontaire refusé sur un échec", () => {
  assert.equal(proposeVoluntaryFailure(createTaskState({ value: 15, result: 90 })).ok, false);
});

test("opposition sur carte : attente, résolution, inversion d'un camp", () => {
  let st = createOpposedState({ a: { name: "Éloïse" }, b: { name: "Agent X" } });
  assert.equal(st.state, "waiting");
  st = setSideRoll(st, "a", createTaskState({ value: 65, pips: 2, result: 28 })).state;
  assert.equal(st.outcome, null);
  st = setSideRoll(st, "b", createTaskState({ value: 65, result: 49 })).state;
  assert.equal(st.outcome, "b");                       // 28 < 49
  assert.equal(setSideRoll(st, "b", createTaskState({ value: 65, result: 1 })).reason, "already-rolled");
  st = invertSide(st, "a", { cost: 1 }).state;         // Génie : 28 → 82
  assert.equal(st.outcome, "a");
});
