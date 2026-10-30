# Plan de recette — phase 7 (équipement)

Statut de chaque ligne : à remplir par le porteur du projet (OK / KO + remarque).
Prévoir un compte MJ et un compte joueur connectés en même temps.
Au premier chargement de la 0.7.0, accepter la ré-initialisation : elle crée le compendium « Kits de matériel ».

## A. Compendium et fiche de kit

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 1 | Rapport d'initialisation | Kits de matériel : 95 créés ; autres compendiums inchangés |OK|
| 2 | Ouvrir « Arme de poing » | 1 PR ; contenu ; arme Tir 5dX, munitions 9-0, « bruyant, … portée courte » ; source LdB p. 117 |OK|
| 3 | Ouvrir « Tenue de ninja » | Arme principale Ninjatō + deux armes supplémentaires (griffes, shuriken) |OK|
| 4 | Ouvrir « Octopode », « Lunettes de vision nocturne » | Catégories Super-science / Technologie d'espionnage ; prérequis « Pilote » pour l'Octopode |OK|
| 5 | Fiche de kit : ajouter / supprimer une arme supplémentaire, cocher « Hors d'usage » | Valeurs conservées |OK|

## B. Obtenir des kits (glisser-déposer)

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 6 | Glisser « Lampe torche » sur la fiche : origine « Personnel » | Kit ajouté aux kits emportés |OK|
| 7 | Glisser « Jet privé » sans Vieille fortune ni Nouveau riche | Avertissement « Prérequis non remplis » ; ajout possible quand même (le Chef tranche) |OK|
| 8 | Glisser « Mitraillette » : origine « Acheté (2 PR) » | Carte de dépense « Kit » ; 2 PR réservés ; aucun kit encore sur la fiche |OK|
| 9 | MJ : Valider la dépense | La Mitraillette rejoint la fiche (origine « Acheté », tag « à rendre ») |OK|
| 10 | Autre achat, MJ : Refuser | PR rendus, aucun kit ajouté |OK|
| 11 | Glisser un kit : origine « Bricolé » | Kit avec 1 usage |OK|
| 12 | Glisser un kit : origine « Trouvé », décocher « Emporté » | Kit rangé dans « Objets trouvés » |OK|

## C. Onglet Matériel

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 13 | Sections | Kits emportés (compteur x / 5), Entrepôt, Objets trouvés |OK|
| 14 | Icône carton / valise sur un kit | Le kit passe de « emportés » à l'entrepôt (ou aux objets trouvés) et inversement |OK|
| 15 | Six kits emportés | Avertissement de dépassement, sans blocage |OK|
| 16 | Deux gadgets signature sans Gadget supplémentaire ; une signature sans description | Avertissements |OK|
| 17 | Arme d'un kit rangé à l'entrepôt | N'apparaît plus dans l'onglet Combat ; armes supplémentaires présentes quand le kit est emporté |OK|

## D. Gadgets et kits bricolés

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 18 | Kit avec « Peu fiable (9-0) » choisi dans « Matériel » (option « utilisé ») ; unités 9 ou 0 | Mention sur la carte ; kit Hors d'usage, plus proposé |OK|
| 19 | Kit « Fatigant » utilisé | Un niveau d'Épuisé |OK|
| 20 | Kit « Dangereux (9-0, 4dX) » ; unités dans la plage | Bouton « Subir (4dX) » → carte de dégâts sur l'utilisateur |OK|
| 21 | Kit « Assourdissant » ou « Fumigène » utilisé | Rappel sur la carte |OK|
| 22 | Kit bricolé utilisé comme matériel | « 0 usage restant » : hors d'usage |OK|
| 23 | Kit bricolé : bouton « Utiliser » de l'onglet Matériel | Un usage de moins |OK|

## E. Fabrication de gadget (Défi)

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 24 | Macro « Défi » → « Fabrication de gadget » | Formulaire : nom, propriétaire, kit à modifier, catégorie, descripteurs, compteurs ; résultats du livre pré-remplis |OK|
| 25 | « Compétences et malus de catégorie » (Super-science) | 5 lignes Ressources, Électronique, Ingénierie, Science, Fouille à −5 |OK|
| 26 | 3 descripteurs positifs, modification d'un kit : répartir les jetons, « Recalculer » | Jetons « −2 −2 −2 +2 » ; répartition verte quand la somme est juste |OK|
| 27 | Publier, faire les jets, résultat Bon ou Excellent | Bouton MJ « Créer le gadget » : kit dans l'entrepôt du propriétaire avec les descripteurs saisis (bricolé : 1 usage, 2 sur Excellent) |OK|
| 28 | Avec « Kit à modifier » | « Appliquer la modification » : descripteurs ajoutés au kit existant |OK|
| 29 | Résultat Mauvais ou Désastreux | « Pas de gadget fabriqué » |OK|

## F. Fin de l'histoire

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 30 | Outil « Points de récit et scène » → « Fin de l'histoire » | Liste des kits achetés et de mission par Risque-tout ; confirmation ; kits retirés ; journal |OK|
| 31 | Aucun kit à rendre | « Aucun kit à rendre » |OK|
