#!/usr/bin/env bash
set -e

# Render provides $PORT; default to 5005 for local use.
PORT="${PORT:-5005}"

echo "Listing /app/models before start:"
ls -lah /app/models || true

exec rasa run \
  --enable-api \
  --cors "*" \
  --port "$PORT" \
  --endpoints endpoints.yml
