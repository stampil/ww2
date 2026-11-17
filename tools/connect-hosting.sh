#!/bin/bash
# Gives GitHub what the Publish action needs to send the site to InfinityFree, then runs the action again. The password
# is typed here and goes straight to GitHub as a secret: only the owner of the repository can set it, and nobody reads it back.
set -euo pipefail
REPOSITORY=stampil/ww2
HOSTING_USER=if0_43464490
WORKFLOW=publish.yml
BRANCH=POC

main() {
	read -r -p "MySQL host (InfinityFree control panel, MySQL Databases): " db_host
	read -r -p "MySQL database name (like ${HOSTING_USER}_game): " db_name
	IFS= read -r -s -p "Hosting password for ${HOSTING_USER}: " password
	echo
	gh variable set DB_HOST --repo "$REPOSITORY" --body "$db_host"
	gh variable set DB_NAME --repo "$REPOSITORY" --body "$db_name"
	printf '%s' "$password" | gh secret set HOSTING_PASSWORD --repo "$REPOSITORY"
	local run_id
	run_id=$(gh run list --repo "$REPOSITORY" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')
	gh run rerun "$run_id" --repo "$REPOSITORY"
	echo "Publishing: https://github.com/${REPOSITORY}/actions/runs/${run_id}"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
	main
fi
