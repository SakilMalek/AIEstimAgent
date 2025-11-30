# ML Service Dockerfile for GCP Cloud Run
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies for PDF processing and image handling
# Force rebuild with poppler-utils
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (including pdf_processor for PDF handling)
COPY app.py pdf_processor.py ./

# Create uploads directory
RUN mkdir -p /app/uploads

# Set environment variables
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Run the application
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}
