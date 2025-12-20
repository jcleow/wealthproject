//go:build e2e
// +build e2e

package e2e

import (
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

func TestV2Timeline_Chart_Empty(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/financial/timeline/chart").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	// Should return empty data structure
	require.NotNil(t, result)
}

func TestV2Timeline_Chart_WithData(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create some financial data
	testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "House")
	testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")
	testutil.CreateExpenseFixture(t, ts.Pool, ts.UserID, "Rent")

	resp := ts.Request("GET", "/api/v2/financial/timeline/chart").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result)
}

func TestV2Timeline_Chart_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/financial/timeline/chart").
		WithoutAuth().
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}

func TestV2Timeline_Chart_WithResolution(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Test yearly resolution
	resp := ts.Request("GET", "/api/v2/financial/timeline/chart?resolution=yearly").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)
	require.NotNil(t, result)

	// Test monthly resolution
	resp = ts.Request("GET", "/api/v2/financial/timeline/chart?resolution=monthly").
		WithDefaultAuth().
		Do(t)

	testutil.AssertOK(t, resp, &result)
	require.NotNil(t, result)
}

func TestV2Timeline_Snapshot_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create some financial data
	testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "House")
	testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")

	resp := ts.Request("GET", "/api/v2/financial/timeline/snapshot?startDate=01-01-2025").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result)
}

func TestV2Timeline_Snapshot_MissingStartDate(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/financial/timeline/snapshot").
		WithDefaultAuth().
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

func TestV2Timeline_Snapshot_InvalidDateFormat(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Wrong format (should be DD-MM-YYYY)
	resp := ts.Request("GET", "/api/v2/financial/timeline/snapshot?startDate=2025-01-01").
		WithDefaultAuth().
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

func TestV2Timeline_Snapshot_WithEndDate(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/financial/timeline/snapshot?startDate=01-01-2025&endDate=31-12-2025").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result)
}

func TestV2Timeline_Snapshot_WithScenarios(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create financial data and a scenario
	testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Salary")
	testutil.CreateScenarioEventFixture(t, ts.Store, ts.UserID, "Promotion")

	// Without scenarios
	resp := ts.Request("GET", "/api/v2/financial/timeline/snapshot?startDate=01-01-2025&includeScenarios=false").
		WithDefaultAuth().
		Do(t)

	var resultWithout map[string]interface{}
	testutil.AssertOK(t, resp, &resultWithout)

	// With scenarios
	resp = ts.Request("GET", "/api/v2/financial/timeline/snapshot?startDate=01-01-2025&includeScenarios=true").
		WithDefaultAuth().
		Do(t)

	var resultWith map[string]interface{}
	testutil.AssertOK(t, resp, &resultWith)

	require.NotNil(t, resultWithout)
	require.NotNil(t, resultWith)
}

func TestV2Timeline_Snapshot_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/financial/timeline/snapshot?startDate=01-01-2025").
		WithoutAuth().
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}
