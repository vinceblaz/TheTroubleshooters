import { test } from "node:test";
import assert from "node:assert/strict";
import { cardActivations, dialogActivations, sheetActivations, matchesSkill } from "../../src/domain/rules/activations.mjs";
import { createTaskState, rerollTask, forceSuccessTask, rerollWithTask, failForPointsTask, invertTask } from "../../src/domain/dice/task-state.mjs";
import { triggerGain, flawPenaltyMods, hasUnluckyFlaw } from "../../src/domain/rules/flaws.mjs";
import { createSpend, resolveSpend, clampSpendCost, newSessionValue } from "../../src/domain/rules/spend.mjs";

const genie = { id: "g", name: "Génie", activations: [
  { type: "invert", cost: 1, skills: ["electronics", "engineering", "mechanics"] },
  { type: "reroll", cost: 2, skills: ["electronics", "engineering", "mechanics"] }
] };
const finLimier = { id: "f", name: "Fin limier", activations: [
  { type: "invert", cost: 1, skills: ["search", "investigation"] },
  { type: "forceSuccess", cost: 2, skills: ["search", "investigation"] }
] };
const artisan = { id: "a", name: "Artisan", activations: [{ type: "invert", cost: 1, skills: [] }] };
const curieux = { id: "c", name: "Curieux", activations: [{ type: "failForPoints", cost: 0, skills: ["stealth", "security", "investigation"], gain: 3 }] };
const avocat = { id: "v", name: "Avocat", activations: [
  { type: "bonusPips", cost: 0, skills: ["status"], pips: 2 }, { type: "narrative", cost: 2, skills: [] }
] };

test("filtre par compétence ; liste vide = situationnelle", () => {
  assert.ok(matchesSkill({ skills: [] }, "charm"));
  assert.ok(matchesSkill({ skills: ["charm"] }, "charm"));
  assert.ok(!matchesSkill({ skills: ["charm"] }, "search"));
  assert.ok(!matchesSkill({ skills: ["charm"] }, ""));
});

test("activations sur carte : Génie sur Électronique, pas sur Charme", () => {
  const task = createTaskState({ value: 65, result: 28 });
  assert.equal(cardActivations([genie], { skillKey: "electronics", task }).length, 2);
  assert.equal(cardActivations([genie], { skillKey: "charm", task }).length, 0);
  assert.equal(cardActivations([artisan], { skillKey: "charm", task }).length, 1);
});

test("forceSuccess seulement sur un échec ; failForPoints seulement sur une réussite de la bonne compétence", () => {
  const ok = createTaskState({ value: 65, result: 20 });
  const ko = createTaskState({ value: 15, result: 90 });
  assert.deepEqual(cardActivations([finLimier], { skillKey: "search", task: ok }).map(a => a.act.type), ["invert"]);
  assert.deepEqual(cardActivations([finLimier], { skillKey: "search", task: ko }).map(a => a.act.type), ["invert", "forceSuccess"]);
  assert.equal(cardActivations([curieux], { skillKey: "stealth", task: ok }).length, 1);
  assert.equal(cardActivations([curieux], { skillKey: "charm", task: ok }).length, 0);
  assert.equal(cardActivations([curieux], { skillKey: "stealth", task: ko }).length, 0);
});

test("aucune activation sur une carte verrouillée ; capacité non acquise ignorée", () => {
  const t = { ...createTaskState({ value: 65, result: 20 }), status: "pendingFailure" };
  assert.equal(cardActivations([genie], { skillKey: "electronics", task: t }).length, 0);
  assert.equal(cardActivations([{ ...genie, acquired: false }], { skillKey: "electronics", task: createTaskState({ value: 65, result: 20 }) }).length, 0);
});

test("boîte de jet et fiche", () => {
  assert.equal(dialogActivations([avocat], "status").length, 1);
  assert.equal(dialogActivations([avocat], "charm").length, 0);
  assert.deepEqual(sheetActivations(avocat).map(s => s.index), [1]);
});

