# ---- build stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY runner/package.json runner/
COPY server/prisma server/prisma
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=file:/data/iteam.db \
    ITEAM_WORK_DIR=/workspace
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g --no-audit --no-fund @anthropic-ai/claude-code @openai/codex @google/gemini-cli
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/client/dist ./client/dist
COPY --from=build --chown=node:node /app/runner ./runner
COPY --from=build --chown=node:node /app/examples ./examples
RUN mkdir -p /data /workspace && chown -R node:node /data /workspace
VOLUME ["/data", "/workspace"]
EXPOSE 3000
# Agent CLIs refuse unattended mode as root; run as the unprivileged node user.
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
WORKDIR /app/server
CMD ["sh", "-c", "node scripts/migrate.mjs && node dist/index.js"]
