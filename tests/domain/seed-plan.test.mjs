import { test } from "node:test";
import assert from "node:assert/strict";
import { planSeed, isSubsetEqual, compareVersions, needsInitialization } from "../../src/domain/init/seed-plan.mjs";

const catalog = [
  { seedKey: "hook.a", data: { name: "A", system: { description: "a" } } },
  { seedKey: "hook.b", data: { name: "B", system: { description: "b" } } },
  { seedKey: "hook.c", data: { name: "C", system: { description: "c" } } }
];

test("monde vide : tout est créé", () => {
  const p = planSeed(catalog, []);
  assert.equal(p.create.length, 3);
  assert.equal(p.update.length, 0);
});

test("idempotence : relance sans changement", () => {
  const existing = catalog.map((e, i) => ({ id: `id${i}`, seedKey: e.seedKey, data: { ...e.data, _id: `id${i}`, extra: 1 } }));
  const p = planSeed(catalog, existing);
  assert.deepEqual(p.unchanged, ["hook.a", "hook.b", "hook.c"]);
  assert.equal(p.create.length + p.update.length, 0);
});

test("mise à jour d'une entrée modifiée, orphelin signalé, jamais supprimé", () => {
  const existing = [
    { id: "x", seedKey: "hook.a", data: { name: "A", system: { description: "ancien" } } },
    { id: "y", seedKey: "hook.z", data: { name: "Z" } }
  ];
  const p = planSeed(catalog, existing);
  assert.deepEqual(p.update.map(u => u.id), ["x"]);
  assert.equal(p.create.length, 2);
  assert.deepEqual(p.orphans, ["hook.z"]);
});

test("doublons du catalogue signalés et traités une seule fois", () => {
  const p = planSeed([...catalog, catalog[0]], []);
  assert.deepEqual(p.duplicates, ["hook.a"]);
  assert.equal(p.create.length, 3);
});

test("isSubsetEqual", () => {
  assert.ok(isSubsetEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2, c: 3 }], d: 4 }));
  assert.ok(!isSubsetEqual({ a: [1, 2] }, { a: [1] }));
});

test("versions", () => {
  assert.equal(compareVersions("0.1.0", "0.1.0"), 0);
  assert.equal(compareVersions("0.1.0", "0.2"), -1);
  assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
  assert.ok(needsInitialization("", "0.1.0"));
  assert.ok(needsInitialization("0.1.0", "0.1.1"));
  assert.ok(!needsInitialization("0.1.1", "0.1.1"));
});
