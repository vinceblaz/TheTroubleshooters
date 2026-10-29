# Plan de recette — phase 5 (conditions et dangers)

Statut de chaque ligne : à remplir par le porteur du projet (OK / KO + remarque).
Prévoir un compte MJ et un compte joueur connectés en même temps.
Au premier chargement de la 0.5.0, accepter la ré-initialisation : elle crée la macro « The Troubleshooters — Dangers ».
Préparation : reprendre le Risque-tout, l'Agent et le Sbire de la recette 4.

## A. Panneau des conditions (fiche, onglet Combat)

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 1 | Onglet Combat | 16 conditions listées ; infobulle d'effet ; inactives estompées |OK mais afficher une liste sur 2 colonnes au lieu d'une|
| 2 | Activer Saoul, puis « + » deux fois | Niveaux 1 → 3 ; malus −6 dans la boîte de jet |OK|
| 3 | « + » une quatrième fois | Hors de combat posé, Saoul reste à 3 |OK|
| 4 | « − » | Le niveau baisse ; à 0 la condition disparaît |OK|
| 5 | Saoul actif | Défense impossible sur une carte d'attaque ; encaissement +1d6 par niveau |OK|
| 6 | Épuisé niveau 1 puis 2 (Vitalité max 6) | Max 3 puis 1 ; la Vitalité actuelle est ramenée |OK|
| 7 | Retirer Saoul ou Épuisé depuis le HUD du jeton | Niveau effacé (réactivation au niveau 1) |OK|
| 8 | Effrayé actif → bouton « Volonté » | Jet ; réussite : Effrayé retiré, carte « appliquée » |OK|
| 9 | Terrifié → « Volonté » réussi | Terrifié remplacé par Effrayé |OK|
| 10 | Jet de sortie raté puis inversé (2 PR) | Bouton « Appliquer la sortie » sur la carte ; la condition disparaît |OK|
| 11 | Prisonnier → trois boutons (Corps-à-corps, Force, Agilité) | Chacun lance le jet correspondant |OK|
| 12 | Blessé → « Rafistoler » (un autre Risque-tout réussit Médecine) | Effet « Rafistolé (scène) » ; malus −2 de Blessé absent hors combat |OK|
| 13 | MJ : « Nouvelle scène » | « Rafistolé » disparaît ; le malus de Blessé revient |OK|
| 13 bis | Fiche PNJ (Agent) : panneau des conditions | Mêmes bascules, niveaux et jets de sortie (compétence listée du PNJ, sinon compétence de base) |OK|
| 13 ter | Fiche PNJ : Blessé → « Rafistoler » | Un Risque-tout réussit Médecine : « Rafistolé (scène) » sur le PNJ |OK|

## B. Nature du jet

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 14 | Boîte de jet de compétence | Liste « Nature du jet » : ordinaire, mouvement, vue, ouïe |OK|
| 15 | Sonné : jet d'Agilité « mouvement » | Malus −5 (au lieu de −2) sur la carte |OK|
| 16 | Surchargé : jet « mouvement » | Malus −2 ; aucun malus en jet ordinaire |OK|
| 17 | Aveuglé : jet de Vigilance « vue » | Raté d'office, mention sur la carte (un double devient Mauvais Karma) |OK|
| 18 | Sourd : jet « ouïe » | Raté d'office |OK|

## C. Début et fin de tour (combat)

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 19 | Surpris sur un combattant, fin de son tour | Surpris retiré automatiquement |OK|
| 20 | En feu, début de tour | Carte « En feu » : 1dX sans encaissement, puis choix d'encaissement si perte |OK|
| 21 | En feu et Hors de combat, début de tour | Blessé posé |OK|
| 22 | Paralysé, fin de tour | Carte de jet d'Endurance (« Lancer », puis « Appliquer » : réussite / échec) |OK|
| 23 | Terrifié, début de tour | Carte de jet de Volonté avec la note « zone de la source » |OK|
| 24 | PNJ avec descripteur « effrayant » (ou « terrifiant ») dans le combat, début du combat | Risque-tout Effrayés (ou Terrifiés) ; Terrifié remplace Effrayé |OK|

## D. Outil du Chef « Dangers »

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 25 | Macro « Dangers » (MJ) | Fenêtre : chute, explosion, zone en feu, noyade, poison, embuscade / sniper, dégâts |OK|
| 26 | Sans jeton sélectionné | Avertissement |OK|
| 27 | Chute de 4 m (jeton du Risque-tout sélectionné) | Carte de vérification : Agilité −3 ; le joueur lance puis « Appliquer » ; échec : Blessé (déjà Blessé : Hors de combat) |OK|
| 28 | Chute de 1 m, ou saut volontaire de 2 m | « Pas de jet » |OK|
| 29 | Grenade : Risque-tout et deux sbires sélectionnés, l'Agent ciblé | Cartes de dégâts 6dX : jet séparé pour le PJ, commun aux sbires ; l'Agent 3dX ; journal « Souffle : 6dX → 3dX » |OK|
| 30 | Carte de dégâts d'explosion | Encaissement avec la protection, puis choix Vitalité / Blessé / Danger de mort |OK|
| 31 | Zone en feu | 1dX sans protection + carte de vérification d'Agilité ; échec : En feu |OK|
| 32 | Noyade « Surpris » | Endurance −2 ; échec : carte 1dX |OK|
| 33 | Poison (gaz soporifique) | Endurance ; à l'application, le MJ lance la force (75) : issue (sans effet / initial / prolongé / doublé) ; Sonné, et Hors de combat (endormi) si prolongé |OK|
| 34 | Poison mortel | Effet initial : carte « 1d6 » (somme) ; prolongé : rappel « 1dX à la fin de chaque tour » et durée |OK|
| 35 | Embuscade (PJ sélectionné) | Vigilance ; issues : Hors de combat / Surpris + 4dX / normal / défense possible |OK|
| 36 | Sniper d'un PJ (PJ sélectionné, PNJ ciblé) | Furtivité ; réussite : PNJ Surpris et rappel +2 pips / +2dX ; Bon Karma : PNJ Hors de combat |OK|
| 37 | Dégâts génériques (3dX, avec protection) | Carte de dégâts au libellé saisi |OK|
| 38 | « Appliquer » une seconde fois | Refusé (« Rien à appliquer ») |OK|
