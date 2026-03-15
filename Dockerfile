FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for the database file (used when running without Docker Compose)
RUN mkdir -p /app/data

# Use PORT env var injected by cloud platforms (default 8000)
ENV PORT=8000

EXPOSE 8000

CMD ["python", "run_server.py"]
