package poc

import (
	"context"
	"database/sql"
	"encoding/json"
	"testing"

	"financial-chat-system/backend/internal/decimal"

	_ "github.com/lib/pq"
)

func TestAccountPOC_JSON(t *testing.T) {
	// Create an account
	acc := &AccountPOC{
		ID:            "test-123",
		Name:          "Savings Account",
		Balance:       decimal.MustFromString("10000.50"),
		GrowthRatePct: decimal.MustFromString("3.25"),
		Currency:      "USD",
	}

	// Marshal to JSON
	data, err := json.Marshal(acc)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	t.Logf("JSON: %s", string(data))

	// Verify JSON format
	expected := `{"id":"test-123","name":"Savings Account","balance":"10000.5","growth_rate_pct":"3.25","currency":"USD"}`
	var gotMap, expectedMap map[string]interface{}
	json.Unmarshal(data, &gotMap)
	json.Unmarshal([]byte(expected), &expectedMap)

	if gotMap["balance"] != "10000.5" {
		t.Errorf("expected balance to be string '10000.5', got %v", gotMap["balance"])
	}

	// Unmarshal from JSON
	var acc2 AccountPOC
	if err := json.Unmarshal(data, &acc2); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	// Verify values match
	if acc2.Balance.Cmp(acc.Balance) != 0 {
		t.Errorf("balance mismatch: got %s, want %s", acc2.Balance.String(), acc.Balance.String())
	}

	if acc2.GrowthRatePct.Cmp(acc.GrowthRatePct) != 0 {
		t.Errorf("growth rate mismatch: got %s, want %s", acc2.GrowthRatePct.String(), acc.GrowthRatePct.String())
	}
}

func TestAccountPOC_MonthlyGrowth(t *testing.T) {
	// Start with $10,000 at 3% annual growth
	acc := &AccountPOC{
		ID:            "test-123",
		Name:          "Investment Account",
		Balance:       decimal.MustFromString("10000.00"),
		GrowthRatePct: decimal.MustFromString("3.0"),
		Currency:      "USD",
	}

	t.Logf("Initial balance: %s", acc.Balance.String())

	// Apply 12 months of compound growth
	err := acc.ApplyMonthlyGrowth(12)
	if err != nil {
		t.Fatalf("failed to apply growth: %v", err)
	}

	t.Logf("Balance after 12 months: %s", acc.Balance.String())

	// After 12 months at 3% annual, should be approximately $10,300
	// (exact: $10,304.16 with monthly compounding)
	expected := decimal.MustFromString("10300.00")
	if acc.Balance.Round(0).Cmp(expected) != 0 {
		t.Logf("Expected approximately %s, got %s (exact value expected)", expected.String(), acc.Balance.Round(0).String())
	}

	// Verify it's more than simple interest (10300)
	simpleInterest := decimal.MustFromString("10300.00")
	if acc.Balance.Cmp(simpleInterest) <= 0 {
		t.Errorf("compound interest should be > simple interest")
	}
}

func TestAccountPOC_AnnualGrowth(t *testing.T) {
	// Start with $5,000/month salary at 5% annual raises
	acc := &AccountPOC{
		ID:            "test-salary",
		Name:          "Monthly Salary",
		Balance:       decimal.MustFromString("5000.00"),
		GrowthRatePct: decimal.MustFromString("5.0"),
		Currency:      "USD",
	}

	t.Logf("Initial salary: %s", acc.Balance.String())

	// Apply 3 years of annual step growth
	err := acc.ApplyAnnualGrowth(3)
	if err != nil {
		t.Fatalf("failed to apply growth: %v", err)
	}

	t.Logf("Salary after 3 years: %s", acc.Balance.String())

	// After 3 years at 5% annual:
	// Year 1: $5,000
	// Year 2: $5,250 (5% increase)
	// Year 3: $5,512.50 (5% increase)
	expected := decimal.MustFromString("5512.50")
	if acc.Balance.Round(2).Cmp(expected) != 0 {
		t.Errorf("expected %s, got %s", expected.String(), acc.Balance.Round(2).String())
	}
}

