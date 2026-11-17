# SUIVI — ww2 (French Touch)

Un suivi ne garde que les tâches à faire et les questions en suspens ; les décisions et le cahier des charges sont dans `.claude/CLAUDE.md`.

## À faire

1. **Plan du jeu « Until the Last Plane » : les étapes** — « on est pas mal, là le poc est validé, tu a toutes les billes pour commencer a faire le jeu until the last plane avec ses assets, fait toi un plan d'etape a suivre pour réaliser le jeu, il faut qu'il soit fonctionnel rapidement » (17/11).
   Compris : le POC est validé et sort du suivi. Le plan vise un jeu jouable de bout en bout le plus vite possible : on ferme d'abord la boucle complète sans mini-jeu (jalon 1), puis on ajoute les mini-jeux (jalon 2), puis les assets, la campagne et la finition (jalon 3). Chaque étape finit par quelque chose que tu peux essayer dans le navigateur ; je la livre, je la vérifie à l'écran et par les routes, je la commite sur `POC` (jamais de push), et je te redonne le suivi. Tailles : petit, moyen, grand. Je garde ce qui existe déjà (comptes, escadrille, base, atelier, terrain, D.520 en 3D, dégâts, sprites des bâtiments).

   **Jalon 1 : la boucle jouable, sans mini-jeu** — fait : le jeu est complet et jouable, je peux gagner ou perdre une bataille ; reste l'inspection d'E5
   - **E5 (reste), petit : l'inspection.** Fait : modules détruits, pièces consommées, réparation au Hangar avec un mécanicien, avion en feu et explosion, repos des pilotes, recrutement, personnel d'entretien qui court de l'atelier au hangar (un point de couleur : aucun sprite de personnage). Reste : l'inspection du jeu d'origine (« inspect » : il faut inspecter un avion pour voir la pièce abîmée avant de la réparer), remplacée pour l'instant par l'affichage immédiat des modules détruits. Critère : après une mission, je répare, je fais reposer et je repars.

   **Jalon 1b : le monde multijoueur (après E6 : « fait la micro gestion solo pour l'instant »)** — étapes proposées, à valider au moment de les prendre ; elles font passer les données de E1 à E6, aujourd'hui par compte, à la base ou à l'instance
   - **M1, grand : le monde et les instances.** Tables des instances et des bases ; une base libre se choisit à l'inscription ; quand toutes les bases d'une carte sont prises, une instance neuve se crée, un autre groupe qui ne voit pas le premier ; horloge du serveur par instance, partie du 10 mai 1940 à 6 h à sa création ; les données par compte (base, escadrille, missions, horloge) passent à la base ou à l'instance.
   - **M2, moyen : la carte de France.** La carte à l'écran, avec les bases libres, prises et tenues par l'IA.
   - **M3, moyen : les clans.** Un clan est un côté (Français, Allemands) ; les joueurs d'un même côté sont alliés.
   - **M4, grand : la gestion intercamps.** Entre les bases d'un joueur et entre les joueurs d'un même clan : échange de ressources, de pilotes, d'équipages et d'avions.
   - **M5, grand : l'Allemagne et les camps tenus par l'IA.** Une partie de l'Allemagne avec ses camps, jouable par des joueurs ; un camp sans joueur est tenu par l'IA jusqu'à ce qu'un joueur s'en empare (vaut aussi pour une base française libre).
   - **M6, grand : les attaques et les bâtiments détruits.** Résultats des attaques, bâtiments détruits, état des bases : tout est synchronisé par le serveur ; le front relit le serveur toutes les quelques secondes et après chaque ordre ; un journal des événements pour le joueur absent.

   **Jalon 2 : les mini-jeux, le cœur tactique**
   - **E7, grand : le combat aérien par cartes.** Règles côté back (grille invisible, trois cartes de manœuvre par modèle d'avion, tours simultanés, cône de tir, trois à cinq tours), route de tour, et à l'écran la vue de dessus avec le D.520 en 3D qui vire, glisse et accélère, cartes jouables au doigt. Il remplace le calcul de E4 pour les combats aériens.
   - **E8, moyen : la reconnaissance.** Survol d'une carte ennemie, photos, jauge de détection qui monte avec le temps passé, missions plus rentables débloquées contre un risque d'interception.
   - **E9, grand : le bombardement.** Vitesse, largage au bon moment, dérive du vent affichée, cibles (char, bunker, usine), bombardiers Amiot 143 et LeO 451.

   **Jalon 3 : les assets, la campagne, la finition**
   - **E10, grand : les assets.** Les autres appareils (MS.406, Amiot 143, LeO 451, adversaires allemands) en 3D ou en sprites à partir des plans libres (`ref/plans-libres/`) ; la livrée allemande du D.520 déjà prête dans FGAddon (`SV-GB.png`, 1 274 820 octets, accord de téléchargement à demander) ; images à faire générer par l'IA, un prompt à la fois (portraits des pilotes à la place des silhouettes, personnel d'entretien, camion de carburant et pompiers, illustrations des cartes, états endommagé et en réparation des avions, aires de stationnement) ; sons.
   - **E11, grand : la campagne.** La Bataille de France (mai à juin 1940) puis d'autres batailles historiques, météo, événements, tutoriel.
   - **E12, moyen : la finition.** Téléphone et tactile, réglages en `localStorage`, performances, mise en ligne (PHP 8.3 et MariaDB chez un hébergeur), limite d'essais de connexion, nettoyage des outils de lint (point 2).

2. **Outillage lint du scaffold (hors POC)** — relevé le 16/11 après ton `npm install` : `eslint` 9.39.5 est signalé « no longer supported » et `npm audit` donne 7 alertes modérées, toutes dans la chaîne `typescript-eslint` (via `minimatch`, un outil de dev, rien du jeu ni de Vite). Ne pas lancer `npm audit fix --force` (il imposerait `typescript-eslint` 8.36.0, un changement cassant). À mettre à jour plus tard.

3. **Jeu multijoueur : monde, instances, clans** — « ce jeu sera multijoueur, donc oui l'orloge c le temps serveur a prendre en compte. on fera une carte de france avec des bases a gerer, chaque base innocupé peut etre chosii par un joueur. si toutes les bases sont prise, sa créé une nouvelle instance, un nv groupe de joeuur entre eux qui ne verront pas les premier. il faudra aussi avoir une partie de l'allemagne avec des camps. le jeux sera par "clan"... il faut une gestion intercamps en plus de notre micro gestion de camps. » puis « avec echange de ressources » puis « l'etat des bases et les resultat des attaque, les batiment detruit tout doit etre synchronisé par le serveur » (17/11, trois messages de suite). Réponses : « camp = base , clan = coté on va dire. 2. les 2. si pas de joueur le camps est IA jusqu'a ce qu'un joueur ce l'accapare. 4. oui fait la micro gestion solo pour l'instant 5. a 6. c et tout pilote, crew avion... 7. a 8. laisse le msg comme scela pour le statique » (17/11).
   Compris :
   - **Camp = base ; clan = côté** (les Français, les Allemands).
   - **Horloge** : le temps du serveur, partagé, sans pause ; une instance neuve part du 10 mai 1940 à 6 h.
   - **Carte de France** : des bases à gérer ; une base inoccupée peut être choisie par un joueur ; quand toutes sont prises, une instance neuve, un autre groupe qui ne voit pas le premier.
   - **Allemagne** : une partie de l'Allemagne avec des camps, jouée par des joueurs des deux côtés ; un camp sans joueur est tenu par l'IA jusqu'à ce qu'un joueur s'en empare.
   - **Gestion intercamps** : en plus de la micro-gestion d'une base ; échange de ressources entre ses propres bases et entre les joueurs d'un même clan, et tout s'échange : ressources, pilotes, équipages, avions.
   - **Attaques** : l'état des bases, les résultats des attaques et les bâtiments détruits sont synchronisés par le serveur, que le front relit toutes les quelques secondes et après chaque ordre.
   - **Ordre** : « fait la micro gestion solo pour l'instant » : je fais E2 repris, puis E4, E5 et E6 sur les données par compte ; le monde (M1 à M6) vient après et fera passer ces données à la base. Je prends cela comme le go de ces étapes.
   - **Site statique** : le message « L'API ne répond pas. » reste tel quel.

## Questions en suspens

Aucune : « Oui, tes choix, go » (17/11) a tranché les sept questions avec mes propositions (voir le cahier).
