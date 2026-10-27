/**
 * Relais MJ par socket (bible §4.5, D-018) — socle.
 *
 * Un joueur ne peut pas modifier un message de chat créé par un autre utilisateur.
 * Il envoie donc une demande ; le MJ actif la valide (règle pure) puis l'applique.
 * Phase 1 : infrastructure et règle de démonstration « ping ». Les flux réels
 * (inversion, défense, validation des PR…) s'enregistrent à partir de la phase 2.
 */
import { SYSTEM_ID } from "../config.mjs";
import { validateRelayRequest } from "../domain/relay/rules.mjs";

const CHANNEL = `system.${SYSTEM_ID}`;

export class RelayService {
  /** @type {Map<string, {rule:object, apply:Function}>} */
  static #handlers = new Map();

  /** Écoute le canal (appelé au hook « ready »). */
  static initialize() {
    game.socket.on(CHANNEL, payload => RelayService.#onMessage(payload));
    RelayService.register("ping", {
      rule: { type: "ping", immutable: [], transitions: {}, maxRolls: 0, requireOwner: false },
      apply: async ({ request }) => {
        console.log(`${SYSTEM_ID} | relais « ping » reçu de ${game.users.get(request.userId)?.name ?? request.userId}`);
      }
    });
  }

  /**
   * Enregistre un flux relayé.
   * @param {string} type
   * @param {{rule:object, apply:(ctx:{message?:ChatMessage, request:object, next:object})=>Promise<void>}} handler
   */
  static register(type, handler) {
    RelayService.#handlers.set(type, handler);
  }

  /** Le MJ actif traite les demandes (un seul MJ, pour éviter les doublons). */
  static get isResponsibleGM() {
    return game.user.isGM && game.users.activeGM?.id === game.user.id;
  }

  /**
   * Envoie une demande. Exécutée localement si l'utilisateur courant est le MJ actif.
   * @param {string} type
   * @param {{messageId?:string, actorUuid?:string, changes?:object, rolls?:Array}} request
   */
  static async request(type, request = {}) {
    const payload = { type, request: { ...request, userId: game.user.id } };
    if (RelayService.isResponsibleGM) return RelayService.#onMessage(payload);
    if (!game.users.activeGM) {
      ui.notifications.warn(game.i18n.localize("TTS.Relay.NoGM"));
      return;
    }
    game.socket.emit(CHANNEL, payload);
  }

  static async #onMessage({ type, request } = {}) {
    if (!RelayService.isResponsibleGM) return;
    const handler = RelayService.#handlers.get(type);
    if (!handler) return console.warn(`${SYSTEM_ID} | relais : type inconnu « ${type} »`);

    const message = request.messageId ? game.messages.get(request.messageId) : null;
    const current = message?.getFlag(SYSTEM_ID, "relay") ?? { state: "open" };
    const actor = request.actorUuid ? await fromUuid(request.actorUuid) : null;
    const user = game.users.get(request.userId);
    const isOwner = actor ? actor.testUserPermission(user, "OWNER") : false;

    const result = validateRelayRequest(handler.rule, current, { ...request, isOwner });
    if (!result.ok) {
      console.warn(`${SYSTEM_ID} | relais « ${type} » refusé : ${result.reason}`);
      return;
    }
    // Ordre imposé : la carte est mise à jour AVANT les effets irréversibles.
    if (message) await message.setFlag(SYSTEM_ID, "relay", result.next);
    await handler.apply({ message, request, next: result.next });
  }
}
