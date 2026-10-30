/**
 * Assistant de création de Risque-tout (bible chap. 14, LdB p. 32-39) — toutes les étapes sur une seule page.
 * Modèle commun : DraftApp (brouillon flags.thetroubleshooters.chargen, contrôles, Appliquer).
 * Règle d'or : seuls les comptes (capacités, désavantages, kits, compétences) bloquent ; le reste avertit.
 */
import { SYSTEM_ID, SYSTEM_PATH, THETROUBLESHOOTERS } from "../config.mjs";
import { SKILL_KEYS } from "../domain/rules/skills.mjs";
import { skillsFromArchetype, skillsFromList, customizeSkills, derivedFromSkills, startingLanguages, checkTraits,
  checkKits, hookConflicts, ARCHETYPE_VALUES } from "../domain/rules/chargen.mjs";
import { checkPrerequisites } from "../domain/rules/equipment.mjs";
import { DESIGN_IDEAS, MEETING_PLACES, tableEntry } from "../domain/rules/chargen-tables.mjs";
import { DraftApp } from "./draft-app.mjs";

const t = key => game.i18n.localize(key);
const skillLabel = k => t(THETROUBLESHOOTERS.skills[k]?.label ?? k);
const PACKS = { archetype: "world.tts-archetypes", ability: "world.tts-abilities", flaw: "world.tts-flaws", kit: "world.tts-kits", hook: "world.tts-hooks" };

const EMPTY = () => ({
  mode: "archetype", archetype: "", atypical: Array(11).fill(""),
  abilities: [], extraAbilities: ["", "", ""], flaw: "", extraFlaw: "",
  origin: "french", native: "", extraLangs: ["", ""],
  kitPicks: ["", "", ""], freeKits: ["", "", "", "", ""], signature: "", signatureDescription: "",
  hooks: ["", ""],
  transfers: [{ from: "", to: "" }, { from: "", to: "" }], replacements: [{ from: "", to: "" }, { from: "", to: "" }], swap: { a: "", b: "" },
  identity: { concept: "", nationality: "", birthplace: "", residence: "", age: "", height: "", weight: "", distinctiveFeatures: "" },
  meeting: ""
});

/** Documents d'un type : compendium du système, puis objets du monde (même nom : le monde l'emporte). */
async function catalog(type) {
  const map = new Map();
  const pack = game.packs.get(PACKS[type]);
  if (pack) for (const d of await pack.getDocuments()) map.set(d.name, d);
  for (const d of game.items.filter(i => i.type === type)) map.set(d.name, d);
  return map;
}

