# Plan de recette — phase 6 (défis et duels)

Statut de chaque ligne : à remplir par le porteur du projet (OK / KO + remarque).
Prévoir un compte MJ et un compte joueur connectés en même temps, avec deux Risque-tout (dont un au joueur) et l'Agent.
Au premier chargement de la 0.6.0, accepter la ré-initialisation : elle crée les macros « Défi » et « Duel ».

## A. Composer et publier un défi

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 1 | Macro « Défi » (MJ) | Fenêtre : titre, modèle, nombre de jets (3/4/5), lignes, résultats facultatifs |OK|
| 2 | Modèle « Analyser une scène de crime » → Charger | 3 lignes Enquête, Fouille, Vigilance ; titre rempli |OK|
| 3 | Boutons 3 / 4 / 5 | Le nombre de lignes change sans perdre la saisie |OK|
| 4 | Ligne attribuée à un personnage, ligne « au choix des joueurs », ligne avec opposition « Garde 45 » | Carte de défi publiée : 0 / 3, une ligne par jet |OK|
| 5 | Ligne attribuée | Bouton « Lancer » visible du seul propriétaire (et du MJ) |OK|
| 6 | Ligne « au choix » | Le joueur lance avec son personnage (choix s'il en a plusieurs) ; son nom s'affiche sur la ligne |OK|
| 7 | Ligne avec opposition | Le jet adverse (45 %) est lancé automatiquement ; il faut le remporter (égalité = non remporté) |OK|
| 8 | Modificateur saisi sur une ligne | Ajouté au jet (« Défi ±N » dans la boîte et sur la carte) |OK|

## B. Résultat du défi

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 9 | Tous les jets faits | Résultat selon la table (3 jets : 0 Désastreux, 1 Limité, 2 Bon, 3 Excellent) et texte saisi pour ce résultat |OK|
| 10 | Défi à 4 jets, 1 réussite | Mauvais résultat |OK|
| 11 | Défi à 5 jets, 3 réussites | Résultat limité |OK|
| 12 | Inverser (2 PR) un jet raté du défi depuis sa carte | La carte de défi se met à jour (réussites et résultat) |OK|
| 13 | Capacité (ex. Génie : relancer) sur un jet du défi | La carte de défi se met à jour |OK|
| 14 | Relancer une ligne déjà lancée | Impossible (pas de bouton) |OK|

## C. Duel

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 15 | Macro « Duel » (MJ) | Nombre cible (3), camp qui commence, deux camps (nom, objectif, participants) |OK|
| 16 | Jeton sélectionné / jeton ciblé avant d'ouvrir | Présélectionnés dans le camp A / le camp B |OK|
| 17 | Publier | Carte de duel : score 0 – 0, « Au tour de » camp A, bouton « Demander un jet » pour les propriétaires du camp A |OK|
| 18 | Demander un jet : Vigilance (même compétence) | Échange créé ; boutons « Lancer » pour chaque camp |OK|
| 19 | Demander une paire (Furtivité contre Fouille) | Chaque camp lance sa compétence |OK|
| 20 | PNJ qui lance | Choix compétence listée / spécialité / base |OK|
| 21 | Échange remporté | Score +1 ; « le gagnant décrit le résultat » ; le tour passe à l'autre camp |OK|
| 22 | Deux échecs ou réussites égales | Score inchangé ; le demandeur décrit |OK|
| 23 | Redemander une compétence déjà demandée dans le duel | Malus −2 par demande antérieure (affiché dans la liste et sur le jet du demandeur seulement) |OK|
| 24 | Réglage « Duels : malus de répétition » sur « même camp » | Seules les demandes du même camp comptent |OK|
| 25 | Inverser un jet d'échange après coup | Score recalculé |OK|
| 26 | Nombre cible atteint | « … remporte le duel » avec son objectif ; plus de bouton |OK|
| 27 | Camp à deux participants | Celui qui clique choisit le participant qui lance |OK|
| 28 | Joueur qui clique pour le camp adverse | Pas de bouton (réservé aux propriétaires du camp et au MJ) |OK|
