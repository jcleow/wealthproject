//go:build e2e
// +build e2e

package e2e

import (
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

func TestV2Incomes_List_Empty(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	// ===== ACT =====
	resp := ts.Request("GET", "/api/v2/cashflow/incomes").
		WithDefaultAuth().
		Do(t)

	// ===== ASSERT =====
	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data, ok := result["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	require.Empty(t, data)
}

func TestV2Incomes_Create_Success(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":           "Monthly Salary",
		"amount":         "8000.00",
		"frequency":      "monthly",
		"category":       "salary",
		"startDate":      "2025-01-01T00:00:00Z",
		"growthRate":     "3.0",
		"growthStrategy": "annual_step",
		"incomeType":     "salary",
		"cpfWageType":    "ow",
	}

	// ===== ACT =====
	resp := ts.Request("POST", "/api/v2/cashflow/incomes").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotEmpty(t, result["id"])
	require.Equal(t, "Monthly Salary", result["name"])
	require.Equal(t, "salary", result["category"])
}

func TestV2Incomes_Create_MissingName(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"amount":    "8000.00",
		"frequency": "monthly",
	}

	// ===== ACT =====
	resp := ts.Request("POST", "/api/v2/cashflow/incomes").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	testutil.AssertBadRequest(t, resp)
}

func TestV2Incomes_Create_Unauthorized(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":      "Test Income",
		"amount":    "5000.00",
		"frequency": "monthly",
	}

	// ===== ACT =====
	resp := ts.Request("POST", "/api/v2/cashflow/incomes").
		WithoutAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	testutil.AssertUnauthorized(t, resp)
}

func TestV2Incomes_List_WithData(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)
	testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Income 1")
	testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Income 2")

	// ===== ACT =====
	resp := ts.Request("GET", "/api/v2/cashflow/incomes").
		WithDefaultAuth().
		Do(t)

	// ===== ASSERT =====
	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data, ok := result["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	require.Len(t, data, 2)
}

func TestV2Incomes_Update_Success(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Original Income")

	payload := map[string]interface{}{
		"name":           "Updated Income",
		"amount":         "10000.00",
		"frequency":      "monthly",
		"category":       "bonus",
		"startDate":      "2025-01-01T00:00:00Z",
		"growthRate":     "5.0",
		"growthStrategy": "annual_step",
	}

	// ===== ACT =====
	resp := ts.Request("PUT", "/api/v2/cashflow/incomes/"+incomeID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, "Updated Income", result["name"])
}

func TestV2Incomes_Update_NotFound(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":      "Updated Name",
		"amount":    "10000.00",
		"frequency": "monthly",
	}

	// ===== ACT =====
	resp := ts.Request("PUT", "/api/v2/cashflow/incomes/nonexistent-id").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	testutil.AssertNotFound(t, resp)
}

func TestV2Incomes_Delete_Success(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "To Delete")

	// ===== ACT =====
	resp := ts.Request("DELETE", "/api/v2/cashflow/incomes/"+incomeID).
		WithDefaultAuth().
		Do(t)

	// ===== ASSERT =====
	testutil.AssertNoContent(t, resp)

	// Verify it's deleted
	resp = ts.Request("GET", "/api/v2/cashflow/incomes").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data := result["data"].([]interface{})
	require.Empty(t, data)
}

func TestV2Incomes_Delete_NotFound(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	// ===== ACT =====
	resp := ts.Request("DELETE", "/api/v2/cashflow/incomes/nonexistent-id").
		WithDefaultAuth().
		Do(t)

	// ===== ASSERT =====
	testutil.AssertNotFound(t, resp)
}

func TestV2Incomes_Stop_Success(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "To Stop")

	payload := map[string]interface{}{
		"endDate": "2025-12-31T00:00:00Z",
	}

	// ===== ACT =====
	resp := ts.Request("POST", "/api/v2/cashflow/incomes/"+incomeID+"/stop").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result["endDate"])
}
