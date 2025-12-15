FROM rasa/rasa:3.6.20-full

WORKDIR /app

# Copy Rasa project files (config, domain, data, endpoints, models).
COPY . /app

# Start Rasa server; will load the latest model in /app/models.
CMD ["run", "--enable-api", "--cors", "*", "--port", "5005", "--endpoints", "endpoints.yml"]
