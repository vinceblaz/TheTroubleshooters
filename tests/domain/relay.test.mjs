import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRelayRequest } from "../../src/domain/relay/rules.mjs";

const rule = {
  type: "demo",
  immutable: ["actorUuid", "roll"],
  transitions: { pending: ["resolved", "cancelled"] },
  maxRolls: 1,
  requireOwner: true
};
const current = { state: "pending", actorUuid: "Actor.a", roll: { total: 42 }, note: "" };

test("transition autorisée", () => {
  const r = validateRelayRequest(rule, current, { isOwner: true, changes: { state: "resolved", note: "ok" } });
  assert.equal(r.ok, true);
  assert.equal(r.next.state, "resolved");
  assert.equal(r.next.note, "ok");
  assert.equal(r.next.actorUuid, "Actor.a");
});

test("demandeur non propriétaire refusé", () => {
  assert.deepEqual(validateRelayRequest(rule, current, { isOwner: false, changes: {} }), { ok: false, reason: "not-owner" });
});

test("champ immuable modifié refusé ; valeur identique acceptée", () => {
  assert.equal(validateRelayRequest(rule, current, { isOwner: true, changes: { roll: { total: 1 } } }).reason, "immutable:roll");
  assert.equal(validateRelayRequest(rule, current, { isOwner: true, changes: { roll: { total: 42 } } }).ok, true);
});

test("transition interdite refusée", () => {
  const done = { ...current, state: "resolved" };
  assert.equal(validateRelayRequest(rule, done, { isOwner: true, changes: { state: "pending" } }).reason, "transition:resolved->pending");
});

test("trop de jets refusés", () => {
  assert.equal(validateRelayRequest(rule, current, { isOwner: true, changes: {}, rolls: [1, 2] }).reason, "too-many-rolls");
});

test("entrée manquante", () => {
  assert.equal(validateRelayRequest(null, current, {}).ok, false);
});