export class ChargenApp extends DraftApp {
  static DEFAULT_OPTIONS = {
    classes: ["tts-chargen"],
    window: { title: "TTS.Chargen.Title", icon: "fa-solid fa-user-plus" },
    position: { width: 760, height: 820 },
    actions: { rollIdea: ChargenApp.#onRollIdea, rollMeeting: ChargenApp.#onRollMeeting }
  };

  static DRAFT_FLAG = "chargen";
  static I18N = { apply: "TTS.Chargen.Apply", applyPrompt: "TTS.Chargen.ApplyPrompt", applied: "TTS.Chargen.Applied",
    reset: "TTS.Chargen.Reset", resetPrompt: "TTS.Chargen.ResetPrompt" };

  static PARTS = { body: { template: `${SYSTEM_PATH}/templates/apps/chargen.hbs`, scrollable: [""] } };

  /** @param {Actor} actor */
  static open(actor) {
    if (!actor?.isOwner || actor.type !== "character") return;
    return new ChargenApp({ actor, id: `tts-chargen-${actor.id}` }).render({ force: true });
  }

  initialDraft() { return EMPTY(); }

  get title() { return `${t("TTS.Chargen.Title")} — ${this.actor.name}`; }

  /** Calcule l'état complet de la création à partir du brouillon. */
  async evaluate() {
    const d = this.draft;
    const [archetypes, abilities, flaws, kits, hooks] = await Promise.all(["archetype", "ability", "flaw", "kit", "hook"].map(catalog));
    const arch = d.mode === "archetype" ? archetypes.get(d.archetype) : null;
    const as = arch?.system;
    const base = as ? skillsFromArchetype(as.skills) : skillsFromList(d.atypical);
    const custom = customizeSkills(base, {
      transfers: d.transfers.filter(x => x.from && x.to),
      replacements: d.replacements.filter(x => x.from && x.to),
      swaps: d.swap.a && d.swap.b ? [d.swap] : []
    });
    const skills = custom.skills;
    const derived = derivedFromSkills(skills);
    const extras = d.extraAbilities.slice(0, as ? 2 : 3).filter(Boolean);
    const abilityNames = [...new Set([...(as ? d.abilities.filter(n => as.abilities.includes(n)) : []), ...extras])];
    const flawNames = [...new Set([d.flaw, d.extraFlaw].filter(Boolean))];
    const inList = (list, n) => !as || list.includes(n);   // atypique : choix libre (LdB p. 34)
    const prereqOk = name => {
      const a = abilities.get(name);
      if (!a) return true;
      const skillOk = (a.system.prerequisites?.skills ?? []).every(p => (skills[p.key] ?? 0) >= p.min);
      const abilOk = (a.system.prerequisites?.abilities ?? []).every(n => abilityNames.includes(n));
      return skillOk && abilOk;
    };
    const traits = checkTraits({
      abilities: abilityNames.map(n => ({ name: n, level: abilities.get(n)?.system.level ?? 0, inList: inList(as?.abilities ?? [], n), prereqOk: prereqOk(n) })),
      flaws: flawNames.map(n => ({ name: n, inList: inList(as?.flaws ?? [], n) }))
    });
    // Atypique : 5 kits libres, traités comme 3 « lignes » + 2 libres pour le contrôle.
    const freeSlots = as ? 2 : 5;
    const archKitLines = as ? as.kits : d.freeKits.slice(0, 3);
    const picks = as ? archKitLines.map((line, i) => { const o = line.split("|").map(x => x.trim()); return o.includes(d.kitPicks[i]) ? d.kitPicks[i] : o[0]; }) : archKitLines;
    const free = as ? d.freeKits.slice(0, 2) : d.freeKits.slice(3, 5);
    const kitCheck = checkKits({ archetypeKits: archKitLines, picks, free, signature: d.signature });
    const kitWarnings = [...(as ? free : d.freeKits)].filter(Boolean)
      .map(n => ({ n, r: checkPrerequisites(kits.get(n)?.system.prerequisites ?? "", { abilityNames }) }))
      .filter(x => !x.r.ok).map(x => `${x.n} : ${x.r.missing.join(", ")}`);
    const takenHooks = game.actors.filter(a => a.type === "character" && a.id !== this.actor.id)
      .flatMap(a => a.items.filter(i => i.type === "hook").map(i => i.name));
    const conflicts = hookConflicts(d.hooks.filter(Boolean), takenHooks);
    const languages = startingLanguages({ origin: d.origin, native: d.native, extra: d.extraLangs.slice(0, derived.extraLanguages) });
    let errors = [...custom.errors.map(e => t(`TTS.Chargen.Error.${e}`)), ...traits.errors.map(e => t(`TTS.Chargen.Error.${e}`)),
      ...kitCheck.errors.map(e => t(`TTS.Chargen.Error.${e.split(":")[0]}`))];
    if (d.mode === "archetype" && !arch) errors.push(t("TTS.Chargen.Error.no-archetype"));
    if (d.mode === "atypical" && d.atypical.filter(Boolean).length !== 11) errors.push(t("TTS.Chargen.Error.atypical-skills"));
    errors = [...new Set(errors)];
    const warnings = [
      ...traits.warnings.map(w => (w.startsWith("prereq:") ? `${w.slice(7)} : ${t("TTS.Chargen.Warn.prereq")}` : t(`TTS.Chargen.Warn.${w}`))),
      ...kitWarnings.map(w => `${t("TTS.Kit.Prerequisites")} — ${w}`),
      ...conflicts.map(h => `${h} : ${t("TTS.Chargen.Warn.hookTaken")}`)
    ];
    return { arch, as, archetypes, abilities, flaws, kits, hooks, skills, derived, abilityNames, flawNames, picks, kitList: kitCheck.kits, languages, errors, warnings, freeSlots };
  }

  /** @override */
  async _prepareContext(options) {
    const base = await super._prepareContext(options);
    const c = base.c;
    const d = this.draft;
    const opts = (map, filter = () => true) => ({ "": "—", ...Object.fromEntries([...map.values()].filter(filter).map(x => [x.name, x.name]).sort((a, b) => a[1].localeCompare(b[1]))) });
    const skillOpts = { "": "—", ...Object.fromEntries(SKILL_KEYS.map(k => [k, skillLabel(k)]).sort((a, b) => a[1].localeCompare(b[1]))) };
    const abilityLabel = a => `${a.name} (${t("TTS.Ability.LevelShort")} ${a.system.level})`;
    return {
      ...base,
      archetypeOptions: opts(c.archetypes),
      archDescription: c.as?.description ?? "",
      atypicalSlots: ARCHETYPE_VALUES.map((v, i) => ({ i, value: v, key: d.atypical[i] })),
      skillOpts,
      skillRows: SKILL_KEYS.filter(k => c.skills[k] > 15).map(k => ({ label: skillLabel(k), value: c.skills[k] })).sort((a, b) => b.value - a.value),
      archAbilities: (c.as?.abilities ?? []).map((n, i) => ({ i, name: n, checked: d.abilities.includes(n), level: c.abilities.get(n)?.system.level ?? "?" })),
      abilityOpts: { "": "—", ...Object.fromEntries([...c.abilities.values()].map(a => [a.name, abilityLabel(a)]).sort((a, b) => a[1].localeCompare(b[1]))) },
      archFlaws: (c.as?.flaws ?? []).map(n => ({ name: n, checked: d.flaw === n })),
      flawOpts: opts(c.flaws),
      kitLines: (c.as?.kits ?? []).map((line, i) => ({ i, n: i + 1, options: Object.fromEntries(line.split("|").map(x => [x.trim(), x.trim()])), single: !line.includes("|"), pick: c.picks[i] })),
      extraAbilitySlots: Array.from({ length: c.as ? 2 : 3 }, (_, i) => ({ i, n: i + 1, value: d.extraAbilities[i] ?? "" })),
      kitOpts: opts(c.kits),
      freeKitSlots: Array.from({ length: c.freeSlots }, (_, i) => ({ i, n: i + 1, value: d.freeKits[i] ?? "" })),
      signatureOpts: { "": "—", ...Object.fromEntries(c.kitList.map(k => [k, k])) },
      hookOpts: { "": "—", ...Object.fromEntries([...c.hooks.values()].map(h => [h.name, (c.as?.suggestedHooks ?? []).includes(h.name) ? `★ ${h.name}` : h.name]).sort((a, b) => a[1].localeCompare(b[1]))) },
      origins: { french: t("TTS.Chargen.Origin.french"), english: t("TTS.Chargen.Origin.english"), other: t("TTS.Chargen.Origin.other") },
      extraLangSlots: Array.from({ length: c.derived.extraLanguages }, (_, i) => ({ i, n: i + 1, value: d.extraLangs[i] ?? "" })),
      languagesLabel: c.languages.map(l => `${l.name}${l.native ? ` (${t("TTS.Language.Native")})` : ""}`).join(", "),
      transferRows: d.transfers.map((x, i) => ({ ...x, i, n: i + 1 })),
      replacementRows: d.replacements.map((x, i) => ({ ...x, i, n: i + 1 })),
      hookRows: d.hooks.map((value, i) => ({ value, i, n: i + 1 }))
    };
  }

  /** Cases cochées (indexées) → noms des capacités de la liste de l'archétype. */
  async #checkedAbilities(flags) {
    const arch = (await catalog("archetype")).get(this.draft.archetype);
    const list = arch?.system.abilities ?? [];
    return Object.entries(flags).filter(([, v]) => v).map(([i]) => list[Number(i)]).filter(Boolean);
  }

