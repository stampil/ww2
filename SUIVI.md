# SUIVI — ww2 (French Touch)

Mis en forme le 18/11 (« synthetise mieux le plan je sais meme plus se qu'i lreste a faire ni si il y a des point ambigue a lever »). Ce fichier ne garde que trois choses : ce qu'il me faut de toi, les questions à lever, le travail restant. Citations, décisions et historique : `.claude/CLAUDE.md`.

Tout ce que je peux faire seul est fait : ce qui reste attend une image, un accord ou un choix de toi.

## 1. Ce qu'il me faut de toi

| Il me faut | Ça débloque |
|---|---|
| Les images de décor restantes, une à la fois : nid de mitrailleuse, fantassins, arbres (la tente et les barils sont reçus) | le décor de l'attaque au sol, les cibles de la reconnaissance, l'ennemi qui tire sur toi |
| Ton accord pour télécharger `SV-GB.png` (1 274 820 octets, GPL v2, FGAddon) | le D.520 à livrée allemande, avion de l'Axe |
| Les trois états de camp restants (tenu par un joueur, tenu par l'IA, attaqué) et une feuille de bâtiments de l'Axe, à demander après le convoi et la Croix-Rouge | les camps sur la carte, la base de l'Axe |

## 2. Questions à lever

Aucune : tout ce qui restait ouvert est tranché, il manque tes « go ».

## 3. Le travail restant, dans l'ordre

| # | Chantier | Taille | Attend |
|---|---|---|---|
| 1 | **Bâtiments en vraie 3D, tout ou rien** (validé le 19/11) : les sept types de bâtiments du camp (hangar, tentes camouflées, dépôt, poste de commandement, tour, manche à air, bunker de DCA) modélisés en code, formes simples et cohérentes entre elles, couleurs prises sur les images actuelles, sans téléchargement ni licence, et posés dans la scène du camp ; tu juges, et si le look ne tient pas rien ne change ; les bâtiments de la carte à plat sont alors rendus depuis les modèles, comme les avions | moyen | ton go |
| 2 | **M5, la fin : l'Axe pilote ses avions** : un joueur dont le premier camp est de l'Axe commence avec les avions de l'Axe, le Bf 109, le D.520 à livrée allemande et le D.520 à livrée Vichy, au lieu de trois D.520 français ; le front suppose aujourd'hui un D.520 français partout (images du Hangar, avions de la carte à plat, décollage et atterrissage en 3D, mini-jeux), il faut le rendre indépendant du modèle ; la livrée allemande vient de `SV-GB.png` de FGAddon | grand | accord SV-GB, ton go |
| 3 | **M6 : les attaques, les bâtiments détruits, les raids et la capture** : résultats, bâtiments détruits et état des bases synchronisés par le serveur, relus toutes les quelques secondes ; journal pour le joueur absent ; raids sur un camp ennemi (missions d'attaque qui usent ses défenses), camp capturable par une mission spéciale « Prise de camp » (validée le 19/11) : un avion et son pilote volent vers le camp, jouent l'attaque au sol, et si la mission réussit ils se posent sur le camp et le prennent selon la règle de la prise des camps ; on ne peut la tenter qu'une fois ses défenses à zéro ; les avions stationnés défendent le camp attaqué et sont perdus s'il tombe ; gardes validées : plafond de dégâts par heure pour un camp absent, protection d'un nouveau joueur, la dernière base d'un joueur ne se capture pas | grand | M5, ton go |
| 4 | **E11 : la campagne dynamique** (validée le 19/11) : le serveur fait vivre la seule bataille de France (mai à juin 1940) ; les abattus deviennent un score, la base ne se termine jamais ; un avion perdu se remplace à l'atelier avec les quatre pièces qu'il fabrique déjà ; le ravitaillement du front est régulier et baisse près du front, les bases de l'arrière peuvent lui en envoyer avec un délai selon la distance ; plus de « nouvelle bataille » | grand | M5 et M6 |
| 5 | **Le Quartier Général, la carte multijoueur** : la carte de France est là, en lecture seule (ton camp, tes alliés, l'ennemi, les camps libres, qui tient quoi) ; reste, sur la carte, les camps de tous les côtés (le catalogue de M5) ; demandes de ravitaillement aux camps IA, choix du camp où stationner un avion en cliquant la carte (le Hangar le choisit aujourd'hui dans une liste), raids sur un camp ennemi, capture, aide à un camp allié | grand | M5 et M6, images des camps |
| 6 | **E10 : les assets restants** : MS.406 (avion de départ, décision du 16/11), sons, images IA (portraits de pilotes, personnel d'entretien, camion de carburant et pompiers, illustrations des cartes, états abîmé et en réparation des avions, aires de stationnement) | grand | images |
| 7 | **E12 : la finition** : réglages en `localStorage`, performances, nettoyage des outils de lint, retrait du type de mission « bombardement » (plus de bombardier jouable) ; le vent pousse l'avion de côté dans l'attaque au sol et la reconnaissance, en proportion des km/h (validé le 19/11) | moyen | — |
| 8 | **Ennemi qui tire sur toi** dans les mini-jeux (Wings) | moyen | le décor |
| 9 | **Réglages à l'usage**, quand tu auras joué : attaque au sol, reconnaissance (cibles, tours, vitesse, jauge, mission repérée à 150 %), pénalité de la Croix-Rouge, attaque au sol (tailles de la moto, des barils et de la tente à 2,8 m, 2,8 m et 5,5 m de large ; ambulance placée au hasard dans le convoi et dont la destruction fait échouer l'attaque, avec le message « Le convoi s'est échappé » que seul le bandeau « Croix-Rouge touchée ! » explique ; le baril et la tente au bord de la route ne comptent pas dans le score ; fumée et feu animés par le jeu), taille de l'avion en fin de vol (estimée à environ ×3,3 vu de dessus à 350 m, sans l'avoir vue), assiette et ombre des vols en 3D, stationnement (vol de 60 s à l'aller et au retour, charge de carburant et de munitions dont le surplus est perdu si l'entrepôt d'arrivée se remplit pendant le vol, pas d'animation d'atterrissage à l'arrivée ni au retour), prise des camps (un premier camp pris sur un camp, même quitté par un joueur avec son stock, est remis à neuf ; un camp lâché ou pris n'apparaît qu'à la requête suivante, sans attendre de relecture), catalogue de vingt camps (noms de terrains dont l'usage de mai 1940 n'est pas confirmé : Reims-Champagne, Lille-Lesquin, Orléans-Bricy, Baden-Oos ; places posées à l'œil sur une carte dessinée), marchand des camps libres (niveau de base 500, capacité 1000, retour de 10 par minute de jeu, écart de 10 %, 100 par échange ; un camp à sec rachète plus cher que l'entrepôt ne vend, donc un petit profit existe) | petit | tes essais |

## Mis de côté

- **Le jeu sur GitHub aussi** (« met de coté », 18/11) : deux voies, le site GitHub qui appelle l'API d'InfinityFree (peu de travail, anti-robot à tester), ou un second serveur chez Supabase (plusieurs jours). Détail au cahier.