test("inversion par capacité : Jeune, 40 → 04 pour 1 PR (LdB p. 18)", () => {
  const r = invertTask(createTaskState({ value: 15, result: 40 }), { cost: 1, source: "ability" });
  assert.equal(r.state.result, 4);
  assert.equal(r.state.success, true);
});

test("relance : nouveau résultat conservé, Karma recalculé", () => {
  const r = rerollTask(createTaskState({ value: 50, result: 90 }), 33, { cost: 2 });
  assert.equal(r.state.result, 33);
  assert.equal(r.state.success, true);
  assert.equal(r.state.karma, "good");
  assert.equal(r.karmaChanged, true);
  assert.equal(r.state.history[0].type, "reroll");
});

test("transformer un échec en réussite", () => {
  const r = forceSuccessTask(createTaskState({ value: 15, result: 90 }));
  assert.equal(r.state.success, true);
  assert.equal(forceSuccessTask(r.state).ok, false);
});

test("Concentré : rejouer en Volonté à +2 pips", () => {
  const r = rerollWithTask(createTaskState({ value: 15, result: 90 }), { value: 45, pips: 2, result: 61, cost: 1 });
  assert.equal(r.state.value, 45);
  assert.equal(r.state.success, true);   // unités 1 ≤ 2 → réussite automatique
  assert.equal(r.state.auto, "success");
});

test("rater pour des PR (désavantage ou Curieux) : immédiat, +3", () => {
  const r = failForPointsTask(createTaskState({ value: 65, result: 20 }), { gain: 3 });
  assert.equal(r.gain, 3);
  assert.equal(r.state.success, false);
  assert.equal(r.state.status, "failedVoluntarily");
  assert.equal(failForPointsTask(createTaskState({ value: 15, result: 90 })).ok, false);
});

test("désavantages : gains et malus de scène", () => {
  assert.equal(triggerGain({ mode: "absent" }), 6);
  assert.equal(triggerGain({ mode: "penalty", gain: 3 }), 3);
  assert.deepEqual(flawPenaltyMods([{ label: "Mauvaise réputation", pips: -2, skills: ["charm", "status"] }, { label: "Phobie", pips: -2, skills: [] }], "charm"),
    [{ label: "Mauvaise réputation", pips: -2 }, { label: "Phobie", pips: -2 }]);
  assert.deepEqual(flawPenaltyMods([{ label: "Mauvaise réputation", pips: -2, skills: ["charm"] }], "search"), []);
  assert.ok(hasUnluckyFlaw([{ special: "unlucky" }]));
  assert.ok(!hasUnluckyFlaw([{ special: "" }]));
});

test("dépense soumise au Chef : réserve, validation, refus, modification", () => {
  const s = createSpend({ type: "major", cost: 6 });
  assert.equal(s.reserved, 6);
  assert.deepEqual(resolveSpend(s, "accept").refund, 0);
  assert.equal(resolveSpend(s, "refuse").refund, 6);
  const m = resolveSpend(s, "modify", { cost: 2 });       // majeur requalifié en mineur (LdB p. 107)
  assert.equal(m.refund, 4);
  assert.equal(m.state.finalCost, 2);
  assert.equal(resolveSpend(createSpend({ type: "clue", cost: 1 }), "modify", { cost: 3 }).extra, 2);
  assert.equal(resolveSpend(m.state, "accept").ok, false);
  assert.equal(clampSpendCost("clue", 9), 4);
  assert.equal(clampSpendCost("minor", 5), 2);
});

test("nouvelle session : 4 + bonus d'intersession, ou réserve conservée", () => {
  assert.equal(newSessionValue({ current: 11, start: 4, pendingBonus: 2 }), 6);
  assert.equal(newSessionValue({ current: 11, start: 4, keep: true }), 11);
  assert.equal(newSessionValue({ current: 0, start: 4, pendingBonus: 20, max: 12 }), 12);
});
