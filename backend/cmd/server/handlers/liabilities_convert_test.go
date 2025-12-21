package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/middleware"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestLiabilityConvertToProperty(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := repository.NewStore(db)
	handler := NewLiabilityHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	rows := sqlmock.NewRows([]string{"id", "name", "category", "current_balance", "interest_rate_apr", "minimum_payment", "notes", "updated_at"}).
		AddRow("l1", "Loan", "property", 5000.0, 0.04, 100.0, "", time.Now())

	mock.ExpectQuery(`UPDATE finance_liabilities SET category='property'`).
		WithArgs(sqlmock.AnyArg(), "l1").
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodPut, "/liabilities/l1/convert-to-property", nil)
	ctx := middleware.WithUserContext(req.Context(), middleware.UserContext{UserID: "test-user"})
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}
