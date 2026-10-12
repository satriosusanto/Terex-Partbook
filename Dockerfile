# Build from the repository root:
# docker build -t terex-partbook-ai -f Dockerfile .
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install backend dependencies first for better build-layer caching.
COPY ai-backend/package.json ./ai-backend/package.json
RUN npm --prefix ai-backend install --omit=dev

# The backend resolves its dataset paths relative to the repository root.
COPY ai-backend ./ai-backend
COPY data ./data
COPY catalogs/terex-ac80-2/data ./catalogs/terex-ac80-2/data
COPY catalogs/franna-at15/data ./catalogs/franna-at15/data
COPY catalogs/franna-mac25/data ./catalogs/franna-mac25/data

EXPOSE 8787
CMD ["npm", "--prefix", "ai-backend", "start"]
