# Production Dockerfile for resmatic-server (NestJS + Prisma)
# Multi-stage: build -> runtime

FROM node:22-alpine AS builder
WORKDIR /app

# Install build deps
RUN apk add --no-cache python3 make g++

# Copy manifests and lockfiles first
COPY package.json package-lock.json ./

# Install dependencies (including dev) for build and prisma generate
RUN npm ci

# Copy source
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client and build Nest app
RUN npx prisma generate
RUN npm run build

# --- Runtime image ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Copy only what is needed to run
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./package.json
COPY prisma ./prisma

# Default command
CMD ["node", "dist/main.js"]
