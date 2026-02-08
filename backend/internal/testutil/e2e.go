//go:build e2e
// +build e2e

package testutil

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"financial-chat-system/backend/cmd/server/routes"
	"financial-chat-system/backend/internal/financial_v2/repository"
	timeline_v2 "financial-chat-system/backend/internal/financial_v2/timeline"
	"financial-chat-system/backend/internal/middleware"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// E2ETestUserID is a consistent user ID for E2E tests.
const E2ETestUserID = "e2e-test-user-00000000-0000-0001"

// TestServer wraps httptest.Server with dependencies for E2E testing.
type TestServer struct {
	Server  *httptest.Server
	Router  *mux.Router
	Store   *repository.Store
	Pool    *pgxpool.Pool
	UserID  string
	cleanup func()
}

// NewTestServer creates a test server with real database for E2E tests.
func NewTestServer(t *testing.T) *TestServer {
	t.Helper()

	// Set environment for dev mode (allows unverified tokens)
	os.Setenv("GO_ENV", "development")
	os.Setenv("BACKEND_SHARED_SECRET", "e2e-test-secret-key-12345")

	pool := GetTestPool(t)
	store := repository.NewStore(pool)
	timelineService := timeline_v2.NewService(store)

	router := mux.NewRouter()

	// Apply middleware chain (same as production)
	router.Use(middleware.CORS)
	router.Use(middleware.RequestID)
	router.Use(middleware.Logging)
	router.Use(middleware.Authenticate)
	router.Use(middleware.RequireAuth)

	// Register V2 routes
	routes.RegisterV2Routes(router.PathPrefix("/api/v2").Subrouter(), routes.V2Dependencies{
		FinStore:        store,
		TimelineService: timelineService,
	})

	server := httptest.NewServer(router)

	ts := &TestServer{
		Server: server,
		Router: router,
		Store:  store,
		Pool:   pool,
		UserID: E2ETestUserID,
		cleanup: func() {
			server.Close()
			CleanupAllTables(context.Background(), pool)
		},
	}

	// Register cleanup
	t.Cleanup(ts.cleanup)

	// Clean tables before test starts
	CleanupAllTables(context.Background(), pool)

	return ts
}

// Request creates a new RequestBuilder for the given method and path.
func (ts *TestServer) Request(method, path string) *RequestBuilder {
	return &RequestBuilder{
		t:       nil, // Set in Build()
		method:  method,
		url:     ts.Server.URL + path,
		headers: make(map[string]string),
		userID:  ts.UserID,
	}
}

// CleanupAllTables truncates all financial tables for test isolation.
func CleanupAllTables(ctx context.Context, pool *pgxpool.Pool) error {
	// Order matters due to foreign key constraints
	tables := []string{
		// Property planner tables (order matters for FK constraints)
		"liability_rate_periods",
		"growth_periods",
		"property_fees",
		"property_sg_grants",
		"property_sg",
		"property_scenarios",
		// Scenario events
		"scenario_events",
		// Insurance tables
		"insurance_policies",
		"coverage_control_points",
		"coverage_guidelines",
		// Financial tables
		"income_allocations",
		"finance_expenses",
		"finance_incomes",
		"finance_liabilities",
		"finance_assets",
		"finance_investments",
		"finance_cash_accounts",
		"cpf_accounts",
		"persons",
	}

	for _, table := range tables {
		// Use DELETE instead of TRUNCATE to avoid permission issues
		if _, err := pool.Exec(ctx, "DELETE FROM "+table); err != nil {
			// Continue on error - table might not exist
			continue
		}
	}
	return nil
}

// RequestBuilder provides a fluent API for building HTTP requests.
type RequestBuilder struct {
	t       *testing.T
	method  string
	url     string
	body    interface{}
	headers map[string]string
	userID  string
}

// WithAuth adds the auth token header for the given userID.
func (rb *RequestBuilder) WithAuth(userID string) *RequestBuilder {
	rb.userID = userID
	return rb
}

