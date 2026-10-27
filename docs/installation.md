# Installation manuelle (développement)

1. Fermez Foundry ou revenez à l'écran de configuration.
2. Décompressez l'archive dans le dossier des systèmes de vos données Foundry :
   `…/FoundryVTT/Data/systems/thetroubleshooters/`
   (le fichier `system.json` doit se trouver directement dans ce dossier).
3. Relancez Foundry : le système apparaît dans l'onglet *Systèmes de jeu*.
4. Créez un monde de test avec ce système et ouvrez-le en tant que MJ.
5. À la première ouverture, une fenêtre propose l'**initialisation** : acceptez. Elle crée le compendium
   « Accroches scénaristiques » et un rapport s'affiche en message privé.
   Vous pouvez la relancer à tout moment avec la macro « The Troubleshooters — Initialiser le système ».

## Mise à jour d'une version de développement

Remplacez le contenu du dossier `thetroubleshooters/` par celui de la nouvelle archive, puis relancez le monde.
L'initialisation est reproposée si la version a augmenté ; elle met à jour les compendiums sans toucher
aux acteurs ni aux objets du monde.
