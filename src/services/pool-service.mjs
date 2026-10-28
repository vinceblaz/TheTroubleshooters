/**
 * Réserves de d6 (dX dégâts, dR encaissement / récupération) — LdB p. 22.
 * Phase 2 : jet et carte de résultat. L'application aux acteurs arrive en phase 4 (combat).
 */
import { poolFormula } from "../domain/dice/pools.mjs";
import { createCardMessage } from "../chat/cards.mjs";

const TITLES = { dX: "TTS.Pool.Damage", dR: "TTS.Pool.Soak", d6: "TTS.Pool.Sum" };

/**
 * @param {number} n
 * @param {"dX"|"dR"|"d6"} kind
 * @param {{flavor?:string, actor?:Actor, rollMode?:string, toMessage?:boolean}} [opts]
 * @returns {Promise<{roll:Roll, hits:number}>}
 */
export async function rollPool(n, kind = "dX", { flavor = "", actor = null, rollMode, toMessage = true } = {}) {
  const formula = poolFormula(n, kind);
  const roll = await new Roll(formula).evaluate();
  const results = roll.dice.flatMap(d => d.results);
  const hits = kind === "d6" ? roll.total : results.filter(r => r.result >= 4 && r.active !== false).length;

  if (toMessage) {
    const view = {
      title: flavor || game.i18n.localize(TITLES[kind] ?? TITLES.d6),
      formula: `${n}${kind}`,
      faces: results.map(r => ({ value: r.result, hit: kind !== "d6" && r.result >= 4, exploded: Boolean(r.exploded) })),
      hits
    };
    await createCardMessage({ kind: "pool", view }, {
      speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
      rolls: [roll],
      rollMode
    });
  }
  return { roll, hits };
}
