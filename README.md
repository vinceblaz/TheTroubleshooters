# The Troubleshooters : les Risque-tout — système Foundry VTT (non officiel)

Système Foundry VTT **v14** (vérifié sur 14.369) pour le jeu de rôle *The Troubleshooters : les Risque-tout*
(Helmgast AB, version française Arkhane Asylum Publishing).

> **Œuvre de fan non officielle**, non approuvée par Helmgast AB ni par Arkhane Asylum Publishing.
> *The Troubleshooters* et *Les Risque-tout* sont la propriété de leurs ayants droit.
> Aucune illustration du livre n'est incluse. Le livre de base est indispensable pour jouer.
> Polices embarquées sous licence SIL Open Font License 1.1 (voir `fonts/OFL-*.txt`).

## État

Version **0.11.1** — phase 11 (contenus : fichier des menaces validé, tables aléatoires et journaux d'aide en recette, `docs/recette-phase-11.md`). Phase 10 (charte graphique) validée en Foundry réel (41/41). Phase 9 (progression et intersession) validée en Foundry réel (28/28). Phase 8 (création de Risque-tout et de personnages secondaires) validée en Foundry réel (33/33). Phase 7 (équipement) validée en Foundry réel (31/31). Phase 6 (défis et duels) validée en Foundry réel (28/28). Phase 5 (conditions et dangers) validée en Foundry réel (40/40). Phase 4 (combat) validée en Foundry réel (53/53). Phase 3 validée en Foundry réel (35/35). Phase 1 (squelette) validée en Foundry réel (22/22). Phase 2 (moteur de jet) validée en Foundry réel
(30/30 avec le correctif 0.2.1). Voir `CHANGELOG.md` et `docs/`.

## Installation (manuelle, pendant le développement)

Voir `docs/installation.md`.

## Développement

```bash
npm test        # tests unitaires de la logique de domaine (src/domain)
npm run check   # contrôles statiques : syntaxe, JSON, i18n, gabarits, attributs name
```

La bible de développement (PDF) fait référence pour toutes les décisions.
