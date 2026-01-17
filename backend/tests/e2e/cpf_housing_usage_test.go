//go:build e2e
// +build e2e

package e2e

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// E2E tests for CPF Housing Usage API
// Run with: TEST_DATABASE_URL="postgres://..." go test -tags=e2e ./tests/e2e/... -v -run TestCPFHousingUsage

// Response types for JSON unmarshalling
type cpfHousingUsageFullResponseE2E struct {
	Usage *cpfHousingUsageResponseE2E `json:"usage"`
}

type cpfHousingUsageResponseE2E struct {
	PropertyScenarioID string               `json:"propertyScenarioId"`
	Borrower1          *cpfBorrowerUsageE2E `json:"borrower1"`
	Borrower2          *cpfBorrowerUsageE2E `json:"borrower2"`
	HoldingMonths      int                  `json:"holdingMonths"`
}

type cpfBorrowerUsageE2E struct {
	PersonID        string `json:"personId"`
	PersonName      string `json:"personName"`
	DownpaymentOA   string `json:"downpaymentOa"`
	MonthlyOA       string `json:"monthlyOa"`
	TotalOAUsed     string `json:"totalOaUsed"`
	AccruedInterest string `json:"accruedInterest"`
	TotalRefund     string `json:"totalRefund"`
}

func TestCPFHousingUsage_ReturnsPerBorrowerBreakdown(t *testing.T) {
	// Arrange
	ts := testutil.NewTestServer(t)
	pool := testutil.GetTestPool(t)
	ctx := context.Background()
	userID := testutil.TestUserID

	cleanupCPFHousingUsageTestData(t, pool, userID)
	t.Cleanup(func() {
		cleanupCPFHousingUsageTestData(t, pool, userID)
	})

	var person1ID, person2ID string
	err := pool.QueryRow(ctx, `
		INSERT INTO persons (user_id, name, date_of_birth, residency_status)
		VALUES ($1, 'Alice Tan', '1990-05-15', 'citizen')
		RETURNING id
	`, userID).Scan(&person1ID)
	require.NoError(t, err, "Failed to create person 1")

	err = pool.QueryRow(ctx, `
		INSERT INTO persons (user_id, name, date_of_birth, residency_status)
		VALUES ($1, 'Bob Lim', '1988-03-20', 'pr')
		RETURNING id
	`, userID).Scan(&person2ID)
	require.NoError(t, err, "Failed to create person 2")

	// Step 2: Create CPF accounts linked to persons
	var cpfAccount1ID, cpfAccount2ID string
	err = pool.QueryRow(ctx, `
		INSERT INTO cpf_accounts (user_id, person_id, oa_balance, sa_balance, ma_balance)
		VALUES ($1, $2, 80000, 40000, 30000)
		RETURNING id
	`, userID, person1ID).Scan(&cpfAccount1ID)
	require.NoError(t, err, "Failed to create CPF account 1")

	err = pool.QueryRow(ctx, `
		INSERT INTO cpf_accounts (user_id, person_id, oa_balance, sa_balance, ma_balance)
		VALUES ($1, $2, 60000, 35000, 25000)
		RETURNING id
	`, userID, person2ID).Scan(&cpfAccount2ID)
	require.NoError(t, err, "Failed to create CPF account 2")

	// Step 3: Create property scenario with joint borrowers via API
	propertyPayload := map[string]interface{}{
		"country": "SG",
		"propertySG": map[string]interface{}{
			"name":                      "Joint Ownership HDB",
			"propertyType":              "hdb",
			"propertySubtype":           "resale",
			"propertyPrice":             "650000",
			"loanType":                  "hdb",
			"borrowerType":              "joint",
			"borrower1CpfAccountId":     cpfAccount1ID,
			"borrower2CpfAccountId":     cpfAccount2ID,
			"borrower1DownpaymentCpfOa": "50000",
			"borrower2DownpaymentCpfOa": "40000",
			"borrower1MonthlyCpfOa":     "1500",
			"borrower2MonthlyCpfOa":     "1200",
		},
		"ratePeriods": []map[string]interface{}{
			{
				"startMonth": "2025-01",
				"termYears":  25,
				"fixedYears": 2,
				"fixedRate":  "2.6",
			},
		},
	}

	resp := ts.Request("POST", "/api/v2/property-planner/scenarios").
		WithDefaultAuth().
		WithJSON(propertyPayload).
		Do(t)

	require.Equal(t, http.StatusCreated, resp.StatusCode, "Create property scenario should succeed")

	var createResult scenarioResponseE2E
	err = json.NewDecoder(resp.Body).Decode(&createResult)
	require.NoError(t, err, "Failed to decode create response")
	resp.Body.Close()

	scenarioID := createResult.Scenario.ID
	require.NotEmpty(t, scenarioID, "Scenario ID should not be empty")

	// Act
	resp = ts.Request("GET", "/api/v2/cpf/housing-usage/"+scenarioID).
		WithDefaultAuth().
		Do(t)

	require.Equal(t, http.StatusOK, resp.StatusCode, "CPF housing usage should return 200")

	var usageResult cpfHousingUsageFullResponseE2E
	err = json.NewDecoder(resp.Body).Decode(&usageResult)
	require.NoError(t, err, "Failed to decode housing usage response")
	resp.Body.Close()

	// Assert
	require.NotNil(t, usageResult.Usage, "Usage should not be nil")
	require.NotNil(t, usageResult.Usage.Borrower1, "Borrower1 should not be nil")
	require.NotNil(t, usageResult.Usage.Borrower2, "Borrower2 should not be nil for joint ownership")

	// Verify borrower 1 details
	assert.Equal(t, person1ID, usageResult.Usage.Borrower1.PersonID,
		"Borrower 1 person ID should match")
	assert.Equal(t, "Alice Tan", usageResult.Usage.Borrower1.PersonName,
		"Borrower 1 person name should be 'Alice Tan'")
	assert.NotEmpty(t, usageResult.Usage.Borrower1.TotalOAUsed,
		"Borrower 1 total OA used should not be empty")

	// Verify borrower 2 details
	assert.Equal(t, person2ID, usageResult.Usage.Borrower2.PersonID,
		"Borrower 2 person ID should match")
	assert.Equal(t, "Bob Lim", usageResult.Usage.Borrower2.PersonName,
		"Borrower 2 person name should be 'Bob Lim'")
	assert.NotEmpty(t, usageResult.Usage.Borrower2.TotalOAUsed,
		"Borrower 2 total OA used should not be empty")
}

