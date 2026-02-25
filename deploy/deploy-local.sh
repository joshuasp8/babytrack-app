#!/usr/bin/env bash
set -e

# This script builds and deploys the app to the remote VPS from a local dev environment.
# It builds the Docker image, saves it to a tar file, and transfers it to the remote server.
# Then it loads the image and restarts the services.
# Note: While we use the ghcr.io image name, we are not pushing it to the registry.
# We are just using it as a tag to identify the image.

# Configuration
# You can hardcode your VPS details here or pass them as environment variables.
SSH_HOST="129.153.92.179"
SSH_USER="ubuntu"
SSH_KEY_PATH="${HOME}/.ssh/oci.key"
SERVICE_NAME="babytrack"
DB_NAME="babytrack"
IMAGE_NAME="ghcr.io/joshuasp8/${SERVICE_NAME}:latest"
REMOTE_DIR="/services/${SERVICE_NAME}"
TAR_FILE="/tmp/${SERVICE_NAME}.tar"

echo "🚀 Starting local deployment for ${SERVICE_NAME} to ${SSH_USER}@${SSH_HOST}..."

# Ensure we're in the project root
cd "$(dirname "$0")/.."

echo "📦 Building Docker image for linux/arm64..."
docker build --platform linux/arm64 -t "${IMAGE_NAME}" .

echo "💾 Saving Docker image to archive..."
docker save -o "${TAR_FILE}" "${IMAGE_NAME}"

echo "📤 Transferring docker-compose.yml, .env, and image archive to VPS..."
# Create the directory just in case
ssh -i "${SSH_KEY_PATH}" "${SSH_USER}@${SSH_HOST}" "mkdir -p ${REMOTE_DIR}"

if [ ! -f "deploy/.env" ]; then
  echo "⚠️ deploy/.env not found! Make sure to create one from deploy/.env.template"
  exit 1
fi

scp -i "${SSH_KEY_PATH}" deploy/docker-compose.yml "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/docker-compose.yml"
scp -i "${SSH_KEY_PATH}" deploy/.env "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/.env"
scp -i "${SSH_KEY_PATH}" "${TAR_FILE}" "${SSH_USER}@${SSH_HOST}:${TAR_FILE}"

echo "🔄 Loading image and restarting services on VPS..."
ssh -i "${SSH_KEY_PATH}" "${SSH_USER}@${SSH_HOST}" << EOF
  set -e
  cd "${REMOTE_DIR}"
  
  echo "PostgreSQL check step..."
  # Create DB if it doesn't exist
  docker exec postgres psql -U postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 \
  || docker exec postgres psql -U postgres -c "CREATE DATABASE ${DB_NAME}"

  # Create schema if it doesn't exist
  docker exec postgres psql -U postgres -d ${DB_NAME} -c "CREATE SCHEMA IF NOT EXISTS ${DB_NAME};"

  echo "Loading image on remote..."
  docker load -i "${TAR_FILE}"
  
  echo "Applying docker-compose..."
  docker compose up -d
  
  echo "Cleaning up remote archive..."
  rm "${TAR_FILE}"
  docker image prune -f
EOF

echo "🧹 Cleaning up local archive..."
rm -f "${TAR_FILE}"

echo "✅ Deployment complete!"

echo "🔗 App is live at https://${SERVICE_NAME}.app.joshuaspeight.com"
