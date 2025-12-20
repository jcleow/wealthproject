#!/bin/bash
# Run all tests (unit + integration) before committing
# This script should be run from the backend directory

set -e

echo "=== Running Backend Tests ==="

# Run unit tests
echo ""
echo "Running unit tests..."
go test ./... 2>&1 | grep -E "^(ok|FAIL|---)" || true

# Run integration tests
echo ""
echo "Running integration tests..."
go test -tags=integration ./internal/financial_v2/repository/... 2>&1 | grep -E "^(ok|FAIL|---)" || true

echo ""
echo "=== All tests complete ==="
