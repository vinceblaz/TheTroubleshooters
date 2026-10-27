# The Troubleshooters : les Risque-tout — système Foundry VTT (non officiel)

Système Foundry VTT **v14** (vérifié sur 14.369) pour le jeu de rôle *The Troubleshooters : les Risque-tout*
(Helmgast AB, version française Arkhane Asylum Publishing).

> **Œuvre de fan non officielle**, non approuvée par Helmgast AB ni par Arkhane Asylum Publishing.
> *The Troubleshooters* et *Les Risque-tout* sont la propriété de leurs ayants droit.
> Aucune illustration du livre n'est incluse. Le livre de base est indispensable pour jouer.

## État

Version **0.1.0** — phase 1 (squelette) de la feuille de route : modèles de données, fiches fonctionnelles,
socle du relais MJ, séquence d'initialisation (catalogue des accroches). Voir `CHANGELOG.md`.
Statut : **livré, non validé** tant que la recette en Foundry réel n'est pas faite (`docs/recette-phase-1.md`).

## Installation (manuelle, pendant le développement)

Voir `docs/installation.md`.

## Développement

```bash
npm test        # tests unitaires de la logique de domaine (src/domain)
npm run check   # contrôles statiques : syntaxe, JSON, i18n, gabarits, attributs name
```

La bible de développement (PDF) fait référence pour toutes les décisions.
