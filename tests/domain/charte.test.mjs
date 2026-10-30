import { test } from "node:test";
import assert from "node:assert/strict";
import { mrzText, splitName, passportNumber, mrzLines, vitalityBoxes } from "../../src/domain/rules/passport.mjs";
import { sfxFor, injectSfx } from "../../src/chat/sfx.mjs";

test("passeport : bande de lecture automatique de 44 caractères", () => {
  assert.equal(mrzText("Éloïse d'Aubigné"), "ELOISE<D<AUBIGNE");
  assert.deepEqual(splitName("Margaux Delorme"), { surname: "Delorme", given: "Margaux" });
  assert.deepEqual(splitName("Kraken"), { surname: "Kraken", given: "" });
  assert.equal(passportNumber("3f9a2c7b"), "RT 3F9A2C");
  const [l1, l2] = mrzLines({ name: "Margaux Delorme", nationality: "Française", number: "RT 3F9A2C" });
  assert.equal(l1.length, 44); assert.equal(l2.length, 44);
  assert.ok(l1.startsWith("P<RTDELORME<<MARGAUX<"));
  assert.ok(l2.startsWith("RT3F9A2C<<FRA"));
});

test("passeport : cases de Vitalité", () => {
  assert.deepEqual(vitalityBoxes(4, 5).map(b => b.filled), [true, true, true, true, false]);
  assert.equal(vitalityBoxes(9, 99).length, 12);
  assert.deepEqual(vitalityBoxes(-2, 2).map(b => b.filled), [false, false]);
});

test("onomatopées : seulement sur les moments forts", () => {
  assert.deepEqual(sfxFor({ kind: "task", task: { karma: "good", status: "resolved" } }), { key: "goodKarma", tone: "yellow" });
  assert.equal(sfxFor({ kind: "task", task: { karma: "bad", status: "resolved" } }).key, "badKarma");
  assert.equal(sfxFor({ kind: "task", task: { karma: null, status: "resolved" } }), null);
  assert.equal(sfxFor({ kind: "task", task: { karma: "bad", status: "pendingFailure" } }), null);
  assert.equal(sfxFor({ kind: "attack", attack: { stage: "damage", hit: true } }).key, "hit");
  assert.equal(sfxFor({ kind: "attack", attack: { stage: "done", hit: true, knockout: { source: "karma" } } }).key, "knockout");
  assert.equal(sfxFor({ kind: "attack", attack: { stage: "miss", hit: false } }).key, "miss");
  assert.equal(sfxFor({ kind: "attack", attack: { stage: "defense", hit: null } }), null);
  assert.equal(sfxFor({ kind: "attack", attack: { stage: "damage", hit: true, hazard: { label: "Chute" } } }), null);
  assert.equal(sfxFor({ kind: "challenge", challenge: { result: "excellent" } }).key, "excellent");
  assert.equal(sfxFor({ kind: "challenge", challenge: { result: "good" } }), null);
  assert.equal(sfxFor({ kind: "duel", duel: { winner: "a" } }).key, "duelWon");
  assert.equal(sfxFor({ kind: "opposed", opposed: { outcome: "a", a: { task: { karma: "good" } } } }).key, "goodKarma");
  assert.equal(sfxFor({ kind: "log" }), null);
});

test("onomatopées : insertion dans la carte", () => {
  const html = '<div class="thetroubleshooters tts-card tts-task-card">\n<header>x</header></div>';
  const out = injectSfx(html, { key: "goodKarma", tone: "yellow" }, "BIM !");
  assert.ok(out.startsWith('<div class="thetroubleshooters tts-card tts-task-card"><div class="tts-sfx tts-sfx-yellow" aria-hidden="true"><span class="tts-sfx-text">BIM !</span></div>'));
  assert.equal(injectSfx(html, null, "x"), html);
});
