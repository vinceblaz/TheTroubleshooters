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
import { TTSCombat } from "./documents/combat.mjs";
import { TTSCharacterSheet } from "./sheets/character-sheet.mjs";
import { TTSNpcSheet } from "./sheets/npc-sheet.mjs";
import { TTSItemSheet, ITEM_BODY_PARTIALS } from "./sheets/item-sheet.mjs";
import { RelayService } from "./relay/relay-service.mjs";
import { initializeSystem, ensureInitMacro, promptInitializationIfNeeded } from "./init/initialize.mjs";
import { registerCardHandlers } from "./chat/card-handlers.mjs";
import { registerAttackHandlers } from "./chat/attack-handlers.mjs";
import { startAttack, catchBreath } from "./services/attack-service.mjs";
import { registerCombatHandlers, onRenderCombatTracker, onCombatStart, onUpdateCombat, onDeleteCombat } from "./services/combat-service.mjs";
import { registerConditionHandlers, onDeleteActiveEffect, addLevel, removeLevel } from "./services/condition-service.mjs";
import { registerHazardHandlers, inflictHazard } from "./services/hazard-service.mjs";
import { HazardsApp } from "./apps/hazards-app.mjs";
import { ChallengeApp, DuelApp } from "./apps/challenge-app.mjs";
import { NpcGenApp } from "./apps/npc-gen-app.mjs";
import { DebriefApp } from "./apps/debrief-app.mjs";
import { ProgressionApp } from "./apps/progression-app.mjs";
import { newCharacter, registerCharacterCreationHandlers } from "./services/character-creation-service.mjs";
import { ChargenApp } from "./apps/chargen-app.mjs";
import { registerChallengeHandlers } from "./services/challenge-service.mjs";
import { registerEquipmentHandlers, endOfStory } from "./services/equipment-service.mjs";
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
    newSession: (opts) => startNewSession(StoryPointsApp.characters(), opts),
    attack: startAttack,
    catchBreath,
    hazards: () => HazardsApp.open(),
    challenge: () => ChallengeApp.open(),
    duel: () => DuelApp.open(),
    newNpc: () => NpcGenApp.createAndOpen(),
    newCharacter,
    debrief: () => DebriefApp.open(),
    progression: actor => ProgressionApp.open(actor),
    npcCreation: actor => NpcGenApp.open(actor),
    characterCreation: actor => ChargenApp.open(actor),
    endOfStory: () => endOfStory(StoryPointsApp.characters()),
    inflictHazard,
    addConditionLevel: addLevel,
    removeConditionLevel: removeLevel
  };

  registerSettings();

  // Documents et modèles de données
  CONFIG.Actor.documentClass = TTSActor;
  CONFIG.Item.documentClass = TTSItem;
  CONFIG.Combat.documentClass = TTSCombat;
  Object.assign(CONFIG.Actor.dataModels, { character: CharacterData, npc: NpcData });
  Object.assign(CONFIG.Item.dataModels, {
    archetype: ArchetypeData, ability: AbilityData, flaw: FlawData,
    hook: HookData, kit: KitData, language: LanguageData
  });
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["vitality"], value: ["storyPoints.value"] },
    npc: { bar: ["vitality"], value: [] }
  };

  // Conditions (familles attaque / défense lues par le combat en phase 4, effets complets en phase 5)
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
    `${SYSTEM_PATH}/templates/shared/conditions-panel.hbs`,
    `${SYSTEM_PATH}/templates/actor/parts/kit-table.hbs`,
    `${SYSTEM_PATH}/templates/apps/parts/draft-footer.hbs`,
    ...["archetype", "skills", "traits", "languages", "kits", "hooks", "identity", "meeting"].map(n => `${SYSTEM_PATH}/templates/apps/parts/chargen-${n}.hbs`),
    `${SYSTEM_PATH}/templates/apps/parts/chargen-vitality.hbs`,
    `${SYSTEM_PATH}/templates/actor/parts/passport-stamps.hbs`,
    ...CHAT_PARTIALS
  ]);

  // Cartes de chat et relais MJ
  registerCardHandlers();
  registerAttackHandlers();
  registerCombatHandlers();
  registerConditionHandlers();
  registerHazardHandlers();
  registerChallengeHandlers();
  registerEquipmentHandlers();
  registerCharacterCreationHandlers();
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);

  // Combat (phase 4)
  Hooks.on("renderCombatTracker", onRenderCombatTracker);
  Hooks.on("combatStart", onCombatStart);
  Hooks.on("updateCombat", onUpdateCombat);
  Hooks.on("deleteCombat", onDeleteCombat);

  // Conditions (phase 5)
  Hooks.on("deleteActiveEffect", onDeleteActiveEffect);
});

Hooks.once("ready", async () => {
  document.body.classList.toggle("tts-reduced-fx", Boolean(game.settings.get(SYSTEM_ID, "reducedEffects")));
  RelayService.initialize();
  await ensureInitMacro();
  await promptInitializationIfNeeded();
});
