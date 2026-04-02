FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    gcc \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create media directories
RUN mkdir -p media/temp media/output

# Expose port
EXPOSE 8000

# Set default port (can be overridden by deployment platform)
ENV PORT=8000

# Run application
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
