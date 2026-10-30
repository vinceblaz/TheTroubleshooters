/**
 * Conditions (bible chap. 11, LdB p. 100-101) : niveaux cumulatifs, jets de sortie, Blessé rafistolé.
 * Les niveaux sont portés par l'acteur (flags.thetroubleshooters.conditionLevels) ; le statut Foundry
 * reste la source de vérité de la présence d'une condition.
 */
import { SYSTEM_ID, THETROUBLESHOOTERS } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { CONDITION_DEFS, conditionLevel, addConditionLevel, removeConditionLevel, exitOutcome } from "../domain/rules/conditions.mjs";
import { getCard, updateCardMessage } from "../chat/cards.mjs";
import { rollTask } from "./roll-service.mjs";
import { characterSkillContext, npcSkillContext, conditionLevelsOf, ignoredConditionsOf } from "./roll-context.mjs";

const t = key => game.i18n.localize(key);
export const conditionLabel = id => t(THETROUBLESHOOTERS.conditions[id]?.label ?? id);
const statuses = actor => [...(actor?.statuses ?? [])];

/** Pose ou retire un statut (sans effet s'il est déjà dans l'état voulu). */
export async function setCondition(actor, id, active = true) {
  if (!actor || !THETROUBLESHOOTERS.conditions[id]) return;
  if (statuses(actor).includes(id) !== active) await actor.toggleStatusEffect(id, { active });
  if (!active && CONDITION_DEFS[id]?.max > 1) await actor.unsetFlag(SYSTEM_ID, `conditionLevels.${id}`);
}

/** Ajoute un niveau (Saoul au 4e niveau → Hors de combat). */
export async function addLevel(actor, id) {
  const current = conditionLevel(id, statuses(actor), conditionLevelsOf(actor));
  const { level, overflow } = addConditionLevel(id, current);
  await setCondition(actor, id, true);
  if ((CONDITION_DEFS[id]?.max ?? 1) > 1) await actor.setFlag(SYSTEM_ID, `conditionLevels.${id}`, level);
  if (overflow) await setCondition(actor, overflow, true);
  // Épuisé : la Vitalité actuelle est ramenée au nouveau maximum (valeur dérivée enregistrée).
  if (id === "exhausted" && actor.type === "character") await actor.update({ "system.vitality.value": actor.system.vitality.value });
  return { level, overflow };
}

/** Retire un niveau ; à 0 la condition disparaît. */
export async function removeLevel(actor, id) {
  const current = conditionLevel(id, statuses(actor), conditionLevelsOf(actor));
  const level = removeConditionLevel(current);
  if (level === 0) await setCondition(actor, id, false);
  else await actor.setFlag(SYSTEM_ID, `conditionLevels.${id}`, level);
  return level;
}

/** Hook deleteActiveEffect : statut retiré depuis le HUD → niveaux effacés (par l'utilisateur à l'origine). */
export async function onDeleteActiveEffect(effect, options, userId) {
  if (userId !== game.user.id) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  for (const id of effect.statuses ?? []) {
    if ((CONDITION_DEFS[id]?.max ?? 1) > 1 && actor.getFlag(SYSTEM_ID, `conditionLevels.${id}`) !== undefined) {
      await actor.unsetFlag(SYSTEM_ID, `conditionLevels.${id}`);
    }
  }
}

/**
 * Jet pour se débarrasser d'une condition (Volonté, Agilité…). Le jet peut être fait par un autre
 * personnage (éteindre les flammes d'un allié) : la carte porte la cible, l'effet est appliqué par le MJ.
 */
export async function rollConditionExit(roller, target, id, skill) {
  if (!roller?.isOwner || !CONDITION_DEFS[id]?.exit) return null;
  const ctx = roller.type === "character"
    ? characterSkillContext(roller, skill)
    : npcSkillContext(roller, { skillName: t(THETROUBLESHOOTERS.skills[skill]?.label ?? skill) });
  const msg = await rollTask(ctx, {
    allowOpposition: false,
    cardExtra: { exit: { condition: id, targetUuid: target.uuid, targetName: target.name, applied: false } }
  });
  if (msg && getCard(msg)?.task?.success) await RelayService.dispatch("conditionExit", { messageId: msg.id, actorUuid: roller.uuid }, { gmOnly: true });
  return msg;
}

