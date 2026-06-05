#!/bin/bash
set -e

# Resolve DB host and port from DATABASE_URL or defaults
# DATABASE_URL: postgresql://tailorforge_admin:temp_password_change_me@db/tailorforge
DB_HOST="db"
DB_PORT="5432"

echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done
echo "PostgreSQL is online. Running database migrations..."

# Run migrations
alembic upgrade head

# Start FastAPI application
echo "Launching FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
