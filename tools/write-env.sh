#!/bin/bash
# Writes the .env of the site in the folder given, from the DB_HOST, DB_NAME, DB_USER and DB_PASSWORD of the environment.
# A password with a ' or a \ cannot be held in that file: it is refused.
set -euo pipefail
SITE=$1
DB_PORT=3306
if [[ "$DB_PASSWORD" == *"'"* || "$DB_PASSWORD" == *"\\"* ]]; then
	echo "This password has a ' or a \\, which the file of settings cannot hold: change it in the control panel." >&2
	exit 1
fi
umask 077
{
	echo "DB_HOST=${DB_HOST}"
	echo "DB_PORT=${DB_PORT}"
	echo "DB_NAME=${DB_NAME}"
	echo "DB_USER=${DB_USER}"
	echo "DB_PASSWORD='${DB_PASSWORD}'"
} > "$SITE/.env"
