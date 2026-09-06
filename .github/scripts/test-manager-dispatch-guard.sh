#!/usr/bin/env bash
# Deterministic test for manager-dispatch-guard.sh, run against a real
# throwaway bare repo (not a mock) so a push actually landing/not-landing
# is independently verifiable, not just asserted from the exit code.
#
# Run: .github/scripts/test-manager-dispatch-guard.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GUARD="$REPO_ROOT/.github/scripts/manager-dispatch-guard.sh"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

pass=0
fail=0

check() {
  local desc="$1"
  local ok="$2"
  if [ "$ok" = "true" ]; then
    echo "PASS - $desc"
    pass=$((pass + 1))
  else
    echo "FAIL - $desc"
    fail=$((fail + 1))
  fi
}

bare="$WORKDIR/origin.git"
work="$WORKDIR/work"
git init --quiet --bare "$bare"
git init --quiet "$work"
cd "$work"
git config user.email "test@example.com"
git config user.name "Guard Test"
git checkout --quiet -b main
echo "seed" > seed.txt
git add seed.txt
git commit --quiet -m "seed"
git remote add origin "$bare"
git push --quiet origin main

run_guard() {
  local outfile="$WORKDIR/gh_output_$$_$RANDOM"
  : > "$outfile"
  local rc=0
  GITHUB_OUTPUT="$outfile" "$GUARD" main origin > "$WORKDIR/guard.log" 2>&1 || rc=$?
  echo "$rc" > "$WORKDIR/guard.rc"
  echo "$outfile"
}

remote_main_sha() { git ls-remote "$bare" refs/heads/main | cut -f1; }
remote_has_branch() { git ls-remote --exit-code --heads "$bare" "$1" >/dev/null 2>&1; }

seed_sha="$(remote_main_sha)"

# --- Scenario A: on main, no new commits -> no-op, nothing pushed ---
out="$(run_guard)"
rc="$(cat "$WORKDIR/guard.rc")"
check "scenario A: no-op on main exits 0" "$([ "$rc" -eq 0 ] && echo true || echo false)"
check "scenario A: main ref on remote unchanged" "$([ "$(remote_main_sha)" = "$seed_sha" ] && echo true || echo false)"

# --- Scenario B: a commit lands directly on main -> guard must refuse, and nothing must reach the remote ---
echo "unauthorized" > direct.txt
git add direct.txt
git commit --quiet -m "unauthorized direct-to-main commit"
out="$(run_guard)"
rc="$(cat "$WORKDIR/guard.rc")"
check "scenario B: direct-to-main push attempt is refused (non-zero exit)" "$([ "$rc" -ne 0 ] && echo true || echo false)"
check "scenario B: main ref on remote still unchanged (nothing leaked to origin)" "$([ "$(remote_main_sha)" = "$seed_sha" ] && echo true || echo false)"
git reset --quiet --hard "$seed_sha"

# --- Scenario C: normal case, a real feature branch with a commit -> must push and report it ---
git checkout --quiet -b task/demo-checkpoint
echo "feature" > feature.txt
git add feature.txt
git commit --quiet -m "feature checkpoint"
out="$(run_guard)"
rc="$(cat "$WORKDIR/guard.rc")"
check "scenario C: feature-branch checkpoint push succeeds" "$([ "$rc" -eq 0 ] && echo true || echo false)"
check "scenario C: pushed=true reported" "$(grep -q '^pushed=true$' "$out" && echo true || echo false)"
check "scenario C: branch=task/demo-checkpoint reported" "$(grep -q '^branch=task/demo-checkpoint$' "$out" && echo true || echo false)"
check "scenario C: branch actually exists on remote" "$(remote_has_branch task/demo-checkpoint && echo true || echo false)"

# --- Scenario D: detached HEAD with a new commit -> must refuse, nothing pushed ---
git checkout --quiet main
git reset --quiet --hard "$seed_sha"
git checkout --quiet --detach main
echo "detached" > detached.txt
git add detached.txt
git commit --quiet -m "detached commit"
out="$(run_guard)"
rc="$(cat "$WORKDIR/guard.rc")"
check "scenario D: detached HEAD push attempt is refused" "$([ "$rc" -ne 0 ] && echo true || echo false)"
check "scenario D: no stray 'HEAD' branch created on remote" "$(remote_has_branch HEAD && echo false || echo true)"

# --- Static check: Claude's own allowlist in the workflow can never merge/push/run arbitrary gh api ---
workflow="$REPO_ROOT/.github/workflows/claude-manager-dispatch.yml"
claude_args="$(awk '/claude_args:/{flag=1; next} /prompt:/{flag=0} flag' "$workflow")"

check "workflow: --dangerously-skip-permissions is gone" "$(echo "$claude_args" | grep -q -- '--dangerously-skip-permissions' && echo false || echo true)"
check "workflow: --allowedTools is present" "$(echo "$claude_args" | grep -q -- '--allowedTools' && echo true || echo false)"
check "workflow: Claude cannot push (no git push in allowedTools)" "$(echo "$claude_args" | grep -q 'git push' && echo false || echo true)"
check "workflow: Claude cannot switch back to an existing branch (no bare git checkout)" "$(echo "$claude_args" | grep -qE 'Bash\(git checkout\)' && echo false || echo true)"
check "workflow: Claude has no gh pr merge" "$(echo "$claude_args" | grep -q 'gh pr merge' && echo false || echo true)"
check "workflow: Claude has no gh pr close" "$(echo "$claude_args" | grep -q 'gh pr close' && echo false || echo true)"
check "workflow: Claude has no gh pr edit" "$(echo "$claude_args" | grep -q 'gh pr edit' && echo false || echo true)"
check "workflow: Claude has no gh pr review" "$(echo "$claude_args" | grep -q 'gh pr review' && echo false || echo true)"
check "workflow: Claude has no unrestricted gh api" "$(echo "$claude_args" | grep -q 'gh api' && echo false || echo true)"

echo ""
echo "== ${pass} passed, ${fail} failed =="
if [ "$fail" -ne 0 ]; then
  exit 1
fi
