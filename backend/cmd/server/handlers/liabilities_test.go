package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/middleware"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
)

func TestCreateLiability_WithoutEndDate(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := repository.NewStore(db)
	handler := NewLiabilityHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	now := time.Now()

	// Create liability without end_date (revolving debt like credit card)
	liabilityRows := sqlmock.NewRows([]string{
		"id", "parent_id", "name", "category", "current_balance",
		"interest_rate_apr", "minimum_payment", "start_date", "end_date",
		"notes", "repayment_strategy", "repayment_metadata", "updated_at",
	}).AddRow(
		"liability-1", "liability-1", "Credit Card", "debt", 5000.0,
		19.99, 100.0, now, nil, // end_date is NULL
		"", "standard_amortization", nil, now,
	)

	mock.ExpectQuery(`INSERT INTO finance_liabilities`).
		WillReturnRows(liabilityRows)

	payload := map[string]interface{}{
		"name":            "Credit Card",
		"category":        "debt",
		"currentBalance":  5000.0,
		"interestRateApr": 19.99,
		"minimumPayment":  100.0,
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/liabilities", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := middleware.WithUserContext(req.Context(), middleware.UserContext{UserID: "test-user"})
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())

	// Verify response
	var response repository.Liability
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)
	require.Equal(t, "liability-1", response.ID)
	require.Nil(t, response.EndDate)
}

func TestCreateLiability_RepaymentMetadataNil(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := repository.NewStore(db)
	handler := NewLiabilityHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	startDate, err := time.Parse(time.RFC3339, "2025-12-14T03:19:12.118Z")
	require.NoError(t, err)

	liabilityRows := sqlmock.NewRows([]string{
		"id", "parent_id", "name", "category", "current_balance",
		"interest_rate_apr", "minimum_payment", "start_date", "end_date",
		"notes", "repayment_strategy", "repayment_metadata", "updated_at",
	}).AddRow(
		"liability-cc", "liability-cc", "Credit Card", "Credit Card", 800.0,
		26.0, 50.0, startDate, nil,
		"Paid in full monthly, revolving for cashback", "standard_amortization", nil, startDate,
	)

	mock.ExpectQuery(`INSERT INTO finance_liabilities`).
		WithArgs(
			"test-user",
			nil, // parent_id
			"Credit Card",
			"Credit Card",
			800.0,
			26.0,
			50.0,
			startDate,
			nil, // end_date
			"Paid in full monthly, revolving for cashback",
			"standard_amortization",
			nil, // repayment_metadata should be NULL when omitted
		).
		WillReturnRows(liabilityRows)

	payload := map[string]interface{}{
		"name":            "Credit Card",
		"category":        "Credit Card",
		"currentBalance":  800.0,
		"interestRateApr": 26.0,
		"minimumPayment":  50.0,
		"notes":           "Paid in full monthly, revolving for cashback",
		"startDate":       "2025-12-14T03:19:12.118Z",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/liabilities", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := middleware.WithUserContext(req.Context(), middleware.UserContext{UserID: "test-user"})
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())

	var response repository.Liability
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)
	require.Equal(t, "liability-cc", response.ID)
	require.Nil(t, response.RepaymentMetadata)
}

func TestCreateLiability_WithEndDate(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := repository.NewStore(db)
	handler := NewLiabilityHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC) // 5 years = 60 months

	// Create liability with end_date (mortgage or fixed-term loan)
	// Note: No auto-expense creation expected - repayments are computed on-the-fly
	liabilityRows := sqlmock.NewRows([]string{
		"id", "parent_id", "name", "category", "current_balance",
		"interest_rate_apr", "minimum_payment", "start_date", "end_date",
		"notes", "repayment_strategy", "repayment_metadata", "updated_at",
	}).AddRow(
		"liability-2", "liability-2", "Car Loan", "debt", 30000.0,
		5.0, 500.0, startDate, endDate,
		"", "standard_amortization", nil, startDate,
	)

	mock.ExpectQuery(`INSERT INTO finance_liabilities`).
		WillReturnRows(liabilityRows)

	// No expense creation expected - repayments are computed on-the-fly in timeline service

	payload := map[string]interface{}{
		"name":            "Car Loan",
		"category":        "debt",
		"currentBalance":  30000.0,
		"interestRateApr": 5.0,
		"minimumPayment":  500.0,
		"startDate":       startDate.Format(time.RFC3339),
		"endDate":         endDate.Format(time.RFC3339),
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/liabilities", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := middleware.WithUserContext(req.Context(), middleware.UserContext{UserID: "test-user"})
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())

	// Verify response
	var response repository.Liability
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)
	require.Equal(t, "liability-2", response.ID)
	require.NotNil(t, response.EndDate)
}

func TestCreateLiability_WithRepaymentStrategy(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := repository.NewStore(db)
	handler := NewLiabilityHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2055, 1, 1, 0, 0, 0, 0, time.UTC) // 30 years

	// Create liability with custom repayment strategy
	metadataJSON := []byte(`{"extra_payment": 500}`)
	liabilityRows := sqlmock.NewRows([]string{
		"id", "parent_id", "name", "category", "current_balance",
		"interest_rate_apr", "minimum_payment", "start_date", "end_date",
		"notes", "repayment_strategy", "repayment_metadata", "updated_at",
	}).AddRow(
		"liability-3", "liability-3", "Home Mortgage", "mortgage_home", 400000.0,
		4.5, 2000.0, startDate, endDate,
		"", "extra_payment", metadataJSON, startDate,
	)

	mock.ExpectQuery(`INSERT INTO finance_liabilities`).
		WillReturnRows(liabilityRows)

	payload := map[string]interface{}{
		"name":              "Home Mortgage",
		"category":          "mortgage_home",
		"currentBalance":    400000.0,
		"interestRateApr":   4.5,
		"minimumPayment":    2000.0,
		"startDate":         startDate.Format(time.RFC3339),
		"endDate":           endDate.Format(time.RFC3339),
		"repaymentStrategy": "extra_payment",
		"repaymentMetadata": map[string]interface{}{
			"extra_payment": 500,
		},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/liabilities", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := middleware.WithUserContext(req.Context(), middleware.UserContext{UserID: "test-user"})
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())

	// Verify response includes repayment strategy
	var response repository.Liability
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)
	require.Equal(t, "liability-3", response.ID)
	require.Equal(t, "extra_payment", response.RepaymentStrategy)
	require.NotNil(t, response.RepaymentMetadata)
}
