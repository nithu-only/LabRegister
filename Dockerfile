# Multi-stage build for Lab Register Management System
# Using Node.js built with SQLite support (nightly build with experimental flags enabled)
# Stage 1: Builder
FROM node:22.5.0 AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (no native modules needed)
RUN npm ci --omit=dev

# Stage 2: Runtime
FROM node:22.5.0

WORKDIR /app

# Copy built dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY package.json package-lock.json ./
COPY server.js ./
COPY config/ ./config/
COPY models/ ./models/
COPY routes/ ./routes/
COPY controllers/ ./controllers/
COPY middleware/ ./middleware/
COPY services/ ./services/
COPY sync/ ./sync/
COPY scripts/ ./scripts/
COPY public/ ./public/
COPY views/ ./views/

# Create data directory for SQLite database and backups
RUN mkdir -p /app/data /app/backups /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Enable SQLite experimental module and start the application
CMD ["node", "--experimental-sqlite", "server.js"]
