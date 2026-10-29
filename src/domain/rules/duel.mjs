/**
 * Duels (LdB p. 85-86) — logique pure.
 * Deux camps ; à tour de rôle, un camp demande un jet en opposition (compétence de son choix,
 * éventuellement une paire de compétences) ; premier camp à atteindre le nombre cible (3 par défaut).
 * Le score est toujours dérivé des échanges : une inversion après coup le recalcule.
 */
import { opposedOutcome } from "../dice/percentile.mjs";

export const DEFAULT_TARGET = 3;
export const REPEAT_PENALTY = -2;
export const other = side => (side === "a" ? "b" : "a");

export function createDuel({ target = DEFAULT_TARGET, sides, first = "a" } = {}) {
  const mk = s => ({ name: s?.name ?? "", goal: s?.goal ?? "", participants: [...(s?.participants ?? [])] });
  return evaluateDuel({ target: Math.max(1, Number(target) || DEFAULT_TARGET), first, sides: { a: mk(sides?.a), b: mk(sides?.b) }, exchanges: [] });
}

/**
 * Malus de répétition pour le demandeur (LdB p. 85) : −2 pips par demande antérieure de la même compétence.
 * scope "duel" : toute demande antérieure dans le duel ; "side" : seulement celles du même camp.
 */
export function repeatPenalty(state, side, skill, scope = "duel") {
  const prior = state.exchanges.filter(e => e.skill === skill && (scope === "duel" || e.by === side)).length;
  return prior ? REPEAT_PENALTY * prior : 0;
}

/** Issue d'un échange : vainqueur ou null (deux échecs ou égalité : le score ne bouge pas). */
export function exchangeWinner(ex) {
  if (!ex.a.task || !ex.b.task) return undefined;
  const o = opposedOutcome(ex.a.task, ex.b.task);
  return o === "tie" ? null : o;
}

/** Score, camp qui demande, fin du duel — dérivés des échanges. */
export function evaluateDuel(state) {
  const score = { a: 0, b: 0 };
  let winner = null;
  const exchanges = state.exchanges.map(ex => {
    const w = exchangeWinner(ex);
    const next = { ...ex, winner: w, describer: w === undefined ? null : (w ?? ex.by) };
    if (!winner && w) {
      score[w] += 1;
      if (score[w] >= state.target) winner = w;
    }
    return next;
  });
  const last = exchanges.at(-1);
  const open = last && last.winner === undefined;
  const turn = winner ? null : (open ? null : (last ? other(last.by) : state.first));
  return { ...state, exchanges, score, winner, turn, pending: open ? exchanges.length - 1 : null };
}

/**
 * Le camp dont c'est le tour demande un jet.
 * @param {{side:"a"|"b", skill:string, oppSkill?:string, scope?:string}} p
 */
export function requestExchange(state, { side, skill, oppSkill = "", scope = "duel" }) {
  if (state.winner) return { ok: false, reason: "finished" };
  if (state.turn !== side) return { ok: false, reason: "not-your-turn" };
  if (!skill) return { ok: false, reason: "no-skill" };
  const pips = repeatPenalty(state, side, skill, scope);
  const ex = {
    by: side, skill, oppSkill: oppSkill || skill, pips,
    a: { actorUuid: "", task: null, rollMessageId: "" },
    b: { actorUuid: "", task: null, rollMessageId: "" }
  };
  return { ok: true, state: evaluateDuel({ ...state, exchanges: [...state.exchanges, ex] }) };
}

/** Jet d'un camp pour un échange (ou mise à jour après inversion du même message). */
export function setExchangeRoll(state, index, side, { actorUuid = "", task, rollMessageId = "" }) {
  const ex = state.exchanges[index];
  if (!ex || !["a", "b"].includes(side)) return { ok: false, reason: "bad-exchange" };
  const cur = ex[side];
  if (cur.rollMessageId && rollMessageId && cur.rollMessageId !== rollMessageId) return { ok: false, reason: "already-rolled" };
  if (!cur.rollMessageId && index !== state.exchanges.length - 1) return { ok: false, reason: "not-current" };
  const exchanges = state.exchanges.map((e, i) => (i === index
    ? { ...e, [side]: { actorUuid: actorUuid || cur.actorUuid, task, rollMessageId: rollMessageId || cur.rollMessageId } }
    : e));
  return { ok: true, state: evaluateDuel({ ...state, exchanges }) };
}

/** Compétence que lance un camp lors d'un échange (le demandeur : skill ; l'autre : oppSkill). */
export function skillFor(ex, side) {
  return side === ex.by ? ex.skill : ex.oppSkill;
}

/** Pips appliqués au jet d'un camp (le malus de répétition ne frappe que le demandeur). */
export function pipsFor(ex, side) {
  return side === ex.by ? ex.pips : 0;
}
