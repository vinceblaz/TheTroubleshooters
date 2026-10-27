/**
 * Aides communes aux fiches (dépendantes de Foundry).
 */

/** Enrichit un texte HTML (liens, secrets) — API v13+ avec repli. */
export async function enrich(html, document) {
  const TE = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
  return TE.enrichHTML(html ?? "", {
    secrets: document?.isOwner ?? false,
    relativeTo: document,
    rollData: document?.getRollData?.() ?? {}
  });
}

/** Demande confirmation puis supprime un Item intégré. */
export async function confirmDeleteItem(item) {
  if (!item) return;
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("TTS.Sheet.DeleteTitle") },
    content: `<p>${game.i18n.format("TTS.Sheet.DeleteConfirm", { name: foundry.utils.escapeHTML?.(item.name) ?? item.name })}</p>`,
    rejectClose: false
  });
  if (confirmed) await item.delete();
}

/** Retrouve l'Item intégré désigné par l'élément cliqué (data-item-id sur un ancêtre). */
export function itemFromEvent(actor, target) {
  const id = target.closest("[data-item-id]")?.dataset.itemId;
  return id ? actor.items.get(id) : null;
}

/** Record clé → libellé localisé (pour selectOptions). */
export function localizedRecord(record) {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, game.i18n.localize(typeof v === "string" ? v : v.label)]));
}