func TestCPFHousingUsage_SingleBorrower_NoBorrower2(t *testing.T) {
	// Arrange
	ts := testutil.NewTestServer(t)
	pool := testutil.GetTestPool(t)
	ctx := context.Background()
	userID := testutil.TestUserID

	cleanupCPFHousingUsageTestData(t, pool, userID)
	t.Cleanup(func() {
		cleanupCPFHousingUsageTestData(t, pool, userID)
	})

	var personID string
	err := pool.QueryRow(ctx, `
		INSERT INTO persons (user_id, name, date_of_birth, residency_status)
		VALUES ($1, 'Charlie Wong', '1992-08-10', 'citizen')
		RETURNING id
	`, userID).Scan(&personID)
	require.NoError(t, err)

	var cpfAccountID string
	err = pool.QueryRow(ctx, `
		INSERT INTO cpf_accounts (user_id, person_id, oa_balance, sa_balance, ma_balance)
		VALUES ($1, $2, 100000, 50000, 40000)
		RETURNING id
	`, userID, personID).Scan(&cpfAccountID)
	require.NoError(t, err)

	// Create single-borrower property scenario
	propertyPayload := map[string]interface{}{
		"country": "SG",
		"propertySG": map[string]interface{}{
			"name":                      "Single Owner Condo",
			"propertyType":              "condo",
			"propertySubtype":           "resale",
			"propertyPrice":             "1200000",
			"loanType":                  "bank",
			"borrowerType":              "single",
			"borrower1CpfAccountId":     cpfAccountID,
			"borrower1DownpaymentCpfOa": "100000",
			"borrower1MonthlyCpfOa":     "2000",
		},
		"ratePeriods": []map[string]interface{}{
			{
				"startMonth": "2025-01",
				"termYears":  30,
				"fixedYears": 3,
				"fixedRate":  "3.5",
			},
		},
	}

	resp := ts.Request("POST", "/api/v2/property-planner/scenarios").
		WithDefaultAuth().
		WithJSON(propertyPayload).
		Do(t)

	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var createResult scenarioResponseE2E
	err = json.NewDecoder(resp.Body).Decode(&createResult)
	require.NoError(t, err)
	resp.Body.Close()

	scenarioID := createResult.Scenario.ID

	// Act
	resp = ts.Request("GET", "/api/v2/cpf/housing-usage/"+scenarioID).
		WithDefaultAuth().
		Do(t)

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var usageResult cpfHousingUsageFullResponseE2E
	err = json.NewDecoder(resp.Body).Decode(&usageResult)
	require.NoError(t, err)
	resp.Body.Close()

	// Assert
	require.NotNil(t, usageResult.Usage)
	require.NotNil(t, usageResult.Usage.Borrower1)
	assert.Equal(t, "Charlie Wong", usageResult.Usage.Borrower1.PersonName)

	// Borrower 2 should be nil for single ownership
	assert.Nil(t, usageResult.Usage.Borrower2,
		"Borrower 2 should be nil for single ownership")
}

func TestCPFHousingUsage_NotFound_InvalidScenarioID(t *testing.T) {
	// Arrange
	ts := testutil.NewTestServer(t)

	// Act
	resp := ts.Request("GET", "/api/v2/cpf/housing-usage/00000000-0000-0000-0000-000000000000").
		WithDefaultAuth().
		Do(t)

	// Assert
	assert.Equal(t, http.StatusNotFound, resp.StatusCode,
		"Should return 404 for non-existent scenario")
	resp.Body.Close()
}

func cleanupCPFHousingUsageTestData(t *testing.T, pool *pgxpool.Pool, userID string) {
	t.Helper()
	ctx := context.Background()

	// Delete in order respecting foreign key constraints
	queries := []string{
		// Property-related
		"DELETE FROM liability_rate_periods WHERE property_scenario_id IN (SELECT id FROM property_scenarios WHERE user_id = $1)",
		"DELETE FROM growth_periods WHERE property_scenario_id IN (SELECT id FROM property_scenarios WHERE user_id = $1)",
		"DELETE FROM property_fees WHERE property_scenario_id IN (SELECT id FROM property_scenarios WHERE user_id = $1)",
		"DELETE FROM property_sg_grants WHERE property_sg_id IN (SELECT id FROM property_sg WHERE id IN (SELECT property_sg_id FROM property_scenarios WHERE user_id = $1))",
		"DELETE FROM property_sg WHERE id IN (SELECT property_sg_id FROM property_scenarios WHERE user_id = $1)",
		"DELETE FROM property_scenarios WHERE user_id = $1",
		// CPF and persons
		"DELETE FROM cpf_accounts WHERE user_id = $1",
		"DELETE FROM persons WHERE user_id = $1",
	}

	for _, q := range queries {
		if _, err := pool.Exec(ctx, q, userID); err != nil {
			t.Logf("Cleanup query failed (may be expected): %v", err)
		}
	}
}
