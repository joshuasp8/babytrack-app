#!/bin/bash

export DB_NAME=babytrack

## Start docker containers (Postgres)
#docker-compose up -d
#
wait_for_postgres() {
  echo "Waiting for Postgres to be ready..."
  until docker exec -it $(docker ps -qf "ancestor=postgres:18-alpine") pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
  done
  echo "Postgres is ready."
}

# Wait for Postgres to be ready
wait_for_postgres

# Create database if it doesn't exist
# this may fail if the database already exists
echo "Dropping '$DB_NAME' database..."
docker exec -it $(docker ps -qf "ancestor=postgres:18-alpine") psql -U postgres -c "DROP DATABASE $DB_NAME;"

echo "Database '$DB_NAME' dropped."
