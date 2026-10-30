import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const load = f => JSON.parse(readFileSync(new URL(`../../data/catalogs/${f}`, import.meta.url)));

test("tables aléatoires : 11 nationalités × 3, traits, idées, lieux, jurons ; plages continues", () => {
  const tables = load("tables.json");
  assert.equal(tables.length, 37);
  for (const t of tables) {
    const r = t.data.results;
    const max = Number(t.data.formula.match(/1d(\d+)/)[1]);
    assert.equal(r[0].range[0], 1, t.seedKey);
    assert.equal(r.at(-1).range[1], max, t.seedKey);
    r.forEach((x, i) => { if (i) assert.equal(x.range[0], r[i - 1].range[1] + 1, `${t.seedKey} ${i}`); assert.ok(x.name, t.seedKey); });
    assert.ok(t.folder, t.seedKey);
  }
  const traits = tables.find(t => t.seedKey === "table.traits-personnalite");
  assert.equal(traits.data.results.length, 100);
  assert.equal(traits.data.results[0].name, "Aimable");
  const fr = tables.find(t => t.seedKey === "table.noms-francais-famille");
  assert.equal(fr.data.results.length, 48);
});

test("journaux d'aide : six journaux, pages HTML dans la charte", () => {
  const j = load("journals.json");
  assert.deepEqual(j.map(e => e.seedKey), ["journal.a-propos", "journal.aide-memoire", "journal.session-pilote", "journal.feuille-indices", "journal.calendrier-1965", "journal.jurons"]);
  for (const e of j) for (const p of e.data.pages) { assert.equal(p.type, "text"); assert.ok(p.text.content.startsWith('<div class="tts-journal">')); }
  const cal = j.find(e => e.seedKey === "journal.calendrier-1965").data.pages[0].text.content;
  assert.ok(cal.includes("Juillet 1965") && cal.includes("14 : Fête nationale") && cal.includes("18 : Pâques"));
  assert.ok(!/<script/i.test(JSON.stringify(j)));
});
