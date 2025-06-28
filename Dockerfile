# Use Python 3.9 slim image
FROM python:3.9-slim

# Set environment variables for UTF-8
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf-8
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the necessary files (excluding main_backup.py)
COPY main.py .
COPY middleware.py .
COPY supabase_client.py .
COPY check_env.py .
COPY start.py .
COPY .env .

# Remove any potential problematic files
RUN rm -f main_backup.py || true
RUN rm -f middleware_updated.py || true

# Expose port
EXPOSE 8000

# Start the application
CMD ["python", "main.py"]
