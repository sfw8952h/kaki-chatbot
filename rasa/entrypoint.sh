#!/usr/bin/env bash
set -e

# Render provides $PORT; default to 8080 for local use.
PORT="${PORT:-8080}"

echo "Listing /app/models before start:"
ls -lah /app/models || true

exec rasa run \
  --enable-api \
  --cors "*" \
  --host "0.0.0.0" \
  --port "$PORT" \
  --endpoints endpoints.yml \
  --model /app/models/production.tar.gz
