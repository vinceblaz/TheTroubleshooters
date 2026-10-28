/**
 * Déclenchement d'un désavantage par le joueur (LdB p. 75, bible §9.1).
 * Le déclenchement appartient au joueur : aucune validation du Chef (règle d'or : la justification est narrative).
 */
import { SYSTEM_ID, SYSTEM_PATH, THETROUBLESHOOTERS } from "../config.mjs";
import { triggerGain, FLAW_MODE_GAINS } from "../domain/rules/flaws.mjs";
import { adjustStoryPoints, logStoryPoints } from "./story-point-service.mjs";

const GENERIC = ["penalty", "condition", "absent", "free"];

/** Ouvre la boîte de déclenchement puis applique le choix. */
export async function triggerFlaw(actor, flaw) {
  if (!actor?.isOwner || flaw?.type !== "flaw") return;
  const skills = Object.fromEntries(Object.entries(THETROUBLESHOOTERS.skills).map(([k, s]) => [k, game.i18n.localize(s.label)]));
  const conditions = Object.fromEntries(Object.entries(THETROUBLESHOOTERS.conditions).map(([k, c]) => [k, game.i18n.localize(c.label)]));
  const modes = Object.fromEntries(GENERIC.map(m => [m, `${game.i18n.localize(THETROUBLESHOOTERS.flawTriggerModes[m])} (+${FLAW_MODE_GAINS[m]} PR)`]));
  const triggers = flaw.system.triggers
    .map((t, i) => ({ ...t, index: i, gain: triggerGain(t) }))
    .filter(t => t.mode !== "fail");     // « rater un jet réussi » se déclenche depuis la carte de jet

  const content = await foundry.applications.handlebars.renderTemplate(`${SYSTEM_PATH}/templates/dialogs/flaw-trigger.hbs`, {
    flaw, triggers, modes, skills, conditions
  });
  const data = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.format("TTS.Flaw.TriggerTitle", { name: flaw.name }) },
    classes: ["thetroubleshooters", "tts-dialog"],
    content,
    ok: {
      label: game.i18n.localize("TTS.Flaw.Trigger"),
      callback: (event, button) => {
        const fd = new foundry.applications.ux.FormDataExtended(button.form).object;
        const sel = button.form.querySelector('select[name="skills"]');
        fd.skills = sel ? [...sel.selectedOptions].map(o => o.value) : [];
        return fd;
      }
    },
    rejectClose: false
  });
  if (!data) return;

  // Choix : un déclencheur du désavantage (« t:index ») ou un mode générique (« m:mode »)
  const [kind, ref] = String(data.choice ?? "").split(":");
  let mode, gain, label, triggerSkills = [], condition = "";
  if (kind === "t") {
    const t = flaw.system.triggers[Number(ref)];
    if (!t) return;
    mode = t.mode; gain = triggerGain(t); label = t.label; triggerSkills = t.skills ?? []; condition = t.condition;
  } else {
    mode = ref; gain = FLAW_MODE_GAINS[mode] ?? 3; label = game.i18n.localize(THETROUBLESHOOTERS.flawTriggerModes[mode] ?? "");
  }

  const skillsChosen = data.skills?.length ? data.skills : triggerSkills;
  const notes = [];

  if (mode === "penalty") {
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: `${flaw.name} (−2)`,
      img: flaw.img,
      origin: flaw.uuid,
      description: label,
      flags: { [SYSTEM_ID]: { scene: true, penalty: { pips: -2, skills: skillsChosen, label: flaw.name } } }
    }]);
    notes.push(skillsChosen.length
      ? game.i18n.format("TTS.Flaw.PenaltyOn", { skills: skillsChosen.map(k => skills[k]).join(", ") })
      : game.i18n.localize("TTS.Flaw.PenaltyAll"));
  } else if (mode === "condition") {
    const cond = data.condition || condition;
    if (cond && THETROUBLESHOOTERS.conditions[cond]) {
      await actor.toggleStatusEffect(cond, { active: true });
      notes.push(conditions[cond]);
    }
  } else if (mode === "absent") {
    notes.push(game.i18n.localize("TTS.Flaw.AbsentNote"));
  }

  const row = await adjustStoryPoints(actor, gain);
  await logStoryPoints(game.i18n.format("TTS.Flaw.Triggered", { actor: actor.name, flaw: flaw.name }), [row], {
    reason: [label, ...notes].filter(Boolean).join(" — ")
  });
}

/** Malus de scène actifs posés par des désavantages (lus par la boîte de jet). */
export function activeFlawPenalties(actor) {
  return actor.effects
    .filter(e => !e.disabled && e.getFlag(SYSTEM_ID, "penalty"))
    .map(e => ({ ...e.getFlag(SYSTEM_ID, "penalty"), effectId: e.id }));
}
