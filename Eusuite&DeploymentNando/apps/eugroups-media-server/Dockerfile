# mediasoup needs native compilation, so we use a multi-stage build
FROM node:22-bookworm as builder

WORKDIR /app

# Install build dependencies for mediasoup
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (this compiles mediasoup)
RUN npm install --omit=dev

# Production image
FROM node:22-bookworm-slim

WORKDIR /app

# Copy built node_modules and source
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose ports
# Main HTTP/WebSocket port
EXPOSE 3000
# RTP ports for media (UDP)
EXPOSE 40000-49999/udp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/server.js"]
