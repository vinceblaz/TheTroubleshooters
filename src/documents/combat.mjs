/**
 * Combat — initiative par jet de tâche et ordre du tracker (LdB p. 90-91, bible §10.1).
 */
import { SYSTEM_ID } from "../config.mjs";
import { compareCombatants } from "../domain/combat/initiative.mjs";
import { rollInitiativeFor } from "../services/combat-service.mjs";

const view = c => ({
  initiative: Number.isFinite(c.initiative) ? c.initiative : null,
  isCharacter: c.actor?.type === "character",
  order: c.flags?.[SYSTEM_ID]?.order ?? 0,
  name: c.name
});

export class TTSCombat extends Combat {
  /** @override — initiative décroissante, Risque-tout avant PNJ à égalité. Appelée sans `this`. */
  _sortCombatants(a, b) {
    return compareCombatants(view(a), view(b));
  }

  /**
   * @override — jet de Vigilance (ou valeur fixe d'un PNJ) au lieu d'une formule.
   * @param {string|string[]} ids
   */
  async rollInitiative(ids, { updateTurn = true } = {}) {
    const list = typeof ids === "string" ? [ids] : [...ids];
    const currentId = this.combatant?.id;
    const updates = [];
    for (const id of list) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner || !combatant.actor) continue;
      const value = await rollInitiativeFor(combatant.actor, { combat: this, combatant });
      if (value !== null) updates.push({ _id: id, initiative: value });
    }
    if (!updates.length) return this;
    await this.updateEmbeddedDocuments("Combatant", updates);
    if (updateTurn && currentId && this.started) {
      const turn = this.turns.findIndex(t => t.id === currentId);
      if (turn >= 0 && turn !== this.turn && game.user.isGM) await this.update({ turn });
    }
    return this;
  }
}
