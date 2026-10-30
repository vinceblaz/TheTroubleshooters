# Plan de recette — phase 8 (création de Risque-tout et de personnages secondaires)

Statut de chaque ligne : à remplir par le porteur du projet (OK / KO + remarque).
Prévoir un compte MJ et un compte joueur connectés en même temps.
Au premier chargement de la 0.8.0, accepter la ré-initialisation : elle crée le compendium « Archétypes » et la macro « Nouveau personnage secondaire ».

## A. Compendium et ouverture

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 1 | Rapport d'initialisation | Archétypes : 15 créés ; autres compendiums inchangés ; macro « Nouveau personnage secondaire » créée |OK|
| 2 | Ouvrir « Archéologue aventurier » | Sciences humaines en principale, 4 secondaires, 6 tertiaires ; 5 capacités ; 3 désavantages ; 3 kits ; accroches suggérées ; description |OK|
| 3 | Fiche de Risque-tout (joueur propriétaire) : bouton d'en-tête « Création » | L'assistant s'ouvre ; contrôles rouges « Choisissez un archétype », capacités, désavantage ; « Appliquer » grisé |OK|

## B. Archétype et compétences

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 4 | Choisir « Archéologue aventurier » | Description affichée ; compétences 75 / 65 ×4 / 45 ×6 ; Vitalité et langues supplémentaires affichées |OK|
| 5 | Transfert Science → Sciences humaines | Sciences humaines 85, Science 55 |OK|
| 6 | Second transfert qui porterait une compétence à 95 | Contrôle rouge « Une compétence dépasse 85 » |OK|
| 7 | Remplacement : une compétence de la liste vers une compétence à 15 | La seconde prend la valeur, la première tombe à 15 ; Vitalité recalculée si Agilité, Corps-à-corps ou Tir change |OK|
| 8 | Échange de deux compétences | Valeurs inversées |OK|
| 9 | Fermer puis rouvrir l'assistant | Le brouillon est conservé |OK|

## C. Capacités, désavantages, langues

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 10 | Cocher 2 capacités et 1 désavantage de la liste | Contrôles rouges correspondants levés |OK|
| 11 | Ajouter une capacité hors liste sans 2e désavantage | Rouge « Une 3e capacité exige un 2e désavantage » ; levé en choisissant un 2e désavantage |OK|
| 12 | Capacité de niveau 2+ dont les prérequis manquent | Avertissement orange (prérequis), sans blocage |OK|
| 13 | Langue maternelle « Autre langue » + langues supplémentaires | Récapitulatif : Français, Anglais, maternelle, langues ajoutées (autant de champs que de langues permises) |OK|
| 14 | Changer d'archétype | Capacités cochées, désavantage et choix de kits effacés |OK|

## D. Kits, accroches, identité

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 15 | Archétype avec une ligne de kits au choix (« A \| B ») | Liste déroulante pour cette ligne ; lignes simples affichées en texte |OK|
| 16 | 2 kits au choix, dont un à prérequis non rempli | Avertissement orange |OK|
| 17 | Matériel signature + description | Liste limitée aux kits choisis |OK|
| 18 | Accroche déjà prise par un autre Risque-tout | Avertissement orange ; les accroches suggérées portent ★ |OK|
| 19 | Dé de « Signes distinctifs » | Idée de conception ajoutée au champ, notification avec le résultat |OK|
| 20 | « Lieu de rencontre » | Jet 1d100 dans le chat ; lieu ajouté au texte de rencontre |OK|

## E. Application

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 21 | « Appliquer à la fiche » puis confirmer | Compétences, Vitalité, identité, rencontre écrites ; archétype, capacités, désavantages, kits (personnels, emportés, signature), accroches et langues ajoutés |OK|
| 22 | Modifier le brouillon et appliquer de nouveau | Confirmation « N objets d'une création précédente seront supprimés » ; pas de doublon ; objets ajoutés à la main conservés |OK|
| 23 | Mode « Personnage atypique » | 11 compétences dans l'ordre des valeurs ; 3 capacités au choix ; 5 kits au choix ; application possible |OK|
| 24 | « Recommencer » | Brouillon vidé après confirmation |OK|

## F. Personnages secondaires

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 25 | Macro « Nouveau personnage secondaire » (MJ) | PNJ créé et assistant ouvert sur le modèle du sous-fifre (3 attaques, descripteur « sous-fifre ») ; aucun avertissement |OK|
| 26 | Même macro avec le compte joueur | Refus « Seul le Chef des Opérations… » |OK|
| 27 | Passer le rang à Chef sans charger le modèle | Descripteur « sous-fifre » remplacé par « chef » ; avertissements défense absente et Vitalité sous 7 |OK|
| 28 | « Charger le modèle » | Modèle du chef générique : Vitalité 8, défense 45, initiative par jet, Katana (2, contre), inverser (4) ; nom conservé |OK|
| 29 | Ajouter / supprimer une compétence et une attaque ; saisir une attaque à 90 % | Lignes mises à jour ; avertissement « attaque éloignée de la spécialité » |OK|
| 30 | Ajouter « inverser (1) » à un sbire | Avertissement « Seuls les lieutenants et les chefs inversent des jets » |OK|
| 31 | Appliquer | Fiche PNJ remplie (rang, compétences, attaques, descripteurs, Vitalité pleine, inversions restantes) ; une note de situation existante est conservée |OK|
| 32 | Rouvrir l'assistant sur ce PNJ | Il part de la fiche ; « Recommencer » repart du modèle du rang |OK|
| 33 | Combat avec le chef créé | Inversions, contre-attaque et Blessé / Danger de mort fonctionnent comme en phase 4 |OK|
