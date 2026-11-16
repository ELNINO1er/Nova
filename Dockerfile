# Node 24 LTS (maintenu jusqu'en avril 2028) — même version majeure que l'environnement de test.
# ── Build stage ──────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build

# ── Production stage ────────────────────────────────────
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server ./server

# Processus non root ; seul le dossier des documents est inscriptible.
RUN mkdir -p data/uploads && chown -R node:node data
USER node

EXPOSE 4001
CMD ["node", "server/index.js"]
