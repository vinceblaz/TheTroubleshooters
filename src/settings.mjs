/**
 * Paramètres du monde (bible §4.8).
 */
import { SYSTEM_ID } from "./config.mjs";
import { DEFAULT_SESSION_STORY_POINTS, DEFAULT_MAX_STORY_POINTS } from "./domain/rules/character.mjs";

export function registerSettings() {
  const reg = (key, data) => game.settings.register(SYSTEM_ID, key, data);

  reg("modifierMode", {
    name: "TTS.Settings.ModifierMode.Name",
    hint: "TTS.Settings.ModifierMode.Hint",
    scope: "world", config: true, type: String, default: "pips",
    choices: { pips: "TTS.Settings.ModifierMode.Pips", taskValue: "TTS.Settings.ModifierMode.TaskValue" }
  });

  reg("xpSystem", {
    name: "TTS.Settings.XpSystem.Name",
    hint: "TTS.Settings.XpSystem.Hint",
    scope: "world", config: true, type: String, default: "ticks",
    choices: { ticks: "TTS.Settings.XpSystem.Ticks", points: "TTS.Settings.XpSystem.Points" }
  });

  reg("sessionStartStoryPoints", {
    name: "TTS.Settings.SessionStartStoryPoints.Name",
    hint: "TTS.Settings.SessionStartStoryPoints.Hint",
    scope: "world", config: true, type: Number, default: DEFAULT_SESSION_STORY_POINTS,
    range: { min: 0, max: 12, step: 1 }
  });

  reg("maxStoryPoints", {
    name: "TTS.Settings.MaxStoryPoints.Name",
    hint: "TTS.Settings.MaxStoryPoints.Hint",
    scope: "world", config: true, type: Number, default: DEFAULT_MAX_STORY_POINTS,
    range: { min: 1, max: 30, step: 1 }
  });

  reg("suggestImprovementTick", {
    name: "TTS.Settings.SuggestImprovementTick.Name",
    hint: "TTS.Settings.SuggestImprovementTick.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });

  reg("autoKarmaStoryPoint", {
    name: "TTS.Settings.AutoKarmaStoryPoint.Name",
    hint: "TTS.Settings.AutoKarmaStoryPoint.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });

  reg("npcRollVisibility", {
    name: "TTS.Settings.NpcRollVisibility.Name",
    hint: "TTS.Settings.NpcRollVisibility.Hint",
    scope: "world", config: true, type: String, default: "public",
    choices: { public: "TTS.Settings.NpcRollVisibility.Public", gm: "TTS.Settings.NpcRollVisibility.Gm" }
  });

  reg("duelRepeatScope", {
    name: "TTS.Settings.DuelRepeatScope.Name",
    hint: "TTS.Settings.DuelRepeatScope.Hint",
    scope: "world", config: true, type: String, default: "duel",
    choices: { duel: "TTS.Settings.DuelRepeatScope.Duel", side: "TTS.Settings.DuelRepeatScope.Side" }
  });

  reg("initializedVersion", {
    scope: "world", config: false, type: String, default: ""
  });
}

export function getSetting(key) {
  return game.settings.get(SYSTEM_ID, key);
}
