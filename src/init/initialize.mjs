/**
 * Séquence d'initialisation du système (bible §4.5, D-017) — repris de Metro 2033 §252.
 *
 * Crée ou met à jour, dans le monde, les compendiums du système à partir de data/catalogs/.
 * Idempotente : chaque entrée porte flags.thetroubleshooters.seedKey ; relancer ne crée pas
 * de doublon, met à jour ce qui a changé et ne supprime jamais rien.
 */
import { SYSTEM_ID, SYSTEM_PATH } from "../config.mjs";
import { planSeed, needsInitialization } from "../domain/init/seed-plan.mjs";

export const MACRO_NAME = "The Troubleshooters — Initialiser le système";

/** Étapes ordonnées. Chaque nouvelle phase ajoute ses catalogues ici. */
export const INIT_STEPS = [
  { key: "hooks", catalog: "hooks.json", pack: "tts-hooks", label: "TTS.Init.Pack.Hooks", type: "Item" }
];

async function loadCatalog(file) {
  const response = await fetch(`${SYSTEM_PATH}/data/catalogs/${file}`);
  if (!response.ok) throw new Error(`${file} : HTTP ${response.status}`);
  const entries = await response.json();
  return entries.map(e => ({
    seedKey: e.seedKey,
    data: foundry.utils.mergeObject(e.data, { flags: { [SYSTEM_ID]: { seedKey: e.seedKey } } }, { inplace: false })
  }));
}

async function ensurePack({ pack, label, type }) {
  const collection = `world.${pack}`;
  let compendium = game.packs.get(collection);
  if (!compendium) {
    const CC = foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
    compendium = await CC.createCompendium({ type, label: game.i18n.localize(label), name: pack, package: "world" });
  }
  if (compendium.locked) await compendium.configure({ locked: false });
  return compendium;
}

async function runStep(step) {
  const catalog = await loadCatalog(step.catalog);
  const compendium = await ensurePack(step);
  const docs = await compendium.getDocuments();
  const existing = docs.map(d => ({ id: d.id, seedKey: d.getFlag(SYSTEM_ID, "seedKey"), data: d.toObject() }));
  const plan = planSeed(catalog, existing);

  const cls = getDocumentClass(step.type);
  if (plan.create.length) await cls.createDocuments(plan.create, { pack: compendium.collection });
  if (plan.update.length) {
    const updates = plan.update.map(({ id, data }) => {
      const { type, ...rest } = data;                 // le type d'un document existant ne change pas
      return { ...rest, _id: id };
    });
    await cls.updateDocuments(updates, { pack: compendium.collection });
  }

  return {
    label: game.i18n.localize(step.label),
    created: plan.create.length,
    updated: plan.update.length,
    unchanged: plan.unchanged.length,
    orphans: plan.orphans,
    duplicates: plan.duplicates
  };
}

/** Lance toute la séquence (MJ seulement), tolérante aux échecs d'étape, avec rapport privé. */
export async function initializeSystem() {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("TTS.Init.GmOnly"));
    return;
  }
  const lines = [];
  let failures = 0;
  for (const step of INIT_STEPS) {
    try {
      const r = await runStep(step);
      lines.push(game.i18n.format("TTS.Init.StepReport", r)
        + (r.orphans.length ? ` — ${game.i18n.format("TTS.Init.Orphans", { list: r.orphans.join(", ") })}` : "")
        + (r.duplicates.length ? ` — ${game.i18n.format("TTS.Init.Duplicates", { list: r.duplicates.join(", ") })}` : ""));
    } catch (err) {
      failures++;
      console.error(`${SYSTEM_ID} | initialisation, étape ${step.key}`, err);
      lines.push(game.i18n.format("TTS.Init.StepFailed", { label: game.i18n.localize(step.label), error: err.message }));
    }
  }
  if (!failures) await game.settings.set(SYSTEM_ID, "initializedVersion", game.system.version);

  await ChatMessage.create({
    content: `<h3>${game.i18n.localize("TTS.Init.ReportTitle")}</h3><ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul>`,
    whisper: [game.user.id],
    speaker: { alias: game.system.title }
  });
  ui.notifications[failures ? "warn" : "info"](game.i18n.localize(failures ? "TTS.Init.DoneWithErrors" : "TTS.Init.Done"));
}

/** Crée la macro MJ si elle n'existe pas encore dans le monde. */
export async function ensureInitMacro() {
  if (!game.user.isGM) return;
  if (game.macros.find(m => m.name === MACRO_NAME)) return;
  await Macro.create({
    name: MACRO_NAME,
    type: "script",
    img: "icons/svg/book.svg",
    command: "game.thetroubleshooters.initializeSystem();"
  });
}

/** Au chargement : propose l'initialisation à la première installation et après chaque mise à jour. */
export async function promptInitializationIfNeeded() {
  if (!game.user.isGM) return;
  const done = game.settings.get(SYSTEM_ID, "initializedVersion");
  if (!needsInitialization(done, game.system.version)) return;
  const proceed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("TTS.Init.PromptTitle") },
    content: `<p>${game.i18n.format("TTS.Init.PromptContent", { version: game.system.version })}</p>`,
    rejectClose: false
  });
  if (proceed) await initializeSystem();
}
