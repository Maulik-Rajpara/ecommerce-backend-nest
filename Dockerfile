# ──────────────────────────────────────────────────────────────────
# STAGE 1 — BUILDER
# Purpose: install ALL deps (including devDeps) and compile TypeScript
# This stage is ONLY used during build, not in the final image.
# ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Set working directory inside the container
# All subsequent commands run from this path
WORKDIR /app

# Copy package files first (before source code)
# WHY: Docker caches each layer. If package.json hasn't changed,
#      Docker reuses the cached npm install layer — much faster builds.
COPY package*.json ./

# Install ALL dependencies (including devDependencies like TypeScript, NestJS CLI)
RUN npm ci

# Now copy the rest of the source code
COPY . .

# Compile TypeScript → JavaScript into the dist/ folder
RUN npm run build

# ──────────────────────────────────────────────────────────────────
# STAGE 2 — PRODUCTION
# Purpose: create the final, minimal image that actually runs
# Only this stage ends up in the deployed container.
# ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# NODE_ENV=production tells Node.js and NestJS to run in production mode
# (disables dev-only features, enables optimizations)
ENV NODE_ENV=production

WORKDIR /app

# Copy ONLY package files from stage 1
COPY package*.json ./

# Install ONLY production dependencies (no TypeScript, no jest, no NestJS CLI)
# --omit=dev shrinks the image significantly
RUN npm ci --omit=dev

# Copy the compiled code from the BUILDER stage
# We do NOT copy source .ts files — only the compiled dist/
COPY --from=builder /app/dist ./dist

# Expose the port your app listens on
# This is documentation — it doesn't actually open the port (docker compose does that)
EXPOSE 3000

# The command that starts your app when the container runs
# We run the compiled JS directly with node (no ts-node, no nest start)
CMD ["node", "dist/main"]
