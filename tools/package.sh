#!/bin/bash
# Builds in build/htdocs what goes on the hosting: the site built by Vite, the API with the libraries of production,
# and the rules of Apache. The settings of the database are added by tools/upload.sh, from what its user types.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SITE="$ROOT/build/htdocs"
rm -rf "$ROOT/build"
mkdir -p "$SITE"
npm --prefix "$ROOT" run build
cp -r "$ROOT/dist/." "$SITE/"
# The command line script of the API is of no use on the hosting, which has none: it plays its migrations itself.
rsync -a --exclude=vendor --exclude=bin "$ROOT/api/" "$SITE/api/"
composer install --working-dir="$SITE/api" --no-dev --no-interaction --optimize-autoloader --quiet
rm "$SITE/api/composer.json" "$SITE/api/composer.lock"
cat > "$SITE/.htaccess" <<'RULES'
# The API answers every address under /api through its front controller; its sources, libraries and migrations
# are never served.
RewriteEngine On
RewriteRule ^api/(src|vendor|migrations)(/|$) - [F,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^api(/.*)?$ api/public/index.php [L]

# The settings of the database and the state of the FTP upload stay on the server: nobody reads them from outside.
<FilesMatch "^(\.env|\.ftp-deploy-sync-state\.json)$">
	Require all denied
</FilesMatch>
RULES
echo "$SITE"
