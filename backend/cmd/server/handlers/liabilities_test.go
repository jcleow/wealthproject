package handlers

import (
	"bytes"
	"database/sql"
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

	startDate := time.Date(2025, time.January, 15, 10, 0, 0, 0, time.UTC)
	monthStart := time.Date(2025, time.January, 1, 0, 0, 0, 0, time.UTC)

	// Create liability without end_date (revolving debt like credit card)
	liabilityRows := sqlmock.NewRows([]string{
		"id", "parent_id", "name", "category", "current_balance",
		"interest_rate_apr", "minimum_payment", "start_date", "end_date",
		"notes", "repayment_strategy", "updated_at",
	}).AddRow(
		"liability-1", "liability-1", "Credit Card", "debt", 5000.0,
		19.99, 100.0, startDate, nil, // end_date is NULL
		"", "standard_amortization", startDate,
	)

	mock.ExpectQuery(`INSERT INTO finance_liabilities`).
		WithArgs(
			"test-user",
			nil, // parent_id
			"Credit Card",
			"debt",
			5000.0,
			19.99,
			100.0,
			startDate,
			nil, // end_date
			"",  // notes
			"standard_amortization",
		).
		WillReturnRows(liabilityRows)

	mock.ExpectQuery(`(?s)SELECT .*FROM finance_expenses`).
		WithArgs(
			"test-user",
			"liability-1",
		).
		WillReturnError(sql.ErrNoRows)

	expenseRows := sqlmock.NewRows([]string{
		"id", "parent_id", "payee", "amount", "frequency", "start_date", "end_date", "category", "growth_rate", "growth_strategy", "notes", "updated_at", "source_liability_id",
	}).AddRow(
		"expense-1", "expense-1", "Credit Card", 100.0, "monthly", monthStart, nil, "Debt Payment", 0.0, "annual_step", "Auto-generated payment for Credit Card", startDate, "liability-1",
	)

	mock.ExpectQuery(`INSERT INTO finance_expenses`).
		WithArgs(
			"test-user",
			nil, // parent_id
			"Credit Card",
			100.0,
			"monthly",
			monthStart,
			nil, // end_date
			"Debt Payment",
			0.0, // growth_rate
			"annual_step",
			"Auto-generated payment for Credit Card",
			"liability-1",
		).
		WillReturnRows(expenseRows)

	payload := map[string]interface{}{
		"name":            "Credit Card",
		"category":        "debt",
		"currentBalance":  5000.0,
		"interestRateApr": 19.99,
		"minimumPayment":  100.0,
		"startDate":       startDate.Format(time.RFC3339),
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

func TestCreateLiability_WithNotes(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := repository.NewStore(db)
	handler := NewLiabilityHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	startDate, err := time.Parse(time.RFC3339, "2025-12-14T03:19:12.118Z")
	require.NoError(t, err)
	monthStart := time.Date(2025, time.December, 1, 0, 0, 0, 0, time.UTC)

	liabilityRows := sqlmock.NewRows([]string{
		"id", "parent_id", "name", "category", "current_balance",
		"interest_rate_apr", "minimum_payment", "start_date", "end_date",
		"notes", "repayment_strategy", "updated_at",
	}).AddRow(
		"liability-cc", "liability-cc", "Credit Card", "Credit Card", 800.0,
		26.0, 50.0, startDate, nil,
		"Paid in full monthly, revolving for cashback", "standard_amortization", startDate,
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
		).
		WillReturnRows(liabilityRows)

	mock.ExpectQuery(`(?s)SELECT .*FROM finance_expenses`).
		WithArgs(
			"test-user",
			"liability-cc",
		).
		WillReturnError(sql.ErrNoRows)

	expenseRows := sqlmock.NewRows([]string{
		"id", "parent_id", "payee", "amount", "frequency", "start_date", "end_date", "category", "growth_rate", "growth_strategy", "notes", "updated_at", "source_liability_id",
	}).AddRow(
		"expense-cc", "expense-cc", "Credit Card", 50.0, "monthly", monthStart, nil, "Debt Payment", 0.0, "annual_step", "Auto-generated payment for Credit Card", startDate, "liability-cc",
	)

	mock.ExpectQuery(`INSERT INTO finance_expenses`).
		WithArgs(
			"test-user",
			nil, // parent_id
			"Credit Card",
			50.0,
			"monthly",
			monthStart,
			nil, // end_date
			"Debt Payment",
			0.0, // growth_rate
			"annual_step",
			"Auto-generated payment for Credit Card",
			"liability-cc",
		).
		WillReturnRows(expenseRows)

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
	require.Equal(t, "Paid in full monthly, revolving for cashback", response.Notes)
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
	monthStart := time.Date(2025, time.January, 1, 0, 0, 0, 0, time.UTC)

	// Create liability with end_date (mortgage or fixed-term loan)
	liabilityRows := sqlmock.NewRows([]string{
		"id", "parent_id", "name", "category", "current_balance",
		"interest_rate_apr", "minimum_payment", "start_date", "end_date",
		"notes", "repayment_strategy", "updated_at",
	}).AddRow(
		"liability-2", "liability-2", "Car Loan", "debt", 30000.0,
		5.0, 500.0, startDate, endDate,
		"", "standard_amortization", startDate,
	)

	mock.ExpectQuery(`INSERT INTO finance_liabilities`).
		WithArgs(
			"test-user",
			nil, // parent_id
			"Car Loan",
			"debt",
			30000.0,
			5.0,
			500.0,
			startDate,
			endDate,
			"", // notes
			"standard_amortization",
		).
		WillReturnRows(liabilityRows)

	mock.ExpectQuery(`(?s)SELECT .*FROM finance_expenses`).
		WithArgs(
			"test-user",
			"liability-2",
		).
		WillReturnError(sql.ErrNoRows)

	expenseRows := sqlmock.NewRows([]string{
		"id", "parent_id", "payee", "amount", "frequency", "start_date", "end_date", "category", "growth_rate", "growth_strategy", "notes", "updated_at", "source_liability_id",
	}).AddRow(
		"expense-2", "expense-2", "Car Loan", 500.0, "monthly", monthStart, endDate, "Debt Payment", 0.0, "annual_step", "Auto-generated payment for Car Loan", startDate, "liability-2",
	)

	mock.ExpectQuery(`INSERT INTO finance_expenses`).
		WithArgs(
			"test-user",
			nil, // parent_id
			"Car Loan",
			500.0,
			"monthly",
			monthStart,
			endDate,
			"Debt Payment",
			0.0, // growth_rate
			"annual_step",
			"Auto-generated payment for Car Loan",
			"liability-2",
		).
		WillReturnRows(expenseRows)

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
	monthStart := time.Date(2025, time.January, 1, 0, 0, 0, 0, time.UTC)

	// Create liability with custom repayment strategy
	liabilityRows := sqlmock.NewRows([]string{
		"id", "parent_id", "name", "category", "current_balance",
		"interest_rate_apr", "minimum_payment", "start_date", "end_date",
		"notes", "repayment_strategy", "updated_at",
	}).AddRow(
		"liability-3", "liability-3", "Home Mortgage", "mortgage_home", 400000.0,
		4.5, 2000.0, startDate, endDate,
		"", "extra_payment", startDate,
	)

	mock.ExpectQuery(`INSERT INTO finance_liabilities`).
		WithArgs(
			"test-user",
			nil, // parent_id
			"Home Mortgage",
			"mortgage_home",
			400000.0,
			4.5,
			2000.0,
			startDate,
			endDate,
			"", // notes
			"extra_payment",
		).
		WillReturnRows(liabilityRows)

	mock.ExpectQuery(`(?s)SELECT .*FROM finance_expenses`).
		WithArgs(
			"test-user",
			"liability-3",
		).
		WillReturnError(sql.ErrNoRows)

	expenseRows := sqlmock.NewRows([]string{
		"id", "parent_id", "payee", "amount", "frequency", "start_date", "end_date", "category", "growth_rate", "growth_strategy", "notes", "updated_at", "source_liability_id",
	}).AddRow(
		"expense-3", "expense-3", "Home Mortgage", 2000.0, "monthly", monthStart, endDate, "Debt Payment", 0.0, "annual_step", "Auto-generated payment for Home Mortgage", startDate, "liability-3",
	)

	mock.ExpectQuery(`INSERT INTO finance_expenses`).
		WithArgs(
			"test-user",
			nil, // parent_id
			"Home Mortgage",
			2000.0,
			"monthly",
			monthStart,
			endDate,
			"Debt Payment",
			0.0, // growth_rate
			"annual_step",
			"Auto-generated payment for Home Mortgage",
			"liability-3",
		).
		WillReturnRows(expenseRows)

	payload := map[string]interface{}{
		"name":              "Home Mortgage",
		"category":          "mortgage_home",
		"currentBalance":    400000.0,
		"interestRateApr":   4.5,
		"minimumPayment":    2000.0,
		"startDate":         startDate.Format(time.RFC3339),
		"endDate":           endDate.Format(time.RFC3339),
		"repaymentStrategy": "extra_payment",
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
}
