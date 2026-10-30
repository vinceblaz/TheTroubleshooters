/**
 * Équipement (bible chap. 13, LdB p. 108-116) : obtention des kits, entrepôt et objets trouvés,
 * kits bricolés, effets des descripteurs de gadget, fin de l'histoire, création d'un gadget fabriqué.
 */
import { THETROUBLESHOOTERS } from "../config.mjs";
import { RelayService } from "../relay/relay-service.mjs";
import { digits } from "../domain/dice/percentile.mjs";
import { carriedKitStatus } from "../domain/rules/character.mjs";
import { signatureStatus, checkPrerequisites, kitsToReturn, useJuryRigged, juryRiggedUses, gadgetTriggers,
  parseGadgetDescriptor, parseKitDescriptors, gadgetBuilt } from "../domain/rules/equipment.mjs";
import { createSpend } from "../domain/rules/spend.mjs";
import { spendStoryPoints } from "../domain/rules/story-points.mjs";
import { createCardMessage, getCard, updateCardMessage } from "../chat/cards.mjs";
import { logStoryPoints } from "./story-point-service.mjs";
import { addLevel } from "./condition-service.mjs";

const t = key => game.i18n.localize(key);
const f = (key, data) => game.i18n.format(key, data);
const abilityNames = actor => actor.items.filter(i => i.type === "ability" && i.system.acquired !== false).map(i => i.name);
const kitsOf = actor => actor.items.filter(i => i.type === "kit");

/* ---------------------------------------------------------------- */
/*  Onglet Matériel                                                 */
/* ---------------------------------------------------------------- */

/** Groupes de l'onglet Matériel : emportés, entrepôt, objets trouvés (D-060). */
export function kitGroups(actor) {
  const kits = [...kitsOf(actor)].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const row = kit => ({
    kit,
    originLabel: t(THETROUBLESHOOTERS.kitOrigins[kit.system.origin] ?? ""),
    categoryLabel: kit.system.category !== "standard" ? t(THETROUBLESHOOTERS.kitCategories[kit.system.category]) : "",
    returned: ["purchased", "mission"].includes(kit.system.origin),
    juryRigged: kit.system.origin === "juryRigged",
    gadget: (kit.system.descriptors ?? []).some(d => parseGadgetDescriptor(d.key)),
    weapons: kit.system.hasWeapon ? [kit.system.weapon, ...(kit.system.extraWeapons ?? [])].map(w => `${w.damage}dX`).join(" / ") : ""
  });
  const carried = kits.filter(k => k.system.carried).map(row);
  const storage = kits.filter(k => !k.system.carried && k.system.origin !== "found").map(row);
  const found = kits.filter(k => !k.system.carried && k.system.origin === "found").map(row);
  return {
    carried, storage, found,
    slots: carriedKitStatus(kits.map(k => k.system)),
    signature: signatureStatus(kits.map(k => ({ name: k.name, signature: k.system.signature, signatureDescription: k.system.signatureDescription })), abilityNames(actor))
  };
}

/* ---------------------------------------------------------------- */
/*  Obtenir un kit (glisser-déposer depuis le compendium)           */
/* ---------------------------------------------------------------- */

/**
 * Un kit déposé sur la fiche : choix de l'origine (personnel, mission, trouvé, bricolé, acheté avec des PR).
 * L'achat passe par une dépense soumise au Chef : le kit n'est ajouté qu'à la validation.
 * @returns {Promise<Item|null|false>} false si l'utilisateur annule
 */
