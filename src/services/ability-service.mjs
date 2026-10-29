/**
 * Activations de capacités depuis la fiche (effets narratifs, et effets de combat en attendant la phase 4).
 * Le système débite le coût et annonce l'effet ; le Chef arbitre la circonstance (règle d'or).
 */
import { adjustStoryPoints, logStoryPoints } from "./story-point-service.mjs";
import { rollRecovery } from "./attack-service.mjs";
import { markCombatant } from "./combat-service.mjs";

/** Capacités acquises d'un acteur sous une forme simple pour la logique pure. */
export function abilitiesOf(actor) {
  return actor.items
    .filter(i => i.type === "ability")
    .map(i => ({ id: i.id, name: i.name, acquired: i.system.acquired, activations: i.system.activations ?? [] }));
}

/** Déclenche l'activation n° index d'une capacité depuis la fiche. */
export async function activateFromSheet(actor, ability, index) {
  if (!actor?.isOwner) return;
  const act = ability?.system.activations?.[index];
  if (!act) return;
  const label = act.label || game.i18n.localize(`TTS.ActivationType.${act.type}`);
  if (act.cost > 0) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: ability.name },
      content: `<p>${game.i18n.format("TTS.Ability.ConfirmSpend", { label, cost: act.cost })}</p>`,
      rejectClose: false
    });
    if (!ok) return;
  }
  const row = act.cost > 0 ? await adjustStoryPoints(actor, -act.cost) : { name: actor.name, text: game.i18n.localize("TTS.Ability.NoCost") };
  const notes = [label];
  // Effets de combat automatisés (phase 4) ; la circonstance reste arbitrée par le Chef (règle d'or).
  if (act.type === "initiative" || act.type === "bonusAction") {
    const marked = await markCombatant(actor, act.type === "initiative" ? "actNow" : "bonusGranted");
    notes.push(game.i18n.localize(marked ? `TTS.Ability.Marked.${act.type}` : "TTS.Combat.NotInCombat"));
  }
  await logStoryPoints(game.i18n.format("TTS.Ability.Activated", { actor: actor.name, ability: ability.name }), [row], { reason: notes.join(" — ") });
  if (act.type === "recovery") await rollRecovery(actor, Math.max(1, Number(act.dice) || 1), `${ability.name} : ${game.i18n.localize("TTS.ActivationType.recovery")}`);
}
