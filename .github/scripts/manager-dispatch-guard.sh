#!/usr/bin/env bash
# Machine-enforced branch invariant for claude-manager-dispatch.yml.
#
# Claude's own tool allowlist in that workflow has no `git push` and no
# `gh pr` access at all — this script is the only thing in the pipeline
# that ever pushes, and only after checking, itself, that HEAD is not the
# protected base branch and is not detached. A prompt telling the agent
# "never push to main" is a request, not a control; this makes it one.
#
# Usage: manager-dispatch-guard.sh <base-branch> [remote]
# Outputs (to $GITHUB_OUTPUT if set): pushed=true|false, branch=<name>
set -euo pipefail

BASE_BRANCH="${1:-main}"
REMOTE="${2:-origin}"
OUT="${GITHUB_OUTPUT:-/dev/null}"

current="$(git rev-parse --abbrev-ref HEAD)"
ahead="$(git rev-list --count "${REMOTE}/${BASE_BRANCH}..HEAD" 2>/dev/null || echo 0)"

is_protected=false
if [ "$current" = "$BASE_BRANCH" ] || [ "$current" = "main" ] || [ "$current" = "master" ] || [ "$current" = "HEAD" ]; then
  is_protected=true
fi

if [ "$is_protected" = true ]; then
  if [ "$ahead" -gt 0 ]; then
    echo "::error::${ahead} commit(s) were made directly on protected ref '${current}' — refusing to push. This should never happen (the agent has no git-push permission in this workflow); investigate the run." >&2
    echo "pushed=false" >> "$OUT"
    exit 1
  fi
  echo "HEAD is '${current}' with no new commits — nothing to do."
  echo "pushed=false" >> "$OUT"
  exit 0
fi

if [ "$ahead" -eq 0 ]; then
  echo "No commits ahead of ${REMOTE}/${BASE_BRANCH} on '${current}' — nothing to push."
  echo "pushed=false" >> "$OUT"
  exit 0
fi

echo "Pushing ${ahead} commit(s) from '${current}' to ${REMOTE}."
git push "$REMOTE" "HEAD:refs/heads/${current}"
echo "pushed=true" >> "$OUT"
echo "branch=${current}" >> "$OUT"
