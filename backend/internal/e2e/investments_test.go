//go:build e2e
// +build e2e

package e2e

import (
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

func TestV2Investments_List_Empty(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/investments").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data, ok := result["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	require.Empty(t, data)
}

func TestV2Investments_Create_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":           "Stock Portfolio",
		"category":       "stocks",
		"currentValue":   "100000.00",
		"growthRate":     "7.0",
		"startDate":      "2025-01-01T00:00:00Z",
		"growthStrategy": "compound_monthly",
	}

	resp := ts.Request("POST", "/api/v2/investments").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotEmpty(t, result["id"])
	require.Equal(t, "Stock Portfolio", result["name"])
	require.Equal(t, "stocks", result["category"])
}

func TestV2Investments_Create_MissingName(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"category":     "stocks",
		"currentValue": "100000.00",
	}

	resp := ts.Request("POST", "/api/v2/investments").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

func TestV2Investments_Create_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":         "Test Investment",
		"currentValue": "50000.00",
	}

	resp := ts.Request("POST", "/api/v2/investments").
		WithoutAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}

func TestV2Investments_List_WithData(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create fixtures
	testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Investment 1")
	testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Investment 2")

	resp := ts.Request("GET", "/api/v2/investments").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data, ok := result["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	require.Len(t, data, 2)
}

func TestV2Investments_Update_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	investmentID := testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Original Investment")

	payload := map[string]interface{}{
		"name":           "Updated Investment",
		"category":       "bonds",
		"currentValue":   "120000.00",
		"growthRate":     "5.0",
		"startDate":      "2025-01-01T00:00:00Z",
		"growthStrategy": "compound_monthly",
	}

	resp := ts.Request("PUT", "/api/v2/investments/"+investmentID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, "Updated Investment", result["name"])
}

func TestV2Investments_Update_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":         "Updated Name",
		"currentValue": "120000.00",
	}

	resp := ts.Request("PUT", "/api/v2/investments/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2Investments_Delete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	investmentID := testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "To Delete")

	resp := ts.Request("DELETE", "/api/v2/investments/"+investmentID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNoContent(t, resp)

	// Verify it's deleted
	resp = ts.Request("GET", "/api/v2/investments").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data := result["data"].([]interface{})
	require.Empty(t, data)
}

func TestV2Investments_Delete_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("DELETE", "/api/v2/investments/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2Investments_Stop_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	investmentID := testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "To Stop")

	payload := map[string]interface{}{
		"endDate": "2025-12-31T00:00:00Z",
	}

	resp := ts.Request("POST", "/api/v2/investments/"+investmentID+"/stop").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result["endDate"])
}

func TestV2Investments_BulkDelete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create multiple fixtures
	testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Investment 1")
	testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Investment 2")

	// Bulk delete
	resp := ts.Request("DELETE", "/api/v2/investments").
		WithDefaultAuth().
		Do(t)

	testutil.AssertNoContent(t, resp)

	// Verify all deleted
	resp = ts.Request("GET", "/api/v2/investments").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)
	require.Empty(t, result["data"].([]interface{}))
}
