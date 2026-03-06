# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ src/

RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Copy environment example files (actual .env should be mounted or injected)
COPY environment/ environment/

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

USER appuser

EXPOSE 3002

CMD ["./docker-entrypoint.sh"]
