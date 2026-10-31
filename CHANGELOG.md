# Journal des modifications

## 0.11.6 — retour de recette : bandeau des étapes de l'assistant

- Bandeau des six étapes de l'assistant « Nouveau Risque-tout » plus haut : la hauteur fixe des boutons de Foundry est levée,
  les libellés longs (« Compétences et personnalisation », « Capacités et désavantages ») passent sur deux lignes en entier.

## 0.11.5 — correctif : propriété « state » réservée par Foundry v14

- Cause du « La macro ne lance aucune action » (erreur remontée grâce à la 0.11.4) : `ApplicationV2` de Foundry v14 expose
  une propriété `state` en lecture seule ; le modèle commun des assistants (DraftApp) y écrivait son état calculé.
  Renommée `draftState`. Touchait l'assistant « Nouveau Risque-tout », l'assistant « Création » de la fiche
  et l'assistant de personnage secondaire.
- Par précaution, l'état du débriefing est renommé `debriefState` (il masquait la même propriété).

## 0.11.4 — retour de recette : « La macro ne lance aucune action »

- L'ouverture de l'assistant « Nouveau Risque-tout » ne dépend plus du registre interne des fenêtres de Foundry ;
  une erreur à l'ouverture (préparation ou gabarit) s'affiche désormais à l'écran avec son message, détaillé dans la console (F12),
  au lieu d'être perdue.
- Nouveau bouton « Nouveau Risque-tout » en tête du répertoire des acteurs, pour tous les utilisateurs : il ouvre l'assistant
  sans passer par une macro (un joueur sans le droit « Utiliser les macros de script » ne peut pas lancer la macro).
- Au chargement, la macro partagée existante est remise à niveau (commande, type script, partage) ; sa commande signale
  un système non chargé au lieu d'échouer en silence.

## 0.11.3 — « Nouveau Risque-tout » : assistant pas à pas

- La macro « Nouveau Risque-tout » ouvre un assistant qui suit les étapes 1 à 6 de la création du livre (p. 32) :
  1 archétype (et nom, joueur propriétaire pour le MJ), 2 compétences et personnalisation (11 compétences pour un atypique),
  3 deux capacités et un désavantage, 4 Vitalité maximale (calcul détaillé), 5 langues, 6 cinq kits de matériel.
- Bandeau des étapes cliquable, Précédent / Suivant ; on ne passe pas une étape qui comporte une erreur bloquante.
- La fiche n'est créée qu'à la fin, déjà remplie, puis ouverte ; le brouillon est gardé sur l'utilisateur (on peut fermer et reprendre).
- Joueur sans droit de création : le MJ crée la fiche (dont le joueur est propriétaire), l'assistant du joueur la remplit et l'ouvre.
- Les étapes 7 à 10 (accroches, description, idée de conception, rencontre) se complètent sur la fiche ; l'assistant complet de la fiche
  (bouton « Création ») est inchangé et partage les mêmes sections.

## 0.11.2 — macro « Nouveau Risque-tout »

- Macro « Nouveau Risque-tout », visible et utilisable par les joueurs : nom de la fiche, création, ouverture de l'assistant de création.
- Le MJ peut choisir le joueur propriétaire : la fiche lui est confiée, associée à son compte s'il n'a pas encore de personnage,
  et l'assistant s'ouvre chez ce joueur.
- Un joueur sans le droit de créer des acteurs passe par le relais MJ (le MJ doit être connecté) ; l'assistant s'ouvre chez lui dès la création.

## 0.11.1 — phase 11 : contenus (2) — tables aléatoires et journaux d'aide

- Compendium « Tables aléatoires » (37 tables, en dossiers) : prénoms masculins, prénoms féminins et noms de famille de 11 nationalités
  (LdB p. 224-227), traits de personnalité (d%), idées de conception, lieux de rencontre, jurons signifiant « Nom de Dieu » (d%).
- Compendium « Journaux d'aide », mis en page dans la charte : À propos du système, Aide-mémoire des règles, Session pilote (modèle),
  Feuille d'indices (modèle), Calendrier de 1965 (jours fériés et saisons), Les jurons en bande dessinée.
