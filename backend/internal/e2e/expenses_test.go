//go:build e2e
// +build e2e

package e2e

import (
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

func TestV2Expenses_List_Empty(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	// ===== ACT =====
	resp := ts.Request("GET", "/api/v2/cashflow/expenses").
		WithDefaultAuth().
		Do(t)

	// ===== ASSERT =====
	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	regular, ok := result["regularExpenses"].([]interface{})
	require.True(t, ok, "expected regularExpenses to be an array")
	require.Empty(t, regular)
}

func TestV2Expenses_Create_Success(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":           "Electricity Bill",
		"amount":         "150.00",
		"frequency":      "monthly",
		"category":       "utilities",
		"startDate":      "2025-01-01T00:00:00Z",
		"growthRate":     "2.5",
		"growthStrategy": "annual_step",
	}

	// ===== ACT =====
	resp := ts.Request("POST", "/api/v2/cashflow/expenses").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotEmpty(t, result["id"])
	require.Equal(t, "Electricity Bill", result["name"])
	require.Equal(t, "utilities", result["category"])
}

func TestV2Expenses_Create_MissingName(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"amount":    "150.00",
		"frequency": "monthly",
		"category":  "utilities",
	}

	// ===== ACT =====
	resp := ts.Request("POST", "/api/v2/cashflow/expenses").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	testutil.AssertBadRequest(t, resp)
}

func TestV2Expenses_Create_Unauthorized(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":      "Test Expense",
		"amount":    "100.00",
		"frequency": "monthly",
	}

	// ===== ACT =====
	resp := ts.Request("POST", "/api/v2/cashflow/expenses").
		WithoutAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	testutil.AssertUnauthorized(t, resp)
}

func TestV2Expenses_List_WithData(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)
	testutil.CreateExpenseFixture(t, ts.Pool, ts.UserID, "Expense 1")
	testutil.CreateExpenseFixture(t, ts.Pool, ts.UserID, "Expense 2")

	// ===== ACT =====
	resp := ts.Request("GET", "/api/v2/cashflow/expenses").
		WithDefaultAuth().
		Do(t)

	// ===== ASSERT =====
	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	regular, ok := result["regularExpenses"].([]interface{})
	require.True(t, ok, "expected regularExpenses to be an array")
	require.Len(t, regular, 2)
}

func TestV2Expenses_Update_Success(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)
	expenseID := testutil.CreateExpenseFixture(t, ts.Pool, ts.UserID, "Original Name")

	payload := map[string]interface{}{
		"name":           "Updated Expense",
		"amount":         "200.00",
		"frequency":      "monthly",
		"category":       "entertainment",
		"startDate":      "2025-01-01T00:00:00Z",
		"growthRate":     "3.0",
		"growthStrategy": "annual_step",
	}

	// ===== ACT =====
	resp := ts.Request("PUT", "/api/v2/cashflow/expenses/"+expenseID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, "Updated Expense", result["name"])
	require.Equal(t, "entertainment", result["category"])
}

func TestV2Expenses_Update_NotFound(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":      "Updated Name",
		"amount":    "200.00",
		"frequency": "monthly",
	}

	// ===== ACT =====
	resp := ts.Request("PUT", "/api/v2/cashflow/expenses/nonexistent-id").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	testutil.AssertNotFound(t, resp)
}

func TestV2Expenses_Delete_Success(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)
	expenseID := testutil.CreateExpenseFixture(t, ts.Pool, ts.UserID, "To Delete")

	// ===== ACT =====
	resp := ts.Request("DELETE", "/api/v2/cashflow/expenses/"+expenseID).
		WithDefaultAuth().
		Do(t)

	// ===== ASSERT =====
	testutil.AssertNoContent(t, resp)

	// Verify it's deleted
	resp = ts.Request("GET", "/api/v2/cashflow/expenses").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	regular := result["regularExpenses"].([]interface{})
	require.Empty(t, regular)
}

func TestV2Expenses_Delete_NotFound(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)

	// ===== ACT =====
	resp := ts.Request("DELETE", "/api/v2/cashflow/expenses/nonexistent-id").
		WithDefaultAuth().
		Do(t)

	// ===== ASSERT =====
	testutil.AssertNotFound(t, resp)
}

func TestV2Expenses_Stop_Success(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)
	expenseID := testutil.CreateExpenseFixture(t, ts.Pool, ts.UserID, "To Stop")

	payload := map[string]interface{}{
		"endDate": "2025-12-31T00:00:00Z",
	}

	// ===== ACT =====
	resp := ts.Request("POST", "/api/v2/cashflow/expenses/"+expenseID+"/stop").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	// ===== ASSERT =====
	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result["endDate"])
}

func TestV2Expenses_BulkDelete_Success(t *testing.T) {
	// ===== ARRANGE =====
	ts := testutil.NewTestServer(t)
	testutil.CreateExpenseFixture(t, ts.Pool, ts.UserID, "Expense 1")
	testutil.CreateExpenseFixture(t, ts.Pool, ts.UserID, "Expense 2")

	// ===== ACT =====
	resp := ts.Request("DELETE", "/api/v2/cashflow/expenses").
		WithDefaultAuth().
		Do(t)

	// ===== ASSERT =====
	testutil.AssertOK(t, resp, nil)

	// Verify all deleted
	resp = ts.Request("GET", "/api/v2/cashflow/expenses").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)
	require.Empty(t, result["regularExpenses"].([]interface{}))
}
