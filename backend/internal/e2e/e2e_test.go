//go:build e2e
// +build e2e

// Package e2e contains end-to-end tests for the V2 API endpoints.
// These tests run against a real PostgreSQL database and test the full
// HTTP request/response cycle.
//
// Run with: go test -tags=e2e -v ./backend/internal/e2e/...
//
// Environment variables:
//   - TEST_DATABASE_URL: Database connection string (defaults to local test db)
//   - BACKEND_SHARED_SECRET: JWT signing secret (defaults to test secret)
package e2e

import (
	"os"
	"testing"
)

// TestMain sets up the test environment before running E2E tests.
func TestMain(m *testing.M) {
	// Set test environment
	os.Setenv("GO_ENV", "development")
	os.Setenv("BACKEND_SHARED_SECRET", "e2e-test-secret-key-12345")

	// Run tests
	code := m.Run()

	os.Exit(code)
}
