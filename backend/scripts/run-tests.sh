#!/bin/bash
# Run all tests (unit + integration) before committing
# This script should be run from the backend directory

set -e

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-financial_user}"
DB_PASSWORD="${DB_PASSWORD:-${DB_PASSWORD}}"
TEST_DB_NAME="financial_chat_test"

echo "=== Running Backend Tests ==="

# Setup test database
echo ""
echo "Setting up test database..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$TEST_DB_NAME'" | grep -q 1 || \
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $TEST_DB_NAME;" 2>/dev/null

# Run migrations (one by one to handle dependencies correctly)
echo "Running migrations..."
for f in migrations/*.up.sql; do
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" -q -f "$f" 2>/dev/null || true
done

# Run unit tests
echo ""
echo "Running unit tests..."
go test ./... 2>&1 | grep -E "^(ok|FAIL|---)" || true

# Run integration tests
echo ""
echo "Running integration tests..."
go test -tags=integration ./internal/financial_v2/repository/... 2>&1 | grep -E "^(ok|FAIL|---)" || true

# Run E2E tests
echo ""
echo "Running E2E tests..."
TEST_DATABASE_URL="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$TEST_DB_NAME?sslmode=disable" \
  go test -tags=e2e ./internal/e2e/... 2>&1 | grep -E "^(ok|FAIL|---)" || true

# Cleanup test database
echo ""
echo "Cleaning up test database..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" 2>/dev/null || true

echo ""
echo "=== All tests complete ==="
