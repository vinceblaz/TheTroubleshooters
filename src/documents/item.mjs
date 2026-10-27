/**
 * Document Item du système.
 */
export class TTSItem extends Item {
  /** Icône par défaut selon le type (bibliothèque fournie avec Foundry). */
  static DEFAULT_ICONS = {
    archetype: "icons/svg/mystery-man.svg",
    ability: "icons/svg/upgrade.svg",
    flaw: "icons/svg/downgrade.svg",
    hook: "icons/svg/book.svg",
    kit: "icons/svg/item-bag.svg",
    language: "icons/svg/sound.svg"
  };

  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    const icon = TTSItem.DEFAULT_ICONS[this.type];
    if (icon && (!data.img || data.img === Item.DEFAULT_ICON)) this.updateSource({ img: icon });
  }
}