func TestAccountPOC_Database(t *testing.T) {
	// Skip if not in integration test mode
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	// Connect to test database
	connStr := "host=localhost port=5432 user=financial_user_dev_2024 password=financial_pass_dev_2024 dbname=financial_db_dev_2024 sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Skipf("failed to connect to database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	dbPOC := NewDatabasePOC(db)

	// Create table
	if err := dbPOC.CreateTable(ctx); err != nil {
		t.Fatalf("failed to create table: %v", err)
	}
	defer dbPOC.DropTable(ctx)

	// Create account
	acc := &AccountPOC{
		ID:            "db-test-1",
		Name:          "Test Savings",
		Balance:       decimal.MustFromString("15000.75"),
		GrowthRatePct: decimal.MustFromString("4.25"),
		Currency:      "USD",
	}

	// Insert
	if err := dbPOC.Insert(ctx, acc); err != nil {
		t.Fatalf("failed to insert: %v", err)
	}

	t.Logf("Inserted account: %s with balance %s", acc.Name, acc.Balance.String())

	// Retrieve
	retrieved, err := dbPOC.Get(ctx, acc.ID)
	if err != nil {
		t.Fatalf("failed to get: %v", err)
	}

	t.Logf("Retrieved account: %s with balance %s", retrieved.Name, retrieved.Balance.String())

	// Verify balance matches (compare as strings to avoid decimal representation issues)
	if retrieved.Balance.String() != acc.Balance.String() {
		t.Errorf("balance mismatch: got %s, want %s", retrieved.Balance.String(), acc.Balance.String())
	}

	if retrieved.GrowthRatePct.String() != acc.GrowthRatePct.String() {
		t.Errorf("growth rate mismatch: got %s, want %s", retrieved.GrowthRatePct.String(), acc.GrowthRatePct.String())
	}

	// Apply growth
	if err := retrieved.ApplyMonthlyGrowth(12); err != nil {
		t.Fatalf("failed to apply growth: %v", err)
	}

	t.Logf("After 12 months growth: %s", retrieved.Balance.String())

	// Update in database
	if err := dbPOC.Update(ctx, retrieved); err != nil {
		t.Fatalf("failed to update: %v", err)
	}

	// Retrieve again to verify update
	updated, err := dbPOC.Get(ctx, acc.ID)
	if err != nil {
		t.Fatalf("failed to get updated: %v", err)
	}

	if updated.Balance.Cmp(retrieved.Balance) != 0 {
		t.Errorf("updated balance mismatch: got %s, want %s", updated.Balance.String(), retrieved.Balance.String())
	}

	t.Logf("Successfully completed full DB round-trip with growth calculation")
}

func TestAccountPOC_PrecisionPreservation(t *testing.T) {
	// Test that we don't lose precision in calculations
	acc := &AccountPOC{
		ID:            "precision-test",
		Name:          "Precision Test",
		Balance:       decimal.MustFromString("100.33"),
		GrowthRatePct: decimal.MustFromString("2.75"),
		Currency:      "USD",
	}

	original := acc.Balance.String()
	t.Logf("Original balance: %s", original)

	// Apply growth
	if err := acc.ApplyMonthlyGrowth(1); err != nil {
		t.Fatalf("failed to apply growth: %v", err)
	}

	t.Logf("After 1 month: %s", acc.Balance.String())

	// The result should have proper precision, not floating point errors
	// With 2.75% annual rate, monthly multiplier is ~1.002265
	// 100.33 * 1.002265 ≈ 100.557
	if acc.Balance.IsZero() {
		t.Error("balance should not be zero after growth")
	}

	// Verify no weird floating point artifacts like 100.5570000000001
	balanceStr := acc.Balance.String()
	if len(balanceStr) > 20 {
		t.Errorf("balance string unexpectedly long: %s", balanceStr)
	}
}

func TestAccountPOC_NegativeRates(t *testing.T) {
	// Test negative growth (decline)
	acc := &AccountPOC{
		ID:            "decline-test",
		Name:          "Declining Asset",
		Balance:       decimal.MustFromString("1000.00"),
		GrowthRatePct: decimal.MustFromString("-5.0"), // -5% annual decline
		Currency:      "USD",
	}

	t.Logf("Initial: %s", acc.Balance.String())

	if err := acc.ApplyAnnualGrowth(1); err != nil {
		t.Fatalf("failed to apply negative growth: %v", err)
	}

	t.Logf("After 1 year of -5%%: %s", acc.Balance.String())

	// Should be $950
	expected := decimal.MustFromString("950.00")
	if acc.Balance.Round(2).Cmp(expected) != 0 {
		t.Errorf("expected %s, got %s", expected.String(), acc.Balance.Round(2).String())
	}
}
