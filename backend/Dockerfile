FROM node:20-alpine
WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source (excludes .env, node_modules via .dockerignore)
COPY src ./src

# Run as non-root user for security
RUN addgroup -S gametime && adduser -S gametime -G gametime
USER gametime

EXPOSE 4000
CMD ["node", "src/server.js"]