  /** @override */
  async updateDraft(data) {
    const d = this.draft;
    const arr = (v, n) => Array.from({ length: n }, (_, i) => (Array.isArray(v) ? v[i] : v?.[i]) ?? "");
    // Changement d'archétype ou de mode : les choix faits dans les listes de l'archétype précédent sont effacés.
    if ((data.archetype !== undefined && data.archetype !== d.archetype) || (data.mode && data.mode !== d.mode)) {
      delete data.abilities; delete data.flaw; delete data.kitPicks;
      d.abilities = []; d.flaw = ""; d.kitPicks = ["", "", ""];
    }
    Object.assign(d, {
      mode: data.mode ?? d.mode, archetype: data.archetype ?? d.archetype,
      atypical: data.atypical ? arr(data.atypical, 11) : d.atypical,
      abilities: data.abilities ? await this.#checkedAbilities(data.abilities) : d.abilities,
      extraAbilities: data.extraAbilities ? arr(data.extraAbilities, 3) : d.extraAbilities,
      flaw: data.flaw ?? d.flaw, extraFlaw: data.extraFlaw ?? d.extraFlaw,
      origin: data.origin ?? d.origin, native: data.native ?? d.native,
      extraLangs: data.extraLangs ? arr(data.extraLangs, 2) : d.extraLangs,
      kitPicks: data.kitPicks ? arr(data.kitPicks, 3) : d.kitPicks,
      freeKits: data.freeKits ? arr(data.freeKits, 5) : d.freeKits,
      signature: data.signature ?? d.signature, signatureDescription: data.signatureDescription ?? d.signatureDescription,
      hooks: data.hooks ? arr(data.hooks, 2) : d.hooks,
      transfers: data.transfers ? [0, 1].map(i => ({ from: data.transfers[i]?.from ?? "", to: data.transfers[i]?.to ?? "" })) : d.transfers,
      replacements: data.replacements ? [0, 1].map(i => ({ from: data.replacements[i]?.from ?? "", to: data.replacements[i]?.to ?? "" })) : d.replacements,
      swap: data.swap ?? d.swap,
      identity: { ...d.identity, ...(data.identity ?? {}) },
      meeting: data.meeting ?? d.meeting
    });
  }

