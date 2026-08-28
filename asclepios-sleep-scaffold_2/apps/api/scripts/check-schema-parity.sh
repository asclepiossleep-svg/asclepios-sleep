#!/usr/bin/env bash
# Fails if prisma/schema.prisma (SQLite, dev) and prisma/schema.staging.prisma
# (Postgres, staging/Vercel) have drifted anywhere in the actual data model.
# The file header comment, generator block and datasource block are allowed
# to differ (that's the whole point of having two files) — everything from
# the first "// ---" section divider onward (i.e. the models themselves)
# must be byte-identical. Run before every push — also wire into CI.
set -euo pipefail
cd "$(dirname "$0")/.."

strip() {
  awk '/^\/\/ ---/{f=1} f{print}' "$1"
}

A=$(strip prisma/schema.prisma)
B=$(strip prisma/schema.staging.prisma)

if [ "$A" != "$B" ]; then
  echo "schema.prisma and schema.staging.prisma have drifted in their model definitions." >&2
  echo "Edit models in schema.prisma, then copy the same model changes into schema.staging.prisma." >&2
  diff <(echo "$A") <(echo "$B") || true
  exit 1
fi
echo "OK: schema.prisma and schema.staging.prisma match (models only)."
