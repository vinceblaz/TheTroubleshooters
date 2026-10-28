# Plan de recette — phase 2 (moteur de jet)

Recette déroulée par le porteur du projet le 28/10/2026 (v0.2.0, Foundry v14.369, comptes MJ et joueur simultanés).
**Résultat : 30 / 30 OK.** Point 9 KO en 0.2.0 (refus non affiché côté joueur), corrigé en 0.2.1 (contrôle préalable
côté client et réponse du relais au demandeur) et revalidé le 28/10/2026. **Phase 2 VALIDÉE EN FOUNDRY RÉEL.**

## A. Jet de tâche (fiche de Risque-tout)

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 1 | Cliquer sur le nom d'une compétence | Boîte de jet : difficulté, circonstances, matériel, capacité, visibilité |OK|
| 2 | Lancer sans modificateur | Carte : résultat, Réussite/Échec selon la valeur ; jet visible dans Dice So Nice si installé |OK|
| 3 | Difficile (−2) : rejouer jusqu'à obtenir un résultat finissant par 1 ou 2 sous la compétence | « Échec (échec automatique par les pips) » |OK|
| 4 | Facile (+2) : résultat > compétence finissant par 1 ou 2 | « Réussite (réussite automatique par les pips) » |OK|
| 5 | Résultat finissant par 0 avec ±pips | Les pips sont ignorés (comparaison normale) |OK|
| 6 | Kit emporté avec un descripteur à +2 pips | Proposé dans « Matériel » ; appliqué et listé sur la carte |OK|
| 7 | Double (11, 22…) | Badge Bon/Mauvais Karma ; +1 point de récit sur la fiche ; ligne « Karma : +1 » |OK|
| 8 | Bouton « Inverser (2 PR) » | Résultat inversé, ancien résultat barré, issue recalculée avec les mêmes pips ; −2 PR |OK|
| 9 | Inverser avec moins de 2 PR | Refus avec message ; aucun changement |OK en 0.2.1 (KO en 0.2.0 : message absent côté joueur)|
| 10 | « Rater volontairement » sur une réussite (joueur) | Carte « en attente du Chef » ; boutons Valider/Refuser visibles du seul MJ |OK|
| 11 | MJ : Valider | Carte « échec volontaire validé (+2 PR) » ; +2 PR sur la fiche du joueur |OK|
| 12 | MJ : Refuser (sur un autre jet) | La carte revient à l'état normal, pas de PR |OK|
| 13 | « Cocher l'amélioration » | Case cochée sur la fiche ; le bouton disparaît |OK|
| 14 | Personnage Blessé (statut) hors combat | Malus −2 listé dans la boîte et sur la carte |OK|
| 15 | Blessé + Saoul | −4 au total (cumul, D-006) |OK|
| 16 | Réglage « Mode des modificateurs » = valeur de tâche | Comparaison à compétence + 5 × pips, sans lecture des unités |OK|
| 17 | Un autre joueur regarde la carte | Il ne voit pas les boutons d'action du propriétaire |OK|

## B. Personnage secondaire

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 18 | Fiche PNJ : cliquer « Compétence de base », « Spécialité », une ligne de compétence | Jet avec la bonne valeur ; pas de bouton d'inversion (PNJ) |OK|
| 19 | Réglage « Visibilité des jets de PNJ » = réservés au MJ | Jet de PNJ en jet privé MJ par défaut |OK|

## C. Opposition

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 20 | Joueur : cibler un jeton de PNJ, lancer Furtivité, cocher « Jet en opposition », choisir Vigilance | Carte d'opposition : camp A lancé, camp B « En attente » |OK|
| 21 | MJ : bouton « Lancer » du camp B | Jet du PNJ, issue affichée (vainqueur encadré) |OK|
| 22 | MJ : cibler le jeton d'un Risque-tout et opposer un PNJ | Le joueur voit le bouton « Lancer » de son camp et lance (relais MJ) |OK|
| 23 | Inverser un camp (joueur) | −2 PR, issue recalculée |OK|
| 24 | Deux échecs / deux réussites égales | « Match nul » |OK|

## D. Demande de jet du Chef

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 25 | Macro « Demander un jet » créée au chargement | Présente dans le dossier des macros |OK|
| 26 | Demande à deux Risque-tout, Fouille, Difficile, non secrète | Carte ; chaque joueur voit son bouton ; difficulté verrouillée dans la boîte |OK|
| 27 | Après le jet d'un joueur | La ligne passe à « Lancé » |OK|
| 28 | Demande avec difficulté secrète | Le joueur voit « Fixée par le Chef » ; sur la carte du jet, le joueur voit l'issue apparente, le MJ l'issue réelle et le modificateur secret |OK|

## E. Réserves de dés (console ou macro)

| # | Vérification | Attendu | Statut |
|---|---|---|---|
| 29 | `game.thetroubleshooters.rollPool(5, "dX")` | Carte : faces, 6 explosés marqués, total des 4-6 |OK|
| 30 | `game.thetroubleshooters.rollPool(2, "dR")` | Pas d'explosion, total des 4-6 |OK|
