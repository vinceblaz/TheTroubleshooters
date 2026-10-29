/**
 * Activations de capacités — logique pure (bible chap. 9, LdB p. 60-73).
 *
 * Une activation : { key, type, cost, skills[], label, pips, dice, skill, gain }.
 * Règle d'or : la circonstance (« au tir à l'arc », « en pays étranger »…) n'est jamais vérifiée.
 * Le filtre par compétence n'écarte que ce qui est évidemment hors sujet ; une activation
 * sans compétence listée est « situationnelle » et toujours proposée, le joueur juge.
 */

export const ACTIVATION_TYPES = Object.freeze({
  invert:         { where: "card",   phase: 3 },   // inverser le jet
  reroll:         { where: "card",   phase: 3 },   // relancer, conserver le nouveau résultat
  forceSuccess:   { where: "card",   phase: 3 },   // transformer un échec en réussite
  rerollWith:     { where: "card",   phase: 3 },   // jet raté : rejouer avec une autre compétence (Concentré)
  failForPoints:  { where: "card",   phase: 3 },   // rater un jet réussi pour gagner des PR (Curieux)
  bonusPips:      { where: "dialog", phase: 3 },   // modificateur de la catégorie Capacités
  narrative:      { where: "sheet",  phase: 3 },   // effet narratif : dépense + annonce
  bonusDamage:    { where: "attack", phase: 4 },   // dés de dégâts en plus (coût 0 : proposé au jet de dégâts)
  rerollDamage:   { where: "attack", phase: 4 },   // relancer les dégâts, conserver le nouveau résultat
  knockoutMinion: { where: "attack", phase: 4 },   // sbire touché : Hors de combat sans jet de dégâts
  recovery:       { where: "sheet",  phase: 4 },   // jet de récupération NdR (action bonus)
  initiative:     { where: "sheet",  phase: 4 },   // agir maintenant : marqueur dans le tracker
  bonusAction:    { where: "sheet",  phase: 4 }    // action bonus accordée : pastille dans le tracker
});

export const ACTIVATION_TYPE_KEYS = Object.freeze(Object.keys(ACTIVATION_TYPES));

/** L'activation concerne-t-elle cette compétence ? (liste vide = situationnelle) */
export function matchesSkill(act, skillKey) {
  const skills = act?.skills ?? [];
  if (!skills.length) return true;
  return Boolean(skillKey) && skills.includes(skillKey);
}

/**
 * Activations utilisables sur une carte de jet.
 * @param {Array<{id:string, name:string, acquired?:boolean, activations:object[]}>} abilities
 * @param {{skillKey?:string, task:object}} ctx
 * @returns {Array<{abilityId:string, abilityName:string, index:number, act:object}>}
 */
export function cardActivations(abilities = [], { skillKey = "", task } = {}) {
  if (!task || task.status !== "resolved") return [];
  const out = [];
  for (const ab of abilities) {
    if (ab.acquired === false) continue;
    (ab.activations ?? []).forEach((act, index) => {
      if (ACTIVATION_TYPES[act.type]?.where !== "card") return;
      if (!matchesSkill(act, skillKey)) return;
      if (act.type === "forceSuccess" && task.success) return;
      if (act.type === "rerollWith" && task.success) return;
      if (act.type === "failForPoints" && (!task.success || !(act.skills ?? []).includes(skillKey))) return;
      out.push({ abilityId: ab.id, abilityName: ab.name, index, act });
    });
  }
  return out;
}

/** Bonus de capacité proposés dans la boîte de jet (catégorie Capacités, un seul retenu). */
export function dialogActivations(abilities = [], skillKey = "") {
  const out = [];
  for (const ab of abilities) {
    if (ab.acquired === false) continue;
    (ab.activations ?? []).forEach((act, index) => {
      if (act.type !== "bonusPips" || !matchesSkill(act, skillKey)) return;
      out.push({ abilityId: ab.id, abilityName: ab.name, index, act });
    });
  }
  return out;
}

/**
 * Activations de combat proposées sur une carte d'attaque, selon l'étape (bible §10.3).
 *  - knockoutMinion : attaque réussie contre un sbire, avant le jet de dégâts ;
 *  - bonusDamage payant et rerollDamage : après le jet de dégâts, avant l'encaissement.
 * @param {Array} abilities
 * @param {{stage:string, hit:boolean, targetRank?:string, damageRolled:boolean, soaked:boolean}} ctx
 */
export function attackActivations(abilities = [], { stage, hit, targetRank = "", damageRolled = false, soaked = false } = {}) {
  const out = [];
  for (const ab of abilities) {
    if (ab.acquired === false) continue;
    (ab.activations ?? []).forEach((act, index) => {
      if (ACTIVATION_TYPES[act.type]?.where !== "attack") return;
      const afterDamage = damageRolled && !soaked && ["soak", "done"].includes(stage);
      if (act.type === "knockoutMinion" && !(stage === "damage" && hit && targetRank === "minion" && !damageRolled)) return;
      if (act.type === "rerollDamage" && !afterDamage) return;
      if (act.type === "bonusDamage" && (!(act.cost > 0) || !afterDamage)) return;
      out.push({ abilityId: ab.id, abilityName: ab.name, index, act });
    });
  }
  return out;
}

/** Bonus de dégâts gratuits (Poings d'acier) proposés au jet de dégâts — circonstance laissée au joueur. */
export function passiveDamageBonuses(abilities = []) {
  const out = [];
  for (const ab of abilities) {
    if (ab.acquired === false) continue;
    (ab.activations ?? []).forEach((act, index) => {
      if (act.type === "bonusDamage" && !(act.cost > 0) && act.dice > 0) out.push({ abilityId: ab.id, abilityName: ab.name, index, act });
    });
  }
  return out;
}

/** Activations à déclencher depuis la fiche (narratives, récupération, initiative, action bonus). */
export function sheetActivations(ability) {
  return (ability?.activations ?? [])
    .map((act, index) => ({ act, index }))
    .filter(({ act }) => ACTIVATION_TYPES[act.type]?.where === "sheet");
}
