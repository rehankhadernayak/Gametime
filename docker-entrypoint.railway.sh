#!/bin/sh
set -e
NGINX_PORT="${PORT:-8080}"
export NGINX_PORT
export PORT=4000
envsubst '$NGINX_PORT' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf
cd /app/backend
node src/server.js &
i=0
while [ "$i" -lt 45 ]; do
  if wget -q -O- "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  i=$((i + 1))
  sleep 1
done
cd /
exec nginx -g 'daemon off;'
