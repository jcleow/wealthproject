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

func TestAssetConvertToProperty(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := repository.NewStore(db)
	handler := NewAssetHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	rows := sqlmock.NewRows([]string{"id", "name", "category", "current_value", "annual_growth_rate", "notes", "updated_at"}).
		AddRow("a1", "Asset", "property", 1000.0, 0.05, "", time.Now())

	mock.ExpectQuery(`UPDATE finance_assets SET category='property'`).
		WithArgs(sqlmock.AnyArg(), "a1").
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodPut, "/assets/a1/convert-to-property", nil)
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
