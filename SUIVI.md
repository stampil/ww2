# SUIVI — ww2 (French Touch)

Mis en forme le 18/11 (« synthetise mieux le plan je sais meme plus se qu'i lreste a faire ni si il y a des point ambigue a lever »). Ce fichier ne garde que trois choses : ce qu'il me faut de toi, les questions à lever, le travail restant. Citations, décisions et historique : `.claude/CLAUDE.md`.

Tout ce que je peux faire seul est fait : ce qui reste attend une image, un accord ou un choix de toi.

## 1. Ce qu'il me faut de toi

| Il me faut | Ça débloque |
|---|---|
| **Ton avis sur la carte nettoyée** (`ref/carte-france.png`, envoyée en carte) : la 3e image avait encore des mots, je les ai effacés par code, il reste de légères traînées claires. Bonne comme ça, ou je la trace par code d'après Natural Earth ? | M2, la carte de France, puis tout le monde (M3 à M6) et les missions choisies |
| **Ton « généré »** du convoi refait : destruction sans feu ni flamme (prompt donné le 18/11, image 1 = la feuille du convoi) | les sprites détruits de l'attaque au sol |
| **Ton « généré »** de la feuille Croix-Rouge, prompt corrigé le 18/11 (plus de flammes) : ambulance et tente sanitaire, 3 états chacune | les éléments à épargner dans l'attaque au sol |
| Les images de décor, une à la fois, après la Croix-Rouge : tente, nid de mitrailleuse, fantassins, arbres | le décor de l'attaque au sol, les cibles de la reconnaissance, l'ennemi qui tire sur toi |
| Ton accord pour télécharger `SV-GB.png` (1 274 820 octets, GPL v2, FGAddon) | le D.520 à livrée allemande, avion de l'Axe |
| Les trois états de camp restants (tenu par un joueur, tenu par l'IA, attaqué) et une feuille de bâtiments de l'Axe, à demander après la carte | les camps sur la carte, la base de l'Axe |

## 2. Questions à lever

1. **Bf 109 : le seul anachronisme étant Vichy (« on fera q anachronisme avec vichy »), il faut un Bf 109 E de 1940.** Le modèle 3D que j'ai (FGAddon) est un G-14 de 1944. (a) Je cherche un Bf 109 E libre et je te donne la source avant tout téléchargement. (b) Je garde le G-14 avec une texture de 1940 et le nom « Bf 109 E » : la forme (capot, dérive) reste celle d'un G. (c) Le G-14 reste tel quel, ce qui fait un second anachronisme. Je recommande (a), puis (b).
2. **Campagne dynamique : trois points à fixer (bloquent E11).** (i) L'objectif de 8 abattus et l'écran de fin de bataille disparaissent : les abattus deviennent un score, la base ne « se termine » jamais. (ii) Un avion perdu se remplace en l'assemblant à l'atelier avec les quatre pièces qu'il fabrique déjà (moteur, ailes, fuselage, armement) : c'est ce qui rend le ravitaillement vital ; un pilote mort se recrute déjà. (iii) Le ravitaillement du front : chaque base touche un ravitaillement régulier qui baisse quand elle est près du front, et les bases de l'arrière peuvent lui en envoyer (M4) avec un délai selon la distance. D'accord, ou à changer ? Je recommande d'accord.
3. **Le vent ne sert plus à rien sans bombardement.** Il n'affectait que le bombardement. (a) Il pousse l'avion de côté dans l'attaque au sol et dans la reconnaissance, en proportion des km/h : le joueur compense. (b) On retire l'affichage du vent. Je recommande (a).

## 3. Le travail restant, dans l'ordre

| # | Chantier | Taille | Attend |
|---|---|---|---|
| 1 | **M2 : la carte de France** : bases libres, prises et tenues par l'IA ; camps en calques cliquables ; on choisit sa base en cliquant la carte | moyen | ton avis sur la carte |
| 2 | **M3 : les clans** : un clan est un côté, les Français ou l'Axe (Allemands et Vichy) ; les joueurs d'un même côté sont alliés | moyen | M2 |
| 3 | **M4 : la gestion intercamps** : échange de ressources, de pilotes, d'équipages et d'avions entre ses bases et entre joueurs d'un clan ; un camp repris est une vraie seconde base (sélecteur de base à l'écran) | grand | M3 |
| 4 | **M5 : les camps de l'Axe et les camps tenus par l'IA** : un camp sans joueur est tenu par l'IA jusqu'à ce qu'un joueur s'en empare ; l'Axe pilote le Bf 109, le D.520 à livrée allemande et le D.520 à livrée Vichy | grand | M3, question 1, accord SV-GB |
| 5 | **M6 : les attaques et les bâtiments détruits** : résultats, bâtiments détruits et état des bases synchronisés par le serveur, relus toutes les quelques secondes ; journal pour le joueur absent | grand | M5 |
| 6 | **E11 : la campagne dynamique** : le serveur fait vivre la seule bataille de France (mai à juin 1940) ; les pertes comptent ; le ravitaillement tient les bases du front ; plus de « nouvelle bataille » | grand | M2 à M6, question 2 |
| 7 | **Missions choisies, sur la carte** : aider un camp allié, poser des avions sur un camp déserté pour le récupérer, attaquer un camp ennemi | grand | M2 à M6, images des camps |
| 8 | **E10 : les assets restants** : Bf 109 E, MS.406 (avion de départ, décision du 16/11), sons, images IA (portraits de pilotes, personnel d'entretien, camion de carburant et pompiers, illustrations des cartes, états abîmé et en réparation des avions, aires de stationnement) | grand | images, question 1 |
| 9 | **E12 : la finition** : réglages en `localStorage`, performances, nettoyage des outils de lint, retrait du type de mission « bombardement » (plus de bombardier jouable) | moyen | question 3 |
| 10 | **Ennemi qui tire sur toi** dans les mini-jeux (Wings) | moyen | le décor |
| 11 | **Réglages à l'usage**, quand tu auras joué : attaque au sol, reconnaissance (cibles, jauge, mission repérée à 150 %), pénalité de la Croix-Rouge | petit | tes essais |

## Mis de côté

- **Le jeu sur GitHub aussi** (« met de coté », 18/11) : deux voies, le site GitHub qui appelle l'API d'InfinityFree (peu de travail, anti-robot à tester), ou un second serveur chez Supabase (plusieurs jours). Détail au cahier.
