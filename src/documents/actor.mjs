/**
 * Document Actor du système.
 */
import { clampStoryPoints } from "../domain/rules/character.mjs";
import { SYSTEM_ID } from "../config.mjs";

export class TTSActor extends Actor {
  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    const token = {};
    if (this.type === "character") {
      token.actorLink = true;
      token.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    } else {
      token.disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
    }
    token.bar1 = { attribute: "vitality" };
    this.updateSource({ prototypeToken: token });
  }

  /** @override — borne les points de récit au plafond du monde. */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user);
    if (allowed === false) return false;

    const sp = foundry.utils.getProperty(changes, "system.storyPoints.value");
    if (this.type === "character" && sp !== undefined) {
      const max = game.settings.get(SYSTEM_ID, "maxStoryPoints");
      const { value, overflow } = clampStoryPoints(sp, max);
      foundry.utils.setProperty(changes, "system.storyPoints.value", value);
      if (overflow > 0) {
        ui.notifications?.info(game.i18n.format("TTS.Notify.StoryPointsCapped", { name: this.name, max }));
      }
    }
  }

  /** Kits du personnage. */
  get kits() {
    return this.items.filter(i => i.type === "kit");
  }
}
