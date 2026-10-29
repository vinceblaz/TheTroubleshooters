# Plan de recette — phase 4 (combat)

Statut de chaque ligne : à remplir par le porteur du projet (OK / KO + remarque).
Prévoir un compte MJ et un compte joueur connectés en même temps (le MJ doit rester connecté : il exécute les effets du combat).
Préparation :
- Risque-tout du joueur avec un kit « Pistolet » (arme : Tir, 5dX, munitions 9-0, descripteurs « Bruyant ») et un kit « Gilet » (protection 1dR), tous deux emportés.
- PNJ « Agent » : rang Chef, défense 45, protection 1, attaque « Poing » (corps-à-corps, 65 %, 3dX), descripteurs `inverser` = 2 et `contre-attaque`.
- PNJ « Sbire » : rang Sbire, sans défense, initiative fixe 5, attaque « Matraque » (corps-à-corps, 45 %, 3dX, descripteurs « non létal »).
- Les trois jetons sur une scène, ajoutés au tracker de combat.

## A. Initiative et tracker

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 1 | Tracker : « Lancer » pour le Risque-tout | Carte « Initiative — Vigilance » avec le d% ; initiative = unités (échec), dizaines + unités (réussite), +10 sur Bon Karma, 0 sur Mauvais Karma | |
| 2 | « Lancer » pour le Sbire (initiative fixe) | Valeur fixe (5), sans carte | |
| 3 | « Lancer » pour l'Agent (mode jet) | Carte de jet (Vigilance si listée, sinon compétence de base) | |
| 4 | Égalité d'initiative entre un Risque-tout et un PNJ | Le Risque-tout passe devant | |
| 5 | Inverser la carte d'initiative du Risque-tout (2 PR) | L'initiative du tracker est recalculée | |
| 6 | Kit à allonge emporté (descripteur « Allonge ») | Carte : « Équipement +2 » et initiative augmentée de 2 | |
| 7 | Début du combat | Compteur « Inverser (PNJ) » de l'Agent mis à 2 (fiche PNJ) | |
| 8 | Pastilles M / G / P / B sous chaque nom | Cliquables par le propriétaire (barrées une fois utilisées) ; remises à zéro au début du tour du combattant | |
| 9 | Sablier « Action retardée » | Saisie « si x, alors y » affichée sous le nom ; effacée au début du tour suivant du combattant | |
| 10 | Marqueurs PNJ dans le tracker | Agent : drapeau commandant si descripteur « commandant », flèche de contre-attaque | |

