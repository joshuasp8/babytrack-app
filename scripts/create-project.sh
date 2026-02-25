#!/bin/bash

# Exit on error
set -e

# Default template path (can be overridden via ENV var)
# Using the absolute path provided to assure it works when called via an alias from anywhere
TEMPLATE_DIR="${TEMPLATE_DIR:-$HOME/workspaces/golang/test/babytrack}"

if [ -z "$1" ]; then
  echo "Usage: $0 <project-name> [destination-path]"
  echo "Example: $0 my-new-app"
  exit 1
fi

PROJECT_NAME="$1"
# If destination is not provided, create a folder named after the project in the current directory
DEST_DIR="${2:-$PWD/$PROJECT_NAME}"

# Ensure valid go module name (simple check to prevent immediate failure)
if [[ ! "$PROJECT_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Error: Project name can only contain alphanumeric characters, dashes, and underscores."
    exit 1
fi

# Convert project name to a valid database name (replace dashes with underscores)
DB_NAME=$(echo "$PROJECT_NAME" | tr '-' '_')

echo "🚀 Scaffolding new project: $PROJECT_NAME"
echo "📂 Destination: $DEST_DIR"
echo "🗄️  Database Name: $DB_NAME"
echo "📋 Template Source: $TEMPLATE_DIR"

# 1. Check destination
if [ -d "$DEST_DIR" ]; then
    echo "❌ Error: Destination directory '$DEST_DIR' already exists."
    exit 1
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "❌ Error: Template directory '$TEMPLATE_DIR' not found."
    exit 1
fi

# 2. Copy files excluding specific paths
echo "⏳ Copying template files..."
mkdir -p "$DEST_DIR"

# Using rsync to copy directories while excluding unnecessary files
rsync -a \
    --exclude '.git' \
    --exclude 'frontend/node_modules' \
    --exclude 'babytrack' \
    "$TEMPLATE_DIR/" "$DEST_DIR/"

# SKIPPING FOR NOW
# 3. Create a clean .env if it doesn't exist (copying from template without relying on ignore)
# cp "$TEMPLATE_DIR/.env.template" "$DEST_DIR/.env" || true

# 4. Global Search and Replace
echo "⏳ Replacing placeholders..."

# Helper function for cross-platform safe in-place sed
replace_in_files() {
    local search="$1"
    local replace="$2"
    
    # Exclude binary files and standard ignores
    if [[ "$OSTYPE" == "darwin"* ]]; then
        find "$DEST_DIR" -type f \
            -not -path "*/.git/*" \
            -not -path "*/frontend/node_modules/*" \
            -not -name "*.jpg" -not -name "*.png" -not -name "*.ico" \
            -exec sed -i '' "s/$search/$replace/g" {} \; 2>/dev/null || true
    else
        find "$DEST_DIR" -type f \
            -not -path "*/.git/*" \
            -not -path "*/frontend/node_modules/*" \
            -not -name "*.jpg" -not -name "*.png" -not -name "*.ico" \
            -exec sed -i "s/$search/$replace/g" {} \; 2>/dev/null || true
    fi
}

# Replace module name and text references
replace_in_files "babytrack" "$PROJECT_NAME"

# Replace database name references
replace_in_files "babytrack" "$DB_NAME"

# 5. Initialize new Git repository
echo "⏳ Initializing git repository..."
cd "$DEST_DIR"
git init > /dev/null
git add .
git commit -m "chore: initial commit from babytrack template" > /dev/null

# 6. Run tests to confirm the project generated successfully
echo "⏳ Running tests in newly scaffolded project..."
if go test ./... > /dev/null; then
    echo "✅ Tests passed."
else
    echo "⚠️ Warning: 'go test ./...' failed. Please check the new project."
fi

echo "🎉 Success! Your new project is ready at $DEST_DIR"
echo ""
echo "Next steps:"
echo "  cd $DEST_DIR"
echo "  ./scripts/bootstrap.sh  # to start your new database"
echo "  go run cmd/main.go      # to run the server"
echo ""
echo "To quickly deploy this project, run:"
echo "  ./deploy/deploy-local.sh"
echo ""
echo "Be sure to read SCAFFOLDING.md for tips on how to repurpose this template."
