import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { signatureLimit, signatureStatus, checkPrerequisites, kitsToReturn, useJuryRigged, juryRiggedUses, parseGadgetDescriptor,
  gadgetTriggers, gadgetGlobalPips, gadgetTokens, gadgetBalance, gadgetBuilt, GADGET_SKILLS, KIT_CATEGORIES } from "../../src/domain/rules/equipment.mjs";
import { parseWeaponDescriptors } from "../../src/domain/combat/weapon.mjs";
import { SKILL_KEYS } from "../../src/domain/rules/skills.mjs";

const kits = JSON.parse(readFileSync(new URL("../../data/catalogs/kits.json", import.meta.url)));
const byName = n => kits.find(k => k.data.name === n)?.data.system;

test("catalogue des kits : 95 kits, coûts, catégories, armes lues par le moteur de combat", () => {
  assert.equal(kits.length, 95);
  assert.equal(new Set(kits.map(k => k.seedKey)).size, 95);
  for (const k of kits) assert.ok(KIT_CATEGORIES.includes(k.data.system.category), k.seedKey);
  const pistol = byName("Arme de poing");
  assert.deepEqual([pistol.storyPointCost, pistol.weapon.damage, pistol.weapon.ammo], [1, 5, "9-0"]);
  assert.ok(parseWeaponDescriptors(pistol.weapon.descriptors, { ammo: pistol.weapon.ammo }).noisy);
  const ninja = byName("Tenue de ninja");
  assert.equal(ninja.extraWeapons.length, 2);
  assert.ok(parseWeaponDescriptors(ninja.extraWeapons[1].descriptors).thrown);
  assert.ok(parseWeaponDescriptors(byName("Rayon disneural").weapon.descriptors).paralyzing);
  assert.ok(parseWeaponDescriptors(byName("Lance-filet").weapon.descriptors).snare);
  assert.equal(byName("Avion de chasse").prerequisites, "Pilote de chasse");
  assert.equal(byName("Motoneige").descriptors[0].pips, 5);
  assert.deepEqual(byName("Liasse de billets").descriptors.map(d => d.pips), [2, 2]);
  assert.equal(byName("Octopode").category, "superScience");
  assert.equal(byName("Lunettes de vision nocturne").category, "spyTech");
});

test("gadgets signature : un, deux avec Gadget supplémentaire ; description obligatoire", () => {
  assert.equal(signatureLimit([]), 1);
  assert.equal(signatureLimit(["Gadget supplémentaire"]), 2);
  const s = signatureStatus([{ name: "Lancia", signature: true, signatureDescription: "Jaune, n° 14" }, { name: "Vespa", signature: true, signatureDescription: "" }], []);
  assert.deepEqual(s, { count: 2, max: 1, over: true, missingDescription: ["Vespa"] });
});

test("prérequis indicatifs, kits rendus, kits bricolés", () => {
  assert.deepEqual(checkPrerequisites("Pilote", { abilityNames: ["Pilote"] }), { ok: true, missing: [] });
  assert.deepEqual(checkPrerequisites("Vieille fortune ou Nouveau riche", { abilityNames: ["Nouveau riche"] }), { ok: true, missing: [] });
  assert.deepEqual(checkPrerequisites("Pilote de chasse", { abilityNames: ["Pilote"] }), { ok: false, missing: ["Pilote de chasse"] });
  assert.ok(checkPrerequisites("", {}).ok);
  assert.deepEqual(kitsToReturn([{ origin: "purchased" }, { origin: "owned" }, { origin: "mission" }, { origin: "found" }]).map(k => k.origin), ["purchased", "mission"]);
  assert.deepEqual(useJuryRigged(2), { uses: 1, broken: false });
  assert.deepEqual(useJuryRigged(1), { uses: 0, broken: true });
  assert.equal(juryRiggedUses("excellent"), 2);
  assert.equal(juryRiggedUses("good"), 1);
});

test("descripteurs de gadget et déclenchement sur les unités", () => {
  assert.deepEqual(parseGadgetDescriptor("Peu fiable (9-0)"), { type: "unreliable", range: "9-0" });
  assert.deepEqual(parseGadgetDescriptor("Dangereux (9-0, 4dX)"), { type: "dangerous", range: "9-0", dice: 4 });
  assert.deepEqual(parseGadgetDescriptor("Très dangereux"), { type: "veryDangerous", range: "0", dice: 8 });
  assert.equal(parseGadgetDescriptor("Fatigant").type, "tiring");
  assert.equal(parseGadgetDescriptor("Volant"), null);
  const d = [{ key: "Peu fiable (9-0)" }, { key: "Dangereux (8-0, 3dX)" }, { key: "Fatigant" }, { key: "Illégal" }];
  assert.deepEqual(gadgetTriggers(d, 9).map(e => e.type), ["unreliable", "dangerous", "tiring"]);
  assert.deepEqual(gadgetTriggers(d, 3).map(e => e.type), ["tiring"]);
  assert.deepEqual(gadgetTriggers(d, 8).map(e => e.type), ["dangerous", "tiring"]);
});

test("fabrication : exemple de la Vespa volante (LdB p. 111)", () => {
  for (const k of GADGET_SKILLS) assert.ok(SKILL_KEYS.includes(k));
  assert.equal(gadgetGlobalPips("superScience"), -5);
  assert.equal(gadgetGlobalPips("spyTech"), -2);
  assert.equal(gadgetGlobalPips("standard"), 0);
  // 3 descripteurs positifs, modification d'un kit (+2), un seul jet par intersession sur les 5 tâches (+2 chacune)
  const tokens = gadgetTokens({ positive: 3, modification: true, extraTime: 5 });
  assert.deepEqual(tokens, [-2, -2, -2, 2, 2, 2, 2, 2, 2]);
  // Électronique −5 (annulé ensuite par la trousse à outils), Science −3, Fouille −5, Ingénierie −1, Ressources −5
  assert.deepEqual(gadgetBalance([-5, -3, -5, -1, -5], { category: "superScience", tokens }), { ok: true, expected: -19, actual: -19 });
  assert.ok(!gadgetBalance([-3, -3, -5, -1, -5], { category: "superScience", tokens }).ok);
  assert.ok(gadgetBuilt("limited") && !gadgetBuilt("bad"));
});

test("descripteurs saisis en texte", async () => {
  const { parseKitDescriptors } = await import("../../src/domain/rules/equipment.mjs");
  assert.deepEqual(parseKitDescriptors("Volant, Bonne impression : +2 pips, Dangereux (9-0, 4dX)").map(d => [d.key, d.pips]),
    [["Volant", 0], ["Bonne impression", 2], ["Dangereux (9-0, 4dX)", 0]]);
  assert.deepEqual(parseKitDescriptors("Vision périphérique : −2 pips").map(d => d.pips), [-2]);
  assert.deepEqual(parseKitDescriptors(""), []);
});
