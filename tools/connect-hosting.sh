#!/bin/bash
# Gives GitHub the hosting password that the Publish action needs to send the site to InfinityFree, then runs the action
# again. The password is typed here and goes straight to GitHub as a secret: only the owner can set it, nobody reads it back.
set -euo pipefail
REPOSITORY=stampil/ww2
HOSTING_USER=if0_43464490
WORKFLOW=publish.yml
BRANCH=POC

main() {
	IFS= read -r -s -p "Hosting password for ${HOSTING_USER}: " password
	echo
	printf '%s' "$password" | gh secret set HOSTING_PASSWORD --repo "$REPOSITORY"
	local run_id
	run_id=$(gh api "repos/${REPOSITORY}/actions/workflows/${WORKFLOW}/runs?branch=${BRANCH}&per_page=1" --jq '.workflow_runs[0].id')
	gh api --method POST "repos/${REPOSITORY}/actions/runs/${run_id}/rerun" --silent
	echo "Publishing: https://github.com/${REPOSITORY}/actions/runs/${run_id}"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
	main
fi
