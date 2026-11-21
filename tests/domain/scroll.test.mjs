import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

// Fenêtres ouvertes par les macros (0.11.7) : classe CSS de la fenêtre, fichier de l'application, gabarit.
const WINDOWS = [
  ["tts-hazards", "src/apps/hazards-app.mjs", "hazards"],
  ["tts-challenge-app", "src/apps/challenge-app.mjs", "challenge"],
  ["tts-duel-app", "src/apps/challenge-app.mjs", "duel"],
  ["tts-npcgen", "src/apps/npc-gen-app.mjs", "npc-gen"],
  ["tts-chargen", "src/apps/chargen-app.mjs", "chargen"],
  ["tts-chargen-wizard", "src/apps/character-wizard-app.mjs", "character-wizard"],
  ["tts-story-points", "src/apps/story-points-app.mjs", "story-points"],
  ["tts-debrief", "src/apps/debrief-app.mjs", "debrief"],
  ["tts-progression", "src/apps/progression-app.mjs", "progression"]
];

test("fenêtres des macros : ascenseur vertical et position de défilement gardée", () => {
  const css = read("styles/tts-charte.css");
  const rule = css.slice(css.indexOf("Ascenseur vertical des fenêtres d'outils"));
  assert.match(rule, /max-height: calc\(100vh - 16px\)/);
  assert.match(rule, /\[data-application-part\] \{[^}]*overflow-y: auto/);
  for (const [cls, file, tpl] of WINDOWS) {
    const src = read(file);
    assert.ok(src.includes(`"${cls}"`), `${cls} déclarée dans ${file}`);
    assert.ok(rule.includes(`.${cls}`), `${cls} couverte par la règle de défilement`);
    assert.ok(src.includes(`templates/apps/${tpl}.hbs\`, scrollable: [""]`), `${tpl} : partie défilante mémorisée`);
  }
});
