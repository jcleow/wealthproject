//go:build e2e
// +build e2e

package e2e

import (
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

func TestV2CPF_Get_Empty(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/cpf/account").
		WithDefaultAuth().
		Do(t)

	// When no CPF account exists, API returns 404
	testutil.AssertNotFound(t, resp)
}

func TestV2CPF_Create_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"oaBalance":       "50000.00",
		"saBalance":       "30000.00",
		"maBalance":       "20000.00",
		"raBalance":       "0.00",
		"dateOfBirth":     "1990-01-15",
		"residencyStatus": "citizen",
		"startDate":       "2025-01-01",
	}

	resp := ts.Request("POST", "/api/v2/cpf/account").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertCreated(t, resp, &result)

	require.NotEmpty(t, result["id"])
	require.Equal(t, "citizen", result["residencyStatus"])
}

func TestV2CPF_Create_MissingDateOfBirth(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"oaBalance":       "50000.00",
		"saBalance":       "30000.00",
		"maBalance":       "20000.00",
		"residencyStatus": "citizen",
	}

	resp := ts.Request("POST", "/api/v2/cpf/account").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

func TestV2CPF_Create_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"oaBalance":       "50000.00",
		"dateOfBirth":     "1990-01-15T00:00:00Z",
		"residencyStatus": "citizen",
	}

	resp := ts.Request("POST", "/api/v2/cpf/account").
		WithoutAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}

func TestV2CPF_Update_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	cpfID := testutil.CreateCPFAccountFixture(t, ts.Pool, ts.UserID)

	payload := map[string]interface{}{
		"oaBalance":        "60000.00",
		"saBalance":        "35000.00",
		"maBalance":        "25000.00",
		"raBalance":        "0.00",
		"oaUsedForHousing": "0.00",
		"dateOfBirth":      "1990-01-15",
		"residencyStatus":  "citizen",
		"startDate":        "2025-01-01T00:00:00Z",
	}

	resp := ts.Request("PUT", "/api/v2/cpf/account/"+cpfID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result)
}

func TestV2CPF_Update_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"oaBalance":        "60000.00",
		"saBalance":        "35000.00",
		"maBalance":        "25000.00",
		"raBalance":        "0.00",
		"oaUsedForHousing": "0.00",
		"dateOfBirth":      "1990-01-15",
		"residencyStatus":  "citizen",
		"startDate":        "2025-01-01T00:00:00Z",
	}

	resp := ts.Request("PUT", "/api/v2/cpf/account/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2CPF_Delete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	cpfID := testutil.CreateCPFAccountFixture(t, ts.Pool, ts.UserID)

	resp := ts.Request("DELETE", "/api/v2/cpf/account/"+cpfID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNoContent(t, resp)
}

func TestV2CPF_Delete_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("DELETE", "/api/v2/cpf/account/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2CPF_Stop_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	cpfID := testutil.CreateCPFAccountFixture(t, ts.Pool, ts.UserID)

	payload := map[string]interface{}{
		"endDate": "2025-12-31T00:00:00Z",
	}

	resp := ts.Request("POST", "/api/v2/cpf/account/"+cpfID+"/stop").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotNil(t, result["endDate"])
}

func TestV2CPF_BulkDelete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	testutil.CreateCPFAccountFixture(t, ts.Pool, ts.UserID)

	// Bulk delete
	resp := ts.Request("DELETE", "/api/v2/cpf/accounts").
		WithDefaultAuth().
		Do(t)

	testutil.AssertNoContent(t, resp)
}

func TestV2CPF_Get_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/cpf/account").
		WithoutAuth().
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}
