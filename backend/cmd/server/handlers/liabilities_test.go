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

func TestCreateLiability_WithoutEndDate_NoAutoExpense(t *testing.T) {
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
		"notes", "updated_at",
	}).AddRow(
		"liability-1", "liability-1", "Credit Card", "debt", 5000.0,
		19.99, 100.0, now, nil, // end_date is NULL
		"", now,
	)

	mock.ExpectQuery(`INSERT INTO finance_liabilities`).
		WillReturnRows(liabilityRows)

	// No expense creation expected since end_date is nil

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

func TestCreateLiability_WithEndDate_CreatesAutoExpense(t *testing.T) {
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
	liabilityRows := sqlmock.NewRows([]string{
		"id", "parent_id", "name", "category", "current_balance",
		"interest_rate_apr", "minimum_payment", "start_date", "end_date",
		"notes", "updated_at",
	}).AddRow(
		"liability-2", "liability-2", "Car Loan", "debt", 30000.0,
		5.0, 500.0, startDate, endDate,
		"", startDate,
	)

	mock.ExpectQuery(`INSERT INTO finance_liabilities`).
		WillReturnRows(liabilityRows)

	// Expect auto-expense creation for loan repayment
	expenseRows := sqlmock.NewRows([]string{
		"id", "parent_id", "payee", "amount", "frequency",
		"start_date", "end_date", "category", "growth_rate", "growth_strategy",
		"notes", "source_liability_id", "updated_at",
	}).AddRow(
		"expense-1", "expense-1", "Car Loan", 566.14, "monthly", // approximate monthly payment
		startDate, endDate, "loan_repayment", 0.0, "fixed",
		"Auto-generated loan repayment for Car Loan", "liability-2", startDate,
	)

	mock.ExpectQuery(`INSERT INTO finance_expenses`).
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

func TestCalculateMonthlyPayment(t *testing.T) {
	tests := []struct {
		name       string
		principal  float64
		apr        float64
		months     int
		wantApprox float64
		tolerance  float64
	}{
		{
			name:       "zero interest loan",
			principal:  12000,
			apr:        0,
			months:     12,
			wantApprox: 1000, // 12000 / 12
			tolerance:  0.01,
		},
		{
			name:       "5% APR 60 month car loan",
			principal:  30000,
			apr:        5.0,
			months:     60,
			wantApprox: 566.14,
			tolerance:  0.50,
		},
		{
			name:       "4% APR 360 month mortgage",
			principal:  400000,
			apr:        4.0,
			months:     360,
			wantApprox: 1909.66,
			tolerance:  1.00,
		},
		{
			name:       "zero principal",
			principal:  0,
			apr:        5.0,
			months:     12,
			wantApprox: 0,
			tolerance:  0.01,
		},
		{
			name:       "zero months",
			principal:  10000,
			apr:        5.0,
			months:     0,
			wantApprox: 0,
			tolerance:  0.01,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateMonthlyPayment(tt.principal, tt.apr, tt.months)
			if got < tt.wantApprox-tt.tolerance || got > tt.wantApprox+tt.tolerance {
				t.Errorf("calculateMonthlyPayment(%v, %v, %v) = %v, want ~%v (tolerance %v)",
					tt.principal, tt.apr, tt.months, got, tt.wantApprox, tt.tolerance)
			}
		})
	}
}
