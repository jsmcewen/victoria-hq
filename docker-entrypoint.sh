#!/bin/sh
set -eu

DATA_DIR="${PGLITE_DATA_DIR:-/data/pglite}"
mkdir -p "$DATA_DIR"
export PGLITE_DATA_DIR="$DATA_DIR"

if [ -f /data/options.json ] || [ -f /config/options.json ] || [ -f /addon_config/options.json ]; then
  eval "$(node scripts/load-ha-options.mjs)"
else
  echo "[victoria] no options.json — using built-in family HTTP origin" >&2
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

# Family home-server origin: HTTP + port 8069. Ignore leftover https / grok.me values.
FAMILY_PUBLIC_URL="http://mcewenkidschores.duckdns.org:8069"
FAMILY_LAN_URL="http://10.10.12.149:8069"
case "${BETTER_AUTH_URL:-}" in
  http://mcewenkidschores.duckdns.org:8069|http://10.10.12.149:8069) ;;
  *grok.me*|https://*|""|*chores.example.com*)
    BETTER_AUTH_URL="$FAMILY_PUBLIC_URL"
    ;;
esac
export BETTER_AUTH_URL
export BETTER_AUTH_TRUSTED_ORIGINS="${BETTER_AUTH_TRUSTED_ORIGINS:-${FAMILY_PUBLIC_URL},${FAMILY_LAN_URL}}"

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

echo "[victoria] public origin: ${BETTER_AUTH_URL}"
echo "[victoria] trusted origins: ${BETTER_AUTH_TRUSTED_ORIGINS}"
echo "[victoria] listening on ${NITRO_HOST}:${NITRO_PORT}"
exec node .output/server/index.mjs
