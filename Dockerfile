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
    PORT=3000 \
    DATABASE_URL=file:/data/iteam.db \
    ITEAM_WORK_DIR=/workspace
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g --no-audit --no-fund @anthropic-ai/claude-code @openai/codex @google/gemini-cli
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/runner ./runner
COPY --from=build /app/examples ./examples
RUN mkdir -p /data /workspace
VOLUME ["/data", "/workspace"]
EXPOSE 3000
WORKDIR /app/server
CMD ["sh", "-c", "node scripts/migrate.mjs && node dist/index.js"]
