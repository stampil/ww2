# SUIVI — ww2 (French Touch)

Mis en forme le 18/11 (« synthetise mieux le plan je sais meme plus se qu'i lreste a faire ni si il y a des point ambigue a lever »). Ce fichier ne garde que trois choses : ce qu'il me faut de toi, les questions à lever, le travail restant. Citations, décisions et historique : `.claude/CLAUDE.md`.

Tout ce que je peux faire seul est fait : ce qui reste attend une image, un accord ou un choix de toi.

## 1. Ce qu'il me faut de toi

| Il me faut | Ça débloque |
|---|---|
| **`carte-france.png`**, carte muette sans texte (la 1re image a été refusée : du texte dessus ; le 2e prompt est donné) | M2, la carte de France, puis tout le monde (M3 à M6) et les missions choisies |
| **Ton « généré »** de la feuille Croix-Rouge (ambulance et tente sanitaire, 3 états chacune ; prompt donné le 18/11) | les éléments à épargner dans l'attaque au sol |
| Les images de décor, une à la fois, après la Croix-Rouge : tente, nid de mitrailleuse, fantassins, arbres | le décor de l'attaque au sol, les cibles de la reconnaissance, l'ennemi qui tire sur toi |
| Ton accord pour télécharger `SV-GB.png` (1 274 820 octets, GPL v2, FGAddon) | le D.520 allemand, adversaire du combat du cockpit |
| Les trois états de camp restants (tenu par un joueur, tenu par l'IA, attaqué), à demander après la carte | les camps sur la carte |

## 2. Questions à lever

1. **Bombardiers français : comment les avoir ? (bloque E9)** Il n'existe pas de modèle 3D libre de l'Amiot 143 ni du LeO 451 (cherché le 17/11), et le jeu est en 3D partout. (a) Je les modèle d'après les plans libres de `ref/plans-libres/` : long, rendu moins bon que le D.520 repris de FlightGear. (b) Le He 111 allemand, déjà en 3D, tient lieu de bombardier le temps de modéliser : anachronique. (c) E9 attend et je passe aux autres chantiers. Je recommande (c), puis (a).
2. **Que pilotent les joueurs allemands ? (bloque M3 et M5)** Les modèles 3D du Bf 109 G-14, du Ju 87 et du He 111 existent déjà (accueil). Proposition : Bf 109 en chasseur, Ju 87 et He 111 en bombardiers. Deux réserves : le Bf 109 est un G-14 de 1944, pas un E de 1940 ; la base allemande aura besoin de ses propres bâtiments (la planche actuelle porte une cocarde sur le toit du hangar). Oui, ou autre chose ? Je recommande oui.
3. **En attendant la carte et les images, je prends quoi ?** (a) Le MS.406 (modèle 3D déjà converti) comme avion de départ plus faible, le D.520 comme avion fort : c'est ton choix du 16/11 (« on met en avant le morane saulnier en avions de depart et le D520 en avion fort »), alors qu'aujourd'hui la base démarre avec trois D.520 ; l'amélioration « Un D.520 de plus » existe déjà. (b) E11, la campagne. (c) J'attends. Je recommande (a).

## 3. Le travail restant, dans l'ordre

| # | Chantier | Taille | Attend |
|---|---|---|---|
| 1 | **M2 : la carte de France** avec les bases libres, prises et tenues par l'IA ; camps en calques cliquables | moyen | la carte |
| 2 | **M3 : les clans** : un clan est un côté (Français, Allemands), les joueurs d'un même côté sont alliés | moyen | M2, question 2 |
| 3 | **M4 : la gestion intercamps** : échange de ressources, de pilotes, d'équipages et d'avions entre ses bases et entre joueurs d'un clan ; un camp repris est une vraie seconde base (sélecteur de base à l'écran) | grand | M3 |
| 4 | **M5 : l'Allemagne et les camps tenus par l'IA** : un camp sans joueur est tenu par l'IA jusqu'à ce qu'un joueur s'en empare | grand | M3, question 2 |
| 5 | **M6 : les attaques et les bâtiments détruits** : résultats, bâtiments détruits et état des bases synchronisés par le serveur, relus toutes les quelques secondes ; journal pour le joueur absent | grand | M5 |
| 6 | **Missions choisies, sur la carte** : aider un camp allié, poser des avions sur un camp déserté pour le récupérer, attaquer un camp ennemi | grand | M2 à M6, images des camps |
| 7 | **E9 : le bombardement** : vitesse, largage au bon moment, dérive du vent affichée, cibles (char, bunker, usine) | grand | question 1 |
| 8 | **E10 : les assets** : les autres appareils (MS.406, Amiot 143, LeO 451, adversaires allemands), sons, images IA (portraits de pilotes, personnel d'entretien, camion de carburant et pompiers, illustrations des cartes, états abîmé et en réparation des avions, aires de stationnement) | grand | images, question 3 |
| 9 | **E11 : la campagne** : la Bataille de France (mai à juin 1940), puis d'autres batailles historiques, météo, événements | grand | question 3 |
| 10 | **E12 : la finition** : réglages en `localStorage`, performances, nettoyage des outils de lint | moyen | — |
| 11 | **Ennemi qui tire sur toi** dans les mini-jeux (Wings) | moyen | le décor |
| 12 | **Réglages à l'usage**, quand tu auras joué : attaque au sol, reconnaissance (cibles, jauge, mission repérée à 150 %), pénalité de la Croix-Rouge | petit | tes essais |

## Mis de côté

- **Le jeu sur GitHub aussi** (« met de coté », 18/11) : deux voies, le site GitHub qui appelle l'API d'InfinityFree (peu de travail, anti-robot à tester), ou un second serveur chez Supabase (plusieurs jours). Détail au cahier.
