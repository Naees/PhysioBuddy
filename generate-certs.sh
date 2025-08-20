#!/bin/bash

# Create certs directory if it doesn't exist
mkdir -p certs

# Generate self-signed certificate for development
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo "SSL certificates generated in certs/ directory"
echo "You can now run: docker-compose up"