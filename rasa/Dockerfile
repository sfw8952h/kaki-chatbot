FROM rasa/rasa:3.6.20-full

WORKDIR /app

# Copy project files, then re-copy entrypoint with executable bit preserved.
COPY . /app
COPY --chmod=755 entrypoint.sh /app/entrypoint.sh

# Train a fresh model inside the image to avoid stale artifacts baked from host.
# Rasa base image uses a non-root user; switch to root to clear/replace models, then return.
USER root
RUN rm -rf /app/models && \
    rasa train --quiet --domain domain.yml --data data --out models --fixed-model-name production && \
    chown -R rasa:rasa /app/models /app/entrypoint.sh
USER rasa

# Start Rasa server; binds to $PORT provided by Render (defaults to 5005 locally).
ENTRYPOINT ["/app/entrypoint.sh"]
