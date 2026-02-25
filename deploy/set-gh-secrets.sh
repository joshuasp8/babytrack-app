#!/usr/bin/env bash
set -euo pipefail

# This script sets GitHub repository secrets for deployments as an alternative to manually setting them in the repo.
# It expects the following:
# - gh CLI installed and authenticated
# - .env file in the current directory with necessary environment variables
# - SSH private key at ~/.ssh/oci.key for deployment access

# ---- config ----
SSH_HOST="129.153.92.179"
SSH_USER="ubuntu"
SSH_KEY_PATH="$HOME/.ssh/oci.key"
ENV_FILE_PATH=".env"
# ----------------

# sanity checks
if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install from https://cli.github.com/"
  exit 1
fi

if [ ! -f "$SSH_KEY_PATH" ]; then
  echo "Missing SSH key at $SSH_KEY_PATH"
  exit 1
fi

# make sure we're in a git repo
gh repo view >/dev/null

# Optional .env
if [ -f "$ENV_FILE_PATH" ]; then
  echo "Setting ENV_FILE secret from $ENV_FILE_PATH"
  gh secret set ENV_FILE < "$ENV_FILE_PATH"
else
  echo "No $ENV_FILE_PATH found, skipping ENV_FILE secret"
fi

echo "Setting SSH_HOST"
gh secret set SSH_HOST -b"$SSH_HOST"

echo "Setting SSH_USER"
gh secret set SSH_USER -b"$SSH_USER"

echo "Setting SSH_PRIVATE_KEY from $SSH_KEY_PATH"
gh secret set SSH_PRIVATE_KEY < "$SSH_KEY_PATH"

echo "✅ GitHub secrets set successfully"
