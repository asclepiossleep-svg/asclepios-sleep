#!/usr/bin/env bash
# Backup & Ops — Postgres staging/production dump.
#
# Usage: DATABASE_URL=postgresql://user:pass@host:5432/db ./scripts/backup.sh
# Writes a timestamped, gzip-compressed dump into ./backups/.
#
# For local SQLite dev, backing up is just: cp apps/api/prisma/dev.db backups/dev-$(date +%Y%m%d-%H%M%S).db
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL to the Postgres connection string first." >&2
  exit 1
fi

mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="backups/asclepios-${STAMP}.sql.gz"

pg_dump "$DATABASE_URL" | gzip > "$OUT"
echo "Backup written to $OUT"

# Retention: keep the last 30 dumps, delete older ones.
ls -1t backups/asclepios-*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --
