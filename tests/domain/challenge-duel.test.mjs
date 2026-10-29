import { test } from "node:test";
import assert from "node:assert/strict";
import { challengeResult, createChallenge, setChallengeRoll, rowSuccess, distribution, CHALLENGE_PRESETS, CHALLENGE_TABLE } from "../../src/domain/rules/challenge.mjs";
import { createDuel, requestExchange, setExchangeRoll, repeatPenalty, exchangeWinner, skillFor, pipsFor } from "../../src/domain/rules/duel.mjs";
import { createTaskState, invertTask } from "../../src/domain/dice/task-state.mjs";
import { SKILL_KEYS } from "../../src/domain/rules/skills.mjs";

const T = (value, result) => createTaskState({ value, result });

test("table des défis (D-058)", () => {
  assert.equal(challengeResult(3, 0), "disastrous");
  assert.equal(challengeResult(3, 1), "limited");
  assert.equal(challengeResult(3, 3), "excellent");
  assert.equal(challengeResult(4, 1), "bad");
  assert.equal(challengeResult(4, 4), "excellent");
  assert.equal(challengeResult(5, 3), "limited");
  assert.equal(challengeResult(5, 5), "excellent");
  assert.equal(challengeResult(2, 1), null);
  assert.deepEqual(Object.keys(CHALLENGE_TABLE), ["3", "4", "5"]);
});

test("défi : création, jets, opposition, inversion", () => {
  assert.equal(createChallenge({ rows: [{ skill: "search" }, { skill: "vigilance" }] }).reason, "row-count");
  let s = createChallenge({ title: "Scène de crime", rows: [
    { skill: "investigation", actorUuid: "A" }, { skill: "search", actorUuid: "B" },
    { skill: "vigilance", actorUuid: "A", opposition: { label: "Agent", value: 45 } }] }).state;
  assert.ok(!s.done);
  s = setChallengeRoll(s, 0, { task: T(55, 30), rollMessageId: "m0" }).state;
  s = setChallengeRoll(s, 1, { task: T(55, 80), rollMessageId: "m1" }).state;
  assert.ok(!s.done);
  s = setChallengeRoll(s, 2, { task: T(55, 50), oppositionTask: T(45, 40), rollMessageId: "m2" }).state;   // 50 > 40 : remporté
  assert.ok(s.done);
  assert.equal(s.successes, 2);
  assert.equal(s.result, "good");
  assert.ok(!setChallengeRoll(s, 0, { task: T(55, 10), rollMessageId: "autre" }).ok);   // une seule fois
  s = setChallengeRoll(s, 1, { task: invertTask(s.rows[1].task).state, rollMessageId: "m1" }).state;   // 80 → 08
  assert.equal(s.result, "excellent");
  assert.deepEqual(distribution(s.rows), { A: 2, B: 1 });
  assert.equal(rowSuccess({ task: T(55, 40), opposition: { value: 45 }, oppositionTask: T(45, 40) }), false);   // égalité
});

test("modèles de défis : 3 à 5 compétences connues", () => {
  for (const [k, list] of Object.entries(CHALLENGE_PRESETS)) {
    assert.ok(list.length >= 3 && list.length <= 5, k);
    for (const s of list) assert.ok(SKILL_KEYS.includes(s), `${k} ${s}`);
  }
});

test("duel : exemple du livre (Elektra contre l'agent, nombre cible 3)", () => {
  let d = createDuel({ target: 3, sides: { a: { name: "Elektra", participants: ["E"] }, b: { name: "Agent", participants: ["X"] } } });
  assert.equal(d.turn, "a");
  d = requestExchange(d, { side: "a", skill: "vigilance" }).state;
  assert.equal(d.turn, null);
  assert.ok(!requestExchange(d, { side: "b", skill: "stealth" }).ok);
  d = setExchangeRoll(d, 0, "a", { task: T(65, 49), rollMessageId: "1a" }).state;
  d = setExchangeRoll(d, 0, "b", { task: T(45, 81), rollMessageId: "1b" }).state;
  assert.deepEqual(d.score, { a: 1, b: 0 });
  assert.equal(d.exchanges[0].describer, "a");
  assert.equal(d.turn, "b");
  d = requestExchange(d, { side: "b", skill: "stealth", oppSkill: "search" }).state;
  assert.equal(skillFor(d.exchanges[1], "a"), "search");
  assert.equal(skillFor(d.exchanges[1], "b"), "stealth");
  d = setExchangeRoll(d, 1, "b", { task: T(65, 67), rollMessageId: "2b" }).state;
  d = setExchangeRoll(d, 1, "a", { task: T(45, 59), rollMessageId: "2a" }).state;
  assert.deepEqual(d.score, { a: 1, b: 0 });                    // deux échecs : score inchangé
  assert.equal(d.exchanges[1].describer, "b");                   // le demandeur décrit
  d = requestExchange(d, { side: "a", skill: "driving" }).state;
  d = setExchangeRoll(d, 2, "a", { task: T(85, 82), rollMessageId: "3a" }).state;
  d = setExchangeRoll(d, 2, "b", { task: T(75, 69), rollMessageId: "3b" }).state;
  assert.deepEqual(d.score, { a: 2, b: 0 });
  d = requestExchange(d, { side: "b", skill: "shooting", oppSkill: "melee" }).state;
  d = setExchangeRoll(d, 3, "b", { task: T(55, 36), rollMessageId: "4b" }).state;
  d = setExchangeRoll(d, 3, "a", { task: T(55, 44), rollMessageId: "4a" }).state;
  assert.deepEqual(d.score, { a: 3, b: 0 });
  assert.equal(d.winner, "a");
  assert.ok(!requestExchange(d, { side: "b", skill: "driving" }).ok);
});

test("duel : malus de répétition, inversion, échange courant", () => {
  let d = createDuel({ sides: { a: {}, b: {} } });
  d = requestExchange(d, { side: "a", skill: "driving" }).state;
  assert.equal(pipsFor(d.exchanges[0], "a"), 0);
  d = setExchangeRoll(d, 0, "a", { task: T(50, 40), rollMessageId: "x" }).state;
  d = setExchangeRoll(d, 0, "b", { task: T(50, 30), rollMessageId: "y" }).state;
  assert.equal(repeatPenalty(d, "b", "driving", "duel"), -2);
  assert.equal(repeatPenalty(d, "b", "driving", "side"), 0);
  d = requestExchange(d, { side: "b", skill: "driving" }).state;
  assert.equal(pipsFor(d.exchanges[1], "b"), -2);
  assert.equal(pipsFor(d.exchanges[1], "a"), 0);
  assert.ok(!setExchangeRoll(d, 0, "a", { task: T(50, 10), rollMessageId: "nouveau" }).ok);
  d = setExchangeRoll(d, 0, "b", { task: invertTask(d.exchanges[0].b.task).state, rollMessageId: "y" }).state;   // 30 → 03
  assert.deepEqual(d.score, { a: 1, b: 0 });
  assert.equal(exchangeWinner({ a: { task: null }, b: { task: null } }), undefined);
});
