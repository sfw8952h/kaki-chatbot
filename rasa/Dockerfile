FROM rasa/rasa:3.6.20-full

WORKDIR /app

# Copy Rasa project files (config, domain, data, endpoints, models).
COPY . /app

# Ensure entrypoint script is executable.
RUN chmod +x /app/entrypoint.sh

# Start Rasa server; binds to $PORT provided by Render (defaults to 5005 locally).
ENTRYPOINT ["/app/entrypoint.sh"]