- L'initialisation conserve les pages de journal et les résultats de table lors d'une mise à jour.
- Retour de recette : nom des PNJ et des objets en lettrage net, sans contour ni ombre portée.

## 0.11.0 — phase 11 : contenus (1) — fichier des menaces (validé en Foundry réel, 10/10)

- Compendium « Fichier des menaces » : les 51 personnages secondaires du livre (LdB p. 208-219), rangés en dossiers :
  Génériques, Police et justice, Mafia, Armée, Agents secrets, La Pieuvre, Animaux, Dinosaures.
  Rang, compétence de base et spécialité, compétences importantes et de personnalisation, attaques (valeur, dégâts, utilisations,
  descripteurs, contre), défense, protection, Vitalité, initiative, descripteurs d'adversaire, description du livre et source.
- L'initialisation sait désormais créer des dossiers dans un compendium.

## 0.10.4 — icônes des conditions (validé)

- 16 icônes originales des conditions, en tampons encreurs ronds (papier, double cercle, pictogramme), à l'encre de leur famille
  comme les tampons du passeport : jetons, menu des statuts, panneau des conditions de la fiche PNJ (`assets/icons/conditions/`).

## 0.10.3 — retour de recette (validé)

- Icône des 7 kits de super-science (Assistant robotique, Ceinture de lévitation, Imprimante à masques, Octopode,
  Projecteur encéphalographique inversé, Propulseur dorsal amélioré, Protections anti-PEI) : l'icône visée n'existe pas dans Foundry ;
  remplacée par une icône originale fournie avec le système (`assets/icons/kit-super-science.svg`). La ré-initialisation met le compendium à jour.

## 0.10.2 — charte étendue à toutes les fenêtres

- Registre BD vintage (papier tramé, champs cerclés, boutons en pastilles, cadres à ombre portée, titres en lettrage) appliqué à toutes les fenêtres
  du système : boîtes de jet, demande de jet, dépenses, dégâts, déclenchement de désavantage, confirmations, outils du Chef (points de récit,
  Dangers, Défi, Duel, Débriefing), création de personnage secondaire et fiches d'objets (bandeau titre bleu nuit tramé).
- Registre « Passeport » pour la création et la progression d'un Risque-tout.
- Toutes les boîtes de dialogue du système portent désormais les classes de la charte.

## 0.10.1 — retour de recette

- Icônes de la barre de titre des fiches Risque-tout et PNJ de nouveau visibles : les styles de la charte (police, boutons, liens)
  sont limités au contenu de la fiche et n'écrasent plus la police des icônes de Foundry.

## 0.10.0 — phase 10 : charte graphique (validé en Foundry réel, 41/41)

- Polices libres (SIL OFL 1.1) embarquées dans le système : Libre Caslon Text, Archivo Narrow, Courier Prime, Space Mono, Bangers, Comic Neue (`fonts/`).
- Fiche de Risque-tout « Passeport » : page guillochée, en-tête du Bureau international des Risque-tout (emblème original), photo et cachet,
  champs tapés à la machine, cases de Vitalité, bande de lecture automatique, onglets verticaux à droite en marque-pages.
- Les 16 conditions en tampons : planche « Mentions officielles » (encrés quand actifs, empreinte pâle sinon ; encre par famille d'états),
  dans l'onglet Compétences et l'onglet Combat (niveaux et jets de sortie sous le tampon) ; tampons actifs rappelés sur la photo.
- Fiche PNJ BD vintage tramée : papier jauni, trames de points, bandeau titre, rang en pastille, jauge de Vitalité, cases numérotées.
- Cartes de chat BD 1960-70 : papier, bandeaux tramés, résultats en lettrage, onomatopées sur les moments forts
  (BIM ! Bon Karma, PATATRAS ! Mauvais Karma, PAF ! attaque qui touche, POUM ! Hors de combat, ZIOUM ! attaque manquée,
  VROOOM ! défi excellent, CATASTROPHE ! défi désastreux, TCHAC ! duel gagné).
- Réglage client « Effets graphiques réduits » (onomatopées, trames et grain retirés).

## 0.9.0 — phase 9 : progression et intersession (validé en Foundry réel, 28/28)

- Outil du Chef « Débriefing » (macro, bouton de l'outil des points de récit) : critères des coches gratuites (ou points d'expérience) par Risque-tout,
  retrait pour meurtre de sang-froid, fin d'aventure (sans effusion de sang +3, conditions de victoire → jets ou points de récompense, périodes d'intersession).
