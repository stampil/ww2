# French Touch (ww2)

Jeu web de gestion d'escadrille française, remake de Until the Last Plane : une API PHP 8.3 sur MariaDB/MySQL, un front React en SCSS.

## Lancer en local

Une seule fois :

```bash
cp .env.example .env
```

Puis mettre dans `.env` les identifiants de la base. Ensuite :

```bash
cd api && composer install && cd ..
php api/bin/migrate.php
npm install
```

`php api/bin/migrate.php` joue d'avance les migrations de la base ; on peut le relancer sans risque. L'API les joue d'ailleurs seule, au premier appel qui suit un changement : c'est ce qui crée la base chez l'hébergeur, qui n'a pas de ligne de commande. Une migration déjà envoyée ne se modifie plus : un changement est une nouvelle migration, écrite pour pouvoir être rejouée.

À chaque session, dans deux terminaux :

```bash
php -S 127.0.0.1:8765 -t api/public api/public/index.php
```

```bash
npm run dev -- --host
```

Le front répond sur le port 5173, et sur l'adresse du réseau local pour le tester sur un téléphone. L'API reste sur 127.0.0.1 : le front lui parle par le proxy `/api`.

## Site statique

L'accueil tourne seul dans le navigateur, sans l'API ni la base : `npm run build` produit le site dans `dist/`, que n'importe quel hébergeur de fichiers sert depuis n'importe quel dossier. Le workflow `.github/workflows/pages.yml` le publie sur GitHub Pages à chaque envoi sur `main` (réglage du dépôt : Pages, source « GitHub Actions »). Sur la branche `POC`, l'accueil (`#/`) est le jeu : connexion ou inscription, puis la base ; il a besoin de l'API. Le POC avec les modèles 3D est à `#/poc`. La vitrine GitHub ne porte que le POC, publié depuis `main`, que je ne touche plus.

## Mise en ligne sur InfinityFree

Le compte d'hébergement est `if0_43464490`, le serveur FTP `ftpupload.net`. Depuis cette machine :

```bash
bash tools/upload.sh
```

Le script demande l'hôte et le nom de la base MySQL (dans le panneau de l'hébergeur), puis le mot de passe de l'hébergement, qui se tape dans le terminal sans s'afficher et ne s'écrit nulle part, hors le fichier `.env` du site, effacé dès l'envoi fini. Il construit le site (`tools/package.sh` : le front de Vite, l'API avec ses bibliothèques de production, un `.htaccess`) puis envoie tous les fichiers par FTP. À la première visite, l'API crée les tables. L'hébergement doit tourner en PHP 8.3 ou plus (réglage du panneau). Les fichiers qui ne sont plus dans le site ne sont pas effacés du serveur.

L'action `.github/workflows/publish.yml` fait la même chose à chaque envoi de `POC` sur GitHub, une fois posés dans les réglages du dépôt le secret `HOSTING_PASSWORD` et les variables `DB_HOST` et `DB_NAME` ; sans eux elle ne publie rien.

Pour que l'action puisse publier, il faut lui donner une fois le mot de passe de l'hébergement et l'adresse de la base : les variables `DB_HOST` et `DB_NAME` se posent dans les réglages du dépôt (Secrets and variables, Actions), et `bash tools/connect-hosting.sh` pose le secret `HOSTING_PASSWORD` avec `gh`, puis relance l'action.
