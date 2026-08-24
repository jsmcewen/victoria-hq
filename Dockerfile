# Victoria HQ — Home Assistant OS local add-on, Portainer, or plain Docker.
# iPads must open this over https (Duck DNS + Nginx Proxy Manager, or Cloudflare Tunnel).
# Sign-in cookies will not stick on http://192.168.x.x.

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Home Assistant Supervisor may pass these; this image pins its own Node base.
ARG BUILD_ARCH
ARG BUILD_VERSION=1.0.0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NITRO_PRESET=node-server
ENV VITE_SELF_HOST=true
ENV VITE_AUTH_ENABLED=true
RUN npm run build:node && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ARG BUILD_VERSION=1.0.0
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
