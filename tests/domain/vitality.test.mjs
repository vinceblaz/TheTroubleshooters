import { test } from "node:test";
import assert from "node:assert/strict";
import { baseMaxVitality, effectiveMaxVitality, clampVitality } from "../../src/domain/rules/vitality.mjs";

test("Vitalité 4 par défaut", () => {
  assert.equal(baseMaxVitality({}), 4);
  assert.equal(baseMaxVitality({ agility: 44, melee: 44, shooting: 15 }), 4);
});

test("Vitalité 5 avec Agilité ou combat à 45", () => {
  assert.equal(baseMaxVitality({ agility: 45 }), 5);
  assert.equal(baseMaxVitality({ shooting: 45 }), 5);
  assert.equal(baseMaxVitality({ melee: 64 }), 5);
});

test("Vitalité 6 avec Agilité OU combat à 65", () => {
  assert.equal(baseMaxVitality({ agility: 65, melee: 45 }), 6);
  assert.equal(baseMaxVitality({ shooting: 75, agility: 45 }), 6); // Frida (LdB p. 39)
});

test("Vitalité 7 avec Agilité ET combat à 65", () => {
  assert.equal(baseMaxVitality({ agility: 68, shooting: 84 }), 7); // exemple LdB p. 129
  assert.equal(baseMaxVitality({ agility: 65, melee: 65 }), 7);
});

test("Prétirés du livre", () => {
  // Elektra : Corps-à-corps 45, Agilité 15 → 5
  assert.equal(baseMaxVitality({ agility: 15, melee: 45 }), 5);
  // Paul : Agilité 65, Corps-à-corps 45 → 6
  assert.equal(baseMaxVitality({ agility: 65, melee: 45 }), 6);
});

test("Bonus et Épuisé cumulatif (moitié, arrondi inférieur)", () => {
  assert.equal(effectiveMaxVitality({ agility: 65, melee: 65 }, 0, 0), 7);
  assert.equal(effectiveMaxVitality({ agility: 65, melee: 65 }, 0, 1), 3);
  assert.equal(effectiveMaxVitality({ agility: 65, melee: 65 }, 0, 2), 1);
  assert.equal(effectiveMaxVitality({}, 1, 0), 5);
  assert.equal(effectiveMaxVitality({}, -10, 0), 0);
});

test("clampVitality", () => {
  assert.equal(clampVitality(9, 5), 5);
  assert.equal(clampVitality(-2, 5), 0);
  assert.equal(clampVitality("x", 5), 5);
});
