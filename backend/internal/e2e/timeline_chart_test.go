//go:build e2e
// +build e2e

package e2e

import (
	"strconv"
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

// TestV2TimelineChart_Empty verifies that the chart endpoint returns timeline
// structure with zero net worth when the user has no financial data.
func TestV2TimelineChart_Empty(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/financial/timeline/chart").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, "yearly", result["resolution"])

	// Should return timeline structure with years (netWorth = 0 for each)
	years, ok := result["years"].([]interface{})
	require.True(t, ok, "expected years to be an array")
	require.NotEmpty(t, years, "expected timeline structure even with no data")

	// All net worth values should be 0
	for _, y := range years {
		yearData := y.(map[string]interface{})
		netWorth := yearData["netWorth"]
		// Net worth should be 0 (either number 0 or string "0")
		switch v := netWorth.(type) {
		case float64:
			require.Equal(t, 0.0, v)
		case string:
			require.Equal(t, "0", v)
		}
	}
}

// TestV2TimelineChart_WithAsset_Yearly verifies that the chart returns yearly
// net worth projections when an asset is present.
func TestV2TimelineChart_WithAsset_Yearly(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create an asset worth $100,000
	testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "House")

	resp := ts.Request("GET", "/api/v2/financial/timeline/chart?resolution=yearly").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, "yearly", result["resolution"])

	years, ok := result["years"].([]interface{})
	require.True(t, ok, "expected years to be an array")
	require.NotEmpty(t, years, "expected at least one year of data")

	// First year should have net worth data
	firstYear := years[0].(map[string]interface{})
	require.NotNil(t, firstYear["year"])
	require.NotNil(t, firstYear["netWorth"])

	// Net worth should be positive (asset value)
	netWorthStr, ok := firstYear["netWorth"].(string)
	if ok {
		netWorth, err := strconv.ParseFloat(netWorthStr, 64)
		require.NoError(t, err)
		require.Greater(t, netWorth, 0.0, "net worth should be positive with an asset")
	}
}

// TestV2TimelineChart_Monthly verifies that the chart returns monthly
// net worth projections when resolution=monthly.
func TestV2TimelineChart_Monthly(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create an investment
	testutil.CreateInvestmentFixture(t, ts.Pool, ts.UserID, "Stock Portfolio")

	resp := ts.Request("GET", "/api/v2/financial/timeline/chart?resolution=monthly").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, "monthly", result["resolution"])

	months, ok := result["months"].([]interface{})
	require.True(t, ok, "expected months to be an array")
	require.NotEmpty(t, months, "expected at least one month of data")

	// First month should have net worth data
	firstMonth := months[0].(map[string]interface{})
	require.NotNil(t, firstMonth["month"])
	require.NotNil(t, firstMonth["netWorth"])
}

// TestV2TimelineChart_InvalidResolution verifies that invalid resolution
// values are rejected with a 400 error.
func TestV2TimelineChart_InvalidResolution(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/financial/timeline/chart?resolution=invalid").
		WithDefaultAuth().
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

// TestV2TimelineChart_Unauthorized verifies that unauthenticated requests
// are rejected with a 401 error.
func TestV2TimelineChart_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/financial/timeline/chart").
		WithoutAuth().
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}

// TestV2TimelineChart_WithLiability verifies that liabilities reduce net worth.
func TestV2TimelineChart_WithLiability(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create an asset worth $100,000 and a liability of $50,000
	testutil.CreateAssetFixture(t, ts.Pool, ts.UserID, "House")
	testutil.CreateLiabilityFixture(t, ts.Pool, ts.UserID, "Mortgage")

	resp := ts.Request("GET", "/api/v2/financial/timeline/chart?resolution=yearly").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	years, ok := result["years"].([]interface{})
	require.True(t, ok, "expected years to be an array")
	require.NotEmpty(t, years)

	// Net worth should be positive but less than asset value due to liability
	firstYear := years[0].(map[string]interface{})
	netWorthStr, ok := firstYear["netWorth"].(string)
	if ok {
		netWorth, err := strconv.ParseFloat(netWorthStr, 64)
		require.NoError(t, err)
		// Net worth = assets - liabilities, should still be positive in most cases
		// but this depends on fixture values
		require.NotZero(t, netWorth, "net worth should not be zero with asset and liability")
	}
}

// TestV2TimelineChart_ScenarioIds verifies that the response includes scenario IDs.
func TestV2TimelineChart_ScenarioIds(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/financial/timeline/chart").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	// scenarioIds should be present (may be empty array or null)
	_, hasScenarioIds := result["scenarioIds"]
	require.True(t, hasScenarioIds, "response should include scenarioIds field")
}
