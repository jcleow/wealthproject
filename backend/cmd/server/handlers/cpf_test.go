package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"financial-chat-system/backend/internal/cpf/account"
)

type stubCPFStore struct {
	deleted   bool
	deleteErr error
}

func (s *stubCPFStore) Get(_ context.Context, _ string) (*account.CPFAccount, error) {
	return nil, account.ErrNotFound
}

func (s *stubCPFStore) Upsert(_ context.Context, acc *account.CPFAccount) (*account.CPFAccount, error) {
	return acc, nil
}

func (s *stubCPFStore) Update(_ context.Context, _ string, acc *account.CPFAccount) (*account.CPFAccount, error) {
	return acc, nil
}

func (s *stubCPFStore) Delete(_ context.Context, _ string) error {
	s.deleted = true
	return s.deleteErr
}

func TestCPFHandler_DeleteAccount(t *testing.T) {
	store := &stubCPFStore{}
	handler := NewCPFHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := addAuthContext(httptest.NewRequest(http.MethodDelete, "/cpf/account", nil))
	rr := httptest.NewRecorder()

	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rr.Code)
	}
	if !store.deleted {
		t.Fatalf("expected delete to be invoked")
	}
}

func TestCPFHandler_DeleteAccount_NotFound(t *testing.T) {
	store := &stubCPFStore{deleteErr: account.ErrNotFound}
	handler := NewCPFHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := addAuthContext(httptest.NewRequest(http.MethodDelete, "/cpf/account", nil))
	rr := httptest.NewRecorder()

	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", rr.Code)
	}
	if !store.deleted {
		t.Fatalf("expected delete to be invoked")
	}
}

// Ensure the stub satisfies the interface during compile-time checks.
var _ cpfAccountStore = (*stubCPFStore)(nil)

// Silence unused imports warning in case helpers change.
var _ = time.Now
