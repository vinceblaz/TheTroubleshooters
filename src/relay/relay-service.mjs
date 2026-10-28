/**
 * Relais MJ par socket (bible §4.5, D-018).
 *
 * Un joueur ne peut pas modifier un message de chat créé par un autre utilisateur.
 * Toute mutation de carte passe donc par `dispatch` :
 *  - si l'utilisateur peut modifier le message (auteur ou MJ), la demande est exécutée localement ;
 *  - sinon elle est envoyée au MJ actif, qui la valide (règle pure) puis l'applique.
 * Dans les deux cas, la même règle de validation et le même `apply` sont utilisés.
 */
import { SYSTEM_ID } from "../config.mjs";
import { validateRelayRequest } from "../domain/relay/rules.mjs";

const CHANNEL = `system.${SYSTEM_ID}`;
const REPLY = "__reply";

export class RelayService {
  /** @type {Map<string, {rule:object, apply:Function}>} */
  static #handlers = new Map();

  /** Écoute le canal (appelé au hook « ready »). */
  static initialize() {
    game.socket.on(CHANNEL, payload => {
      if (payload?.type === REPLY) return RelayService.#onReply(payload);
      if (RelayService.isResponsibleGM) RelayService.#process(payload.type, payload.request);
    });
  }

  /**
   * Enregistre un flux.
   * @param {string} type
   * @param {{rule:object, apply:(ctx:{message:ChatMessage|null, actor:Actor|null, user:User, request:object, current:object})=>Promise<void>}} handler
   */
  static register(type, handler) {
    RelayService.#handlers.set(type, handler);
  }

  /** Le MJ actif traite les demandes (un seul MJ, pour éviter les doublons). */
  static get isResponsibleGM() {
    return game.user.isGM && game.users.activeGM?.id === game.user.id;
  }

  /**
   * Point d'entrée unique d'une mutation de carte.
   * @param {string} type
   * @param {{messageId?:string, actorUuid?:string, changes?:object, rolls?:Array, [k:string]:any}} request
   */
  static async dispatch(type, request = {}) {
    const full = { ...request, userId: game.user.id };
    const message = full.messageId ? game.messages.get(full.messageId) : null;
    const canWrite = game.user.isGM || (message && message.isAuthor);
    if (canWrite || !message) return RelayService.#process(type, full);
    if (!game.users.activeGM) {
      ui.notifications.warn(game.i18n.localize("TTS.Relay.NoGM"));
      return;
    }
    game.socket.emit(CHANNEL, { type, request: full });
  }

  /**
   * Informe le demandeur d'un refus ou d'une erreur : localement si c'est l'utilisateur courant,
   * sinon par une réponse socket (le MJ traite la demande, le joueur doit voir le message).
   */
  static #notify(user, level, text) {
    if (!user || user.id === game.user.id) return ui.notifications[level]?.(text);
    game.socket.emit(CHANNEL, { type: REPLY, userId: user.id, level, text });
  }

  static #onReply({ userId, level, text } = {}) {
    if (userId === game.user.id && text) ui.notifications[level === "error" ? "error" : "warn"](text);
  }

  static async #process(type, request = {}) {
    const handler = RelayService.#handlers.get(type);
    if (!handler) return console.warn(`${SYSTEM_ID} | relais : type inconnu « ${type} »`);

    const message = request.messageId ? game.messages.get(request.messageId) : null;
    const current = message?.getFlag(SYSTEM_ID, "relay") ?? { state: "open" };
    const actor = request.actorUuid ? await fromUuid(request.actorUuid) : null;
    const user = game.users.get(request.userId) ?? game.user;
    const isOwner = actor ? (user.isGM || actor.testUserPermission(user, "OWNER")) : user.isGM;

    const result = validateRelayRequest(handler.rule, current, { ...request, isOwner });
    if (!result.ok) {
      console.warn(`${SYSTEM_ID} | demande « ${type} » refusée : ${result.reason}`);
      RelayService.#notify(user, "warn", game.i18n.format("TTS.Relay.Refused", { reason: result.reason }));
      return;
    }
    try {
      await handler.apply({ message, actor, user, request, current });
    } catch (err) {
      console.error(`${SYSTEM_ID} | demande « ${type} » en erreur`, err);
      RelayService.#notify(user, "warn", err.message);
    }
  }
}
