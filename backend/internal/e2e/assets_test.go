//go:build e2e
// +build e2e

package e2e

import (
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

func TestV2Assets_List_Empty(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/assets").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	// Should return empty data array
	data, ok := result["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	require.Empty(t, data)
}

func TestV2Assets_Create_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":             "Test House",
		"category":         "real_estate",
		"currentValue":     "500000.00",
		"annualGrowthRate": "3.5",
		"startDate":        "2025-01-01T00:00:00Z",
		"growthStrategy":   "compound",
	}

	resp := ts.Request("POST", "/api/v2/assets").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotEmpty(t, result["id"])
	require.Equal(t, "Test House", result["name"])
	require.Equal(t, "real_estate", result["category"])
}

func TestV2Assets_Create_MissingName(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"category":     "real_estate",
		"currentValue": "500000.00",
	}

	resp := ts.Request("POST", "/api/v2/assets").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

func TestV2Assets_Create_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":         "Test House",
		"category":     "real_estate",
		"currentValue": "500000.00",
	}

	resp := ts.Request("POST", "/api/v2/assets").
		WithoutAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}

func TestV2Assets_List_WithData(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "Test Asset 1")
	testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "Test Asset 2")

	resp := ts.Request("GET", "/api/v2/assets").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data, ok := result["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	require.Len(t, data, 2)
}

func TestV2Assets_Update_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	assetID := testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "Original Name")

	payload := map[string]interface{}{
		"name":             "Updated Name",
		"category":         "real_estate",
		"currentValue":     "600000.00",
		"annualGrowthRate": "4.0",
		"startDate":        "2025-01-01T00:00:00Z",
		"growthStrategy":   "compound",
	}

	resp := ts.Request("PUT", "/api/v2/assets/"+assetID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, "Updated Name", result["name"])
}

func TestV2Assets_Update_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":         "Updated Name",
		"category":     "real_estate",
		"currentValue": "600000.00",
	}

	resp := ts.Request("PUT", "/api/v2/assets/nonexistent-id").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2Assets_Delete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	assetID := testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "To Delete")

	resp := ts.Request("DELETE", "/api/v2/assets/"+assetID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNoContent(t, resp)

	// Verify it's deleted
	resp = ts.Request("GET", "/api/v2/assets").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	data := result["data"].([]interface{})
	require.Empty(t, data)
}

func TestV2Assets_Delete_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("DELETE", "/api/v2/assets/nonexistent-id").
		WithDefaultAuth().
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2Assets_Stop_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	assetID := testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "To Stop")

	payload := map[string]interface{}{
		"endDate": "2025-12-31T00:00:00Z",
	}

	resp := ts.Request("POST", "/api/v2/assets/"+assetID+"/stop").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result["endDate"])
}

func TestV2Assets_Stop_MissingEndDate(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	assetID := testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "To Stop")

	payload := map[string]interface{}{}

	resp := ts.Request("POST", "/api/v2/assets/"+assetID+"/stop").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

func TestV2Assets_BulkDelete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create multiple fixtures
	testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "Asset 1")
	testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "Asset 2")
	testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "Asset 3")

	// Verify they exist
	resp := ts.Request("GET", "/api/v2/assets").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)
	require.Len(t, result["data"].([]interface{}), 3)

	// Bulk delete
	resp = ts.Request("DELETE", "/api/v2/assets").
		WithDefaultAuth().
		Do(t)

	testutil.AssertOK(t, resp, nil)

	// Verify all deleted
	resp = ts.Request("GET", "/api/v2/assets").
		WithDefaultAuth().
		Do(t)

	testutil.AssertOK(t, resp, &result)
	require.Empty(t, result["data"].([]interface{}))
}
