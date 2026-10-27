import { test } from "node:test";
import assert from "node:assert/strict";
import { extraLanguagesAllowed, carriedKitStatus, clampStoryPoints } from "../../src/domain/rules/character.mjs";

test("langues supplémentaires selon Langues", () => {
  assert.equal(extraLanguagesAllowed(15), 0);
  assert.equal(extraLanguagesAllowed(44), 0);
  assert.equal(extraLanguagesAllowed(45), 1);
  assert.equal(extraLanguagesAllowed(64), 1);
  assert.equal(extraLanguagesAllowed(65), 2);
  assert.equal(extraLanguagesAllowed(90), 2);
});

test("kits emportés : 5 max, simple signalement", () => {
  const kits = [1, 2, 3, 4, 5].map(() => ({ carried: true }));
  assert.deepEqual(carriedKitStatus(kits), { carried: 5, max: 5, over: false });
  kits.push({ carried: true }, { carried: false });
  assert.deepEqual(carriedKitStatus(kits), { carried: 6, max: 5, over: true });
});

test("points de récit bornés à [0, 12] avec écrêtage signalé", () => {
  assert.deepEqual(clampStoryPoints(13), { value: 12, overflow: 1 });
  assert.deepEqual(clampStoryPoints(-1), { value: 0, overflow: 0 });
  assert.deepEqual(clampStoryPoints(4), { value: 4, overflow: 0 });
  assert.deepEqual(clampStoryPoints(9, 8), { value: 8, overflow: 1 });
});
