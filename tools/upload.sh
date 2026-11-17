#!/bin/bash
# Builds the site and sends it to the hosting by FTP from this machine. The password is typed here: it goes to the
# FTP server and to the .env of the site, which is deleted as soon as the upload is over.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SITE="$ROOT/build/htdocs"
FTP_SERVER=ftpupload.net
HOSTING_USER=if0_43464490
REMOTE_DIR=htdocs

# A curl configuration that sends every file of the site to the FTP server, over one connection.
# $1: folder of the site, $2: address of the remote folder, $3: user, $4: password.
curl_configuration() {
	local site=$1 remote=$2 user=$3 password=$4
	local escaped_credentials=${user}:${password}
	escaped_credentials=${escaped_credentials//\\/\\\\}
	escaped_credentials=${escaped_credentials//\"/\\\"}
	echo "fail-early"
	echo "silent"
	echo "show-error"
	local first=yes
	local file
	while IFS= read -r -d '' file; do
		if [ "$first" = no ]; then
			echo "next"
		fi
		first=no
		echo "url = \"${remote}/${file#"$site"/}\""
		echo "upload-file = \"${file}\""
		echo "user = \"${escaped_credentials}\""
		echo "ftp-create-dirs"
		echo "write-out = \"${file#"$site"/}\\n\""
	done < <(find "$site" -type f -print0 | sort -z)
}

main() {
	read -r -p "MySQL host (control panel, like sql123.infinityfree.com): " db_host
	read -r -p "MySQL database name (control panel, like ${HOSTING_USER}_game): " db_name
	IFS= read -r -s -p "Hosting password for ${HOSTING_USER}: " password
	echo
	bash "$ROOT/tools/package.sh"
	trap 'rm -f "$SITE/.env"' EXIT
	DB_HOST="$db_host" DB_NAME="$db_name" DB_USER="$HOSTING_USER" DB_PASSWORD="$password" bash "$ROOT/tools/write-env.sh" "$SITE"
	curl_configuration "$SITE" "ftp://${FTP_SERVER}/${REMOTE_DIR}" "$HOSTING_USER" "$password" | curl --config -
	echo "Sent. Open the site, then check /api/health."
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
	main
fi
