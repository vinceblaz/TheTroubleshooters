/**
 * Mouvements de points de récit avec traçabilité dans le chat (bible P8, §8).
 */
import { SYSTEM_ID } from "../config.mjs";
import { gainStoryPoints, spendStoryPoints } from "../domain/rules/story-points.mjs";
import { newSessionValue } from "../domain/rules/spend.mjs";
import { createCardMessage } from "../chat/cards.mjs";

const maxSP = () => game.settings.get(SYSTEM_ID, "maxStoryPoints");

/**
 * Calcule et applique un mouvement sur un Risque-tout.
 * @returns {Promise<{name:string, from:number, to:number, delta:number}|null>}
 */
export async function adjustStoryPoints(actor, delta, { allowNegative = false } = {}) {
  if (actor?.type !== "character") return null;
  const from = actor.system.storyPoints.value;
  let to;
  if (delta >= 0) to = gainStoryPoints(from, delta, maxSP()).value;
  else {
    const r = spendStoryPoints(from, -delta);
    if (!r.ok && !allowNegative) throw new Error(game.i18n.format("TTS.Notify.NotEnoughStoryPoints", { name: actor.name, cost: -delta }));
    to = r.ok ? r.value : 0;
  }
  if (to !== from) await actor.update({ "system.storyPoints.value": to });
  return { name: actor.name, from, to, delta: to - from };
}

/** Publie un journal de mouvements de PR. */
export async function logStoryPoints(title, rows, { reason = "", whisperGM = false } = {}) {
  const lines = rows.filter(Boolean);
  if (!lines.length) return;
  const card = { kind: "log", title, reason, lines };
  const data = { speaker: { alias: game.i18n.localize("TTS.Request.Speaker") } };
  if (whisperGM) data.whisper = game.users.filter(u => u.isGM).map(u => u.id);
  return createCardMessage(card, data);
}

/** Applique le même mouvement à plusieurs Risque-tout et le journalise. */
export async function adjustMany(actors, delta, title, reason = "") {
  const rows = [];
  for (const a of actors) rows.push(await adjustStoryPoints(a, delta, { allowNegative: true }));
  await logStoryPoints(title, rows, { reason });
  return rows;
}

/** Nouvelle session (LdB p. 104) : 4 PR (réglage) + bonus d'intersession, ou réserves conservées. */
export async function startNewSession(actors, { keep = false } = {}) {
  const start = game.settings.get(SYSTEM_ID, "sessionStartStoryPoints");
  const rows = [];
  for (const a of actors.filter(x => x.type === "character")) {
    const from = a.system.storyPoints.value;
    const to = newSessionValue({ current: from, start, pendingBonus: a.system.progression.pendingStartBonus, keep, max: maxSP() });
    await a.update({ "system.storyPoints.value": to, "system.progression.pendingStartBonus": 0 });
    rows.push({ name: a.name, from, to, delta: to - from });
  }
  await logStoryPoints(game.i18n.localize("TTS.SP.NewSession"), rows, {
    reason: game.i18n.localize(keep ? "TTS.SP.NewSessionKeep" : "TTS.SP.NewSessionReset")
  });
  return rows;
}
