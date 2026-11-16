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
npm install
```

À chaque session, dans deux terminaux :

```bash
php -S 127.0.0.1:8765 -t api/public api/public/index.php
```

```bash
npm run dev -- --host
```

Le front répond sur le port 5173, et sur l'adresse du réseau local pour le tester sur un téléphone. L'API reste sur 127.0.0.1 : le front lui parle par le proxy `/api`.
