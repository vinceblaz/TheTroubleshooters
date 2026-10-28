/**
 * État d'un jet en opposition porté par une carte — transitions pures (bible §7.5).
 *
 * { a: Side, b: Side, defenderWinsTies, outcome:"a"|"b"|"tie"|null, state:"waiting"|"resolved" }
 * Side = { actorUuid, name, skillLabel, task: TaskState|null }
 */
import { opposedOutcome } from "./percentile.mjs";
import { invertTask } from "./task-state.mjs";

export function createOpposedState({ a, b, defenderWinsTies = false }) {
  return computeOutcome({
    a: { actorUuid: a.actorUuid ?? "", name: a.name ?? "", skillLabel: a.skillLabel ?? "", task: a.task ?? null },
    b: { actorUuid: b.actorUuid ?? "", name: b.name ?? "", skillLabel: b.skillLabel ?? "", task: b.task ?? null },
    defenderWinsTies,
    outcome: null,
    state: "waiting"
  });
}

/** Recalcule l'issue dès que les deux camps ont lancé. */
export function computeOutcome(state) {
  if (!state.a.task || !state.b.task) return { ...state, outcome: null, state: "waiting" };
  const outcome = opposedOutcome(state.a.task, state.b.task, { defenderWinsTies: state.defenderWinsTies });
  return { ...state, outcome, state: "resolved" };
}

/** Enregistre le jet d'un camp (une seule fois). */
export function setSideRoll(state, side, task) {
  if (!["a", "b"].includes(side)) return { ok: false, reason: "bad-side" };
  if (state[side].task) return { ok: false, reason: "already-rolled" };
  return { ok: true, state: computeOutcome({ ...state, [side]: { ...state[side], task } }) };
}

/** Inverse le jet d'un camp et recalcule l'issue. */
export function invertSide(state, side, opts) {
  const task = state[side]?.task;
  if (!task) return { ok: false, reason: "not-rolled" };
  const r = invertTask(task, opts);
  if (!r.ok) return r;
  return { ok: true, state: computeOutcome({ ...state, [side]: { ...state[side], task: r.state } }) };
}
