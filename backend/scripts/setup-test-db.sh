#!/bin/bash
# Setup test database for integration tests
# Run this once before running integration tests

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-financial_user}"
DB_PASSWORD="${DB_PASSWORD:-${DB_PASSWORD}}"
TEST_DB_NAME="financial_chat_test"

echo "Setting up test database: $TEST_DB_NAME"

# Create database if it doesn't exist
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$TEST_DB_NAME'" | grep -q 1 || \
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $TEST_DB_NAME;"

echo "Running migrations..."

# Run all migrations
cd "$(dirname "$0")/.."
cat migrations/*.up.sql | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" -q

echo "Test database setup complete!"
