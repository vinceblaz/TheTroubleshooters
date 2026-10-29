/**
 * Outil du Chef « Dangers » (bible §11.2, LdB p. 102-103).
 * Les personnages concernés sont les jetons sélectionnés ; pour une explosion, les jetons ciblés
 * sont dans les zones adjacentes (moitié des dégâts). Les zones restent narratives (règle d'or).
 */
import { SYSTEM_PATH } from "../config.mjs";
import { fallCheck, explosionRings, EXPLOSIVES, POISONS, FIRE_DICE, THICK_CLOTHES_PIPS, DROWNING_PIPS } from "../domain/combat/hazards.mjs";
import { inflictHazard, createHazardCheck } from "../services/hazard-service.mjs";
import { logStoryPoints } from "../services/story-point-service.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const t = key => game.i18n.localize(key);

const unique = list => [...new Map(list.filter(Boolean).map(a => [a.uuid, a])).values()];
const selectedActors = () => unique(canvas?.tokens?.controlled.map(tk => tk.actor) ?? []);
const targetedActors = () => unique([...game.user.targets].map(tk => tk.actor));

export class HazardsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "tts-hazards",
    tag: "form",
    classes: ["thetroubleshooters", "tts-app", "tts-hazards"],
    window: { title: "TTS.Hazard.AppTitle", resizable: true, icon: "fa-solid fa-triangle-exclamation" },
    position: { width: 520, height: "auto" },
    form: { closeOnSubmit: false },
    actions: {
      fall: HazardsApp.#onFall,
      explosion: HazardsApp.#onExplosion,
      fireZone: HazardsApp.#onFireZone,
      drowning: HazardsApp.#onDrowning,
      poison: HazardsApp.#onPoison,
      ambush: HazardsApp.#onAmbush,
      sniper: HazardsApp.#onSniper,
      damage: HazardsApp.#onDamage
    }
  };

  static PARTS = { body: { template: `${SYSTEM_PATH}/templates/apps/hazards.hbs` } };

  static #instance = null;

  static open() {
    if (!game.user.isGM) return ui.notifications.warn(t("TTS.Init.GmOnly"));
    HazardsApp.#instance ??= new HazardsApp();
    return HazardsApp.#instance.render({ force: true });
  }

  /** @override */
  async _prepareContext() {
    return {
      explosives: Object.fromEntries(Object.entries(EXPLOSIVES).map(([k, d]) => [k, `${t(`TTS.Hazard.Explosive.${k}`)} (${d}dX)`])),
      poisons: Object.fromEntries(Object.entries(POISONS).map(([k, p]) => [k, `${t(`TTS.Hazard.Poison.${k}`)} (${p.strength})`])),
      drowningPreps: Object.fromEntries(Object.entries(DROWNING_PIPS).map(([k, p]) => [k, `${t(`TTS.Hazard.DrowningPrep.${k}`)} (${p > 0 ? "+" : ""}${p})`])),
      thickPips: THICK_CLOTHES_PIPS
    };
  }

  #data() {
    return new foundry.applications.ux.FormDataExtended(this.element).object;
  }

  #require(list) {
    if (!list.length) ui.notifications.warn(t("TTS.Hazard.NoActors"));
    return list.length > 0;
  }

  static async #onFall() {
    const d = this.#data();
    const actors = selectedActors();
    if (!this.#require(actors)) return;
    const check = fallCheck({ height: Number(d.height) || 0, voluntary: Boolean(d.voluntary) });
    if (!check.required) return ui.notifications.info(t("TTS.Hazard.FallNoRoll"));
    await createHazardCheck({ kind: "fall", label: `${t("TTS.Hazard.Fall")} (${d.height} m)`, skill: "agility", pips: check.pips,
      note: t("TTS.Hazard.FallNote"), actors });
  }

  static async #onExplosion() {
    const d = this.#data();
    const dice = Number(d.explosionDice) || EXPLOSIVES[d.explosive] || 0;
    const zone = selectedActors();
    const adjacent = targetedActors().filter(a => !zone.some(z => z.uuid === a.uuid));
    if (!this.#require([...zone, ...adjacent])) return;
    const rings = explosionRings(dice);
    const label = t("TTS.Hazard.Explosion");
    await inflictHazard({ kind: "explosion", label: `${label} (${rings[0]}dX)`, actors: zone, dice: rings[0], soak: true });
    if (rings[1]) await inflictHazard({ kind: "explosion", label: `${label} — ${t("TTS.Hazard.Adjacent")} (${rings[1]}dX)`, actors: adjacent, dice: rings[1], soak: true });
    const further = rings.slice(2);
    await logStoryPoints(label, [{ name: "", text: game.i18n.format("TTS.Hazard.Rings", { rings: rings.map(r => `${r}dX`).join(" → ") }) }],
      { reason: further.length ? t("TTS.Hazard.FurtherRings") : "" });
  }

  static async #onFireZone() {
    const actors = selectedActors();
    if (!this.#require(actors)) return;
    await inflictHazard({ kind: "fireZone", label: t("TTS.Hazard.FireZone"), actors, dice: FIRE_DICE, soak: false });
    await createHazardCheck({ kind: "fireZone", label: t("TTS.Hazard.FireZone"), skill: "agility",
      note: game.i18n.format("TTS.Hazard.FireNote", { pips: THICK_CLOTHES_PIPS }), actors });
  }

  static async #onDrowning() {
    const d = this.#data();
    const actors = selectedActors();
    if (!this.#require(actors)) return;
    await createHazardCheck({ kind: "drowning", label: t("TTS.Hazard.Drowning"), skill: "endurance", pips: DROWNING_PIPS[d.drowningPrep] ?? 0,
      note: t("TTS.Hazard.DrowningNote"), actors });
  }

  static async #onPoison() {
    const d = this.#data();
    const actors = selectedActors();
    if (!this.#require(actors)) return;
    const custom = Number(d.poisonStrength) || 0;
    const key = custom ? "" : d.poison;
    const strength = custom || POISONS[key]?.strength || 50;
    const label = key ? t(`TTS.Hazard.Poison.${key}`) : `${t("TTS.Hazard.PoisonCustom")} (${strength})`;
    await createHazardCheck({ kind: "poison", label, skill: "endurance", note: game.i18n.format("TTS.Hazard.PoisonNote", { strength }),
      actors, extra: { poison: key, strength } });
  }

  static async #onAmbush() {
    const actors = selectedActors().filter(a => a.type === "character");
    if (!this.#require(actors)) return;
    await createHazardCheck({ kind: "ambush", label: t("TTS.Hazard.AmbushTitle"), skill: "vigilance", note: t("TTS.Hazard.AmbushNote"), actors });
  }

  static async #onSniper() {
    const shooters = selectedActors().filter(a => a.type === "character");
    const target = targetedActors()[0] ?? null;
    if (!this.#require(shooters)) return;
    await createHazardCheck({ kind: "sniper", label: t("TTS.Hazard.SniperTitle"), skill: "stealth",
      note: game.i18n.format("TTS.Hazard.SniperNote", { target: target?.name ?? t("TTS.Attack.NoTarget") }), actors: shooters,
      extra: { targetUuid: target?.uuid ?? "" } });
  }

  static async #onDamage() {
    const d = this.#data();
    const actors = selectedActors();
    if (!this.#require(actors)) return;
    const dice = Math.max(1, Number(d.damageDice) || 1);
    await inflictHazard({ kind: "generic", label: d.damageLabel || t("TTS.Hazard.Generic"), actors, dice, soak: Boolean(d.damageSoak) });
  }
}

