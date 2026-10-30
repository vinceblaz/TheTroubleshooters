import { test } from "node:test";
import assert from "node:assert/strict";
import { NPC_TEMPLATES, draftFromTemplate, parseNpcDescriptors, formatNpcDescriptors, checkNpc, swapRankDescriptor } from "../../src/domain/rules/npc-gen.mjs";
import { NPC_RANKS } from "../../src/domain/rules/npc.mjs";
import { npcReverses, npcCanCounter } from "../../src/domain/combat/attack.mjs";

const codes = d => checkNpc(d).map(w => w.code);

test("un modèle par rang, valeurs des exemples du livre", () => {
  assert.deepEqual(Object.keys(NPC_TEMPLATES).sort(), [...NPC_RANKS].sort());
  assert.equal(NPC_TEMPLATES.boss.vitality, 8);
  assert.equal(NPC_TEMPLATES.boss.initiative.mode, "roll");
  assert.equal(NPC_TEMPLATES.minion.vitality, 2);
  assert.equal(NPC_TEMPLATES.henchman.initiative.value, 7);
  assert.equal(NPC_TEMPLATES.extra.specialty, 65);
});

test("les modèles du livre ne déclenchent aucun avertissement", () => {
  for (const rank of NPC_RANKS) assert.deepEqual(codes(draftFromTemplate(rank)), [], rank);
});

test("brouillon indépendant du modèle", () => {
  const d = draftFromTemplate("boss");
  d.attacks[0].value = 10;
  d.skills.push({ name: "x", value: 1, kind: "flavor" });
  assert.equal(NPC_TEMPLATES.boss.attacks[0].value, 75);
  assert.equal(NPC_TEMPLATES.boss.skills.length, 7);
});

test("descripteurs : texte ⇄ liste, lus par le combat (inverser, contre-attaque)", () => {
  const list = parseNpcDescriptors("chef, inverser (4), contre-attaque, attaques multiples (3)");
  assert.deepEqual(list.map(d => d.key), ["chef", "inverser (4)", "contre-attaque", "attaques multiples (3)"]);
  assert.equal(npcReverses(list), 4);
  assert.ok(npcCanCounter({ descriptors: list, attacks: [] }));
  assert.deepEqual(parseNpcDescriptors("volant (2, rapide); bête").map(d => d.key), ["volant (2, rapide)", "bête"]);
  assert.equal(formatNpcDescriptors([{ key: "inverser", value: "2" }, { key: "sbire" }]), "inverser (2), sbire");
  assert.deepEqual(parseNpcDescriptors(""), []);
});

test("repères du livre en avertissements", () => {
  const d = draftFromTemplate("henchman");
  Object.assign(d, { baseSkill: 55, defense: 45, vitality: 3, initiative: { mode: "roll", value: 7 } });
  d.specialty.value = 85;
  assert.deepEqual(codes(d).slice(0, 6), ["base", "specialty", "defenseRank", "vitality", "initiativeRoll", "important"]);
  const l = draftFromTemplate("lieutenant");
  l.defense = null;
  l.descriptors = "inverser (2)";
  assert.deepEqual(codes(l), ["defenseMissing", "rankDescriptor"]);
  const m = draftFromTemplate("minion");
  m.descriptors = "sbire, inverser (1), chef";
  m.attacks = [];
  assert.deepEqual(codes(m), ["otherRankDescriptor", "reverseRank", "noAttack"]);
  const b = draftFromTemplate("boss");
  b.defense = 65;
  assert.deepEqual(codes(b), [], "défense élevée tolérée pour un chef (écart 20)");
  const l2 = draftFromTemplate("lieutenant");
  l2.defense = 75;
  assert.deepEqual(codes(l2), ["defenseCap", "defenseGap"]);
});

test("changement de rang : le descripteur de rang est remplacé, les autres gardés", () => {
  assert.equal(swapRankDescriptor("sous-fifre, bête", "boss"), "chef, bête");
  assert.equal(swapRankDescriptor("chef, inverser (4)", "extra"), "inverser (4)");
});
