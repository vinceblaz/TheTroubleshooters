/**
 * Création de personnages secondaires (LdB p. 205-209) — logique pure.
 *  - modèles génériques par rang (spécialiste ultra-générique, sbire, sous-fifre, lieutenant, chef) ;
 *  - repères du livre transformés en avertissements : le Chef des Opérations reste seul juge (règle d'or).
 */
import { NPC_RANKS } from "./npc.mjs";

const shot = "shooting", melee = "melee";
const atk = (name, value, damage, skill, descriptors = "", extra = {}) => ({ name, value, damage, skill, descriptors, uses: 1, counter: false, ...extra });
const sk = (name, value, kind = "important") => ({ name, value, kind });

/** Modèles génériques (LdB p. 207-209). Les valeurs sont celles des exemples du livre. */
export const NPC_TEMPLATES = Object.freeze({
  extra: {
    source: "LdB p. 207", baseSkill: 35, specialty: 65, defense: null, protection: 0, vitality: 4,
    initiative: { mode: "fixed", value: 5 }, descriptors: [],
    attacks: [atk("Attaque générique", 65, 4, melee)], skills: []
  },
  minion: {
    source: "LdB p. 209", baseSkill: 35, specialty: 45, defense: null, protection: 0, vitality: 2,
    initiative: { mode: "fixed", value: 5 }, descriptors: ["sbire"],
    attacks: [atk("Coup de poing générique", 45, 2, melee), atk("Flingue générique", 45, 4, shot, "bruyant, munitions (9-0), portée courte (2)")],
    skills: [sk("Attaque en groupe", 55, "flavor"), sk("Fonction unique", 65, "flavor")]
  },
  henchman: {
    source: "LdB p. 209", baseSkill: 35, specialty: 55, defense: null, protection: 0, vitality: 5,
    initiative: { mode: "fixed", value: 7 }, descriptors: ["sous-fifre"],
    attacks: [atk("Crochet du gauche", 55, 2, melee), atk("Pistolet Beretta 9 mm", 55, 5, shot, "bruyant, munitions (9-0), portée courte (3)"),
      atk("Pistolet-mitrailleur HK MP5 9 mm", 45, 5, shot, "bruyant, munitions (9-0)")],
    skills: [sk("Agilité", 45), sk("Force", 55), sk("Obéir aux ordres", 55, "flavor")]
  },
  lieutenant: {
    source: "LdB p. 208", baseSkill: 45, specialty: 65, defense: 35, protection: 0, vitality: 5,
    initiative: { mode: "fixed", value: 7 }, descriptors: ["lieutenant", "inverser (2)", "attaques multiples (2)"],
    attacks: [atk("Poignard affûté", 65, 4, melee, "précis"), atk("Pistolet .357 Magnum Desert Eagle", 65, 6, shot, "bruyant, munitions (8-0), portée courte (3)"),
      atk("Fusil d'assaut FAMAS", 55, 6, shot, "bruyant, munitions (9-0)")],
    skills: [sk("Agilité", 65), sk("Furtivité", 65), sk("Pilotage", 75), sk("Vigilance", 65),
      sk("Prendre une balle à la place du chef", 55, "flavor"), sk("Voler le cœur du héros", 55, "flavor")]
  },
  boss: {
    source: "LdB p. 208", baseSkill: 45, specialty: 75, defense: 45, protection: 0, vitality: 8,
    initiative: { mode: "roll", value: 7 }, descriptors: ["chef", "inverser (4)", "contre-attaque", "attaques multiples (3)"],
    attacks: [atk("Katana", 75, 5, melee, "contre", { uses: 2, counter: true }),
      atk("Pistolet .357 Magnum Desert Eagle", 65, 6, shot, "bruyant, munitions (8-0), portée courte (3)"),
      atk("Mitraillette Uzi 9 mm", 65, 5, shot, "bruyant, munitions (9-0)")],
    skills: [sk("Endurance", 65), sk("Force", 65), sk("Intimidation", 65), sk("Pilotage", 75), sk("Vigilance", 65),
      sk("Aboyer des ordres", 85, "flavor"), sk("Se vanter de sa domination du monde", 85, "flavor")]
  }
});

/** Descripteur porté par chaque rang combattant (LdB p. 206). */
export const RANK_DESCRIPTOR = Object.freeze({ extra: "", minion: "sbire", henchman: "sous-fifre", lieutenant: "lieutenant", boss: "chef" });

/** Repères du livre (p. 205-209). vitality : minimum conseillé ; initiative : valeur fixe d'environ. */
export const NPC_GUIDES = Object.freeze({
  base: [25, 45],
  specialty: [55, 75],
  minionSpecialty: [35, 55], // les sbires, « type particulier de figurant », restent plus bas (sbire générique : 45)
  importantSpread: 10,      // compétences importantes ≈ spécialité à 10 % près
  attackSpread: 10,         // attaques dans la plage de la spécialité
  defenseAboveBase: 20,     // « un peu plus élevée que la base, peut-être de 10 ou 20 % » (le lieutenant générique est sous sa base)
  defenseCap: 50,           // sauf les chefs les plus puissants
  vitality: { extra: null, minion: 2, henchman: 5, lieutenant: 5, boss: 7 },
  initiative: { minion: 5, henchman: 7 }
});

