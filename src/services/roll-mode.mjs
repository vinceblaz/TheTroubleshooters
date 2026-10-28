/**
 * Mode de jet (visibilité) — accès protégé au réglage cœur.
 */
import { SYSTEM_ID } from "../config.mjs";

/** Mode de jet courant de l'utilisateur, avec repli si le réglage cœur change de nom. */
export function coreRollMode() {
  try {
    return game.settings.get("core", "rollMode") ?? "publicroll";
  } catch {
    return "publicroll";
  }
}

/** Mode de jet par défaut : réglage du monde pour les PNJ, réglage de l'utilisateur sinon. */
export function defaultRollModeFor(actor) {
  if (actor?.type === "npc" && game.settings.get(SYSTEM_ID, "npcRollVisibility") === "gm") return "gmroll";
  return coreRollMode();
}
