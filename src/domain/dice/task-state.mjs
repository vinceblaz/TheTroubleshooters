/**
 * État d'un jet de tâche porté par une carte de chat — transitions pures.
 *
 * L'état est un objet plat sérialisable (drapeau du message) :
 *  { value, pips, mode, result, originalResult, success, auto, karma, target,
 *    hiddenPips, apparent:{success, auto, target} | null,
 *    history:[{type, from, to, cost, by}], status:"resolved"|"pendingFailure"|"failedVoluntarily" }
 */
import { evaluateTask, invertResult } from "./percentile.mjs";

export const GENERIC_INVERT_COST = 2;      // LdB p. 82 et 106
export const VOLUNTARY_FAILURE_GAIN = 2;   // LdB p. 105

/** Construit l'état initial d'un jet. hiddenPips : malus/bonus secret imposé par le Chef (bible §7.7). */
export function createTaskState({ value, pips = 0, hiddenPips = 0, mode = "pips", result }) {
  const state = {
    value: Number(value) || 0,
    pips: Number(pips) || 0,
    hiddenPips: Number(hiddenPips) || 0,
    mode,
    result: Number(result),
    originalResult: Number(result),
    history: [],
    status: "resolved"
  };
  return evaluateState(state);
}

/** (Ré)évalue l'issue réelle et, s'il y a un modificateur secret, l'issue apparente pour les joueurs. */
export function evaluateState(state) {
  const real = evaluateTask({ value: state.value, result: state.result, pips: state.pips + state.hiddenPips, mode: state.mode });
  const next = { ...state, success: real.success, auto: real.auto, karma: real.karma, target: real.target };
  if (state.hiddenPips) {
    const seen = evaluateTask({ value: state.value, result: state.result, pips: state.pips, mode: state.mode });
    next.apparent = { success: seen.success, auto: seen.auto, target: seen.target };
  } else next.apparent = null;
  if (next.status === "failedVoluntarily") next.success = false;
  return next;
}

/**
 * Inverse le jet (2 PR génériques, ou coût d'une capacité). Le Karma ne change pas
 * (un double reste un double) mais l'issue est recalculée avec les mêmes pips.
 * @returns {{ok:true, state:object} | {ok:false, reason:string}}
 */
export function invertTask(state, { cost = GENERIC_INVERT_COST, source = "generic", by = "" } = {}) {
  if (state.status === "pendingFailure" || state.status === "failedVoluntarily") return { ok: false, reason: "locked" };
  const to = invertResult(state.result);
  const karma = state.karma;
  const next = evaluateState({
    ...state,
    result: to,
    history: [...state.history, { type: "invert", from: state.result, to, cost, source, by }]
  });
  next.karma = karma;
  return { ok: true, state: next };
}

/** Le joueur propose de rater un jet réussi : en attente de validation du Chef. */
export function proposeVoluntaryFailure(state) {
  if (!state.success || state.status !== "resolved") return { ok: false, reason: "not-success" };
  return { ok: true, state: { ...state, status: "pendingFailure" } };
}

/** Décision du Chef sur l'échec volontaire. */
export function resolveVoluntaryFailure(state, accepted, { gain = VOLUNTARY_FAILURE_GAIN } = {}) {
  if (state.status !== "pendingFailure") return { ok: false, reason: "not-pending" };
  if (!accepted) return { ok: true, state: { ...state, status: "resolved" }, gain: 0 };
  return {
    ok: true,
    gain,
    state: { ...state, status: "failedVoluntarily", success: false, history: [...state.history, { type: "voluntaryFailure", gain }] }
  };
}

/**
 * Relance (capacité) : nouveau d%, conserver le nouveau résultat (LdB p. 61).
 * Le Karma est recalculé sur le nouveau résultat.
 * @returns {{ok:true, state:object, karmaChanged:boolean} | {ok:false, reason:string}}
 */
export function rerollTask(state, newResult, { cost = 2, source = "ability", label = "" } = {}) {
  if (state.status !== "resolved") return { ok: false, reason: "locked" };
  const next = evaluateState({
    ...state,
    result: Number(newResult),
    history: [...state.history, { type: "reroll", from: state.result, to: Number(newResult), cost, source, label }]
  });
  return { ok: true, state: next, karmaChanged: Boolean(next.karma) };
}

/** Transformer un jet raté en réussite (capacité, ex. Fin limier). */
export function forceSuccessTask(state, { cost = 2, source = "ability", label = "" } = {}) {
  if (state.status !== "resolved") return { ok: false, reason: "locked" };
  if (state.success) return { ok: false, reason: "already-success" };
  return {
    ok: true,
    state: {
      ...state, success: true, auto: null, forced: true,
      apparent: state.apparent ? { ...state.apparent, success: true, auto: null } : null,
      history: [...state.history, { type: "forceSuccess", cost, source, label }]
    }
  };
}

/**
 * Jet raté rejoué avec une autre compétence et des pips (Concentré : Volonté à +2 pips).
 * Le modificateur secret éventuel ne s'applique plus : c'est un nouveau jet d'une autre nature.
 */
export function rerollWithTask(state, { value, pips = 0, result, cost = 1, label = "" }) {
  if (state.status !== "resolved") return { ok: false, reason: "locked" };
  if (state.success) return { ok: false, reason: "already-success" };
  const next = evaluateState({
    ...state,
    value: Number(value) || 0,
    pips: Number(pips) || 0,
    hiddenPips: 0,
    result: Number(result),
    history: [...state.history, { type: "rerollWith", from: state.result, to: Number(result), cost, label }]
  });
  return { ok: true, state: next, karmaChanged: Boolean(next.karma) };
}

/**
 * Rater un jet réussi au titre d'un désavantage ou d'une capacité (Curieux) : immédiat,
 * sans validation du Chef (LdB p. 75 : le déclenchement appartient au joueur).
 */
export function failForPointsTask(state, { gain = 3, source = "flaw", label = "" } = {}) {
  if (state.status !== "resolved" || !state.success) return { ok: false, reason: "not-success" };
  return {
    ok: true,
    gain,
    state: { ...state, status: "failedVoluntarily", success: false, history: [...state.history, { type: "failForPoints", gain, source, label }] }
  };
}

