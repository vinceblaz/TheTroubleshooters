# Journal des modifications

## 0.3.0 — phase 3 : points de récit, désavantages, capacités (livré, non validé)

- Compendiums « Capacités » (56, textes du livre et 129 activations structurées) et « Désavantages » (18 ; « Trop confiant » = Présomptueux, D-031).
- Outil du Chef « Points de récit et scène » (macro) : ajustements, Capturés ! (+9), Amuser la table (+1),
  matériel signature indisponible (+3), meurtre de sang-froid, nouvelle session (4 + bonus ou réserves conservées), nouvelle scène.
- Journal des mouvements de PR dans le chat.
- Dépenses soumises au Chef depuis la fiche : indice, élément mineur, élément majeur, kit, autre ; PR réservés,
  carte Valider / Modifier / Refuser avec remboursement automatique.
- Désavantages : bouton « Déclencher » (malus de scène, condition, absence, libre) ; malus de scène lus par la boîte de jet ;
  « Rater (désavantage) » sur les cartes (+3 PR) ; Malchanceux (inversion par le Chef, +3 PR).
- Capacités : activations sur les cartes (inverser, relancer, transformer en réussite, rejouer autrement, rater pour des PR),
  bonus en pips dans la boîte de jet (payants compris), effets narratifs et de combat déclenchés depuis la fiche.
- Éditeurs : activations et prérequis des capacités, règle spéciale et alias des désavantages.
- Contrôles statiques : cohérence des catalogues avec le domaine.


## 0.2.1 — correctif de recette (VALIDÉ EN FOUNDRY RÉEL le 28/10/2026)

- Recette 2 point 9 : le joueur est désormais prévenu quand il n'a pas assez de points de récit pour inverser
  (contrôle préalable côté client), et le relais renvoie au demandeur les refus et erreurs traités par le MJ.

## 0.2.0 — phase 2 : moteur de jet (VALIDÉ EN FOUNDRY RÉEL le 28/10/2026, recette 30/30 avec le correctif 0.2.1)

- Jet de tâche d% : pips lus sur les unités, un modificateur par catégorie, malus de conditions cumulés (D-006),
  règle optionnelle de valeur de tâche, Karma (Bon/Mauvais) avec +1 point de récit automatique.
- Boîte de jet (DialogV2) : difficulté, circonstances, matériel (descripteurs à pips des kits emportés), capacité, visibilité.
- Carte de chat : inversion (2 PR) avec réévaluation, échec volontaire proposé par le joueur et validé par le Chef (+2 PR),
  case d'amélioration proposée.
- Jets de PNJ : compétence de base, spécialité, compétences listées ; visibilité par défaut réglable.
- Jet en opposition contre la cible : le second camp lance depuis la carte (relais MJ), inversion par camp, issue recalculée.
- Demande de jet du Chef (macro) : difficulté verrouillée, éventuellement secrète (issue réelle réservée au MJ).
- Réserves dX (explosives), dR et Nd6 : `game.thetroubleshooters.rollPool(n, "dX"|"dR"|"d6")`.
- Relais MJ : point d'entrée unique `dispatch` (local si l'utilisateur peut écrire la carte, sinon via le MJ actif).
- Contrôles statiques : structure des blocs Handlebars.


## 0.1.0 — phase 1 : squelette (VALIDÉ EN FOUNDRY RÉEL le 28/10/2026, recette 22/22)

- Manifeste `system.json` (id `thetroubleshooters`, Foundry v14, socket activé).
- Modèles de données : Actor `character`, `npc` ; Items `archetype`, `ability`, `flaw`, `hook`, `kit`, `language`.
- Vitalité maximale dérivée (4 à 7, LdB p. 34 et 129) ; langues supplémentaires indicatives ; contrôle des 5 kits emportés (avertissement).
- Points de récit bornés au plafond du monde (12 par défaut), avec notification d'écrêtage.
- Fiches V2 : Risque-tout (4 onglets), personnage secondaire (compétences, attaques, descripteurs en lignes), fiche d'Item par type.
- 16 conditions déclarées comme statuts (icônes Foundry) — effets mécaniques en phase 5.
- Paramètres du monde (mode des modificateurs, progression, PR, visibilité des jets de PNJ…).
- Socle du relais MJ par socket, avec règle de validation pure.
- Séquence d'initialisation idempotente + macro MJ ; compendium « Accroches scénaristiques » (11 entrées).
- Tests unitaires du domaine et script de contrôles statiques.
