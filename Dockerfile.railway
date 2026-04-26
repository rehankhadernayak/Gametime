# Production image: Vite static frontend + Express API + Nginx (same-origin `/api`, long timeouts for SSE).
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache nginx gettext

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev
COPY backend/src ./src

COPY --from=frontend-builder /frontend/dist /usr/share/nginx/html
COPY nginx.railway.conf.template /etc/nginx/templates/nginx.conf.template
COPY docker-entrypoint.railway.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080
CMD ["/docker-entrypoint.sh"]
