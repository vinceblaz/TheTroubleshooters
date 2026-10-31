/**
 * Macro « Nouveau Risque-tout » : assistant pas à pas des étapes 1 à 6 du livre (CharacterWizardApp).
 * La fiche est créée à la fin. Un joueur sans le droit de créer des acteurs passe par le relais MJ :
 * le MJ crée une fiche vide dont le joueur est propriétaire (associée à son compte s'il n'a pas de personnage),
 * puis l'assistant du joueur la remplit et l'ouvre.
 */
import { SYSTEM_ID } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { CharacterWizardApp } from "../apps/character-wizard-app.mjs";

/** Point d'entrée de la macro. */
export function newCharacter() {
  return CharacterWizardApp.open();
}

/** Bouton « Nouveau Risque-tout » en tête du répertoire des acteurs (pour tous, sans passer par une macro). */
function addDirectoryButton(_app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".tts-new-character")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tts-new-character";
  button.innerHTML = `<i class="fa-solid fa-passport"></i> ${game.i18n.localize("TTS.Wizard.Button")}`;
  button.addEventListener("click", ev => { ev.preventDefault(); newCharacter(); });
  const host = root.querySelector(".header-actions") ?? root.querySelector(".directory-header");
  if (host) host.append(button); else root.prepend(button);
}

export function registerCharacterCreationHandlers() {
  Hooks.on("renderActorDirectory", addDirectoryButton);
  RelayService.register("characterCreate", {
    rule: { immutable: [], transitions: {}, maxRolls: 0, requireOwner: false },
    apply: async ({ user, request }) => {
      if (user.isGM) return;
      const actor = await Actor.create({
        name: String(request.name ?? "").trim() || game.i18n.localize("TTS.NewCharacter.DefaultName"),
        type: "character",
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
        flags: { [SYSTEM_ID]: { wizardFor: user.id } }
      });
      if (actor && !user.character) await user.update({ character: actor.id });
    }
  });
  // Chez le joueur : remplir la fiche que le MJ vient de créer avec le brouillon de l'assistant.
  Hooks.on("createActor", actor => {
    if (game.user.isGM || actor.getFlag(SYSTEM_ID, "wizardFor") !== game.user.id) return;
    setTimeout(async () => {
      if (!actor.isOwner) return;
      try {
        const wizard = CharacterWizardApp.pending ?? new CharacterWizardApp();
        await wizard.finishOn(actor);
        await actor.unsetFlag(SYSTEM_ID, "wizardFor");
      } catch (err) { CharacterWizardApp.reportError(err); }
    }, 300);
  });
}
