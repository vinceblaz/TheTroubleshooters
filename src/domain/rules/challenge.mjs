/**
 * Défis (LdB p. 84, 87) — logique pure.
 * 3 à 5 jets de tâche, simples ou en opposition ; le résultat dépend du nombre de jets réussis / remportés.
 */
import { opposedOutcome } from "../dice/percentile.mjs";

export const CHALLENGE_RESULTS = Object.freeze(["disastrous", "bad", "limited", "good", "excellent"]);

/** Table du livre (D-058 : à 3 jets, 0 réussite = Désastreux, pas de « Mauvais »). */
export const CHALLENGE_TABLE = Object.freeze({
  3: ["disastrous", "limited", "good", "excellent"],
  4: ["disastrous", "bad", "limited", "good", "excellent"],
  5: ["disastrous", "bad", "limited", "limited", "good", "excellent"]
});

export const MIN_ROWS = 3;
export const MAX_ROWS = 5;

/** Résultat selon le nombre de jets et de réussites. */
export function challengeResult(rows, successes) {
  const line = CHALLENGE_TABLE[rows];
  if (!line) return null;
  return line[Math.max(0, Math.min(line.length - 1, Number(successes) || 0))];
}

/** Un jet de défi est-il réussi ? Opposition : il faut la remporter (égalité = non remporté). */
export function rowSuccess(row) {
  if (!row?.task) return null;
  if (row.opposition) {
    if (!row.oppositionTask) return null;
    return opposedOutcome(row.task, row.oppositionTask) === "a";
  }
  return Boolean(row.task.success);
}

/**
 * Crée un défi.
 * @param {{title:string, rows:Array<{skill:string, pips?:number, actorUuid?:string, name?:string, opposition?:{label:string, value:number}|null}>, outcomes?:object}} p
 */
export function createChallenge({ title = "", rows = [], outcomes = {} } = {}) {
  if (rows.length < MIN_ROWS || rows.length > MAX_ROWS) return { ok: false, reason: "row-count" };
  return {
    ok: true,
    state: evaluateChallenge({
      title,
      outcomes: Object.fromEntries(CHALLENGE_RESULTS.map(k => [k, outcomes[k] ?? ""])),
      rows: rows.map((r, i) => ({
        index: i, skill: r.skill, pips: Number(r.pips) || 0, actorUuid: r.actorUuid ?? "", name: r.name ?? "",
        opposition: r.opposition ?? null, task: null, oppositionTask: null, rollMessageId: ""
      })),
      successes: 0, done: false, result: null
    })
  };
}

/** Recalcule réussites et résultat (dès que tous les jets sont faits). */
export function evaluateChallenge(state) {
  const outcomes = state.rows.map(rowSuccess);
  const done = outcomes.every(o => o !== null);
  const successes = outcomes.filter(o => o === true).length;
  return { ...state, rows: state.rows.map((r, i) => ({ ...r, success: outcomes[i] })), successes, done, result: done ? challengeResult(state.rows.length, successes) : null };
}

/** Enregistre (ou met à jour après inversion) le jet d'une ligne. */
export function setChallengeRoll(state, index, { task, oppositionTask = null, rollMessageId = "" } = {}) {
  const row = state.rows[index];
  if (!row) return { ok: false, reason: "bad-row" };
  if (row.rollMessageId && rollMessageId && row.rollMessageId !== rollMessageId) return { ok: false, reason: "already-rolled" };
  const rows = state.rows.map((r, i) => (i === index
    ? { ...r, task, oppositionTask: r.oppositionTask ?? oppositionTask, rollMessageId: rollMessageId || r.rollMessageId }
    : r));
  return { ok: true, state: evaluateChallenge({ ...state, rows }) };
}

/** Répartition des jets : nombre de jets par participant (les joueurs répartissent « aussi équitablement que possible »). */
export function distribution(rows = []) {
  const out = {};
  for (const r of rows) if (r.actorUuid) out[r.actorUuid] = (out[r.actorUuid] ?? 0) + 1;
  return out;
}

/** Modèles tirés de « Comment résoudre les situations » (LdB p. 87). */
export const CHALLENGE_PRESETS = Object.freeze({
  crimeScene: ["investigation", "search", "vigilance"],
  schematics: ["electronics", "investigation", "engineering", "science"],
  gadget: ["electronics", "engineering", "resources", "science"],
  bypassSecurity: ["electronics", "engineering", "sleightOfHand", "security"],
  archives: ["bureaucracy", "contacts", "investigation", "search"],
  history: ["contacts", "investigation", "search", "humanities"],
  cryptanalysis: ["investigation", "languages", "science", "security"],
  makeContact: ["bureaucracy", "contacts", "resources", "status"],
  climb: ["agility", "endurance", "strength", "vigilance"],
  mountaineering: ["agility", "endurance", "survival", "vigilance", "willpower"],
  diving: ["agility", "endurance", "mechanics", "vigilance", "willpower"],
  interrogate: ["bureaucracy", "charm", "contacts", "investigation"],
  contraband: ["bureaucracy", "charm", "contacts", "resources"],
  rolePlay: ["charm", "languages", "deception", "vigilance", "willpower"],
  roughWater: ["agility", "endurance", "willpower"],
  groupSneak: ["search", "stealth", "security", "vigilance"],
  hike: ["endurance", "strength", "survival", "vigilance", "willpower"],
  artSearch: ["contacts", "investigation", "search", "humanities"]
});
