import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SKILLS, SKILL_KEYS, SKILL_FAMILIES, COMBAT_SKILLS, clampSkill, isSkillKey, skillsByFamily
} from "../../src/domain/rules/skills.mjs";

test("28 compétences, clés uniques", () => {
  assert.equal(SKILLS.length, 28);
  assert.equal(new Set(SKILL_KEYS).size, 28);
});

test("chaque compétence appartient à une famille connue", () => {
  for (const s of SKILLS) assert.ok(SKILL_FAMILIES.includes(s.family), s.key);
});

test("répartition des familles conforme au LdB p. 52", () => {
  const f = skillsByFamily();
  assert.equal(f.basic.length, 7);      // Agilité, Endurance, Force, Passe-passe, Ressources, Vigilance, Volonté
  assert.equal(f.social.length, 6);      // Charme, Contacts, Langues, Spectacle, Statut, Tromperie
  assert.equal(f.research.length, 8);
  assert.equal(f.action.length, 5);
  assert.equal(f.combat.length, 2);
  assert.equal(Object.values(f).flat().length, 28);
});

test("compétences de combat = Corps-à-corps et Tir", () => {
  assert.deepEqual([...COMBAT_SKILLS].sort(), ["melee", "shooting"]);
});

test("clampSkill borne dans [15, 106] et arrondit", () => {
  assert.equal(clampSkill(3), 15);
  assert.equal(clampSkill(200), 106);
  assert.equal(clampSkill(64.6), 65);
  assert.equal(clampSkill("abc"), 15);
  assert.equal(clampSkill(undefined), 15);
});

test("isSkillKey", () => {
  assert.ok(isSkillKey("sleightOfHand"));
  assert.ok(!isSkillKey("passePasse"));
});
