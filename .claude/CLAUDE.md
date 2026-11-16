# CLAUDE.md — ww2 (French Touch)

## Suivi : comment mettre en suivi toutes les instructions

Repris le 16/11 de `~/PERSONNEL/sw/.claude/CLAUDE.md` (session « test portage php8.5 ») et de la section 0 de `~/.claude/CLAUDE.md`.

**LE SUIVI EST DANS `SUIVI.md`, À LA RACINE DU DÉPÔT, À RELIRE EN PREMIER.** À chaque instruction de l'utilisateur, dans cet ordre :

1. L'écrire dans `SUIVI.md` avec ses mots exacts et ce qui en est compris. Une demande ambiguë s'y pose en question, jamais en choix silencieux.
2. Redonner TOUT `SUIVI.md`, global, avec les questions en suspens, pas seulement les dernières instructions.
3. Ne rien coder tant que l'utilisateur n'a pas dit « go ».
4. Au « go », dépiler dans l'ordre validé.

- **Un suivi ne garde que les tâches à faire et les questions en suspens** (15/11, « un suivi c'est que les tâches à faire et les questions en suspens », « ne me rappelle pas les finis ») : un point fini en sort, l'historique du dépôt le garde.
- **Plan et mémoire de travail** (consigne du 14/11, « travaille mieux en plan et suivi pour ne plus oublier, ta compression de contexte te fait perdre des données essentielles ») : (1) la tâche entre dans le plan de l'app (`update_plan`) dès le premier appel d'outil ; (2) tout ce qu'il faut pour la reprendre (fichiers sources, noms de branches, valeurs, décisions, consignes redites) s'écrit dans ce fichier ou dans `SUIVI.md` AVANT de coder ; (3) à la fin, la ligne est mise à jour ou retirée. Une consigne que l'utilisateur redit est une consigne perdue : elle va au cahier tout de suite, avec sa date et ses mots.
- **Chaque tâche que l'utilisateur ajoute est acquittée par le plan** (14/11, « à chaque tâche que je rajouterai, tu acquiesces en mettant à jour le plan et en me l'affichant par prompt, je veux m'assurer que tu n'oublieras plus jamais rien ») : dès qu'une demande arrive, même au milieu d'un travail, le plan de l'app est mis à jour (liste entière : fait, en cours, à venir) ; il garde toute la file. Sa recopie en clair dans la réponse n'est pas reprise ici : elle ferait doublon avec le suivi global redonné à chaque fois (16/11, « Oui, copier »).
- **Le « go » vient de l'utilisateur, en toutes lettres** (leçon du 10/11 dans `sw` : un « Oui, coder » répondu à une question de fin de tour n'a pas levé la consigne ; l'utilisateur a corrigé aussitôt, « code que la page d'accueil, ne code pas les instructions du suivi »).

## Décisions et consignes de l'utilisateur (16/11)

Le texte exact de l'utilisateur, puis ce qui en est compris. Ce sont des règles du projet : le suivi n'en garde rien.

