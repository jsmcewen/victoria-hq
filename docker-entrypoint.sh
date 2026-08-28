#!/bin/sh
set -eu

DATA_DIR="${PGLITE_DATA_DIR:-/data/pglite}"
mkdir -p "$DATA_DIR"
export PGLITE_DATA_DIR="$DATA_DIR"

if [ -f /data/options.json ] || [ -f /config/options.json ] || [ -f /addon_config/options.json ]; then
  eval "$(node scripts/load-ha-options.mjs)"
else
  echo "[victoria] no options.json — set public_url in the add-on Configuration tab" >&2
fi

if [ -z "${BETTER_AUTH_SECRET:-}" ]; then
  if [ -f /data/auth-secret ]; then
    BETTER_AUTH_SECRET="$(cat /data/auth-secret)"
  else
    BETTER_AUTH_SECRET="$(
      node --input-type=module -e 'import { randomBytes } from "node:crypto"; process.stdout.write(randomBytes(32).toString("hex"))'
    )"
    printf '%s' "$BETTER_AUTH_SECRET" > /data/auth-secret
  fi
  export BETTER_AUTH_SECRET
fi

export VITE_AUTH_ENABLED="${VITE_AUTH_ENABLED:-true}"
export VITE_SELF_HOST="${VITE_SELF_HOST:-true}"
export NITRO_HOST="${NITRO_HOST:-0.0.0.0}"
export NITRO_PORT="${NITRO_PORT:-${PORT:-8080}}"
export HOST="$NITRO_HOST"
export PORT="$NITRO_PORT"

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[victoria] waiting for postgres and applying migrations…"
  i=0
  until node scripts/migrate.mjs; do
    i=$((i + 1))
    if [ "$i" -gt 30 ]; then
      echo "[victoria] database never became ready" >&2
      exit 1
    fi
    sleep 2
  done
else
  echo "[victoria] no DATABASE_URL — using on-disk family database at $PGLITE_DATA_DIR"
fi

if [ -z "${BETTER_AUTH_URL:-}" ]; then
  echo "[victoria] warning: public origin is UNSET. In Configuration set public_url to the exact https address in the iPad bar (https://mcewenkidschores.duckdns.org)." >&2
else
  echo "[victoria] public origin: ${BETTER_AUTH_URL}"
fi

echo "[victoria] listening on ${NITRO_HOST}:${NITRO_PORT}"
exec node .output/server/index.mjs
