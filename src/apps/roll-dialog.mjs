/**
 * Boîte de lancement d'un jet de tâche (DialogV2).
 * Un seul modificateur par catégorie (difficulté, circonstances, matériel, capacités) ;
 * les malus de conditions sont affichés et cumulés automatiquement (D-006).
 */
import { SYSTEM_PATH } from "../config.mjs";
import { DIFFICULTIES } from "../domain/dice/percentile.mjs";
import { coreRollMode } from "../services/roll-mode.mjs";

const DIFFICULTY_LABELS = {
  veryEasy: "TTS.Roll.Difficulty.VeryEasy",
  easy: "TTS.Roll.Difficulty.Easy",
  average: "TTS.Roll.Difficulty.Average",
  hard: "TTS.Roll.Difficulty.Hard",
  veryHard: "TTS.Roll.Difficulty.VeryHard"
};

/**
 * @param {object} ctx  contexte (roll-context.mjs)
 * @param {{lockedDifficulty?:number|null, hiddenDifficulty?:boolean, opponents?:Array<{uuid:string,name:string,choices:object}>, defaultRollMode?:string, allowOpposition?:boolean,
 *          attack?:{options:Array<{key:string,label:string,ok:boolean,hint:string}>, targets:string[], canZone:boolean}}} opts
 * @returns {Promise<null|{difficulty:number, circumstances:number, gearId:string, gearPips:number, abilities:number, rollMode:string, opposed:boolean, opponentUuid?:string, opponentChoice?:string}>}
 */
export async function promptTaskRoll(ctx, opts = {}) {
  const difficultyChoices = Object.fromEntries(Object.entries(DIFFICULTIES).map(([k, v]) => [
    String(v), `${game.i18n.localize(DIFFICULTY_LABELS[k])} (${v > 0 ? "+" : ""}${v})`
  ]));
  const conditionTotal = ctx.conditionMods.reduce((a, m) => a + m.pips, 0);
  const flawTotal = (ctx.flawMods ?? []).reduce((a, m) => a + m.pips, 0);
  const rollModes = Object.fromEntries(Object.entries(CONFIG.Dice.rollModes ?? {}).map(([k, v]) => [k, game.i18n.localize(v?.label ?? v)]));

  const content = await foundry.applications.handlebars.renderTemplate(`${SYSTEM_PATH}/templates/dialogs/task-roll.hbs`, {
    ctx,
    difficultyChoices,
    locked: opts.lockedDifficulty !== undefined && opts.lockedDifficulty !== null,
    lockedLabel: opts.hiddenDifficulty
      ? game.i18n.localize("TTS.Roll.DifficultySecret")
      : (difficultyChoices[String(opts.lockedDifficulty)] ?? String(opts.lockedDifficulty)),
    conditionTotal,
    flawTotal,
    rollModes,
    rollMode: opts.defaultRollMode ?? coreRollMode(),
    opponents: opts.allowOpposition === false ? [] : (opts.opponents ?? []),
    attack: opts.attack ?? null,
    rollKinds: opts.rollKinds && !opts.attack
      ? Object.fromEntries(["skill", "movement", "sight", "hearing"].map(k => [k, game.i18n.localize(`TTS.Roll.Kind.${k}`)])) : null,
    defaultKind: opts.defaultKind ?? "skill",
    extraTotal: (ctx.extraMods ?? []).reduce((a, m) => a + m.pips, 0)
  });

  return foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.format("TTS.Roll.DialogTitle", { label: ctx.label, value: ctx.value }) },
    classes: ["thetroubleshooters", "tts-dialog", "tts-roll-dialog"],
    content,
    ok: {
      label: game.i18n.localize("TTS.Roll.Roll"),
      icon: "fa-solid fa-dice-d10",
      callback: (event, button) => {
        const data = new foundry.applications.ux.FormDataExtended(button.form).object;
        const gear = ctx.gearOptions.find(g => g.id === data.gearId);
        const ability = (ctx.abilityOptions ?? []).find(a => a.id === data.abilityId);
        return {
          difficulty: opts.lockedDifficulty ?? (Number(data.difficulty) || 0),
          circumstances: clampPips(data.circumstances),
          gearId: gear?.id ?? "",
          gearPips: gear?.pips ?? 0,
          gearLabel: gear?.label ?? "",
          abilities: ability ? ability.pips : clampPips(data.abilities),
          abilityId: ability?.id ?? "",
          abilityLabel: ability?.label ?? "",
          abilityCost: ability?.cost ?? 0,
          rollMode: data.rollMode || opts.defaultRollMode,
          opposed: Boolean(data.opposed),
          opponentUuid: data.opponentUuid || "",
          opponentChoice: data.opponentChoice || "",
          option: data.option || "base",
          rakatakataMode: data.rakatakataMode || "single",
          rollKind: data.rollKind || "skill"
        };
      }
    },
    rejectClose: false
  });
}

function clampPips(v) {
  const n = Math.trunc(Number(v) || 0);
  return Math.max(-9, Math.min(9, n));
}
