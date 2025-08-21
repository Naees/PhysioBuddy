FROM python:3.9-slim-bullseye

WORKDIR /app

COPY requirements.txt .

# Install system dependencies first
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Then install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app
ENV PYTHONPATH=/app

CMD ["python", "app/main.py"]