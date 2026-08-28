# Victoria HQ — Home Assistant OS local add-on, Portainer, or plain Docker.
# iPads must open this over https (Duck DNS + Nginx Proxy Manager, or Cloudflare Tunnel).
# Sign-in cookies will not stick on http://192.168.x.x.

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Home Assistant Supervisor may pass these; this image pins its own Node base.
ARG BUILD_ARCH
ARG BUILD_VERSION=1.0.2

# Playwright is a sandbox QA dep — never download browsers on the HA box.
# Native optional packages (lightningcss / tailwind oxide) ship as prebuilt binaries;
# g++ is only a fallback if npm cannot fetch the matching ARM/x64 binary.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV npm_config_jobs=2
ENV NODE_OPTIONS=--max-old-space-size=2048

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
# --ignore-scripts skips Playwright's browser download. Optional native binaries
# still install from the lockfile. Fall back to npm install if ci rejects the lock.
RUN npm ci --ignore-scripts --no-audit --no-fund \
  || npm install --ignore-scripts --no-audit --no-fund

COPY . .
ENV NITRO_PRESET=node-server
ENV VITE_SELF_HOST=true
ENV VITE_AUTH_ENABLED=true
RUN npm run build:node && npm prune --omit=dev --ignore-scripts

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ARG BUILD_VERSION=1.0.2
LABEL io.hass.name="Victoria HQ" \
      io.hass.description="Family chores, stars, and rewards. Victoria is CEO." \
      io.hass.type="addon" \
      io.hass.arch="aarch64|amd64" \
      io.hass.version="${BUILD_VERSION}" \
      org.opencontainers.image.title="Victoria HQ" \
      org.opencontainers.image.description="Family chores, stars, and rewards for the iPad."

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=8080
ENV PORT=8080
ENV HOST=0.0.0.0
ENV PGLITE_DATA_DIR=/data/pglite
ENV VITE_AUTH_ENABLED=true
ENV VITE_SELF_HOST=true

RUN mkdir -p /data/pglite

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.output ./.output
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts/migrate.mjs /app/scripts/migration-plan.mjs /app/scripts/load-ha-options.mjs ./scripts/
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8080
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8080/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
