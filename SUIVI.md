# SUIVI — ww2 (French Touch)

Mis en forme le 18/11 (« synthetise mieux le plan je sais meme plus se qu'i lreste a faire ni si il y a des point ambigue a lever »). Ce fichier ne garde que trois choses : ce qu'il me faut de toi, les questions à lever, le travail restant. Citations, décisions et historique : `.claude/CLAUDE.md`.

Tout ce que je peux faire seul est fait : ce qui reste attend une image, un accord ou un choix de toi.

## 1. Ce qu'il me faut de toi

| Il me faut | Ça débloque |
|---|---|
| **Ton « généré »** du convoi refait : destruction sans feu ni flamme (prompt et carte redonnés le 19/11, image 1 = la feuille du convoi) | les sprites détruits de l'attaque au sol |
| **Ton « généré »** de la feuille Croix-Rouge, prompt corrigé et redonné le 19/11 (plus de flammes) : ambulance et tente sanitaire, 3 états chacune | les éléments à épargner dans l'attaque au sol |
| Les images de décor, une à la fois, après la Croix-Rouge : tente, nid de mitrailleuse, fantassins, arbres | le décor de l'attaque au sol, les cibles de la reconnaissance, l'ennemi qui tire sur toi |
| Ton accord pour télécharger `SV-GB.png` (1 274 820 octets, GPL v2, FGAddon) | le D.520 à livrée allemande, avion de l'Axe |
| Les trois états de camp restants (tenu par un joueur, tenu par l'IA, attaqué) et une feuille de bâtiments de l'Axe, à demander après le convoi et la Croix-Rouge | les camps sur la carte, la base de l'Axe |

## 2. Questions à lever

1. **La mission de capture.** « camps CAPTURABLE ( faut envoyer un avion mission spéciale pour cela ) » (19/11), en réponse aux raids et à la capture. Ma lecture : un camp ennemi se capture par une mission spéciale « Prise de camp », lancée depuis la tour comme les autres : un avion et son pilote volent vers le camp, jouent l'attaque au sol, et si la mission réussit ils se posent sur le camp et le prennent, selon la règle de M4d (le camp est à toi tant que ton avion y est). Les raids restent des missions d'attaque qui usent ses défenses ; je propose qu'on ne puisse tenter la prise qu'une fois ses défenses à zéro. D'accord, ou la mission spéciale est autre chose (un autre mini-jeu, un parachutage) ? Je recommande d'accord.
2. **Les bâtiments en 3D : tout ou rien.** « fait les tous si sa match c tout ou rien » (19/11). Le camp compte sept types de bâtiments : hangar, tentes camouflées, dépôt à silos, poste de commandement, tour de contrôle, manche à air et bunker de DCA ; je n'ai trouvé de modèle libre que pour le hangar, donc « tous » ne peut pas venir de modèles téléchargés. (a) Je modélise les sept en code (formes simples, cohérentes entre elles, couleurs prises sur les images actuelles), sans téléchargement ni licence ; tu juges dans la scène du camp, et si le look ne tient pas rien ne change. (b) Un modèle téléchargé pour le hangar et des images pour le reste : écarté par ton « tout ou rien ». (c) Rien. Je recommande (a) : tu n'as plus rien à télécharger.

## 3. Le travail restant, dans l'ordre

| # | Chantier | Taille | Attend |
|---|---|---|---|
| 1 | **Bâtiments en vraie 3D, tout ou rien** : les sept types de bâtiments du camp (hangar, tentes camouflées, dépôt, poste de commandement, tour, manche à air, bunker de DCA) modélisés en code et posés dans la scène du camp ; tu juges, et si le look ne tient pas rien ne change ; les bâtiments de la carte à plat sont alors rendus depuis les modèles, comme les avions | moyen | question 2 |
| 2 | **L'accueil mène au jeu** : le POC actuel passe sur `#/poc` ; l'accueil `#/` montre d'emblée la connexion et l'inscription, puis le jeu une fois connecté ; lien « POC » dans l'en-tête ; la vitrine GitHub ne garde que le POC et je ne touche plus à `main` | petit | ton go |
| 3 | **M5 : la carte complète, les camps de l'Axe et les camps tenus par l'IA** : un catalogue fixe de 20 à 30 camps, moitié français moitié Axe, de vrais terrains de 1940 dont je vérifie les noms dans des sources, visible par tous avec l'état et les ressources de chaque camp (l'enum des sites, la colonne `site`, les places sur la carte, les noms, les images à étendre) ; une nouvelle instance s'ouvre quand tous les camps libres et vides sont pris ; un camp sans joueur est tenu par l'IA jusqu'à ce qu'un joueur s'y pose ; le marchand automatique des camps IA (le prix suit le stock du camp, avec un écart entre achat et vente et un stock borné qui revient vers un niveau de base) ; l'Axe pilote le Bf 109, le D.520 à livrée allemande et le D.520 à livrée Vichy | grand | accord SV-GB, ton go |
| 4 | **M6 : les attaques, les bâtiments détruits, les raids et la capture** : résultats, bâtiments détruits et état des bases synchronisés par le serveur, relus toutes les quelques secondes ; journal pour le joueur absent ; raids sur un camp ennemi (missions d'attaque qui usent ses défenses), camp capturable par une mission spéciale « Prise de camp » ; les avions stationnés défendent le camp attaqué et sont perdus s'il tombe ; gardes validées : plafond de dégâts par heure pour un camp absent, protection d'un nouveau joueur, la dernière base d'un joueur ne se capture pas | grand | M5, question 1 |
| 5 | **E11 : la campagne dynamique** (validée le 19/11) : le serveur fait vivre la seule bataille de France (mai à juin 1940) ; les abattus deviennent un score, la base ne se termine jamais ; un avion perdu se remplace à l'atelier avec les quatre pièces qu'il fabrique déjà ; le ravitaillement du front est régulier et baisse près du front, les bases de l'arrière peuvent lui en envoyer avec un délai selon la distance ; plus de « nouvelle bataille » | grand | M5 et M6 |
| 6 | **Le Quartier Général, la carte multijoueur** : la carte de France est là, en lecture seule (ton camp, tes alliés, l'ennemi, les camps libres, qui tient quoi) ; reste, sur la carte, les camps de tous les côtés (le catalogue de M5) ; demandes de ravitaillement aux camps IA, choix du camp où stationner un avion en cliquant la carte (le Hangar le choisit aujourd'hui dans une liste), raids sur un camp ennemi, capture, aide à un camp allié | grand | M5 et M6, images des camps |
| 7 | **E10 : les assets restants** : MS.406 (avion de départ, décision du 16/11), sons, images IA (portraits de pilotes, personnel d'entretien, camion de carburant et pompiers, illustrations des cartes, états abîmé et en réparation des avions, aires de stationnement) | grand | images |
| 8 | **E12 : la finition** : réglages en `localStorage`, performances, nettoyage des outils de lint, retrait du type de mission « bombardement » (plus de bombardier jouable) ; le vent pousse l'avion de côté dans l'attaque au sol et la reconnaissance, en proportion des km/h (validé le 19/11) | moyen | — |
| 9 | **Ennemi qui tire sur toi** dans les mini-jeux (Wings) | moyen | le décor |
| 10 | **Réglages à l'usage**, quand tu auras joué : attaque au sol, reconnaissance (cibles, tours, vitesse, jauge, mission repérée à 150 %), pénalité de la Croix-Rouge, taille de l'avion en fin de vol (estimée à environ ×3,3 vu de dessus à 350 m, sans l'avoir vue), assiette et ombre des vols en 3D, stationnement (vol de 60 s à l'aller et au retour, charge de carburant et de munitions dont le surplus est perdu si l'entrepôt d'arrivée se remplit pendant le vol, pas d'animation d'atterrissage à l'arrivée ni au retour), prise des camps (un camp déserté qui a un stock ne se choisit pas comme premier camp ; un premier camp pris sur un camp vide est remis à neuf ; un camp lâché ou pris n'apparaît qu'à la requête suivante, sans attendre de relecture) | petit | tes essais |

## Mis de côté

- **Le jeu sur GitHub aussi** (« met de coté », 18/11) : deux voies, le site GitHub qui appelle l'API d'InfinityFree (peu de travail, anti-robot à tester), ou un second serveur chez Supabase (plusieurs jours). Détail au cahier.
