package testutil

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	testPool     *pgxpool.Pool
	testPoolOnce sync.Once
	testPoolErr  error
)

// GetTestDatabaseURL returns the test database URL from environment or default.
func GetTestDatabaseURL() string {
	if url := os.Getenv("TEST_DATABASE_URL"); url != "" {
		return url
	}
	// Default to local dev database with test schema
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "financial_chat"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "financial_user"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "${DB_PASSWORD}"
	}
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, password, host, port, dbName)
}

// GetTestPool returns a shared test database pool.
// The pool is created once and reused across tests.
func GetTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	testPoolOnce.Do(func() {
		ctx := context.Background()
		url := GetTestDatabaseURL()

		config, err := pgxpool.ParseConfig(url)
		if err != nil {
			testPoolErr = fmt.Errorf("failed to parse test database URL: %w", err)
			return
		}

		config.MaxConns = 5
		config.MinConns = 1

		pool, err := pgxpool.NewWithConfig(ctx, config)
		if err != nil {
			testPoolErr = fmt.Errorf("failed to create test pool: %w", err)
			return
		}

		if err := pool.Ping(ctx); err != nil {
			pool.Close()
			testPoolErr = fmt.Errorf("failed to ping test database: %w", err)
			return
		}

		testPool = pool
	})

	if testPoolErr != nil {
		t.Skipf("Skipping integration test: %v", testPoolErr)
	}

	return testPool
}

// TestUserID is a consistent user ID for integration tests.
const TestUserID = "test-user-integration-00000000"

// CleanupTestData removes test data created by integration tests.
// Call this at the start or end of each test to ensure isolation.
func CleanupTestData(t *testing.T, pool *pgxpool.Pool, userID string) {
	t.Helper()
	ctx := context.Background()

	// Delete in order respecting foreign key constraints
	queries := []string{
		"DELETE FROM scenario_event_impacts WHERE event_id IN (SELECT id FROM scenario_events WHERE user_id = $1)",
		"DELETE FROM scenario_events WHERE user_id = $1",
		"DELETE FROM income_allocations WHERE income_id IN (SELECT id FROM finance_incomes WHERE user_id = $1)",
		"DELETE FROM finance_expenses WHERE user_id = $1",
		"DELETE FROM finance_incomes WHERE user_id = $1",
		"DELETE FROM finance_liabilities WHERE user_id = $1",
		"DELETE FROM finance_assets WHERE user_id = $1",
		"DELETE FROM finance_cash_accounts WHERE user_id = $1",
		"DELETE FROM finance_investments WHERE user_id = $1",
	}

	for _, q := range queries {
		if _, err := pool.Exec(ctx, q, userID); err != nil {
			// Log but don't fail - table might not exist or constraint issue
			t.Logf("Cleanup query failed (may be expected): %v", err)
		}
	}
}

// CreateTestExpense creates a test expense and returns its ID.
func CreateTestExpense(t *testing.T, pool *pgxpool.Pool, userID, name string, amount int64) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_expenses (user_id, name, amount, frequency, category, start_date)
		VALUES ($1, $2, $3, 'monthly', 'test', NOW())
		RETURNING id
	`, userID, name, amount).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to create test expense: %v", err)
	}
	return id
}

// CreateTestIncome creates a test income and returns its ID.
func CreateTestIncome(t *testing.T, pool *pgxpool.Pool, userID, name string, amount int64) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_incomes (user_id, name, amount, frequency, category, start_date)
		VALUES ($1, $2, $3, 'monthly', 'test', NOW())
		RETURNING id
	`, userID, name, amount).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to create test income: %v", err)
	}
	return id
}

// CreateTestLiability creates a test liability and returns its ID.
func CreateTestLiability(t *testing.T, pool *pgxpool.Pool, userID, name string, balance int64) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_liabilities (user_id, name, current_balance, category, start_date)
		VALUES ($1, $2, $3, 'test', NOW())
		RETURNING id
	`, userID, name, balance).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to create test liability: %v", err)
	}
	return id
}

// CreateTestAsset creates a test asset and returns its ID.
func CreateTestAsset(t *testing.T, pool *pgxpool.Pool, userID, name string, value int64) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_assets (user_id, name, current_value, category, start_date)
		VALUES ($1, $2, $3, 'test', NOW())
		RETURNING id
	`, userID, name, value).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to create test asset: %v", err)
	}
	return id
}
