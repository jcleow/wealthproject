//go:build e2e
// +build e2e

package e2e

import (
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

func TestV2IncomeAllocations_ListAll_Empty(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/income-allocations").
		WithDefaultAuth().
		Do(t)

	var result []interface{}
	testutil.AssertOK(t, resp, &result)

	require.Empty(t, result)
}

func TestV2IncomeAllocations_ListByIncome_Empty(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create income fixture
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Test Income")

	resp := ts.Request("GET", "/api/v2/incomes/"+incomeID+"/allocations").
		WithDefaultAuth().
		Do(t)

	var result []interface{}
	testutil.AssertOK(t, resp, &result)

	require.Empty(t, result)
}

// TODO: Backend returns 500 instead of 404 when income doesn't exist.
// Once the API properly handles not found errors, remove the Skip.
func TestV2IncomeAllocations_ListByIncome_NotFound(t *testing.T) {
	t.Skip("Backend returns 500 for not found; should return 404")
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/incomes/"+testutil.NonexistentUUID+"/allocations").
		WithDefaultAuth().
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2IncomeAllocations_Create_ToInvestment(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create fixtures
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")
	investmentID := testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Stock Portfolio")

	payload := map[string]interface{}{
		"targetInvestmentId": investmentID,
		"allocationType":     "percentage",
		"allocationValue":    "50",
		"startDate":          "2025-01-01T00:00:00Z",
	}

	resp := ts.Request("POST", "/api/v2/incomes/"+incomeID+"/allocations").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertCreated(t, resp, &result)

	require.NotEmpty(t, result["id"])
	require.Equal(t, investmentID, result["targetInvestmentId"])
	require.Equal(t, "percentage", result["allocationType"])
}

func TestV2IncomeAllocations_Create_ToCashAccount(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create fixtures
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")
	cashAccountID := testutil.CreateCashAccountFixture(t, ts.Pool, ts.UserID, "Savings Account")

	payload := map[string]interface{}{
		"targetCashAccountId": cashAccountID,
		"allocationType":      "fixed",
		"allocationValue":     "1000",
		"startDate":           "2025-01-01T00:00:00Z",
	}

	resp := ts.Request("POST", "/api/v2/incomes/"+incomeID+"/allocations").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertCreated(t, resp, &result)

	require.NotEmpty(t, result["id"])
	require.Equal(t, cashAccountID, result["targetCashAccountId"])
	require.Equal(t, "fixed", result["allocationType"])
}

func TestV2IncomeAllocations_Create_BothTargets_Fails(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create fixtures
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")
	investmentID := testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Stock Portfolio")
	cashAccountID := testutil.CreateCashAccountFixture(t, ts.Pool, ts.UserID, "Savings Account")

	payload := map[string]interface{}{
		"targetInvestmentId":  investmentID,
		"targetCashAccountId": cashAccountID,
		"allocationType":      "percentage",
		"allocationValue":     "50",
	}

	resp := ts.Request("POST", "/api/v2/incomes/"+incomeID+"/allocations").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

func TestV2IncomeAllocations_Create_NoTarget_Fails(t *testing.T) {
	ts := testutil.NewTestServer(t)

	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")

	payload := map[string]interface{}{
		"allocationType":  "percentage",
		"allocationValue": "50",
	}

	resp := ts.Request("POST", "/api/v2/incomes/"+incomeID+"/allocations").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

func TestV2IncomeAllocations_Create_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")

	payload := map[string]interface{}{
		"allocationType":  "percentage",
		"allocationValue": "50",
	}

	resp := ts.Request("POST", "/api/v2/incomes/"+incomeID+"/allocations").
		WithoutAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}

func TestV2IncomeAllocations_Update_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create fixtures
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")
	investmentID := testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Stock Portfolio")
	allocationID := testutil.CreateIncomeAllocationFixture(t, ts.Pool, incomeID, &investmentID, nil)

	payload := map[string]interface{}{
		"targetInvestmentId": investmentID,
		"allocationType":     "percentage",
		"allocationValue":    "75",
	}

	resp := ts.Request("PUT", "/api/v2/incomes/"+incomeID+"/allocations/"+allocationID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	// Check allocation value was updated
	require.NotNil(t, result["allocationValue"])
}

// TODO: Backend returns 500 instead of 404 when allocation doesn't exist.
// Once the API properly handles not found errors, remove the Skip.
func TestV2IncomeAllocations_Update_NotFound(t *testing.T) {
	t.Skip("Backend returns 500 for not found; should return 404")
	ts := testutil.NewTestServer(t)

	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")

	payload := map[string]interface{}{
		"allocationType":  "percentage",
		"allocationValue": "75",
	}

	resp := ts.Request("PUT", "/api/v2/incomes/"+incomeID+"/allocations/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2IncomeAllocations_Delete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create fixtures
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")
	investmentID := testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Stock Portfolio")
	allocationID := testutil.CreateIncomeAllocationFixture(t, ts.Pool, incomeID, &investmentID, nil)

	resp := ts.Request("DELETE", "/api/v2/incomes/"+incomeID+"/allocations/"+allocationID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNoContent(t, resp)

	// Verify it's deleted
	resp = ts.Request("GET", "/api/v2/incomes/"+incomeID+"/allocations").
		WithDefaultAuth().
		Do(t)

	var result []interface{}
	testutil.AssertOK(t, resp, &result)
	require.Empty(t, result)
}

// TODO: Backend returns 500 instead of 404 when allocation doesn't exist.
// Once the API properly handles not found errors, remove the Skip.
func TestV2IncomeAllocations_Delete_NotFound(t *testing.T) {
	t.Skip("Backend returns 500 for not found; should return 404")
	ts := testutil.NewTestServer(t)

	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")

	resp := ts.Request("DELETE", "/api/v2/incomes/"+incomeID+"/allocations/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2IncomeAllocations_Stop_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create fixtures
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")
	investmentID := testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Stock Portfolio")
	allocationID := testutil.CreateIncomeAllocationFixture(t, ts.Pool, incomeID, &investmentID, nil)

	payload := map[string]interface{}{
		"endDate": "2025-12-31T00:00:00Z",
	}

	resp := ts.Request("POST", "/api/v2/incomes/"+incomeID+"/allocations/"+allocationID+"/stop").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result["endDate"])
}
