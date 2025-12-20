//go:build e2e
// +build e2e

package e2e

import (
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

func TestV2CashAccounts_List_Empty(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/cash-accounts").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data, ok := result["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	require.Empty(t, data)
}

func TestV2CashAccounts_List_WithData(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create fixtures
	testutil.CreateCashAccountFixture(t, ts.Pool, ts.UserID, "Savings Account")
	testutil.CreateCashAccountFixture(t, ts.Pool, ts.UserID, "Checking Account")

	resp := ts.Request("GET", "/api/v2/cash-accounts").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data, ok := result["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	require.Len(t, data, 2)
}

func TestV2CashAccounts_List_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/cash-accounts").
		WithoutAuth().
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}

func TestV2CashAccounts_Update_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	cashAccountID := testutil.CreateCashAccountFixture(t, ts.Pool, ts.UserID, "Original Account")

	payload := map[string]interface{}{
		"name":         "Updated Account",
		"balance":      "25000.00",
		"interestRate": "2.5",
		"bankName":     "Updated Bank",
		"accountType":  "savings",
	}

	resp := ts.Request("PUT", "/api/v2/cash-accounts/"+cashAccountID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, "Updated Account", result["name"])
}

func TestV2CashAccounts_Update_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":    "Updated Name",
		"balance": "25000.00",
	}

	resp := ts.Request("PUT", "/api/v2/cash-accounts/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2CashAccounts_Delete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	cashAccountID := testutil.CreateCashAccountFixture(t, ts.Pool, ts.UserID, "To Delete")

	resp := ts.Request("DELETE", "/api/v2/cash-accounts/"+cashAccountID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNoContent(t, resp)

	// Verify it's deleted
	resp = ts.Request("GET", "/api/v2/cash-accounts").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data := result["data"].([]interface{})
	require.Empty(t, data)
}

func TestV2CashAccounts_Delete_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("DELETE", "/api/v2/cash-accounts/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2CashAccounts_Stop_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	cashAccountID := testutil.CreateCashAccountFixture(t, ts.Pool, ts.UserID, "To Stop")

	payload := map[string]interface{}{
		"endDate": "2025-12-31T00:00:00Z",
	}

	resp := ts.Request("POST", "/api/v2/cash-accounts/"+cashAccountID+"/stop").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result["endDate"])
}

func TestV2CashAccounts_BulkDelete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create multiple fixtures
	testutil.CreateCashAccountFixture(t, ts.Pool, ts.UserID, "Account 1")
	testutil.CreateCashAccountFixture(t, ts.Pool, ts.UserID, "Account 2")

	// Bulk delete
	resp := ts.Request("DELETE", "/api/v2/cash-accounts").
		WithDefaultAuth().
		Do(t)

	testutil.AssertNoContent(t, resp)

	// Verify all deleted
	resp = ts.Request("GET", "/api/v2/cash-accounts").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)
	require.Empty(t, result["data"].([]interface{}))
}
