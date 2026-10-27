/**
 * Personnages secondaires — logique pure.
 * Source : LdB p. 95 (tableau Blessé / Danger de mort), p. 206-209 (rangs).
 */

/** Rangs, du plus faible au plus fort. "extra" = figurant sans rang combattant. */
export const NPC_RANKS = Object.freeze(["extra", "minion", "henchman", "lieutenant", "boss"]);

const CAPABILITIES = Object.freeze({
  extra:      { canTakeWounded: false, canTakeMortalDanger: false, goodKarmaKnocksOut: false, hasDefenseByDefault: false },
  minion:     { canTakeWounded: false, canTakeMortalDanger: false, goodKarmaKnocksOut: true,  hasDefenseByDefault: false },
  henchman:   { canTakeWounded: false, canTakeMortalDanger: false, goodKarmaKnocksOut: true,  hasDefenseByDefault: false },
  lieutenant: { canTakeWounded: true,  canTakeMortalDanger: false, goodKarmaKnocksOut: false, hasDefenseByDefault: true  },
  boss:       { canTakeWounded: true,  canTakeMortalDanger: true,  goodKarmaKnocksOut: false, hasDefenseByDefault: true  }
});

/** Ce qu'autorise un rang (personnage joueur : canTakeWounded et canTakeMortalDanger). */
export function rankCapabilities(rank) {
  return { ...(CAPABILITIES[rank] ?? CAPABILITIES.extra) };
}

/** Capacités d'un personnage joueur, pour la même interface. */
export function characterCapabilities() {
  return { canTakeWounded: true, canTakeMortalDanger: true, goodKarmaKnocksOut: false, hasDefenseByDefault: true };
}

/**
 * Compétence à utiliser par un PNJ pour un jet (LdB p. 85 et 205) :
 * compétence listée si elle existe, sinon spécialité si la tâche est dans son domaine, sinon base.
 * @param {{baseSkill:number, specialty:{value:number}, skills:Array<{name:string,value:number}>}} npc
 * @param {{skillName?:string, inSpecialty?:boolean}} request
 * @returns {{value:number, source:"skill"|"specialty"|"base", name?:string}}
 */
export function resolveNpcSkill(npc, { skillName, inSpecialty = false } = {}) {
  if (skillName) {
    const wanted = normalize(skillName);
    const found = (npc.skills ?? []).find(s => normalize(s.name) === wanted);
    if (found) return { value: Number(found.value) || 0, source: "skill", name: found.name };
  }
  if (inSpecialty) return { value: Number(npc.specialty?.value) || 0, source: "specialty" };
  return { value: Number(npc.baseSkill) || 0, source: "base" };
}

function normalize(s) {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}
