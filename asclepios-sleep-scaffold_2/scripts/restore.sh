#!/usr/bin/env bash
# Restore a dump produced by scripts/backup.sh into a Postgres database.
#
# Usage: DATABASE_URL=postgresql://user:pass@host:5432/db ./scripts/restore.sh backups/asclepios-20260827-120000.sql.gz
#
# WARNING: this restores into whatever DATABASE_URL points at. Double-check
# it before running against staging, and never point it at production
# without a second person's sign-off (Doc 06 §7 staging review discipline).
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL to the target Postgres connection string first." >&2
  exit 1
fi

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: DATABASE_URL=... ./scripts/restore.sh <path-to-dump.sql.gz>" >&2
  exit 1
fi

echo "Restoring $FILE into $DATABASE_URL"
gunzip -c "$FILE" | psql "$DATABASE_URL"
echo "Restore complete."