/** Blessé : un allié réussit un jet de Médecine → les effets sont ignorés pour la scène (LdB p. 99). */
export async function patchUpWounded(healer, target) {
  if (!healer?.isOwner) return null;
  const msg = await rollTask(characterSkillContext(healer, "medicine"), {
    allowOpposition: false,
    cardExtra: { exit: { condition: "wounded", mode: "patchUp", targetUuid: target.uuid, targetName: target.name, applied: false } }
  });
  if (msg && getCard(msg)?.task?.success) await RelayService.dispatch("conditionExit", { messageId: msg.id, actorUuid: healer.uuid }, { gmOnly: true });
  return msg;
}

/** Lignes du panneau des conditions (fiches Risque-tout et PNJ). */
/** Charte (phase 10) : encre du tampon par famille d'états. */
export const CONDITION_INK = Object.freeze({
  wounded: "red", mortalDanger: "red", outOfAction: "red", onFire: "red",
  frightened: "teal", terrified: "teal", surprised: "teal", stunned: "teal",
  drunk: "violet", exhausted: "violet", encumbered: "violet",
  vulnerable: "navy",
  blinded: "green", deafened: "green", paralyzed: "green", restrained: "green"
});
const STAMP_SHAPES = ["double", "oval", "square"];

export function conditionRows(actor) {
  const st = statuses(actor);
  const levels = conditionLevelsOf(actor);
  const ignored = ignoredConditionsOf(actor);
  return Object.entries(CONDITION_DEFS).map(([id, def], index) => {
    const active = st.includes(id);
    const patched = id === "wounded" && ignored.includes("wounded");
    return {
      id, active, img: THETROUBLESHOOTERS.conditions[id].img,
      ink: CONDITION_INK[id] ?? "navy", shape: STAMP_SHAPES[index % STAMP_SHAPES.length],
      label: conditionLabel(id),
      effect: `TTS.Condition.Effect.${id}`,
      ends: `TTS.Condition.Ends.${def.ends}`,
      cumulative: def.max > 1,
      level: conditionLevel(id, st, levels),
      maxLabel: def.max > 1 && def.max < 9 ? def.max : "",
      exits: active && def.exit ? def.exit.skills.map(k => ({ skill: k, label: t(THETROUBLESHOOTERS.skills[k].label) })) : [],
      patchUp: id === "wounded" && active && !patched,
      patched: active && patched
    };
  });
}

/** Actions communes du panneau (à brancher dans les fiches). */
export const conditionPanelActions = {
  async toggleStatus(actor, id) {
    if (!id || !THETROUBLESHOOTERS.conditions[id]) return;
    if (statuses(actor).includes(id)) await setCondition(actor, id, false);
    else await addLevel(actor, id);
  },
  levelUp: (actor, id) => addLevel(actor, id),
  levelDown: (actor, id) => removeLevel(actor, id),
  exitRoll: (actor, id, skill) => rollConditionExit(actor, actor, id, skill)
};

export function registerConditionHandlers() {
  /* Sortie réussie (ou devenue réussie après inversion) : appliquée une fois par carte */
  RelayService.register("conditionExit", {
    rule: { immutable: [], transitions: {}, maxRolls: 0, requireOwner: true },
    apply: async ({ message, actor }) => {
      const card = foundry.utils.deepClone(getCard(message));
      if (card?.kind !== "task" || !card.exit || card.actorUuid !== actor?.uuid) throw new Error("Carte introuvable");
      if (card.exit.applied) return;
      if (!card.task.success) throw new Error(t("TTS.Condition.ExitFailed"));
      const target = await fromUuid(card.exit.targetUuid);
      if (!target) throw new Error("Cible introuvable");
      card.exit.applied = true;
      await updateCardMessage(message, card);
      if (card.exit.mode === "patchUp") {
        await target.createEmbeddedDocuments("ActiveEffect", [{
          name: t("TTS.Condition.PatchedUp"), img: "icons/svg/regen.svg",
          flags: { [SYSTEM_ID]: { scene: true, ignoreCondition: "wounded" } }
        }]);
        return;
      }
      const out = exitOutcome(card.exit.condition);
      if (!out) return;
      await setCondition(target, out.remove, false);
      if (out.add) await setCondition(target, out.add, true);
    }
  });
}
