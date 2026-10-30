/**
 * Onomatopées des cartes de chat (charte phase 10) — logique pure.
 * Une onomatopée par moment fort, jamais sur un jet ordinaire, pour garder l'effet rare :
 *  Bon Karma « BIM ! », Mauvais Karma « PATATRAS ! », attaque qui touche « PAF ! », Hors de combat « POUM ! »,
 *  attaque manquée « ZIOUM ! », défi excellent « VROOOM ! », défi désastreux « CATASTROPHE ! », duel gagné « TCHAC ! ».
 * Renvoie une clé (texte dans lang/*.json, TTS.Sfx.<clé>) et un ton de couleur.
 */

export const SFX = Object.freeze({
  goodKarma: { tone: "yellow" },
  badKarma: { tone: "mustard" },
  hit: { tone: "red" },
  knockout: { tone: "red" },
  miss: { tone: "teal" },
  excellent: { tone: "teal" },
  disaster: { tone: "mustard" },
  duelWon: { tone: "yellow" }
});

const pick = key => ({ key, tone: SFX[key].tone });

/** @param {object} card  état de la carte (flags.thetroubleshooters.card) */
export function sfxFor(card) {
  if (!card) return null;
  switch (card.kind) {
    case "task": {
      const t = card.task;
      if (!t || t.status === "pendingFailure") return null;
      if (t.karma === "good") return pick("goodKarma");
      if (t.karma === "bad") return pick("badKarma");
      return null;
    }
    case "opposed": {
      const o = card.opposed;
      if (!o?.outcome || o.outcome === "tie") return null;
      const w = o[o.outcome]?.task;
      if (w?.karma === "good") return pick("goodKarma");
      return null;
    }
    case "attack": {
      const s = card.attack;
      if (!s || s.hazard) return null;
      if (s.knockout || s.stage === "knockout") return pick("knockout");
      if (s.hit === true) return pick("hit");
      if (s.hit === false && s.stage === "miss") return pick("miss");
      return null;
    }
    case "challenge": {
      const r = card.challenge?.result;
      if (r === "excellent") return pick("excellent");
      if (r === "disastrous") return pick("disaster");
      return null;
    }
    case "duel":
      return card.duel?.winner ? pick("duelWon") : null;
    default:
      return null;
  }
}

/** Insère le bloc d'onomatopée juste après la balise ouvrante de la carte. */
export function injectSfx(html, sfx, text) {
  if (!sfx || !text) return html;
  const block = `<div class="tts-sfx tts-sfx-${sfx.tone}" aria-hidden="true"><span class="tts-sfx-text">${text}</span></div>`;
  return String(html).replace(/^(\s*<div[^>]*\btts-card\b[^>]*>)/, `$1${block}`);
}