/** Brouillon complet à partir du modèle d'un rang (copie indépendante). */
export function draftFromTemplate(rank = "henchman") {
  const t = NPC_TEMPLATES[rank] ?? NPC_TEMPLATES.henchman;
  return {
    rank: NPC_RANKS.includes(rank) ? rank : "henchman",
    baseSkill: t.baseSkill, specialty: { value: t.specialty, domain: "" },
    defense: t.defense, protection: t.protection, vitality: t.vitality,
    initiative: { ...t.initiative },
    descriptors: formatNpcDescriptors(t.descriptors.map(key => ({ key }))),
    attacks: t.attacks.map(a => ({ ...a })), skills: t.skills.map(s => ({ ...s }))
  };
}

/** « chef, inverser (4), contre-attaque » → [{key}] (les virgules entre parenthèses sont conservées). */
export function parseNpcDescriptors(text = "") {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of String(text ?? "")) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === ";") && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.map(key => ({ key, pips: 0, situation: "", value: "" }));
}

/** [{key, value?}] → texte éditable. */
export function formatNpcDescriptors(list = []) {
  return (list ?? []).map(d => (d.value && !String(d.key).includes("(") ? `${d.key} (${d.value})` : d.key)).filter(Boolean).join(", ");
}

const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * Contrôle indicatif d'un brouillon de PNJ : uniquement des avertissements (codes stables, paramètres).
 * @returns {Array<{code:string, data?:object}>}
 */
export function checkNpc(d) {
  const w = [];
  const G = NPC_GUIDES;
  const out = (v, [lo, hi]) => Number.isFinite(v) && (v < lo || v > hi);
  if (out(d.baseSkill, G.base)) w.push({ code: "base", data: { min: G.base[0], max: G.base[1] } });
  const spe = d.specialty?.value;
  const speRange = d.rank === "minion" ? G.minionSpecialty : G.specialty;
  if (out(spe, speRange)) w.push({ code: "specialty", data: { min: speRange[0], max: speRange[1] } });
  const hasDefense = d.defense !== null && d.defense !== "" && Number.isFinite(Number(d.defense));
  if (hasDefense) {
    const def = Number(d.defense);
    if (d.rank === "minion" || d.rank === "henchman") w.push({ code: "defenseRank" });
    if (def > G.defenseCap && d.rank !== "boss") w.push({ code: "defenseCap", data: { max: G.defenseCap } });
    const gap = def - d.baseSkill;
    if (gap > G.defenseAboveBase) w.push({ code: "defenseGap", data: { max: G.defenseAboveBase } });
  } else if (d.rank === "lieutenant" || d.rank === "boss") w.push({ code: "defenseMissing" });
  const minVit = G.vitality[d.rank];
  if (minVit && d.vitality < minVit) w.push({ code: "vitality", data: { min: minVit } });
  if ((d.rank === "minion" || d.rank === "henchman") && d.initiative?.mode === "roll") w.push({ code: "initiativeRoll", data: { value: G.initiative[d.rank] } });
  for (const s of d.skills ?? []) {
    if (s.kind === "important" && Number.isFinite(spe) && Math.abs(s.value - spe) > G.importantSpread) w.push({ code: "important", data: { name: s.name } });
  }
  for (const a of d.attacks ?? []) {
    if (Number.isFinite(spe) && Math.abs(a.value - spe) > G.attackSpread) w.push({ code: "attack", data: { name: a.name } });
  }
  const keys = parseNpcDescriptors(d.descriptors).map(x => norm(x.key));
  const rankKey = RANK_DESCRIPTOR[d.rank];
  if (rankKey && !keys.some(k => k === rankKey)) w.push({ code: "rankDescriptor", data: { key: rankKey } });
  const others = Object.entries(RANK_DESCRIPTOR).filter(([r, k]) => k && r !== d.rank).map(([, k]) => k);
  if (keys.some(k => others.includes(k))) w.push({ code: "otherRankDescriptor" });
  if ((d.rank === "minion" || d.rank === "henchman" || d.rank === "extra") && keys.some(k => k.startsWith("inverser"))) w.push({ code: "reverseRank" });
  if (!(d.attacks ?? []).length && d.rank !== "extra") w.push({ code: "noAttack" });
  return w;
}

/** Remplace le descripteur de rang dans le texte quand le rang change (les autres descripteurs sont gardés). */
export function swapRankDescriptor(text, rank) {
  const rankKeys = Object.values(RANK_DESCRIPTOR).filter(Boolean);
  const kept = parseNpcDescriptors(text).filter(x => !rankKeys.includes(norm(x.key)));
  const key = RANK_DESCRIPTOR[rank];
  return formatNpcDescriptors([...(key ? [{ key }] : []), ...kept]);
}
