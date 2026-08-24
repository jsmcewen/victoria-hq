#!/bin/sh
set -eu

DATA_DIR="${PGLITE_DATA_DIR:-/data/pglite}"
mkdir -p "$DATA_DIR"
export PGLITE_DATA_DIR="$DATA_DIR"

if [ -f /data/options.json ]; then
  eval "$(node scripts/load-ha-options.mjs)"
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
  echo "[victoria] warning: BETTER_AUTH_URL is empty. Set it to the https URL the iPads will open (Duck DNS + Nginx Proxy Manager, or Cloudflare Tunnel). Sign-in cookies will not stick on plain http LAN addresses." >&2
fi

echo "[victoria] listening on ${NITRO_HOST}:${NITRO_PORT}"
exec node .output/server/index.mjs