// WithDefaultAuth adds the default test user auth token.
func (rb *RequestBuilder) WithDefaultAuth() *RequestBuilder {
	rb.userID = E2ETestUserID
	return rb
}

// WithoutAuth removes authentication (for testing 401 responses).
func (rb *RequestBuilder) WithoutAuth() *RequestBuilder {
	rb.userID = ""
	return rb
}

// WithJSON sets the JSON body.
func (rb *RequestBuilder) WithJSON(body interface{}) *RequestBuilder {
	rb.body = body
	rb.headers["Content-Type"] = "application/json"
	return rb
}

// WithHeader adds a custom header.
func (rb *RequestBuilder) WithHeader(key, value string) *RequestBuilder {
	rb.headers[key] = value
	return rb
}

// Do executes the request and returns the response.
func (rb *RequestBuilder) Do(t *testing.T) *http.Response {
	t.Helper()
	rb.t = t

	var bodyReader io.Reader
	if rb.body != nil {
		jsonBytes, err := json.Marshal(rb.body)
		require.NoError(t, err, "failed to marshal request body")
		bodyReader = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequest(rb.method, rb.url, bodyReader)
	require.NoError(t, err, "failed to create request")

	for k, v := range rb.headers {
		req.Header.Set(k, v)
	}

	// Add auth token if userID is set
	if rb.userID != "" {
		token, err := GenerateTestToken(rb.userID)
		require.NoError(t, err, "failed to generate test token")
		req.Header.Set("X-Auth-Token", token)
	}

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err, "failed to execute request")

	return resp
}

// GenerateTestToken creates a valid JWT for testing.
func GenerateTestToken(userID string) (string, error) {
	secret := os.Getenv("BACKEND_SHARED_SECRET")
	if secret == "" {
		secret = "e2e-test-secret-key-12345"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(1 * time.Hour).Unix(),
	})

	return token.SignedString([]byte(secret))
}

// Response assertion helpers

// AssertStatus asserts the response status code.
func AssertStatus(t *testing.T, resp *http.Response, expected int) {
	t.Helper()
	require.Equal(t, expected, resp.StatusCode,
		"expected status %d, got %d", expected, resp.StatusCode)
}

// AssertJSON decodes response body into target and asserts success.
func AssertJSON(t *testing.T, resp *http.Response, target interface{}) {
	t.Helper()
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err, "failed to read response body")

	err = json.Unmarshal(body, target)
	require.NoError(t, err, "failed to decode JSON response: %s", string(body))
}

// AssertOK asserts 200 OK and decodes JSON.
func AssertOK(t *testing.T, resp *http.Response, target interface{}) {
	t.Helper()
	AssertStatus(t, resp, http.StatusOK)
	if target != nil {
		AssertJSON(t, resp, target)
	}
}

// AssertCreated asserts 201 Created and decodes JSON.
func AssertCreated(t *testing.T, resp *http.Response, target interface{}) {
	t.Helper()
	AssertStatus(t, resp, http.StatusCreated)
	if target != nil {
		AssertJSON(t, resp, target)
	}
}

// AssertNoContent asserts 204 No Content.
func AssertNoContent(t *testing.T, resp *http.Response) {
	t.Helper()
	AssertStatus(t, resp, http.StatusNoContent)
}

// AssertNotFound asserts 404 Not Found.
func AssertNotFound(t *testing.T, resp *http.Response) {
	t.Helper()
	AssertStatus(t, resp, http.StatusNotFound)
}

// AssertBadRequest asserts 400 Bad Request.
func AssertBadRequest(t *testing.T, resp *http.Response) {
	t.Helper()
	AssertStatus(t, resp, http.StatusBadRequest)
}

// AssertUnauthorized asserts 401 Unauthorized.
func AssertUnauthorized(t *testing.T, resp *http.Response) {
	t.Helper()
	AssertStatus(t, resp, http.StatusUnauthorized)
}

// AssertBodyContains asserts the response body contains the given string.
func AssertBodyContains(t *testing.T, resp *http.Response, substring string) {
	t.Helper()
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err, "failed to read response body")
	require.Contains(t, string(body), substring)
}
