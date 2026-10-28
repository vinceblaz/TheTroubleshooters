# The Troubleshooters : les Risque-tout — système Foundry VTT (non officiel)

Système Foundry VTT **v14** (vérifié sur 14.369) pour le jeu de rôle *The Troubleshooters : les Risque-tout*
(Helmgast AB, version française Arkhane Asylum Publishing).

> **Œuvre de fan non officielle**, non approuvée par Helmgast AB ni par Arkhane Asylum Publishing.
> *The Troubleshooters* et *Les Risque-tout* sont la propriété de leurs ayants droit.
> Aucune illustration du livre n'est incluse. Le livre de base est indispensable pour jouer.

## État

Version **0.3.0** — phase 3 livrée, non validée (`docs/recette-phase-3.md`). Phase 1 (squelette) validée en Foundry réel (22/22). Phase 2 (moteur de jet) validée en Foundry réel
(30/30 avec le correctif 0.2.1). Voir `CHANGELOG.md` et `docs/`.

## Installation (manuelle, pendant le développement)

Voir `docs/installation.md`.

## Développement

```bash
npm test        # tests unitaires de la logique de domaine (src/domain)
npm run check   # contrôles statiques : syntaxe, JSON, i18n, gabarits, attributs name
```

La bible de développement (PDF) fait référence pour toutes les décisions.
