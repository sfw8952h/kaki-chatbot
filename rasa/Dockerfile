FROM rasa/rasa:3.6.20-full

WORKDIR /app

# Copy Rasa project files (config, domain, data, endpoints, models) with executable entrypoint.
COPY --chmod=755 entrypoint.sh /app/entrypoint.sh
COPY . /app

# Start Rasa server; binds to $PORT provided by Render (defaults to 5005 locally).
ENTRYPOINT ["/app/entrypoint.sh"]
