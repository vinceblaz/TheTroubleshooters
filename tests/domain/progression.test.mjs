import { test } from "node:test";
import assert from "node:assert/strict";
import { freeTicksFor, increaseRule, increaseAmount, experienceRoll, pointIncrease, addLanguageCross, languagePips,
  addAbilityCross, abilityPrerequisites, canUse, recordUse, targetKey } from "../../src/domain/rules/progression.mjs";
import { baseMaxVitality } from "../../src/domain/rules/vitality.mjs";

test("coches gratuites : somme des critères, retrait du Chef", () => {
  assert.equal(freeTicksFor({ present: true }), 1);
  assert.equal(freeTicksFor({ present: true, npcInteraction: true, pcInteraction: true, hookedDrag: true }), 4);
  assert.equal(freeTicksFor({ present: true, pcInteraction: true, bloodless: true }), 5);
  assert.equal(freeTicksFor({ present: true, npcInteraction: true }, 5), 0);
});

test("table d'augmentation (LdB p. 130)", () => {
  assert.equal(increaseRule(15).label, "1d6");
  assert.equal(increaseRule(65).label, "1d6");
  assert.equal(increaseRule(66).label, "1d6/2");
  assert.equal(increaseRule(86).label, "1d6/3");
  assert.equal(increaseRule(96).label, "1");
  assert.equal(increaseAmount(70, 5), 3);
  assert.equal(increaseAmount(90, 4), 2);
  assert.equal(increaseAmount(97, 6), 1);
});

test("exemples du livre (p. 127-128) : Agilité 63 → 68, Tir 83 inchangé, Statut 15 → 17, 45 → 45, 45 → 49, Corps-à-corps 65 → 68", () => {
  assert.deepEqual(pick(experienceRoll({ value: 63, d100: 73, d6: 5 })), [true, 68]);
  assert.deepEqual(pick(experienceRoll({ value: 83, d100: 42, d6: 6 })), [false, 83]);
  assert.deepEqual(pick(experienceRoll({ value: 15, d100: 39, d6: 2 })), [true, 17]);
  assert.deepEqual(pick(experienceRoll({ value: 45, d100: 28, d6: 6 })), [false, 45]);
  assert.deepEqual(pick(experienceRoll({ value: 45, d100: 96, d6: 4 })), [true, 49]);
  assert.deepEqual(pick(experienceRoll({ value: 65, d100: 88, d6: 3 })), [true, 68]);
});
const pick = r => [r.success, r.newValue];

test("plafond 100, et 106 seulement depuis 100 avec 100 puis 6", () => {
  assert.equal(experienceRoll({ value: 98, d100: 99, d6: 6 }).newValue, 99);
  assert.equal(experienceRoll({ value: 100, d100: 99, d6: 6 }).newValue, 100);
  assert.equal(experienceRoll({ value: 100, d100: 100, d6: 5 }).newValue, 100);
  const r = experienceRoll({ value: 100, d100: 100, d6: 6 });
  assert.ok(r.legendary); assert.equal(r.newValue, 106);
  assert.equal(experienceRoll({ value: 106, d100: 100, d6: 6 }).newValue, 106);
  assert.equal(experienceRoll({ value: 85, d100: 100, d6: 6 }).newValue, 88);
});

test("points : augmentation sans seuil", () => {
  assert.equal(pointIncrease({ value: 45, d6: 4 }).newValue, 49);
  assert.equal(pointIncrease({ value: 99, d6: 6 }).newValue, 100);
  assert.equal(pointIncrease({ value: 100, d6: 6 }).newValue, 100);
});

test("langues : courante à 5 croix, +1 pip par croix avant", () => {
  assert.deepEqual(addLanguageCross(0), { crosses: 1, fluent: false });
  assert.deepEqual(addLanguageCross(4), { crosses: 5, fluent: true });
  assert.equal(languagePips({ fluent: false, crosses: 3 }), 3);
  assert.equal(languagePips({ fluent: true, crosses: 5 }), 0);
});

test("capacités : acquise au coût ; prérequis (Pair du royaume, Maître judoka)", () => {
  assert.deepEqual(addAbilityCross(3, 5), { crosses: 4, acquired: false });
  assert.deepEqual(addAbilityCross(4, 5), { crosses: 5, acquired: true });
  const pair = { prerequisites: { skills: [{ key: "status", min: 65 }], abilities: [] } };
  assert.equal(abilityPrerequisites(pair, { skills: { status: 17 } }).ok, false);
  const judo = { prerequisites: { skills: [], abilities: ["Ceinture noire de judo"] } };
  assert.equal(abilityPrerequisites(judo, { abilityNames: ["Ceinture noire de judo"] }).ok, true);
  assert.deepEqual(abilityPrerequisites(judo, { abilityNames: [] }).missing, [{ type: "ability", name: "Ceinture noire de judo" }]);
});

test("limites : une coche ordinaire et une gratuite par cible ; récompenses illimitées", () => {
  const judo = { type: "ability", name: "Maître judoka" };
  let uses = {};
  assert.ok(canUse(uses, { source: "ordinary", skill: "melee", target: judo, learnWith: ["melee", "status"] }).ok);
  uses = recordUse(uses, "ordinary", judo);
  // la coche de Statut ne peut plus servir à Maître judoka (une seule coche ordinaire par capacité)
  assert.equal(canUse(uses, { source: "ordinary", skill: "status", target: judo, learnWith: ["melee", "status"] }).reason, "already-used");
  assert.ok(canUse(uses, { source: "free", target: judo }).ok);
  uses = recordUse(uses, "free", judo);
  assert.equal(canUse(uses, { source: "free", target: judo }).reason, "two-rolls");
  assert.equal(canUse(uses, { source: "training", target: judo }).reason, "two-rolls");
  assert.ok(canUse(uses, { source: "reward", skill: "melee", target: judo, learnWith: ["melee"] }).ok);
  assert.equal(canUse({}, { source: "ordinary", skill: "agility", target: { type: "skill", key: "melee" } }).reason, "wrong-skill");
  assert.equal(canUse({}, { source: "ordinary", skill: "agility", target: { type: "language", name: "Grec" } }).reason, "needs-languages");
  assert.equal(canUse({}, { source: "reward", skill: "status", target: judo, learnWith: ["melee"] }).reason, "not-associated");
  assert.equal(targetKey({ type: "language", name: " Grec " }), "language:grec");
});

test("points : 1 point d'expérience par cible ; point de récompense en croix à 85+", () => {
  const sk = { type: "skill", key: "status" };
  let uses = recordUse({}, "xp", sk);
  assert.equal(canUse(uses, { source: "xp", target: sk }).reason, "already-used");
  assert.ok(canUse(uses, { source: "rewardPoint", skill: "status", target: sk }).ok);
  const lang = { type: "language", name: "Grec" };
  assert.equal(canUse({}, { source: "rewardPoint", skill: "status", skillValue: 80, target: lang }).reason, "reward-point-locked");
  assert.ok(canUse({}, { source: "rewardPoint", skill: "status", skillValue: 85, target: lang }).ok);
  uses = recordUse({}, "rewardPoint", lang);
  assert.equal(canUse(uses, { source: "rewardPoint", skill: "status", skillValue: 90, target: lang }).reason, "already-used");
});

test("Vitalité recalculée (LdB p. 129) : Agilité 68 et Tir 84 → 7", () => {
  assert.equal(baseMaxVitality({ agility: 63, melee: 15, shooting: 84 }), 6);
  assert.equal(baseMaxVitality({ agility: 68, melee: 15, shooting: 84 }), 7);
});
