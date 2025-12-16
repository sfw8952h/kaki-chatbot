#!/usr/bin/env bash
set -e

# Use Render-injected PORT (default to 10000 if unset).
PORT="${PORT:-10000}"

echo "Listing /app/models before start:"
ls -lah /app/models || true

exec rasa run \
  --enable-api \
  --cors "*" \
  --interface "0.0.0.0" \
  --port "$PORT" \
  --endpoints endpoints.yml \
  --model /app/models/production.tar.gz
