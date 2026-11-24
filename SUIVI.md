# SUIVI — ww2 (French Touch)

Mis en forme le 18/11 (« synthetise mieux le plan je sais meme plus se qu'i lreste a faire ni si il y a des point ambigue a lever »). Ce fichier ne garde que trois choses : ce qu'il me faut de toi, les questions à lever, le travail restant. Citations, décisions et historique : `.claude/CLAUDE.md`.

Les chantiers marqués « go donné » se codent dans l'ordre du tableau ; les autres attendent une image, un accord ou ton go.

## 1. Ce qu'il me faut de toi

| Il me faut | Ça débloque |
|---|---|

## 2. Questions à lever

1. **Retour de l'IA** : la règle du 19/11 (« un camp libre n'a pas de côté », plus d'état « tenu par l'IA ») tombe pour cet ordre. Je la retire (recommandé) ; les 65 % de camps restants restent libres. D'accord ?
2. **Qui tient quoi** : à la création d'une instance, 35 % de ses camps sont tirés au hasard et tenus par l'IA, moitié de chaque camp. « Ennemi (base capturée) » : un site que l'IA du camp adverse tient (un site français tenu par l'IA de l'Axe, et l'inverse) ; « allié » : un site que l'IA de ton camp tient. Les camps de l'IA ne se choisissent plus à l'inscription. Lu comme ça (recommandé).
3. **Ce que fait l'IA** : elle ne joue pas, elle tient le camp (défense, avions au sol, stocks) : un camp IA ennemi se raide et se prend, un camp IA allié reçoit des avions en stationnement et du ravitaillement, et elle n'attaque jamais les joueurs (recommandé). Ou elle les attaque aussi ?

Sans réponse de ta part, le « go » vaut pour mes recommandations. Lectures prises seul, sans question, à corriger si elles sont fausses :

- **Croix de l'Axe** (« on evite la hakenkruz, pour l'allemagne prend la croix de l'armée celle qui ressemble a un diese », 24/11) : la croix de l'armée allemande (Balkenkreuz), aux branches droites et étroites qui se croisent comme un dièse, sans croix gammée.

- **Morane-Saulnier** (« 4.a => perimé, plus d'upgrade plus de 406 jouable », 20/11) : plus d'amélioration et plus de MS.406 jouable. La base garde ses trois D.520 ; le MS.406 ne reste que comme modèle 3D de l'accueil. Les anciennes questions sur le sens d'« upgrade », les chiffres des deux avions et le cockpit du MS.406 tombent avec lui ; le cockpit de FGAddon (`Models/Interior/`, 27 fichiers, 1 798 707 octets, GPL v2) reste noté au cahier, non téléchargé.
- **Sons** (« 7 les son tu te demerdes ta toute les billes », 20/11) : choisis par moi, les deux CC0 de craigsmith, téléchargés (les aperçus MP3 de Freesound, seuls disponibles sans compte) dans `ref/freesound-craigsmith/` : `437790-fighter-starts-taxis-stops.mp3` (2 508 048 octets, 1 min 54, mono 48 kHz) et `437831-two-engine-prop-steady.mp3` (2 142 912 octets, 1 min 38, mono 48 kHz). Aucun n'est un 12Y : à dire au `CREDITS.md`. Bouclés et branchés (`public/audio/`, sous l'interrupteur de la musique) : au combat du cockpit et aux attaques vues de dessus (moteur), au décollage et à l'atterrissage de la base.
- **M6, E11, E12 faits avec mes recommandations** (« tu dépile tout ce projet doit etre fini maintenant, tu fait tout en recommandé », 23/11) : les raids, la prise de camp, la campagne sans fin, les sons, le vent, le retrait du bombardement ; le détail de chaque choix est au cahier. L'état « tenu par l'IA » n'existe plus : un camp libre est libre, comme la règle du 19/11 le dit (« un camp libre n'a pas de côté »).
- **Manques visibles, spinner, couloir faits avec mes recommandations** (« go », 24/11) : le couloir du combat du cockpit est retiré partout (pas seulement sur écran tactile) ; la raison d'un ordre impossible est écrite sous le bouton, avant le clic et après un refus du serveur ; le délai du spinner est de 10 s.
- **Le Bf 109 reste une IA** (« on va pas faire jouer le 109, sa reste juste IA, les joueurs de l'autre camps joueront le D520 skin allemand » puis « tu retire pas le 109 j'ai dit , IA ! », 23/11) : les joueurs de l'Axe démarrent avec trois D.520 en livrée allemande ; la livrée Vichy ne sert plus qu'aux ennemis du combat du cockpit (et à l'accueil) ; le Bf 109 ne se joue pas, mais il reste, gréé, comme ennemi IA du combat du cockpit (les pales et le train rentré y sont animés) ; son cockpit n'est plus à faire. Les bases de l'Axe déjà fondées avec un Bf 109 ou un D.520 Vichy les voient devenir des D.520 allemands (migrations 038 et 039).

## 3. Le travail restant, dans l'ordre

| N° | Instruction (tes mots) | Ce que j'en comprends | Go |
|---|---|---|---|
| 1 | « peuple les base a 35% IA soit en ennemi ( base capturé) soit en allié dans les 2 camps, les icones sur la carte doivent identifier facilement les base vide et peuplé, et de quel camps, peut etre rajoute une icone du camps ( axe.. ) sur les base occupé » (24/11) | Aujourd'hui (lu dans le code) : chaque site a un côté fixe par sa position (`Site::clan()`), un camp sans joueur est libre (`bases.player_id` nul) et se choisit à l'inscription ; la carte (`WorldMap.tsx`) a trois images, libre, tenu et attaqué, et un halo qui marque les alliés. À faire : (1) à la création d'une instance, 35 % de ses camps passent à l'IA, moitié de chaque camp, avec défense, avions et stocks, et ne se choisissent plus ; (2) sur la carte, un camp vide garde l'image de camp libre, un camp peuplé (joueur ou IA) celle de camp tenu, et un insigne de camp (ligne 2) se pose sur chaque camp occupé ; (3) la fiche d'un camp dit qui le tient : un joueur, l'IA alliée ou l'IA ennemie. Questions 1 à 3. | attend ton go |
| 2 | « fait le prompt pour les icones de camps » puis « on evite la hakenkruz, pour l'allemagne prend la croix de l'armée celle qui ressemble a un diese » (24/11) | Prompt donné le 24/11 : deux insignes ronds sur fond magenta, la cocarde française (bleu au centre, blanc, rouge) et la croix de l'armée allemande, d'après l'icône de camp libre. À ton « généré » : contrôle, détourage, rangement dans `public/sprites/camps/`. Le code qui les pose sur les camps occupés suit la ligne 1. | attend ton « généré » |


## Mis de côté

- **Le jeu sur GitHub aussi** (« met de coté », 18/11) : deux voies, le site GitHub qui appelle l'API d'InfinityFree (peu de travail, anti-robot à tester), ou un second serveur chez Supabase (plusieurs jours). Détail au cahier.
