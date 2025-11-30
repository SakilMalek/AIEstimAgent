# ML Service Dockerfile for GCP Cloud Run
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py pdf_processor.py ./

# Copy custom model directory (if exists)
COPY models ./models

# Create uploads directory
RUN mkdir -p /app/uploads

# Set environment variables
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Health check (longer start-period for model loading)
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8080/healthz', timeout=5).raise_for_status()" || exit 1

# Run the application
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}