export async function acquireKit(actor, source) {
  const prereq = checkPrerequisites(source.system.prerequisites, { abilityNames: abilityNames(actor) });
  const origins = Object.fromEntries(Object.entries(THETROUBLESHOOTERS.kitOrigins).map(([k, v]) => [k, t(v)]));
  origins.purchased = `${origins.purchased} (${source.system.storyPointCost} PR)`;
  const options = Object.entries(origins).map(([k, v]) => `<option value="${k}" ${k === "purchased" ? "selected" : ""}>${foundry.utils.escapeHTML(v)}</option>`).join("");
  const warn = prereq.ok ? "" : `<p class="tts-warning">${f("TTS.Kit.PrereqMissing", { list: prereq.missing.join(", ") })}</p>`;
  const data = await foundry.applications.api.DialogV2.prompt({
    window: { title: f("TTS.Kit.AcquireTitle", { name: source.name }) },
    classes: ["thetroubleshooters", "tts-dialog"],
    content: `${warn}<div class="form-group"><label>${t("TTS.Kit.Origin")}</label><select name="origin">${options}</select></div>
      <label class="tts-check-label"><input type="checkbox" name="carried" checked> ${t("TTS.Kit.Carried")}</label>
      <p class="hint">${t("TTS.Kit.AcquireHint")}</p>`,
    ok: { callback: (event, button) => ({ origin: button.form.elements.origin.value, carried: button.form.elements.carried.checked }) },
    rejectClose: false
  });
  if (!data) return false;
  const itemData = foundry.utils.mergeObject(source.toObject(), {
    "system.origin": data.origin, "system.carried": data.carried,
    "system.uses": data.origin === "juryRigged" ? 1 : null
  });
  delete itemData._id;
  if (data.origin !== "purchased") {
    const [item] = await actor.createEmbeddedDocuments("Item", [itemData]);
    return item;
  }
  // Achat : dépense soumise au Chef (PR réservés), kit ajouté à la validation (D-032).
  const cost = source.system.storyPointCost;
  const check = spendStoryPoints(actor.system.storyPoints.value, cost);
  if (!check.ok) { ui.notifications.warn(f("TTS.Notify.NotEnoughStoryPoints", { name: actor.name, cost })); return null; }
  const spend = createSpend({ type: "kit", cost, description: source.name, actorUuid: actor.uuid, actorName: actor.name });
  spend.typeLabel = t("TTS.Spend.Type.Kit");
  spend.kit = { name: source.name, data: itemData };
  await createCardMessage({ kind: "spend", spend }, { speaker: ChatMessage.getSpeaker({ actor }) });
  await actor.update({ "system.storyPoints.value": check.value });
  return null;
}

/** Après validation d'un achat de kit par le Chef (appelé par le relais, MJ). */
export async function deliverPurchasedKit(actor, spend) {
  if (!spend?.kit?.data || !["accepted", "modified"].includes(spend.status)) return;
  await actor.createEmbeddedDocuments("Item", [spend.kit.data]);
}

/* ---------------------------------------------------------------- */
/*  Utilisation : kits bricolés et descripteurs de gadget           */
/* ---------------------------------------------------------------- */

/** Bouton « Utiliser » d'un kit bricolé : un usage de moins, hors d'usage à 0. */
export async function useKit(actor, kit) {
  if (!kit?.isOwner || kit.system.origin !== "juryRigged") return;
  const { uses, broken } = useJuryRigged(kit.system.uses ?? 1);
  await kit.update({ "system.uses": uses, "system.broken": broken });
  if (broken) ui.notifications.info(f("TTS.Kit.UsedUp", { name: kit.name }));
}

/**
 * Kit utilisé comme matériel lors d'un jet : déclencheurs des descripteurs de gadget sur les unités du d%,
 * usage d'un kit bricolé. Exécuté par le propriétaire de l'acteur juste après le jet.
 * @returns {Promise<{kitName:string, effects:Array<{type:string, text:string, dice?:number}>}|null>}
 */
export async function applyKitUse(actor, kitId, task) {
  const kit = actor?.items.get(kitId);
  if (!kit || kit.type !== "kit") return null;
  const effects = [];
  const units = digits(task.result).units;
  for (const g of gadgetTriggers(kit.system.descriptors ?? [], units)) {
    if (g.type === "unreliable") { await kit.update({ "system.broken": true }); effects.push({ type: g.type, text: f("TTS.Gadget.Unreliable", { name: kit.name }) }); }
    if (g.type === "tiring") { await addLevel(actor, "exhausted"); effects.push({ type: g.type, text: t("TTS.Gadget.Tiring") }); }
    if (g.type === "dangerous") effects.push({ type: g.type, dice: g.dice, text: f("TTS.Gadget.Dangerous", { dice: g.dice }) });
    if (g.type === "veryDangerous") { await kit.update({ "system.broken": true }); effects.push({ type: g.type, dice: g.dice, text: f("TTS.Gadget.VeryDangerous", { dice: g.dice }) }); }
    if (g.type === "deafening") effects.push({ type: g.type, text: t("TTS.Gadget.Deafening") });
    if (g.type === "smoke") effects.push({ type: g.type, text: t("TTS.Gadget.Smoke") });
  }
  if (kit.system.origin === "juryRigged" && !kit.system.broken) {
    const { uses, broken } = useJuryRigged(kit.system.uses ?? 1);
    await kit.update({ "system.uses": uses, "system.broken": broken });
    effects.push({ type: "juryRigged", text: broken ? f("TTS.Kit.UsedUp", { name: kit.name }) : f("TTS.Kit.UsesLeft", { name: kit.name, uses }) });
  }
  return effects.length ? { kitName: kit.name, actorUuid: actor.uuid, effects } : null;
}