  static async #onRollIdea() {
    const roll = await new Roll("1d100").evaluate();
    const idea = tableEntry(DESIGN_IDEAS, roll.total);
    const cur = this.draft.identity.distinctiveFeatures;
    this.draft.identity.distinctiveFeatures = cur ? `${cur}, ${idea}` : idea;
    await this.saveDraft({ render: false });
    ui.notifications.info(`${t("TTS.Chargen.DesignIdea")} : ${roll.total} — ${idea}`);
    this.render();
  }

  static async #onRollMeeting() {
    const roll = await new Roll("1d100").evaluate();
    const place = tableEntry(MEETING_PLACES, roll.total);
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: `${t("TTS.Chargen.MeetingPlace")} : ${place}` });
    this.draft.meeting = `${this.draft.meeting ? `${this.draft.meeting}\n` : ""}${roll.total} — ${place} : `;
    await this.saveDraft();
  }

  /** Écrit la fiche : compétences, Vitalité, identité, objets (archétype, capacités, désavantages, kits, accroches, langues). */
  /** @override */
  applyNotice() {
    const count = this.actor.items.filter(i => i.getFlag(SYSTEM_ID, "chargen")).length;
    return count ? `<p class="tts-warning">${game.i18n.format("TTS.Chargen.ApplyReplace", { count })}</p>` : "";
  }

  /** @override */
  async applyDraft(c) {
    const d = this.draft;
    const previous = this.actor.items.filter(i => i.getFlag(SYSTEM_ID, "chargen"));
    if (previous.length) await this.actor.deleteEmbeddedDocuments("Item", previous.map(i => i.id));
    const flag = { [SYSTEM_ID]: { chargen: true } };
    const copy = (doc, extra = {}) => foundry.utils.mergeObject(doc.toObject(), { flags: flag, ...extra }, { inplace: false });
    const items = [];
    if (c.arch) items.push(copy(c.arch));
    for (const n of c.abilityNames) { const a = c.abilities.get(n); if (a) items.push(copy(a, { "system.acquired": true })); }
    for (const n of c.flawNames) { const f = c.flaws.get(n); if (f) items.push(copy(f)); }
    for (const n of c.kitList) {
      const k = c.kits.get(n);
      if (!k) continue;
      const sig = n === d.signature;
      items.push(copy(k, { "system.origin": "owned", "system.carried": true, "system.signature": sig, "system.signatureDescription": sig ? d.signatureDescription : "" }));
    }
    for (const n of d.hooks.filter(Boolean)) { const h = c.hooks.get(n); if (h) items.push(copy(h)); }
    for (const l of c.languages) items.push({ name: l.name, type: "language", flags: flag, system: { fluent: true, native: l.native, crosses: 0 } });
    items.forEach(i => delete i._id);
    await this.actor.createEmbeddedDocuments("Item", items);
    const update = {
      "system.archetype": c.arch?.name ?? t("TTS.Chargen.Atypical"),
      "system.vitality.value": c.derived.vitality,
      "system.vitality.bonus": 0,
      ...Object.fromEntries(SKILL_KEYS.flatMap(k => [[`system.skills.${k}.value`, c.skills[k]], [`system.skills.${k}.improvement`, false]])),
      ...Object.fromEntries(Object.entries(d.identity).filter(([, v]) => v).map(([k, v]) => [`system.identity.${k}`, v]))
    };
    if (d.meeting) update["system.identity.meeting"] = `<p>${foundry.utils.escapeHTML(d.meeting).replace(/\n/g, "<br>")}</p>`;
    await this.actor.update(update);
  }
}
