#!/usr/bin/env bash
set -e

# Hard-code port 8080 (ignore injected PORT). Render health checks may fail if they expect a different port.
PORT="8080"

echo "Listing /app/models before start:"
ls -lah /app/models || true

exec rasa run \
  --enable-api \
  --cors "*" \
  --host "0.0.0.0" \
  --port "$PORT" \
  --endpoints endpoints.yml \
  --model /app/models/production.tar.gz
