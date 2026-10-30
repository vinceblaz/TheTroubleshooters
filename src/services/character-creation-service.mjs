/**
 * Création d'un Risque-tout depuis une macro (MJ ou joueur).
 * Un joueur sans le droit de créer des acteurs passe par le relais MJ : le MJ crée la fiche, en donne la propriété
 * au joueur (et l'associe à son compte s'il n'a pas encore de personnage) ; l'assistant de création s'ouvre chez le joueur.
 */
import { SYSTEM_ID } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { ChargenApp } from "../apps/chargen-app.mjs";

const t = key => game.i18n.localize(key);
const OWNER = () => CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Boîte de saisie : nom (et, pour le MJ, joueur propriétaire). */
async function askNewCharacter() {
  const players = game.users.filter(u => !u.isGM);
  const ownerField = game.user.isGM && players.length ? `
    <div class="form-group"><label>${t("TTS.NewCharacter.Owner")}</label>
      <select name="owner"><option value="">${t("TTS.NewCharacter.NoOwner")}</option>${players.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join("")}</select></div>` : "";
  return foundry.applications.api.DialogV2.prompt({
    classes: ["thetroubleshooters", "tts-dialog"],
    window: { title: t("TTS.NewCharacter.Title"), icon: "fa-solid fa-passport" },
    content: `<div class="form-group"><label>${t("TTS.Sheet.Name")}</label><input type="text" name="name" value="${esc(t("TTS.NewCharacter.DefaultName"))}" autofocus></div>${ownerField}
      <p class="hint">${t("TTS.NewCharacter.Hint")}</p>`,
    ok: { label: t("TTS.NewCharacter.Create"), icon: "fa-solid fa-user-plus",
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
    rejectClose: false
  });
}

/** Données de l'acteur à créer pour un utilisateur donné. */
function characterData(name, userId) {
  const data = { name: name?.trim() || t("TTS.NewCharacter.DefaultName"), type: "character" };
  if (userId) {
    data.ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, [userId]: OWNER() };
    data.flags = { [SYSTEM_ID]: { openChargenFor: userId } };
  }
  return data;
}

/** Point d'entrée de la macro « Nouveau Risque-tout ». */
export async function newCharacter() {
  const input = await askNewCharacter();
  if (!input) return null;
  if (game.user.isGM) {
    const owner = input.owner ? game.users.get(input.owner) : null;
    const actor = await Actor.create(characterData(input.name, owner?.id ?? null));
    if (owner && !owner.character) await owner.update({ character: actor.id });
    if (!owner) ChargenApp.open(actor);
    else ui.notifications.info(game.i18n.format("TTS.NewCharacter.CreatedFor", { name: actor.name, user: owner.name }));
    return actor;
  }
  if (game.user.can("ACTOR_CREATE")) {
    const actor = await Actor.create({ name: input.name?.trim() || t("TTS.NewCharacter.DefaultName"), type: "character" });
    if (actor) ChargenApp.open(actor);
    return actor;
  }
  if (!game.users.activeGM) return ui.notifications.warn(t("TTS.Relay.NoGM"));
  await RelayService.dispatch("characterCreate", { name: input.name }, { gmOnly: true });
  ui.notifications.info(t("TTS.NewCharacter.Requested"));
  return null;
}

export function registerCharacterCreationHandlers() {
  RelayService.register("characterCreate", {
    rule: { immutable: [], transitions: {}, maxRolls: 0, requireOwner: false },
    apply: async ({ user, request }) => {
      if (user.isGM) return;
      const actor = await Actor.create(characterData(request.name, user.id));
      if (!user.character) await user.update({ character: actor.id });
    }
  });
  // Chez le joueur : ouvrir l'assistant de création de la fiche qu'on vient de lui confier.
  Hooks.on("createActor", actor => {
    if (actor.getFlag(SYSTEM_ID, "openChargenFor") !== game.user.id || game.user.isGM) return;
    setTimeout(() => { if (actor.isOwner) ChargenApp.open(actor); }, 250);
  });
}
