/**
 * Dépenses de points de récit soumises au Chef — logique pure (LdB p. 106-110, bible §8.4).
 * Les PR sont réservés (débités) à la proposition ; le Chef valide, refuse (remboursement total)
 * ou modifie le coût (remboursement de la différence, ou supplément si le coût augmente).
 */

export const SPEND_TYPES = Object.freeze({
  clue:  { cost: 1, min: 1, max: 4 },   // indice, 1 à 4 PR
  minor: { cost: 2, min: 2, max: 2 },   // élément mineur
  major: { cost: 6, min: 6, max: 6 },   // élément majeur
  kit:   { cost: 1, min: 0, max: 12 },  // kit de matériel en scène du plan (coût du kit)
  other: { cost: 1, min: 0, max: 12 }
});

export function defaultSpendCost(type) {
  return SPEND_TYPES[type]?.cost ?? 1;
}

/** Borne un coût proposé au domaine du type. */
export function clampSpendCost(type, cost) {
  const t = SPEND_TYPES[type] ?? SPEND_TYPES.other;
  const c = Math.round(Number(cost));
  if (!Number.isFinite(c)) return t.cost;
  return Math.min(t.max, Math.max(t.min, c));
}

export function createSpend({ type = "other", cost, description = "", actorUuid = "", actorName = "" }) {
  const reserved = clampSpendCost(type, cost ?? defaultSpendCost(type));
  return { type, description, actorUuid, actorName, reserved, finalCost: null, status: "pending", note: "" };
}

/**
 * Décision du Chef.
 * @param {"accept"|"refuse"|"modify"} decision
 * @returns {{ok:true, state:object, refund:number, extra:number} | {ok:false, reason:string}}
 *   refund : PR rendus au joueur ; extra : PR supplémentaires à débiter
 */
export function resolveSpend(state, decision, { cost, note = "" } = {}) {
  if (state.status !== "pending") return { ok: false, reason: "not-pending" };
  if (decision === "accept") return { ok: true, refund: 0, extra: 0, state: { ...state, status: "accepted", finalCost: state.reserved, note } };
  if (decision === "refuse") return { ok: true, refund: state.reserved, extra: 0, state: { ...state, status: "refused", finalCost: 0, note } };
  if (decision === "modify") {
    const c = Math.max(0, Math.round(Number(cost) || 0));
    const diff = state.reserved - c;
    return {
      ok: true,
      refund: Math.max(0, diff),
      extra: Math.max(0, -diff),
      state: { ...state, status: "modified", finalCost: c, note }
    };
  }
  return { ok: false, reason: "bad-decision" };
}

/** Points de récit en début de session (LdB p. 104 ; bonus d'intersession, p. 130). */
export function newSessionValue({ current = 0, start = 4, pendingBonus = 0, keep = false, max = 12 } = {}) {
  const v = keep ? Number(current) || 0 : (Number(start) || 0) + (Number(pendingBonus) || 0);
  return Math.min(max, Math.max(0, v));
}
