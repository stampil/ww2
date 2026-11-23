# SUIVI — ww2 (French Touch)

Mis en forme le 18/11 (« synthetise mieux le plan je sais meme plus se qu'i lreste a faire ni si il y a des point ambigue a lever »). Ce fichier ne garde que trois choses : ce qu'il me faut de toi, les questions à lever, le travail restant. Citations, décisions et historique : `.claude/CLAUDE.md`.

Les chantiers marqués « go donné » se codent dans l'ordre du tableau ; les autres attendent une image, un accord ou ton go.

## 1. Ce qu'il me faut de toi

| Il me faut | Ça débloque |
|---|---|

## 2. Questions à lever

Aucune. Lectures prises seul, sans question, à corriger si elles sont fausses :

- **Morane-Saulnier** (« 4.a => perimé, plus d'upgrade plus de 406 jouable », 20/11) : plus d'amélioration et plus de MS.406 jouable. La base garde ses trois D.520 ; le MS.406 ne reste que comme modèle 3D de l'accueil. Les anciennes questions sur le sens d'« upgrade », les chiffres des deux avions et le cockpit du MS.406 tombent avec lui ; le cockpit de FGAddon (`Models/Interior/`, 27 fichiers, 1 798 707 octets, GPL v2) reste noté au cahier, non téléchargé.
- **Sons** (« 7 les son tu te demerdes ta toute les billes », 20/11) : choisis par moi, les deux CC0 de craigsmith, téléchargés (les aperçus MP3 de Freesound, seuls disponibles sans compte) dans `ref/freesound-craigsmith/` : `437790-fighter-starts-taxis-stops.mp3` (2 508 048 octets, 1 min 54, mono 48 kHz) et `437831-two-engine-prop-steady.mp3` (2 142 912 octets, 1 min 38, mono 48 kHz). Aucun n'est un 12Y : à dire au `CREDITS.md`. Bouclés et branchés (`public/audio/`, sous l'interrupteur de la musique) : au combat du cockpit et aux attaques vues de dessus (moteur), au décollage et à l'atterrissage de la base.
- **M6, E11, E12 faits avec mes recommandations** (« tu dépile tout ce projet doit etre fini maintenant, tu fait tout en recommandé », 23/11) : les raids, la prise de camp, la campagne sans fin, les sons, le vent, le retrait du bombardement ; le détail de chaque choix est au cahier. L'état « tenu par l'IA » n'existe plus : un camp libre est libre, comme la règle du 19/11 le dit (« un camp libre n'a pas de côté »).
- **Le Bf 109 reste une IA** (« on va pas faire jouer le 109, sa reste juste IA, les joueurs de l'autre camps joueront le D520 skin allemand » puis « tu retire pas le 109 j'ai dit , IA ! », 23/11) : les joueurs de l'Axe démarrent avec trois D.520 en livrée allemande ; la livrée Vichy ne sert plus qu'aux ennemis du combat du cockpit (et à l'accueil) ; le Bf 109 ne se joue pas, mais il reste, gréé, comme ennemi IA du combat du cockpit (les pales et le train rentré y sont animés) ; son cockpit n'est plus à faire. Les bases de l'Axe déjà fondées avec un Bf 109 ou un D.520 Vichy les voient devenir des D.520 allemands (migrations 038 et 039).

## 3. Le travail restant, dans l'ordre

| # | Chantier | Taille | Attend |
|---|---|---|---|
| 6 | **E10 : les images IA restantes** (finition : le jeu marche sans elles, avec ses silhouettes et ses pastilles) : illustrations des cartes (missions d'abord), états abîmé et en réparation des avions, aires de stationnement ; le MS.406 n'est plus jouable (20/11), il ne reste que son modèle de l'accueil | grand | tes images, une à la fois, avec mes prompts |

## Mis de côté

- **Le jeu sur GitHub aussi** (« met de coté », 18/11) : deux voies, le site GitHub qui appelle l'API d'InfinityFree (peu de travail, anti-robot à tester), ou un second serveur chez Supabase (plusieurs jours). Détail au cahier.
