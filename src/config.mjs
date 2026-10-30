/**
 * CONFIG.THETROUBLESHOOTERS — constantes du système exposées à Foundry.
 * Les listes « métier » viennent de src/domain (source unique, testée) ;
 * ce fichier n'ajoute que les clés de libellés i18n et les icônes.
 */
import { SKILLS, SKILL_FAMILIES } from "./domain/rules/skills.mjs";
import { NPC_RANKS } from "./domain/rules/npc.mjs";

export const SYSTEM_ID = "thetroubleshooters";
export const SYSTEM_PATH = `systems/${SYSTEM_ID}`;

const ucFirst = s => s.charAt(0).toUpperCase() + s.slice(1);

export const THETROUBLESHOOTERS = {
  /** 28 compétences : clé → { family, label } */
  skills: Object.fromEntries(SKILLS.map(s => [s.key, { family: s.family, label: `TTS.Skill.${ucFirst(s.key)}` }])),

  /** Familles de compétences : clé → libellé */
  skillFamilies: Object.fromEntries(SKILL_FAMILIES.map(f => [f, `TTS.SkillFamily.${ucFirst(f)}`])),

  /** Rangs de PNJ : clé → libellé */
  npcRanks: Object.fromEntries(NPC_RANKS.map(r => [r, `TTS.NpcRank.${ucFirst(r)}`])),

  /** Catégories de kits (LdB p. 112) */
  kitCategories: {
    standard: "TTS.KitCategory.Standard",
    spyTech: "TTS.KitCategory.SpyTech",
    superScience: "TTS.KitCategory.SuperScience",
    ancientLore: "TTS.KitCategory.AncientLore",
    lostLore: "TTS.KitCategory.LostLore"
  },

  /** Origine d'un kit (LdB p. 110-113) */
  kitOrigins: {
    owned: "TTS.KitOrigin.Owned",
    mission: "TTS.KitOrigin.Mission",
    purchased: "TTS.KitOrigin.Purchased",
    juryRigged: "TTS.KitOrigin.JuryRigged",
    found: "TTS.KitOrigin.Found"
  },

  /** Modes de déclenchement d'un désavantage (bible chap. 9) */
  flawTriggerModes: {
    penalty: "TTS.FlawMode.Penalty",
    fail: "TTS.FlawMode.Fail",
    condition: "TTS.FlawMode.Condition",
    absent: "TTS.FlawMode.Absent",
    free: "TTS.FlawMode.Free"
  },

  /** Modes d'initiative d'un PNJ */
  initiativeModes: {
    fixed: "TTS.Initiative.Fixed",
    roll: "TTS.Initiative.Roll"
  },

  /**
   * Les 16 conditions (LdB p. 100-101). Effets mécaniques : phase 5.
   * Icônes : tampons originaux fournis avec le système (charte phase 10, assets/icons/conditions).
   */
  conditions: {
    blinded:       { label: "TTS.Condition.Blinded",       img: "systems/thetroubleshooters/assets/icons/conditions/blinded.svg" },
    wounded:       { label: "TTS.Condition.Wounded",       img: "systems/thetroubleshooters/assets/icons/conditions/wounded.svg" },
    mortalDanger:  { label: "TTS.Condition.MortalDanger",  img: "systems/thetroubleshooters/assets/icons/conditions/mortalDanger.svg" },
    frightened:    { label: "TTS.Condition.Frightened",    img: "systems/thetroubleshooters/assets/icons/conditions/frightened.svg" },
    onFire:        { label: "TTS.Condition.OnFire",        img: "systems/thetroubleshooters/assets/icons/conditions/onFire.svg" },
    exhausted:     { label: "TTS.Condition.Exhausted",     img: "systems/thetroubleshooters/assets/icons/conditions/exhausted.svg" },
    outOfAction:   { label: "TTS.Condition.OutOfAction",   img: "systems/thetroubleshooters/assets/icons/conditions/outOfAction.svg" },
    paralyzed:     { label: "TTS.Condition.Paralyzed",     img: "systems/thetroubleshooters/assets/icons/conditions/paralyzed.svg" },
    restrained:    { label: "TTS.Condition.Restrained",    img: "systems/thetroubleshooters/assets/icons/conditions/restrained.svg" },
    drunk:         { label: "TTS.Condition.Drunk",         img: "systems/thetroubleshooters/assets/icons/conditions/drunk.svg" },
    stunned:       { label: "TTS.Condition.Stunned",       img: "systems/thetroubleshooters/assets/icons/conditions/stunned.svg" },
    deafened:      { label: "TTS.Condition.Deafened",      img: "systems/thetroubleshooters/assets/icons/conditions/deafened.svg" },
    encumbered:    { label: "TTS.Condition.Encumbered",    img: "systems/thetroubleshooters/assets/icons/conditions/encumbered.svg" },
    surprised:     { label: "TTS.Condition.Surprised",     img: "systems/thetroubleshooters/assets/icons/conditions/surprised.svg" },
    terrified:     { label: "TTS.Condition.Terrified",     img: "systems/thetroubleshooters/assets/icons/conditions/terrified.svg" },
    vulnerable:    { label: "TTS.Condition.Vulnerable",    img: "systems/thetroubleshooters/assets/icons/conditions/vulnerable.svg" }
  }
};

/** Liste d'options {value, label} localisées pour un select ou un multi-select. */
export function localizedOptions(record) {
  return Object.entries(record).map(([value, label]) => ({
    value,
    label: game.i18n.localize(typeof label === "string" ? label : label.label)
  }));
}
