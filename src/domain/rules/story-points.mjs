/**
 * Points de récit — opérations pures (LdB p. 104-107).
 */
import { DEFAULT_MAX_STORY_POINTS } from "./character.mjs";

/** Gains standard. */
export const STORY_POINT_GAINS = Object.freeze({
  karma: 1,
  captured: 9,
  flawMinor: 3,
  flawMajor: 6,
  voluntaryFailure: 2,
  amuseTable: 1,
  signatureUnavailable: 3,
  unlucky: 3
});

/** Dépenses standard. */
export const STORY_POINT_COSTS = Object.freeze({
  invert: 2,
  minorElement: 2,
  majorElement: 6
});

/**
 * Ajoute des PR en respectant le plafond.
 * @returns {{value:number, gained:number, overflow:number}}
 */
export function gainStoryPoints(current, amount, max = DEFAULT_MAX_STORY_POINTS) {
  const cur = Math.max(0, Number(current) || 0);
  const add = Math.max(0, Number(amount) || 0);
  const value = Math.min(max, cur + add);
  return { value, gained: value - cur, overflow: cur + add - value };
}

/**
 * Dépense des PR.
 * @returns {{ok:true, value:number} | {ok:false, reason:"insufficient", value:number}}
 */
export function spendStoryPoints(current, cost) {
  const cur = Math.max(0, Number(current) || 0);
  const c = Math.max(0, Number(cost) || 0);
  if (c > cur) return { ok: false, reason: "insufficient", value: cur };
  return { ok: true, value: cur - c };
}