2. **Projet jeu web : back API PHP 8.1, MySQL, front React, flex en SCSS** — « projet jeu web en api php 8.1 coté back qui parlera a du mysql coté database. le front reste en react. devra genrer le flex en scss » (16/11).
   Compris :
   - Back : une API en PHP 8.3 (`"php": "^8.3"`, réponse « Oui, 8.3 » de l'instruction 6).
   - Database : MariaDB 10.11 en dev, SQL commun à MySQL et MariaDB (réponse « Oui, SQL commun » de l'instruction 6), parlé par l'API.
   - Front : reste le React existant (React 19, TypeScript, Vite 6, i18next FR/EN).
   - Style : le front passe en SCSS, avec le flex (flexbox) géré en SCSS.

3. **Style du code : minimaliste, lisible, documenté, SOLID** — « le code doit etre minimaliste, tres sympliste ( je prefere de boucle clair lissible, bien documenté avecdes variable qui parle, en ayant la rigueur SOLID » (16/11).
   Compris :
   - Code minimal, très simple.
   - Boucles explicites, claires, lisibles (pas de chaînes compressées).
   - Variables et noms parlants (noms complets).
   - Code bien documenté.
   - Rigueur SOLID, sur le back et sur le front.

4. **Le jeu : remake de Until the Last Plane** — « le jeu est un remake de until the last plane : » suivi du game design collé (texte exact en annexe ci-dessous) (16/11).
   Compris, les systèmes à coder :
   - Boucle principale en trois temps, gestion en temps réel avec pause active + mini-jeux tactiques au tour par tour : Reconnaissance → Préparation → Exécution (missions) → Maintenance.
   - Base (aérodrome) : 4 bâtiments (Quartier Général, Atelier, Entrepôt, Hangar/Piste), ressources et files d'attente ; avions faits de modules (moteur, ailes, fuselage, armement), fabrication des pièces à l'atelier (un mécanicien réduit le chrono) ; avion en feu ou très endommagé = compte à rebours, explosion sur la piste si pas réparé à temps (pilote parfois tué).
   - Entités : Pilote (Rang, Fatigue, Stress, Précision, Résistance) ; Avion (Catégorie chasseur ou bombardier/attaquant, Durabilité, Maniabilité, Capacité de carburant, Emport de munitions) ; Météo (vent, température) avec malus de précision au bombardement.
   - Mini-jeux en vue de dessus : Reconnaissance (jauge de détection), Combat aérien (deck de 3 cartes de manœuvre, jeu simultané, grille invisible, cône de tir), Bombardement (vitesse, largage, dérive du vent).
   - Progression : campagne de plusieurs batailles historiques ; deux monnaies, Ressources matérielles et Points de Commandement (amélioration de l'aérodrome et des escadrilles).

5. **Aucun push sans accord express (consigne permanente)** — « tu ne pushera pas sur le dépot public sans mon accord express » (16/11).
   Compris : je ne pousse rien vers un dépôt public (`stampil/french_touch`, `stampil/ww2`) sans ton accord express, donné pour ce push précis. Je commite en local seulement.

6. **Réponses du 16/11 aux questions du suivi** (texte exact, puis ce que j'en comprends) :
   - « 1 le style.css sera a reconvertir en scss » → `src/styles.css` converti en SCSS.
   - « 2. prend une version supporté utilisé par les hebergeur ( génralement la derniere est tjrs trop recente ) » → version PHP encore supportée et répandue chez les hébergeurs, pas la dernière ; retenu : PHP 8.3 (réponse « Oui, 8.3 »).
   - « 3. si mariadb est utiliser par les hebergeur lambda, alors ok » → MariaDB si les hébergeurs l'utilisent (point non confirmé ; réglé par « Oui, SQL commun »).
   - « 4. maison mais en prennais les vendor le + possible pour le REST etc » → API maison, avec des paquets composer (vendor) le plus possible pour le REST (routeur, requêtes/réponses…) (liste validée sans PHPUnit, voir les deux dernières réponses).
   - « 5. front a la racine » → le React reste à la racine du dépôt, l'API à côté (dossier `api/`).
   - « 6. branch POC mais ne push pas de PR sur master sans mon accordexpress » → travail sur la branche `POC` ; ni push ni PR vers `master` sans accord express.
   - « 7. oui respecte consigne général, mais fait du PHPDOC aussi » → règles générales (aucun commentaire par défaut, 2 lignes max, en anglais) + PHPDoc sur les classes et interfaces (précisions : validé par « oui pour tout », voir instruction 8).
   - « 8.  ok » → SOLID : une responsabilité par classe, une interface seulement aux vraies frontières (accès MySQL, sortie HTTP, les 3 mini-jeux).
   - « 9. ok » → ordre : (a) socle API + MySQL + front SCSS, (b) Pilote et Avion, (c) la Base, (d) combat aérien par cartes, (e) reconnaissance et bombardement, (f) économie et campagne.
   - « 10. les 2 mais ce qui fait foi sera le back » → chrono calculé dans le front pour l'affichage ET dans le back (dates en base, pause enregistrée) ; en cas d'écart, le back fait foi.
   - « 11. back pour resolution via api AJAX » → le front envoie les choix du joueur (cartes jouées, largage) en AJAX (fetch), le back résout et répond en JSON.
   - « 12. 1 seule save mais avec compte, la save peut etre en localstorage pour  l'esteqiue, setting perso » → comptes joueurs, une seule sauvegarde de jeu par compte (en MySQL) ; localStorage pour l'esthétique et les réglages perso (point à confirmer : validé par « oui pour tout », voir instruction 8).
   - « 13. on ne part pas sur du pixel art, mais sur des avion style bd lissé, les prompt seront a généré pour une ia spécialisé, avec des ref d'image joint pour tenir la charte graphique » / « oui : on met en avant le morane saulnier en avions de depart et le D520 en avion fort. » / « + 2 bombardier equivalent en fr » → graphismes : avions style BD lissé (pas de pixel art) ; je produis un prompt par visuel pour une IA spécialisée, avec des images de référence jointes pour la charte. Avion de départ : Morane-Saulnier ; avion fort : D.520 ; plus 2 bombardiers français équivalents (validés par « oui pour tout », voir instruction 8).
   - « 14. bien vu c'est le ww2 a prendre et developper au final » → `stampil/ww2` devient le dépôt de développement (état relevé ; validé par « oui pour tout », voir instruction 8).
   - « Oui, 8.3 » (réponse à la question sur la version PHP) → PHP 8.3 est la version cible (`"php": "^8.3"`), `league/route` 7.0.0 compatible.
   - « Oui, SQL commun » (réponse à la question MariaDB / MySQL) → MariaDB 10.11 en dev (déjà installé), SQL commun à MySQL et MariaDB, sans fonction propre à l'un ou l'autre.
   - « 1 . ne fait pas de php unit dans ce projet » (réponse à la question sur les paquets composer) → liste validée sans PHPUnit : `league/route`, `nyholm/psr7`, `nyholm/psr7-server`, `laminas/laminas-httphandlerrunner`, `vlucas/phpdotenv` ; accès MySQL en PDO natif. Aucun PHPUnit dans le projet (voir instruction 8 sur les tests).
   - « 2 oui » (lu comme la réponse à la question sur les comptes) → comptes joueurs avec pseudo + mot de passe (`password_hash` natif), session PHP en cookie, pas d'e-mail en v1.

7. **Planche de référence graphique** — « voila le model du rendu desirer pour generer les asset, sa sera la ref de base » (16/11), image jointe : `/tmp/claude-1001/-home-sgd-PERSONNEL/934d048c-f99f-43b2-9555-3b60ef183d5e/images/1.webp` (1856×1280, dossier temporaire).
   Compris : cette planche est la référence de base de la charte graphique pour générer les assets. Ce qu'elle contient (examiné sur des agrandissements) :
   - Un carton « AÉRODROME FRANÇAIS - 1940 / TUILES MODULAIRES / ROUTES / TAXIWAYS CONNECTÉS / VUE DE DESSUS - ANTIALIAISÉ » : des tuiles qui se raccordent entre elles.
   - Terrain : herbe, 3 tronçons de piste, taxiways (droits, virages, T, croisements), aires de stationnement.
   - Bâtiments et décors : tour de contrôle, hangar avec bâtiment attenant, hangar avec dalle, dépôt (silos, camion, barils), poste de commandement (tente et sacs de sable), bunker de DCA, tentes camouflées, camions, manche à air avec cabane.
   - Avions en vue de dessus pure, en trois états (intact, endommagé, en réparation avec mécaniciens et outils) : D.520, Morane-Saulnier, Léo 451, Amiot 143. Les bâtiments sont en vue oblique.
   - Rendu illustré et lissé (pas de pixel art), fond en damier sombre autour des tuiles.
   Défauts relevés sur la planche :
   - Les cocardes (ailes des avions, toit du hangar) sont de type RAF : centre rouge, anneau extérieur bleu. À ma connaissance, la cocarde française de 1940 a le bleu au centre et le rouge à l'extérieur. Les dérives du D.520 portent bien les bandes bleu-blanc-rouge.
   - Les numéros de piste sont déformés (« 1991 », « 271 »).
   - Légendes brouillées : « MORANE-SAULNIER ENIMOT 143 » ; l'avion légendé « LÉO 451 » est monomoteur.
   - Les états sont incomplets : 10 avions pour 12 attendus (4 avions × 3 états) ; il manque au moins le Léo 451 intact et l'Amiot 143 intact.
   Réponse « Oui, corriger » (à la question sur la planche) : la planche sert de référence de style (rendu, palette, perspective) ; les prompts corrigent ses défauts : cocardes françaises (bleu au centre), aucun texte ni numéro dans l'image (le jeu les affiche), 12 sprites d'avions (4 avions × intact / endommagé / en réparation).

8. **Oui à tout sauf les tests : aucun test, seulement `php -l`** — « oui pour tout sauf le 10, aucun test qui ralentirai la phase de poc, meme pas d'analyseur statique, juste un php -l avant chaque envoi » (16/11).
   Compris :
   - « le 10 » = la question sur les tests (son ancien numéro, avant renumérotation).
   - « oui pour tout » = oui à mes propositions des questions du suivi, telles que posées, sauf deux : la question sur les tests (réponse ci-dessous) et la question sur `SUIVI.md` (un « oui » ne choisit pas entre « commité » et « `.gitignore` », elle reste ouverte).
   - Décisions validées :
     - Dépôt de développement `stampil/ww2` : le scaffold de `french_touch` y est reporté, la branche `POC` est créée depuis `main` au « go ». `french_touch` reste tel quel.
     - Commits sur `POC` : une phrase, une ligne vide, puis `POC`.
     - PHPDoc : 2 lignes max en anglais sur chaque classe, interface et méthode publique ; tags (`@return array<int, Pilot>`, `@throws`) seulement quand le type natif ne dit pas tout ; même principe en TSDoc sur le front.
     - Images de référence : la planche est copiée dans un dossier `ref/` du projet, ignoré par git ; d'autres images de référence viendront ; ordre des prompts : les 4 avions, puis pilotes, bâtiments, cartes ; le Morane-Saulnier est le MS.406.
     - Bombardiers français : Amiot 143 (départ) et LeO 451 (fort).
     - Campagne : la Bataille de France (mai–juin 1940) en premier, d'autres ensuite.
     - Sauvegarde : une sauvegarde de jeu par compte en MySQL ; localStorage seulement pour l'esthétique et les réglages perso.
   - Tests : aucun test, aucun analyseur statique (ni PHPStan ni Psalm), pas non plus de vérification `curl` à la main ; seul `php -l` sur le PHP « avant chaque envoi » (« envoi » = chaque commit sur `POC`, validé par « Oui, avant commit »). Côté front, je ne lance rien (tes règles : tu builds toi-même).

9. **Doit tourner sur un serveur local** — « le code doit pouvoir tourner sur serveur local pour test et valider » (16/11).
   Compris : le projet se lance en local pour que tu le testes et le valides toi-même. État local relevé aujourd'hui : MariaDB 10.11 active (port 3306), PHP 8.5.12 avec `pdo_mysql`, Node 22. Architecture proposée :
   - API : serveur intégré de PHP (`php -S`) sur le dossier public de `api/`.
   - Front : serveur de dev Vite, avec un proxy `/api` vers l'API (même origine, donc pas de CORS).
   - Base : MariaDB locale, identifiants dans un `.env` ignoré par git ; un `.env.example` versionné avec des valeurs factices.
   - `.gitignore` à compléter : `.env`, `vendor/`, `ref/`.
   - Piège : le PHP local (8.5) n'est pas la cible (8.3). `php -l` en 8.5 accepte une syntaxe 8.4/8.5 qui casserait sur l'hébergeur : aucune syntaxe ni fonction PHP 8.4/8.5 dans le code, et `config.platform.php` à 8.3 dans `composer.json` pour que composer ne choisisse que des paquets compatibles 8.3.
   - Je ne lance ni serveur ni build moi-même : je te donne les commandes (tes règles).

10. **Responsive et mobile** — « le projet doit etre responsive et tourner sur mobile ( d'où le flex ) » (16/11).
   Compris :
   - Le jeu doit s'afficher et se jouer sur téléphone comme sur ordinateur ; le flexbox en SCSS (instruction 2) sert cette mise en page responsive.
   - État relevé du front : `index.html` a déjà la balise viewport ; `styles.css` n'a qu'une règle `@media (max-width: 480px)` (écrit du grand écran vers le petit) et mélange flex et grid.
   - Conséquences à tenir : commandes tactiles pour les mini-jeux (cartes, largage), rien qui dépende du survol, et test sur téléphone via le serveur local (réseau local).

13. **Accès base de données : ceux des tests locaux de `sw`** — « je n'ai pas les acce db, prend les meme que les tests locaux de la session test portage php8.5 » (16/11).
   Compris : tu n'as pas d'accès à la base ; le jeu utilise les mêmes accès que les tests locaux de la session « test portage php8.5 » (projet `sw`). Relevé (vérifié par une connexion, sans afficher le mot de passe) :
   - Identifiants dans `~/PERSONNEL/sw/Require/settings.php` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`), fichier suivi par git dans `sw` (dépôt privé).
   - Serveur : le MariaDB 10.11.19 local, le même que celui d'ici (127.0.0.1, port 3306). La connexion fonctionne.
   - L'utilisateur est un compte d'administration : tous les droits sur tout le serveur, avec droit d'en donner. Le serveur héberge d'autres bases, dont celles de `sw`.
   - Le mot de passe n'est recopié nulle part dans ce dépôt (public) : ni `SUIVI.md`, ni `.claude/CLAUDE.md`, ni `.env.example` ; seulement dans `.env`, ignoré par git, au « go ».

## Fait au « go » (16/11, « dépile un peu avance, ta toute les biles »)

- Dépôt de développement `stampil/ww2` cloné dans `~/PERSONNEL/ww2`, branche `POC` créée depuis `main`, scaffold de `french_touch` reporté ; `french_touch` reste tel quel.
- Base `ww2` et utilisateur `ww2` créés avec le compte d'administration des tests locaux de `sw` ; droits limités à la base `ww2` (accès à la base `sw` refusé, vérifié) ; mot de passe généré, écrit seulement dans `.env` (mode 600, ignoré par git).
- API : socle PHP 8.3 dans `api/` (routeur `league/route`, PDO), route `GET /api/health`.
- Front : `styles.css` converti en SCSS mobile-first, flex en mixin, points de rupture des classes de taille de fenêtre Material Design 3 (600, 840, 1200, 1600 px, relevés sur developer.android.com) ; le point de rupture du scaffold (480 px) passe à 600 px ; la page affiche l'état de l'API et de la base.
- Planche de référence copiée dans `ref/` (ignoré par git).

## Choix pris au « go » (propositions non contestées, à corriger si besoin)

- Ports locaux : API 8765 (`php -S`), Vite 5173 ; l'utilisateur lance les serveurs avec les commandes du `README.md`.
- Test sur téléphone : `npm run dev -- --host` ; l'API reste sur 127.0.0.1 derrière le proxy `/api`.
- `SUIVI.md` et `.claude/CLAUDE.md` se commitent avec la fonctionnalité en cours, jamais seuls (règle de `sw`) ; rien ne part sans l'accord express de l'utilisateur.
- PHP 8.3 seulement : `config.platform.php` à 8.3 ; ni `php -l` ni le serveur local (PHP 8.5) ne rattrapent une erreur 8.4+, la discipline tient.
- Material Design 3 pour l'interface (boutons, menus, formulaires, compte), style de la planche pour le jeu (base, cartes, mini-jeux).
- Images générées : fond uni `#FF00FF` à la place de la transparence (« le background censé être transparent en #FF00FF dans dégradé pour que tu puisses toi retravailler les images », 16/11) ; lecture de « dans dégradé » : sans dégradé, un aplat, à confirmer.

## Cahier des charges du jeu (game design collé par l'utilisateur, 16/11, texte exact)


game design autour d'une boucle principale en trois temps qui mélange gestion en temps réel (avec pause active) et mini-jeux tactiques au tour par tour.
Voici la décomposition technique des systèmes à coder et à équilibrer :
1. La boucle de jeu (Core Gameplay Loop)
Le jeu repose sur un cycle continu où le temps défile sur l'aérodrome :

1. Reconnaissance. Le joueur envoie un avion léger repérer la zone pour révéler des cibles et évaluer les risques.
2. Préparation. Le joueur sélectionne une mission révélée, assigne des pilotes et des appareils, puis charge le carburant et les munitions.
3. Exécution (Missions). Les avions quittent la carte et déclenchent des événements tactiques que le joueur doit résoudre.
4. Maintenance. Au retour, les avions endommagés doivent être inspectés, réparés et ravitaillés avant la prochaine sortie.

2. Le système de gestion de l'aérodrome (La Base)
Ta scène principale est une vue d'ensemble de la piste et de ses bâtiments, gérée par un système de ressources et de files d'attente.

* Les Bâtiments fonctionnels. Tu dois coder quatre pôles distincts : le Quartier Général (choix des missions et recrutement), l'Atelier (fabrication de pièces détachées), l'Entrepôt (achat et stockage de carburant, munitions et matériaux) et le Hangar/Piste (stationnement et réparation des avions).
* L'Atelier et le Crafting. Chaque avion est composé de modules (moteur, ailes, fuselage, armement). Lorsqu'une pièce est détruite, le joueur doit lancer sa fabrication dans l'atelier. Assigner un mécanicien à la tâche réduit le chronomètre de production.
* La Maintenance sous pression. Un avion qui rentre en feu ou très endommagé dispose d'un compte à rebours caché ou visible. S'il n'est pas inspecté et réparé à temps par un mécanicien assigné, il explose sur la piste, tuant parfois le pilote resté à bord.

3. Les entités : Pilotes et Avions (Data Design)
Pour créer des choix stratégiques, tes objets `Pilote` et `Avion` doivent avoir des statistiques interdépendantes.

* Variables des Pilotes. Chaque pilote possède un Rang (qui débloque des compétences), une jauge de Fatigue (qui baisse ses stats si elle est trop haute), une jauge de Stress (qui augmente s'il est pris en chasse ou blessé), ainsi que des scores de Précision et de Résistance.
* Variables des Avions. Chaque appareil est défini par sa Catégorie (Chasseur pour le combat aérien, Bombardier/Attaquant pour le sol), sa Durabilité, sa Maniabilité, sa Capacité de carburant et son Emport de munitions.
* Synergie et Météo. Avant le décollage, le jeu affiche la météo (vent, température). Un vent fort applique un malus de précision lors des mini-jeux de bombardement, obligeant le joueur à choisir un pilote plus expérimenté.

4. Les mécaniques de mission (Mini-jeux en vue de dessus)
Lorsqu'une escadrille est en vol, une icône d'alerte apparaît à l'écran. Cliquer dessus ouvre une fenêtre en vue de dessus avec un gameplay dédié selon la situation :

* La Reconnaissance (Gestion du risque). L'avion survole une carte ennemie en vue de dessus. Plus le joueur reste longtemps et prend de photos aériennes, plus il débloque de missions lucratives, mais plus la jauge de détection (et donc le risque d'interception) grimpe.
* Le Combat Aérien (Système de cartes au tour par tour). C'est le cœur tactique en vue de dessus. L'attaquant est placé derrière le défenseur sur une grille invisible.
   * Chaque avion possède un deck de 3 cartes de manœuvre propres à son modèle (ex: virage serré, accélération, glissade).
   * À chaque tour, le joueur et l'IA jouent une carte simultanément pour déplacer leur sprite.
   * Condition de victoire : Si l'attaquant termine ses mouvements (généralement 3 à 5 tours) avec le sprite ennemi dans son cône de tir rouge, l'ennemi est abattu. Si le défenseur sort de la zone ou survit à la fin du compte à rebours, il s'échappe.
* Le Bombardement (Timing et physique simple). L'avion survole une cible au sol (char, bunker, usine) en vue de dessus. Le joueur doit gérer sa vitesse et larguer ses bombes au bon moment en compensant la dérive liée au vent affichée à l'écran.

5. La progression et l'économie
Pour maintenir la tension sur la durée d'une campagne (composée de plusieurs batailles historiques successives), tu dois équilibrer deux monnaies :

* Les Ressources matérielles. L'argent ou les bons de ravitaillement servent à acheter du carburant, des munitions et à payer les salaires/recrutements.
* Les Points de Commandement (XP globale). Gagnés à chaque mission réussie, ils permettent d'améliorer l'aérodrome (agrandir le hangar, accélérer l'atelier) et de débloquer des améliorations permanentes pour les escadrilles.
