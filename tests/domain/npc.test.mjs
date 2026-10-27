import { test } from "node:test";
import assert from "node:assert/strict";
import { NPC_RANKS, rankCapabilities, characterCapabilities, resolveNpcSkill } from "../../src/domain/rules/npc.mjs";

test("tableau Blessé / Danger de mort (LdB p. 95)", () => {
  assert.equal(rankCapabilities("minion").canTakeWounded, false);
  assert.equal(rankCapabilities("henchman").canTakeWounded, false);
  assert.equal(rankCapabilities("lieutenant").canTakeWounded, true);
  assert.equal(rankCapabilities("lieutenant").canTakeMortalDanger, false);
  assert.equal(rankCapabilities("boss").canTakeMortalDanger, true);
  assert.equal(characterCapabilities().canTakeMortalDanger, true);
});

test("Bon Karma met Hors de combat sbires et sous-fifres seulement", () => {
  assert.ok(rankCapabilities("minion").goodKarmaKnocksOut);
  assert.ok(rankCapabilities("henchman").goodKarmaKnocksOut);
  assert.ok(!rankCapabilities("lieutenant").goodKarmaKnocksOut);
});

test("rang inconnu → figurant ; copie défensive", () => {
  const c = rankCapabilities("??");
  assert.deepEqual(c, rankCapabilities("extra"));
  c.canTakeWounded = true;
  assert.equal(rankCapabilities("extra").canTakeWounded, false);
  assert.equal(NPC_RANKS.length, 5);
});

test("compétence de PNJ : listée, puis spécialité, puis base", () => {
  const agent = { baseSkill: 45, specialty: { value: 65 }, skills: [{ name: "Furtivité", value: 65 }] };
  assert.deepEqual(resolveNpcSkill(agent, { skillName: "furtivite" }), { value: 65, source: "skill", name: "Furtivité" });
  assert.deepEqual(resolveNpcSkill(agent, { skillName: "Agilité", inSpecialty: true }), { value: 65, source: "specialty" });
  assert.deepEqual(resolveNpcSkill(agent, { skillName: "Agilité" }), { value: 45, source: "base" });
});
