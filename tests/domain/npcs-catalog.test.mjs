import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NPC_RANKS } from "../../src/domain/rules/npc.mjs";
import { npcReverses, npcCanCounter } from "../../src/domain/combat/attack.mjs";
import { parseWeaponDescriptors } from "../../src/domain/combat/weapon.mjs";

const npcs = JSON.parse(readFileSync(new URL("../../data/catalogs/npcs.json", import.meta.url)));
const byName = n => npcs.find(e => e.data.name === n).data.system;

test("fichier des menaces : 51 personnages secondaires du livre, données valides", () => {
  assert.equal(npcs.length, 51);
  for (const e of npcs) {
    const s = e.data.system;
    assert.equal(e.data.type, "npc", e.seedKey);
    assert.ok(NPC_RANKS.includes(s.rank), e.seedKey);
    assert.ok(s.vitality.max > 0 && s.vitality.value === s.vitality.max, e.seedKey);
    assert.ok(["fixed", "roll"].includes(s.initiative.mode), e.seedKey);
    assert.ok(s.attacks.length > 0, e.seedKey);
    for (const a of s.attacks) {
      assert.ok(["melee", "shooting"].includes(a.skill), `${e.seedKey} ${a.name}`);
      assert.ok(a.damage >= 0 && a.damage <= 20 && a.value > 0 && a.value <= 106, `${e.seedKey} ${a.name}`);
      parseWeaponDescriptors(a.descriptors);
    }
    assert.ok(s.baseSkill >= 15 && s.specialty.value >= s.baseSkill, e.seedKey);
    assert.ok(e.folder, e.seedKey);
    assert.match(s.description, /LdB p\. \d+/, e.seedKey);
  }
});

test("fichier des menaces : valeurs du livre sur quelques fiches", () => {
  const chef = byName("Chef générique");
  assert.equal(chef.rank, "boss"); assert.equal(chef.vitality.max, 8); assert.equal(chef.initiative.mode, "roll");
  assert.equal(npcReverses(chef.descriptors), 4); assert.ok(npcCanCounter(chef));
  assert.equal(chef.attacks[0].name, "Katana"); assert.equal(chef.attacks[0].uses, 2); assert.equal(chef.attacks[0].damage, 5);
  const policier = byName("Policier municipal");
  assert.equal(policier.rank, "henchman"); assert.equal(policier.defense, null); assert.equal(policier.attacks[1].skill, "shooting");
  const hippo = byName("Hippopotame");
  assert.equal(hippo.protection, 2); assert.equal(hippo.vitality.max, 12);
  const santos = byName("Santos");
  assert.equal(santos.attacks[0].value, 95); assert.ok(santos.description.includes("sniper"));
  assert.ok(!santos.skills.some(k => /BÊTES/.test(k.name)));
});
