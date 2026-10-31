# Plan de recette — phase 11 (contenus)

## A. Fichier des menaces (0.11.0)

Statut de chaque ligne : à remplir par le porteur du projet (OK / KO + remarque).
Au premier chargement de la 0.11.0, accepter la ré-initialisation : elle crée le compendium « Fichier des menaces ».

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 1 | Rapport d'initialisation | Fichier des menaces : 51 créés ; autres compendiums inchangés |OK|
| 2 | Ouvrir le compendium | 8 dossiers : Génériques, Police et justice, Mafia, Armée, Agents secrets, La Pieuvre, Animaux, Dinosaures |OK|
| 3 | « Chef générique » | Rang Chef, Vitalité 8, initiative par jet, défense 45, Katana (2) 75 % 5dX contre, inverser (4), contre-attaque, attaques multiples (3) |OK|
| 4 | « Policier municipal » | Sous-fifre, initiative 4, Vitalité 3, sans défense, Matraque et Pistolet Beretta |OK|
| 5 | « Graf von Zadrith », « Docteur Cutter », « Alice » | Description du livre, attaques et compétences de personnalisation (« Mouahahahaha ! ») |OK|
| 6 | « Hippopotame » | Protection 2 dR (cuir d'hippopotame rappelé en description), Vitalité 12 |OK|
| 7 | « Tyrannosaure » | Fiche complète ; source « LdB p. 219 » |OK|
| 8 | Glisser un PNJ sur la scène, attaquer un Risque-tout | Carte d'attaque normale ; inversions et contre-attaque selon les descripteurs |OK|
| 9 | Ouvrir l'assistant « Création » sur un PNJ importé | Il part de la fiche (pas du modèle) |OK|
| 10 | Relancer la macro d'initialisation | 51 inchangés, aucun doublon, aucun dossier en double |OK|

## B. Tables aléatoires et journaux d'aide (0.11.1)

Au premier chargement de la 0.11.1, accepter la ré-initialisation : elle crée les compendiums « Tables aléatoires » et « Journaux d'aide ».

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 11 | Rapport d'initialisation | Tables aléatoires : 37 créées ; Journaux d'aide : 6 créés ; autres compendiums inchangés | |
| 12 | Compendium « Tables aléatoires » | Dossiers « Noms français »… « Noms japonais » (3 tables chacun) et « Personnages » | |
| 13 | Tirer « Noms de famille français » | Un nom du livre dans le chat | |
| 14 | Tirer « Traits de personnalité (d%) » et « Jurons signifiant Nom de Dieu (d%) » | Résultat cohérent avec le d% (plages de 5 pour les jurons) | |
| 15 | Journal « Aide-mémoire des règles » | Page papier tramé, titres en lettrage BD, tableaux lisibles | |
| 16 | Journal « Calendrier de 1965 » | 12 mois, 1er janvier un vendredi, jours fériés en rouge (Pâques le 18 avril) | |
| 17 | Journaux « Jurons », « Session pilote », « Feuille d'indices », « À propos » | Contenu lisible ; les modèles se complètent après import dans le monde | |
| 18 | Fiche PNJ et fiche d'objet | Nom en lettrage net, sans ombre portée | |
| 19 | Relancer l'initialisation | Tout inchangé, aucun doublon de page ni de résultat | |

## C. Macro « Nouveau Risque-tout » : assistant pas à pas (0.11.3, corrigé en 0.11.4 et 0.11.5)

La macro est créée au chargement par le compte MJ (dossier des macros), partagée avec les joueurs ; la glisser dans leur barre si besoin.

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 20 | Lancer la macro (ou le bouton du répertoire) | Assistant « Nouveau Risque-tout » au registre Passeport ; bandeau des 6 étapes ; étape 1 avec nom (et joueur propriétaire pour le MJ) | |
| 21 | Étape 1 sans archétype | « Suivant » grisé ; erreur « Choisissez un archétype » | |
| 22 | Choisir un archétype, Suivant | Étape 2 : compétences 75 / 65 ×4 / 45 ×6 ; personnalisation (transferts, remplacements, échange) | |
| 23 | Mode atypique | Les 11 compétences se choisissent à l'étape 2 | |
| 24 | Étape 3 | Deux capacités et un désavantage ; « Suivant » grisé tant que le compte n'y est pas | |
| 25 | Cliquer l'étape 6 dans le bandeau avec l'étape 3 incomplète | Arrêt à l'étape 3 | |
| 26 | Étape 4 | Agilité, meilleure compétence de combat, règle retenue surlignée, Vitalité maximale | |
| 27 | Étape 5 | Langue maternelle, langues supplémentaires selon Langues, récapitulatif | |
| 28 | Étape 6 | 3 kits de l'archétype (choix « A ou B ») + 2 au choix, matériel signature ; « Créer le Risque-tout » | |
| 29 | Fermer l'assistant au milieu puis relancer la macro | On reprend où on s'était arrêté | |
| 30 | MJ, propriétaire « Aucun » : créer | Fiche créée, remplie (compétences, Vitalité, archétype, capacités, désavantage, langues, kits) et ouverte | |
| 31 | MJ, propriétaire = un joueur | Fiche remplie, confiée au joueur et associée à son compte s'il n'avait pas de personnage | |
| 32 | Joueur sans droit de création (MJ connecté) : créer | « Demande envoyée » ; la fiche apparaît chez le joueur, remplie et ouverte | |
| 33 | Sur la fiche créée | Accroches, identité et rencontre à compléter (onglets, ou bouton « Création » de la fiche) | |
| 34 | Recharger le monde (F5) en MJ après la mise à jour 0.11.4 | Bouton « Nouveau Risque-tout » en tête du répertoire des acteurs ; la macro partagée est remise à niveau | |
| 35 | Joueur : bouton du répertoire des acteurs | L'assistant s'ouvre aussi pour un joueur sans droit de macro de script | |
| 36 | En cas d'échec à l'ouverture | Message d'erreur rouge persistant « n'a pas pu s'ouvrir : … » — me transmettre ce message | |
| 37 | Fiche d'un Risque-tout : bouton « Création » ; fiche PNJ : assistant de personnage secondaire | Les deux assistants s'ouvrent (même correctif) | |
| 38 | Macro « Débriefing » | S'ouvre, critères et récompenses fonctionnent | |
| 39 | Bandeau des étapes (0.11.6) | Numéro et libellé complet de chaque étape lisibles, libellés longs sur deux lignes | |
