#!/usr/bin/env bash
set -euo pipefail

issue="${1:-}"
op="${2:-}"
shift 2 || true

if [[ ! "$issue" =~ ^[0-9]+$ ]]; then
  echo "issue number required" >&2
  exit 2
fi

expected_prefix="rex/${issue}-"
current_branch() { git rev-parse --abbrev-ref HEAD; }
require_rex_branch() {
  local branch
  branch="$(current_branch)"
  if [[ "$branch" != ${expected_prefix}* ]]; then
    echo "refusing git write outside ${expected_prefix}*: current=${branch}" >&2
    exit 3
  fi
  if [[ "$branch" == "main" ]]; then
    echo "refusing direct main write" >&2
    exit 3
  fi
}

case "$op" in
  init)
    slug="${1:-work}"
    if [[ ! "$slug" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
      echo "invalid branch slug" >&2
      exit 2
    fi
    branch="${expected_prefix}${slug}"
    git fetch origin main
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      git checkout "$branch"
    elif git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
      git fetch origin "$branch:$branch"
      git checkout "$branch"
    else
      git checkout -b "$branch" origin/main
    fi
    ;;
  sync-main)
    require_rex_branch
    git fetch origin main
    git merge --no-edit origin/main
    ;;
  add)
    require_rex_branch
    if [[ "$#" -eq 0 ]]; then
      echo "at least one path required" >&2
      exit 2
    fi
    git add -- "$@"
    ;;
  commit)
    require_rex_branch
    message="${*:-}"
    if [[ -z "$message" ]]; then
      echo "commit message required" >&2
      exit 2
    fi
    git commit -m "$message"
    ;;
  push)
    require_rex_branch
    branch="$(current_branch)"
    git push origin "HEAD:$branch"
    ;;
  *)
    echo "unsupported operation: $op" >&2
    exit 2
    ;;
esac
