/**
 * The Troubleshooters : les Risque-tout — système Foundry VTT v14 (non officiel).
 * Point d'entrée unique (bible §4.3).
 */
import { SYSTEM_ID, SYSTEM_PATH, THETROUBLESHOOTERS } from "./config.mjs";
import { registerSettings } from "./settings.mjs";
import { CharacterData } from "./data/actor-character.mjs";
import { NpcData } from "./data/actor-npc.mjs";
import { ArchetypeData, AbilityData, FlawData, HookData, KitData, LanguageData } from "./data/items.mjs";
import { TTSActor } from "./documents/actor.mjs";
import { TTSItem } from "./documents/item.mjs";
import { TTSCharacterSheet } from "./sheets/character-sheet.mjs";
import { TTSNpcSheet } from "./sheets/npc-sheet.mjs";
import { TTSItemSheet, ITEM_BODY_PARTIALS } from "./sheets/item-sheet.mjs";
import { RelayService } from "./relay/relay-service.mjs";
import { initializeSystem, ensureInitMacro, promptInitializationIfNeeded } from "./init/initialize.mjs";
import { registerCardHandlers } from "./chat/card-handlers.mjs";
import { onRenderChatMessage } from "./chat/chat-hooks.mjs";
import { CHAT_PARTIALS } from "./chat/cards.mjs";
import { rollCharacterSkill, rollNpcSkill } from "./services/roll-service.mjs";
import { rollPool } from "./services/pool-service.mjs";
import { openRollRequest } from "./apps/request-roll.mjs";
import { StoryPointsApp } from "./apps/story-points-app.mjs";
import { startNewScene } from "./services/scene-service.mjs";
import { startNewSession } from "./services/story-point-service.mjs";

Hooks.once("init", async () => {
  console.log(`${SYSTEM_ID} | Initialisation du système The Troubleshooters`);

  CONFIG.THETROUBLESHOOTERS = THETROUBLESHOOTERS;
  game.thetroubleshooters = {
    config: THETROUBLESHOOTERS,
    initializeSystem,
    relay: RelayService,
    rollSkill: rollCharacterSkill,
    rollNpcSkill,
    rollPool,
    requestRoll: openRollRequest,
    storyPoints: () => StoryPointsApp.open(),
    newScene: startNewScene,
    newSession: (opts) => startNewSession(StoryPointsApp.characters(), opts)
  };

  registerSettings();

  // Documents et modèles de données
  CONFIG.Actor.documentClass = TTSActor;
  CONFIG.Item.documentClass = TTSItem;
  Object.assign(CONFIG.Actor.dataModels, { character: CharacterData, npc: NpcData });
  Object.assign(CONFIG.Item.dataModels, {
    archetype: ArchetypeData, ability: AbilityData, flaw: FlawData,
    hook: HookData, kit: KitData, language: LanguageData
  });
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["vitality"], value: ["storyPoints.value"] },
    npc: { bar: ["vitality"], value: [] }
  };

  // Conditions (effets mécaniques en phase 5)
  CONFIG.statusEffects = Object.entries(THETROUBLESHOOTERS.conditions).map(([id, c]) => ({ id, name: c.label, img: c.img }));
  CONFIG.specialStatusEffects.DEFEATED = "outOfAction";
  CONFIG.specialStatusEffects.BLIND = "blinded";

  // Fiches
  const { Actors, Items } = foundry.documents.collections;
  Actors.registerSheet(SYSTEM_ID, TTSCharacterSheet, { types: ["character"], makeDefault: true, label: "TTS.Sheet.Character" });
  Actors.registerSheet(SYSTEM_ID, TTSNpcSheet, { types: ["npc"], makeDefault: true, label: "TTS.Sheet.Npc" });
  Items.registerSheet(SYSTEM_ID, TTSItemSheet, { makeDefault: true, label: "TTS.Sheet.Item" });

  // Gabarits partiels (corps des fiches d'Items, listes partagées)
  await foundry.applications.handlebars.loadTemplates([
    ...Object.values(ITEM_BODY_PARTIALS),
    `${SYSTEM_PATH}/templates/shared/item-list.hbs`,
    ...CHAT_PARTIALS
  ]);

  // Cartes de chat et relais MJ
  registerCardHandlers();
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);
});

Hooks.once("ready", async () => {
  RelayService.initialize();
  await ensureInitMacro();
  await promptInitializationIfNeeded();
});
