import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { skillsFromArchetype, skillsFromList, checkDistribution, customizeSkills, derivedFromSkills, startingLanguages,
  checkTraits, checkKits, hookConflicts } from "../../src/domain/rules/chargen.mjs";
import { DESIGN_IDEAS, MEETING_PLACES, tableEntry } from "../../src/domain/rules/chargen-tables.mjs";
import { SKILL_KEYS } from "../../src/domain/rules/skills.mjs";

const archetypes = JSON.parse(readFileSync(new URL("../../data/catalogs/archetypes.json", import.meta.url)));
const etudiant = archetypes.find(a => a.data.name === "Étudiant enthousiaste").data.system;

test("15 archétypes : 1 + 4 + 6 compétences connues, 5 capacités (4 pour le journaliste), 3 désavantages, 3 kits", () => {
  assert.equal(archetypes.length, 15);
  for (const a of archetypes) {
    const s = a.data.system;
    assert.ok(SKILL_KEYS.includes(s.skills.primary), a.seedKey);
    assert.equal(s.skills.secondary.length, 4, a.seedKey);
    assert.equal(s.skills.tertiary.length, 6, a.seedKey);
    for (const k of [...s.skills.secondary, ...s.skills.tertiary]) assert.ok(SKILL_KEYS.includes(k), `${a.seedKey} ${k}`);
    assert.ok(s.abilities.length === 5 || a.data.name === "Journaliste d’investigation", a.seedKey);
    assert.equal(s.flaws.length, 3, a.seedKey);
    assert.equal(s.kits.length, 3, a.seedKey);
    assert.ok(checkDistribution(skillsFromArchetype(s.skills)), a.seedKey);
  }
});

test("Vitalité de l'archétype = Vitalité dérivée des compétences (sauf coquille du livre)", () => {
  for (const a of archetypes) {
    const s = a.data.system;
    const derived = derivedFromSkills(skillsFromArchetype(s.skills));
    // Millionnaire cosmopolite : le livre indique 4 mais Tir 45 donne 5 (LdB p. 34) — la valeur dérivée s'applique.
    if (a.data.name === "Millionnaire cosmopolite") assert.deepEqual([s.vitality, derived.vitality], [4, 5]);
    else assert.equal(derived.vitality, s.vitality, a.data.name);
    assert.equal(derived.extraLanguages, s.extraLanguages, a.data.name);
  }
});

test("Éloïse pas à pas (LdB p. 32-34)", () => {
  const base = skillsFromArchetype(etudiant.skills);
  assert.equal(base.investigation, 75);
  assert.deepEqual(["engineering", "electronics", "humanities", "search"].map(k => base[k]), [65, 65, 65, 65]);
  const r = customizeSkills(base, {
    transfers: [{ from: "humanities", to: "science" }, { from: "humanities", to: "science" }],
    replacements: [{ from: "humanities", to: "security" }],
    swaps: [{ a: "medicine", b: "engineering" }]
  });
  assert.ok(r.ok, r.errors.join());
  const s = r.skills;
  assert.equal(s.investigation, 75);
  assert.deepEqual(["electronics", "science", "medicine", "search"].map(k => s[k]), [65, 65, 65, 65]);
  assert.deepEqual(["contacts", "languages", "engineering", "melee", "security", "willpower"].map(k => s[k]), [45, 45, 45, 45, 45, 45]);
  assert.equal(s.humanities, 15);
  assert.equal(derivedFromSkills(s).vitality, 5);
  assert.equal(derivedFromSkills(s).extraLanguages, 1);
});

test("personnalisation : plafond 85, trois transferts, remplacement invalide", () => {
  const base = skillsFromArchetype(etudiant.skills);
  assert.deepEqual(customizeSkills(base, { transfers: [{ from: "melee", to: "investigation" }, { from: "melee", to: "investigation" }] }).errors, ["over-cap"]);
  assert.ok(customizeSkills(base, { transfers: [{ from: "melee", to: "investigation" }] }).ok);   // 85 permis
  assert.ok(customizeSkills(base, { transfers: Array(3).fill({ from: "melee", to: "agility" }) }).errors.includes("too-many-transfers"));
  assert.ok(customizeSkills(base, { replacements: [{ from: "agility", to: "status" }] }).errors.includes("bad-replacement"));   // 15 → rien à déplacer
  assert.ok(customizeSkills(base, { replacements: [{ from: "melee", to: "search" }] }).errors.includes("bad-replacement"));    // déjà dans la liste
  const atyp = skillsFromList(["shooting", "vigilance", "deception", "driving", "endurance", "agility", "melee", "bureaucracy", "strength", "investigation", "charm"]);
  assert.ok(checkDistribution(atyp));
  assert.equal(derivedFromSkills(atyp).vitality, 6);   // exemple de l'officier suédois (LdB p. 39)
});

test("langues de départ", () => {
  assert.deepEqual(startingLanguages({ origin: "french", extra: ["Allemand"] }), [
    { name: "Français", native: true }, { name: "Anglais", native: false }, { name: "Allemand", native: false }]);
  assert.deepEqual(startingLanguages({ origin: "other", native: "Suédois" }).map(l => [l.name, l.native]),
    [["Français", false], ["Anglais", false], ["Suédois", true]]);
});

test("capacités, désavantages, kits, accroches", () => {
  const ok = checkTraits({ abilities: [{ name: "Génie", level: 1, inList: true, prereqOk: false }, { name: "Jeune", level: 0, inList: true }], flaws: [{ name: "Mineur", inList: true }] });
  assert.ok(ok.ok && !ok.warnings.length);
  const third = checkTraits({ abilities: [{ name: "Génie", level: 1, inList: true }, { name: "Jeune", level: 0, inList: true }, { name: "Inventeur fou", level: 1, inList: false }],
    flaws: [{ name: "Mineur", inList: true }] });
  assert.deepEqual(third.errors, ["third-ability-needs-flaw"]);
  const lvl2 = checkTraits({ abilities: [{ name: "Pilote de chasse", level: 2, inList: false, prereqOk: false }, { name: "Pilote", level: 0, inList: true }], flaws: [{ name: "Patriote" }] });
  assert.ok(lvl2.ok && lvl2.warnings.includes("prereq:Pilote de chasse"));
  const kits = checkKits({ archetypeKits: etudiant.kits, picks: ["Outils d’électronique", "Bicyclette", "Laboratoire de chimiste"], free: ["Talkie-walkie", "Équipement de ski"], signature: "Outils d’électronique" });
  assert.ok(kits.ok);
  assert.equal(kits.kits.length, 5);
  assert.ok(!checkKits({ archetypeKits: ["Appareil photo | Caméra"], picks: ["Scooter"] }).ok);
  assert.deepEqual(hookConflicts(["Dette", "Exilé"], ["Exilé", "Agent secret"]), ["Exilé"]);
});

test("tables : idées de conception et lieux de rencontre (exemples du livre)", () => {
  assert.equal(DESIGN_IDEAS.length, 100);
  assert.equal(MEETING_PLACES.length, 100);
  assert.equal(tableEntry(DESIGN_IDEAS, 30), "Chevelure rebelle");
  assert.equal(tableEntry(DESIGN_IDEAS, 63), "Moustache broussailleuse");
  assert.equal(tableEntry(MEETING_PLACES, 44), "Lillehammer, Norvège");
  assert.equal(tableEntry(MEETING_PLACES, 96), "Venise, Italie");
  assert.equal(tableEntry(MEETING_PLACES, 99), "Zell am See, Autriche");
  assert.equal(tableEntry(MEETING_PLACES, 100), "Zürich, Suisse");
});