/* ---------------------------------------------------------------- */
/*  Fin de l'histoire                                               */
/* ---------------------------------------------------------------- */

/** Les kits achetés avec des PR et les kits de mission sont rendus (LdB p. 110). */
export async function endOfStory(actors) {
  if (!game.user.isGM) return;
  const plan = actors.map(a => ({ actor: a, kits: kitsToReturn(kitsOf(a).map(k => ({ id: k.id, name: k.name, origin: k.system.origin }))) }))
    .filter(p => p.kits.length);
  if (!plan.length) return ui.notifications.info(t("TTS.Kit.NothingToReturn"));
  const list = plan.map(p => `<li><strong>${foundry.utils.escapeHTML(p.actor.name)}</strong> : ${p.kits.map(k => foundry.utils.escapeHTML(k.name)).join(", ")}</li>`).join("");
  const ok = await foundry.applications.api.DialogV2.confirm({ classes: ["thetroubleshooters", "tts-dialog"],
    window: { title: t("TTS.Kit.EndOfStory") },
    content: `<p>${t("TTS.Kit.EndOfStoryPrompt")}</p><ul>${list}</ul>`,
    rejectClose: false
  });
  if (!ok) return;
  const rows = [];
  for (const p of plan) {
    await p.actor.deleteEmbeddedDocuments("Item", p.kits.map(k => k.id));
    rows.push({ name: p.actor.name, text: p.kits.map(k => k.name).join(", ") });
  }
  await logStoryPoints(t("TTS.Kit.EndOfStory"), rows, { reason: t("TTS.Kit.Returned") });
}

/* ---------------------------------------------------------------- */
/*  Gadget fabriqué (défi de fabrication)                           */
/* ---------------------------------------------------------------- */

export function registerEquipmentHandlers() {
  /* Création (ou modification) du kit à l'issue d'un défi de fabrication réussi (MJ) */
  RelayService.register("gadgetCreate", {
    rule: { immutable: [], transitions: {}, maxRolls: 0, requireOwner: false },
    apply: async ({ message, user }) => {
      if (!user.isGM) throw new Error(t("TTS.Init.GmOnly"));
      const card = foundry.utils.deepClone(getCard(message));
      const c = card?.challenge;
      if (!c?.gadget || !c.done || c.gadget.created) throw new Error(t("TTS.Gadget.NothingToCreate"));
      if (!gadgetBuilt(c.result)) throw new Error(t("TTS.Gadget.NotBuilt"));
      const g = c.gadget;
      const actor = await fromUuid(g.actorUuid);
      if (!actor) throw new Error(t("TTS.Gadget.NoOwner"));
      const descriptors = parseKitDescriptors(g.descriptors);
      if (g.kitId && actor.items.get(g.kitId)) {
        const kit = actor.items.get(g.kitId);
        await kit.update({ "system.descriptors": [...foundry.utils.deepClone(kit.system._source.descriptors), ...descriptors] });
      } else {
        await actor.createEmbeddedDocuments("Item", [{
          name: g.name || t("TTS.Gadget.DefaultName"), type: "kit", img: "icons/svg/lightning.svg",
          system: {
            category: g.category, descriptors, carried: false, storyPointCost: 0,
            origin: g.juryRigged ? "juryRigged" : "owned", uses: g.juryRigged ? juryRiggedUses(c.result) : null,
            description: `<p>${foundry.utils.escapeHTML(f("TTS.Gadget.MadeBy", { result: t(`TTS.Challenge.Result.${c.result}`) }))}</p>`
          }
        }]);
      }
      card.challenge.gadget.created = true;
      await updateCardMessage(message, card);
    }
  });
}

