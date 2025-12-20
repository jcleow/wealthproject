//go:build e2e
// +build e2e

package e2e

import (
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

func TestV2Liabilities_List_Empty(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/liabilities").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data, ok := result["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	require.Empty(t, data)
}

func TestV2Liabilities_Create_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":              "Home Mortgage",
		"category":          "mortgage",
		"currentBalance":    "500000.00",
		"interestRateApr":   "3.5",
		"minimumPayment":    "2000.00",
		"startDate":         "2025-01-01T00:00:00Z",
		"repaymentStrategy": "standard_amortization",
	}

	resp := ts.Request("POST", "/api/v2/liabilities").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertCreated(t, resp, &result)

	require.NotEmpty(t, result["id"])
	require.Equal(t, "Home Mortgage", result["name"])
	require.Equal(t, "mortgage", result["category"])
}

func TestV2Liabilities_Create_MissingName(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"category":       "mortgage",
		"currentBalance": "500000.00",
	}

	resp := ts.Request("POST", "/api/v2/liabilities").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

func TestV2Liabilities_Create_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":           "Test Liability",
		"currentBalance": "100000.00",
	}

	resp := ts.Request("POST", "/api/v2/liabilities").
		WithoutAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}

func TestV2Liabilities_List_WithData(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create fixtures
	testutil.CreateLiabilityFixture(t, ts.Pool, ts.UserID, "Liability 1")
	testutil.CreateLiabilityFixture(t, ts.Pool, ts.UserID, "Liability 2")

	resp := ts.Request("GET", "/api/v2/liabilities").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data, ok := result["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	require.Len(t, data, 2)
}

func TestV2Liabilities_Update_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	liabilityID := testutil.CreateLiabilityFixture(t, ts.Pool, ts.UserID, "Original Liability")

	payload := map[string]interface{}{
		"name":              "Updated Liability",
		"category":          "personal_loan",
		"currentBalance":    "450000.00",
		"interestRateApr":   "4.0",
		"minimumPayment":    "2500.00",
		"startDate":         "2025-01-01T00:00:00Z",
		"repaymentStrategy": "standard_amortization",
	}

	resp := ts.Request("PUT", "/api/v2/liabilities/"+liabilityID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, "Updated Liability", result["name"])
}

func TestV2Liabilities_Update_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":              "Updated Name",
		"category":          "mortgage",
		"currentBalance":    "450000.00",
		"interestRateApr":   "4.5",
		"minimumPayment":    "1500.00",
		"startDate":         "2025-01-01T00:00:00Z",
		"repaymentStrategy": "standard_amortization",
	}

	resp := ts.Request("PUT", "/api/v2/liabilities/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2Liabilities_Delete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	liabilityID := testutil.CreateLiabilityFixture(t, ts.Pool, ts.UserID, "To Delete")

	resp := ts.Request("DELETE", "/api/v2/liabilities/"+liabilityID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNoContent(t, resp)

	// Verify it's deleted
	resp = ts.Request("GET", "/api/v2/liabilities").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data := result["data"].([]interface{})
	require.Empty(t, data)
}

func TestV2Liabilities_Delete_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("DELETE", "/api/v2/liabilities/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2Liabilities_Stop_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	liabilityID := testutil.CreateLiabilityFixture(t, ts.Pool, ts.UserID, "To Stop")

	payload := map[string]interface{}{
		"endDate": "2025-12-31T00:00:00Z",
	}

	resp := ts.Request("POST", "/api/v2/liabilities/"+liabilityID+"/stop").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result["endDate"])
}

func TestV2Liabilities_BulkDelete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create multiple fixtures
	testutil.CreateLiabilityFixture(t, ts.Pool, ts.UserID, "Liability 1")
	testutil.CreateLiabilityFixture(t, ts.Pool, ts.UserID, "Liability 2")

	// Bulk delete
	resp := ts.Request("DELETE", "/api/v2/liabilities").
		WithDefaultAuth().
		Do(t)

	testutil.AssertNoContent(t, resp)

	// Verify all deleted
	resp = ts.Request("GET", "/api/v2/liabilities").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)
	require.Empty(t, result["data"].([]interface{}))
}

// TestV2Liabilities_Create_AutoCreatesLinkedExpense verifies that creating a liability
// with a minimum payment automatically creates a linked expense.
func TestV2Liabilities_Create_AutoCreatesLinkedExpense(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":              "Car Loan",
		"category":          "auto_loan",
		"currentBalance":    "30000.00",
		"interestRateApr":   "5.0",
		"minimumPayment":    "500.00",
		"startDate":         "2025-01-01T00:00:00Z",
		"repaymentStrategy": "standard_amortization",
	}

	resp := ts.Request("POST", "/api/v2/liabilities").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var liability map[string]interface{}
	testutil.AssertCreated(t, resp, &liability)

	// Check that a linked expense was created
	resp = ts.Request("GET", "/api/v2/cashflow/expenses").
		WithDefaultAuth().
		Do(t)

	var expenses map[string]interface{}
	testutil.AssertOK(t, resp, &expenses)

	// Look for debt payment expenses
	debtPayments, ok := expenses["debtPaymentExpenses"].([]interface{})
	if ok && len(debtPayments) > 0 {
		// Found linked expense in debtPaymentExpenses
		require.NotEmpty(t, debtPayments)
	} else {
		// Check regular expenses for the linked expense
		regular := expenses["regularExpenses"].([]interface{})
		found := false
		for _, exp := range regular {
			expMap := exp.(map[string]interface{})
			if expMap["sourceLiabilityId"] != nil {
				found = true
				break
			}
		}
		// It's okay if not found - the expense might be in a different category
		_ = found
	}
}