## B. Attaque d'un Risque-tout contre un PNJ

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 11 | Fiche, onglet Combat | Armes : Pistolet et Mains nues (2dX) ; protection 1dR ; défenses ; conditions de combat | |
| 12 | Cibler l'Agent, « Attaquer » au Pistolet | Boîte de jet avec options : base, Pan ! (si initiative ≥ 1), Rakatakata (munitions) ; Vlan ! grisé (distance) | |
| 13 | Attaque de base réussie | Carte d'attaque : « En attente de la défense » ; boutons de défense visibles du seul MJ | |
| 14 | Unités du jet dans 9-0 | Mention « l'arme est vide » ; kit marqué Vide ; bouton « Attaquer » désactivé, « Recharger » proposé | |
| 15 | MJ : se défendre (score de défense 45) | Jet en opposition ; égalité de réussites → défense | |
| 16 | Attaque ratée puis « Inverser (2 PR) » par le joueur | Le jet devient une réussite : la défense est de nouveau attendue | |
| 17 | MJ : « Inverser (PNJ) » sur la défense | Défense inversée, compteur de l'Agent −1 | |
| 18 | Touché → « Jet de dégâts » | Boîte : dés détaillés (Arme 5) ; jet de dX explosifs ; la carte est verrouillée (plus d'inversion) | |
| 19 | Bon Karma sur l'attaque contre l'Agent | Bouton « Bon Karma : relancer les dégâts » (une fois, nouveau résultat conservé) | |
| 20 | MJ : « Encaissement (1dR) » | Perte = dégâts − encaissement | |
| 21 | Choix de l'Agent (Chef) | Perdre la Vitalité / Blessé / Danger de mort ; Blessé appliqué → condition posée, Vitalité inchangée | |
| 22 | Agent à 0 Vitalité | Hors de combat (statut et jeton vaincu) | |
| 23 | MJ : bouton « Contre-attaque » (Agent) | Boîte d'attaque du PNJ, cible = l'attaquant | |

## C. Attaque d'un PNJ contre le Risque-tout

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 24 | MJ : ciblez le Risque-tout, attaque « Poing » de l'Agent | Carte publique ; le joueur voit « Se défendre : Corps-à-corps » et « Ne pas se défendre » | |
| 25 | Case « À couvert » cochée sur la fiche | Défense supplémentaire « Agilité (À couvert) » | |
| 26 | Joueur : défense ratée avec Mauvais Karma | Le Risque-tout devient Vulnérable | |
| 27 | Joueur : « Encaissement » | 1dR du gilet ; perte nette affichée | |
| 28 | Choix du joueur | Perdre la Vitalité (aperçu de la Vitalité restante) / Blessé / Danger de mort | |
| 29 | En Danger de mort, perte menant à 0 | Bouton en rouge « MORT » ; confirmation demandée ; puis Hors de combat et « Mort » sur la carte | |
| 30 | Risque-tout en Danger de mort qui attaque | Bouton « Inverser (Danger de mort, gratuit) » | |
| 31 | Mauvais Karma sur un jet d'attaque | Effet « Mauvais Karma (prochain jet) » −2 sur l'attaquant, appliqué puis retiré au jet suivant | |

## D. Options, descripteurs et rangs

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 32 | Pan ! | +2 pips sur le jet, +1dX aux dégâts, initiative −2 dans le tracker, munitions ignorées | |
| 33 | Rakatakata ! une cible | +2dX ; arme vide ; Mauvais Karma → enrayée | |
| 34 | Rakatakata ! zone (deux jetons ciblés) | Un jet et une carte par cible ; arme vidée une seule fois | |
| 35 | Vlan ! à mains nues | Réussite : choisir deux effets (1dX, Prisonnier, Vulnérable) ; statuts posés sur la cible | |
| 36 | Attaque du Sbire touché avec Bon Karma | Hors de combat sans jet de dégâts | |
| 37 | Matraque (non létal) contre le Risque-tout | Pas de choix « Danger de mort » | |
| 38 | Arme « Aiguisé » contre une cible qui ne se défend pas | +1dX (« Aiguisé ») dans le détail des dés | |
| 39 | Arme « Tranchant » contre une cible protégée | Encaissement −1dR | |
| 40 | Arme « Fragile » : jet avec Karma | Arme marquée Cassée | |

## E. Capacités et actions

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 41 | Boxeur : attaque à mains nues réussie contre un Sbire | Bouton « Boxeur : Hors de combat » (1 PR), sans jet de dégâts | |
| 42 | Uppercut fracassant à mains nues | « Poings d'acier +1dX » coché dans la boîte de dégâts ; après le jet, bouton « +2dX » (1 PR) | |
| 43 | Champion de boxe après le jet de dégâts | « Relancer les dégâts » (2 PR) | |
| 44 | Boxeur depuis la fiche : récupération (1 PR) | −1 PR, jet de 1dR, Vitalité augmentée (plafonnée) | |
| 45 | As de la gâchette : « tour avant tout le monde » / « attaque supplémentaire » | −1 PR ; marqueur éclair ou pastille B verte dans le tracker | |
| 46 | « Reprendre son souffle » | Jet de 2dR, Vitalité augmentée | |
| 47 | « Tomber à terre » / « Se relever » | Vulnérable posé / retiré | |
| 48 | « Évaluer la situation » | Nouveau jet d'initiative | |
| 49 | Défense gagnante avec Bon Karma | Bouton « Récupération (1dR) » pour le défenseur, une fois | |

## F. Fin de combat

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 50 | MJ : terminer le combat | Vitalité remise au maximum ; Danger de mort retiré ; carte « Fin du combat » | |
| 51 | « Jet de Médecine » sur un personnage Hors de combat | Réussite : Hors de combat retiré ; une seule tentative par personnage | |
| 52 | Tous les Risque-tout Hors de combat | Bouton MJ « Capturés ! (+9 PR) » | |
| 53 | Blessé après le combat | −2 pips sur les jets hors combat | |
