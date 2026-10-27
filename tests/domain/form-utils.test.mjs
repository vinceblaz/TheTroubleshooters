import { test } from "node:test";
import assert from "node:assert/strict";
import { numericObjectToArray, normalizeArrayPaths, splitList, normalizeListPaths } from "../../src/sheets/form-utils.mjs";

test("objet à clés numériques → tableau ordonné", () => {
  assert.deepEqual(numericObjectToArray({ 1: "b", 0: "a", 10: "c" }), ["a", "b", "c"]);
});

test("valeurs non concernées inchangées", () => {
  const o = { a: 1 };
  assert.equal(numericObjectToArray(o), o);
  assert.deepEqual(numericObjectToArray([1]), [1]);
  assert.equal(numericObjectToArray(null), null);
  assert.equal(numericObjectToArray("x"), "x");
  assert.deepEqual(numericObjectToArray({}), {});
});

test("normalisation de chemins imbriqués", () => {
  const data = { system: { attacks: { 0: { name: "Poing" } }, skills: { secondary: { 0: "charm", 1: "contacts" } } } };
  normalizeArrayPaths(data, ["system.attacks", "system.skills.secondary", "system.absent"]);
  assert.deepEqual(data.system.attacks, [{ name: "Poing" }]);
  assert.deepEqual(data.system.skills.secondary, ["charm", "contacts"]);
  assert.ok(!("absent" in data.system));
});

test("listes saisies en texte", () => {
  assert.deepEqual(splitList("Génie\n Jeune ,Curieux\n\n"), ["Génie", "Jeune", "Curieux"]);
  assert.deepEqual(splitList(["a"]), ["a"]);
  const data = { system: { kits: "Appareil photo\nScooter" } };
  normalizeListPaths(data, ["system.kits", "system.none"]);
  assert.deepEqual(data.system.kits, ["Appareil photo", "Scooter"]);
});