- Fenêtre « Progression » de la fiche : coches ordinaires, coches gratuites, jets de récompense, dans l'ordre du livre ; jets d'expérience en carte de chat
  (table d'augmentation, plafond 100, 106 depuis 100) ; croix de langue (courante à 5) et de capacité (acquise au coût, prérequis, compétences associées) ;
  limites d'usage par cible ; Vitalité recalculée et annoncée.
- Intersession : convalescence (retire Blessé), fréquentations et voyage (+2 PR à la prochaine session), achats et artisanat (rappels), entraînement.
- Règle alternative en points (réglage « Système de progression ») : points d'expérience et points de récompense.
- Langues en apprentissage : bouton de jet de Langues sur la fiche (+1 pip par croix).

## 0.8.0 — phase 8 : création de personnages (Risque-tout et personnages secondaires) (validé en Foundry réel, 33/33)

- Compendium « Archétypes » : les 15 archétypes du livre (compétences 75 / 65 ×4 / 45 ×6, capacités, désavantages, kits avec choix « A | B », accroches suggérées, description).
- Modèle commun d'assistant de création (brouillon conservé sur la fiche, contrôles bloquants et avertissements, « Appliquer », « Recommencer »).
- Assistant de création de Risque-tout (bouton « Création » de la fiche) : archétype ou personnage atypique, personnalisation des compétences
  (transferts, remplacements, échange), Vitalité et langues recalculées, capacités et désavantages (3e capacité contre un 2e désavantage, prérequis à partir du niveau 2),
  langues (maternelle selon l'origine), kits (3 de l'archétype + 2 au choix, matériel signature), accroches (avertissement si déjà prise), identité,
  tables « Idée de conception » et « Lieu de rencontre » (1d100). Une nouvelle application remplace les objets de la création précédente.
- Assistant de création de personnage secondaire (bouton « Création » de la fiche PNJ, macro « Nouveau personnage secondaire ») :
  modèles génériques des cinq rangs (spécialiste ultra-générique, sbire, sous-fifre, lieutenant, chef), repères du livre en avertissements
  (base, spécialité, défense, Vitalité, initiative, compétences importantes, attaques, descripteurs de rang et inversions).

## 0.7.0 — phase 7 : équipement (validé en Foundry réel, 31/31)

- Compendium « Kits de matériel » : les 95 kits du livre (contenu, coût, descripteurs à pips, profils d'arme, prérequis, catégories).
- Kits à plusieurs armes (profil principal + armes supplémentaires), état « hors d'usage », usages des kits bricolés.
- Onglet Matériel : kits emportés (5 emplacements), entrepôt, objets trouvés ; avertissements sur les gadgets signature.
- Obtention par glisser-déposer : personnel, mission, trouvé, bricolé, ou acheté avec des PR (dépense validée par le Chef, kit livré à la validation) ; prérequis indicatifs.
- Fin de l'histoire (outil des points de récit) : kits achetés et de mission rendus.
- Descripteurs de gadget déclenchés sur les unités quand le kit sert de matériel (Peu fiable, Dangereux, Très dangereux, Fatigant, Assourdissant, Fumigène).
- Défi : mode « Fabrication de gadget » (compétences, malus de catégorie, jetons à répartir, contrôle) et création ou modification du kit par le Chef.

## 0.6.0 — phase 6 : défis et duels (validé en Foundry réel, 28/28)

- Application du Chef « Défi » (macro) : titre, 3 à 5 jets (compétence, modificateur, participant attribué ou au choix des joueurs,
  opposition libellé + valeur), textes des cinq résultats, 18 modèles tirés de « Comment résoudre les situations ».
- Carte de défi : chaque jet est une carte ordinaire (inversions, capacités) ; réussites et résultat recalculés automatiquement ;
  jet adverse lancé par le MJ pour les lignes en opposition.
- Application du Chef « Duel » (macro) : nombre cible, camp qui commence, deux camps (nom, objectif, participants ;
  jetons sélectionnés et ciblés présélectionnés).
- Carte de duel : demandes à tour de rôle, paire de compétences, malus de répétition (−2 par demande antérieure, portée réglable),
  choix compétence listée / spécialité / base pour les PNJ, score recalculé après inversion, rappel du descripteur, fin au nombre cible.

## 0.5.1 — retour de recette

- Panneau des conditions affiché sur deux colonnes (recette 5, point 1).

## 0.5.0 — phase 5 : conditions et dangers (validé en Foundry réel, 40/40)

- Panneau des 16 conditions dans l'onglet Combat du Risque-tout et sur la fiche PNJ (D-057 amendée) : bascule, niveaux (Saoul ×3 puis Hors de combat, Épuisé cumulatif),
  jets de sortie (Volonté, Agilité, Corps-à-corps / Force / Agilité), Terrifié → Effrayé, Blessé « rafistolé » pour la scène.
- Nature du jet dans la boîte de jet : ordinaire, mouvement, vue, ouïe (Sonné, Surchargé ; Aveuglé et Sourd ratent d'office).
- Épuisé réduit la Vitalité maximale des Risque-tout ; Saoul cumule malus et protection.
- Tracker : Surpris retiré en fin de tour ; En feu (1dX, Blessé si Hors de combat), Paralysé et Terrifié traités au début ou à la fin du tour.
- Adversaires Effrayant / Terrifiant : condition posée aux Risque-tout au début du combat.
- Outil du Chef « Dangers » (macro) : chute, explosion (zone, zones adjacentes, sbires groupés), zone en feu, noyade, poison (4 poisons ou force libre),
  embuscade, sniper des PJ, dégâts génériques ; cartes de vérification en deux temps (jet, puis « Appliquer ») et cartes de dégâts avec encaissement.

## 0.4.0 — phase 4 : combat (validé en Foundry réel, 53/53)

- Initiative : jet de Vigilance automatique (carte inversable qui met à jour le tracker), valeur fixe des PNJ,
  Allonge +2, malus de protection, Risque-tout avant PNJ à égalité, « Évaluer la situation ».
- Tracker : pastilles d'actions M / G / P / B (rappel sans verrou), action retardée, marqueurs « agit maintenant »,
  action bonus, commandant et contre-attaque ; remise à zéro au début du tour.
- Carte d'attaque : options (base, Vlan !, Pan !, Rakatakata !), défense en opposition (Corps-à-corps, Agilité à couvert,
  score des PNJ), inversions (2 PR, Danger de mort gratuite, « inverser (X) » des PNJ), capacités sur les jets,
  dégâts explosifs détaillés, relance du Bon Karma, encaissement, choix Vitalité / Blessé / Danger de mort selon le rang,
  Hors de combat et mort confirmée.
- Descripteurs d'arme lus dans le texte : munitions (X), un coup, lancé, précis, aiguisé, tranchant, non létal, paralysant,
  collet, fragile, incendiaire, croche-patte, allonge, rechargement rapide / difficile.
- Karma en combat : sbires et sous-fifres Hors de combat, malus « prochain jet », récupération et Vulnérable en défense.
- Fiche : onglet Combat (armes, recharger, protection, défenses, reprendre son souffle, tomber à terre / se relever,
  conditions de combat). Fiche PNJ : bouton d'attaque, compétence et état « vide » des attaques, protection.
- Capacités de combat automatisées : sbire Hors de combat, relance et bonus de dégâts, récupération, marqueurs d'initiative et d'action bonus.
- Fin de combat : Vitalité au maximum, Danger de mort retiré, carte de bilan avec jet de Médecine et « Capturés ! ».
- Relais : option « MJ uniquement » pour les effets sur les acteurs d'autres joueurs.

## 0.3.0 — phase 3 : points de récit, désavantages, capacités (validé en Foundry réel, 35/35)

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
