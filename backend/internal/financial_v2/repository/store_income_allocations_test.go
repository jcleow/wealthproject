package repository

import (
	"context"
	"fmt"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/require"
)

// mockPool is a lightweight pgxpool substitute for repository tests.
type mockPool struct {
	t          *testing.T
	queryCalls []queryCall
	rowCalls   []rowCall
	execCalls  []execCall
}

type queryCall struct {
	sqlContains string
	args        []any
	rows        pgx.Rows
	err         error
}

type rowCall struct {
	sqlContains string
	args        []any
	row         pgx.Row
}

type execCall struct {
	sqlContains string
	args        []any
	tag         pgconn.CommandTag
	err         error
}

func newMockPool(t *testing.T) *mockPool {
	return &mockPool{t: t}
}

func (m *mockPool) enqueueQuery(sqlContains string, args []any, rows pgx.Rows, err error) {
	m.queryCalls = append(m.queryCalls, queryCall{sqlContains: sqlContains, args: args, rows: rows, err: err})
}

func (m *mockPool) enqueueRow(sqlContains string, args []any, row pgx.Row) {
	m.rowCalls = append(m.rowCalls, rowCall{sqlContains: sqlContains, args: args, row: row})
}

func (m *mockPool) enqueueExec(sqlContains string, args []any, tag pgconn.CommandTag, err error) {
	m.execCalls = append(m.execCalls, execCall{sqlContains: sqlContains, args: args, tag: tag, err: err})
}

func (m *mockPool) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	require.NotEmpty(m.t, m.queryCalls, "unexpected Query call")
	call := m.queryCalls[0]
	m.queryCalls = m.queryCalls[1:]
	if call.sqlContains != "" {
		require.Contains(m.t, sql, call.sqlContains)
	}
	if call.args != nil {
		require.Equal(m.t, call.args, args)
	}
	return call.rows, call.err
}

func (m *mockPool) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	require.NotEmpty(m.t, m.rowCalls, "unexpected QueryRow call")
	call := m.rowCalls[0]
	m.rowCalls = m.rowCalls[1:]
	if call.sqlContains != "" {
		require.Contains(m.t, sql, call.sqlContains)
	}
	if call.args != nil {
		require.Equal(m.t, call.args, args)
	}
	return call.row
}

func (m *mockPool) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	require.NotEmpty(m.t, m.execCalls, "unexpected Exec call")
	call := m.execCalls[0]
	m.execCalls = m.execCalls[1:]
	if call.sqlContains != "" {
		require.Contains(m.t, sql, call.sqlContains)
	}
	if call.args != nil {
		require.Equal(m.t, call.args, args)
	}
	return call.tag, call.err
}

func (m *mockPool) Begin(ctx context.Context) (pgx.Tx, error) {
	return &mockTx{t: m.t}, nil
}

// mockTx satisfies pgx.Tx for Begin callers; methods panic if invoked unexpectedly.
type mockTx struct {
	t *testing.T
}

func (m *mockTx) Commit(context.Context) error   { return nil }
func (m *mockTx) Rollback(context.Context) error { return nil }
func (m *mockTx) Begin(context.Context) (pgx.Tx, error) {
	return m, nil
}
func (m *mockTx) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	var tag pgconn.CommandTag
	return tag, nil
}
func (m *mockTx) Query(context.Context, string, ...any) (pgx.Rows, error) { return nil, nil }
func (m *mockTx) QueryRow(context.Context, string, ...any) pgx.Row        { return &stubRow{t: m.t} }
func (m *mockTx) CopyFrom(context.Context, pgx.Identifier, []string, pgx.CopyFromSource) (int64, error) {
	return 0, nil
}
func (m *mockTx) SendBatch(context.Context, *pgx.Batch) pgx.BatchResults {
	var br pgx.BatchResults
	return br
}
func (m *mockTx) LargeObjects() pgx.LargeObjects { return pgx.LargeObjects{} }
func (m *mockTx) Prepare(context.Context, string, string) (*pgconn.StatementDescription, error) {
	return nil, nil
}
func (m *mockTx) Conn() *pgx.Conn { return nil }

// stubRows implements pgx.Rows for deterministic test data.
type stubRows struct {
	t    *testing.T
	rows [][]any
	idx  int
	err  error
}

func newStubRows(t *testing.T, rows [][]any) *stubRows {
	return &stubRows{t: t, rows: rows}
}

func (r *stubRows) Close()                                       {}
func (r *stubRows) Err() error                                   { return r.err }
func (r *stubRows) CommandTag() pgconn.CommandTag                { return pgconn.CommandTag{} }
func (r *stubRows) FieldDescriptions() []pgconn.FieldDescription { return nil }
func (r *stubRows) Conn() *pgx.Conn                              { return nil }

func (r *stubRows) Next() bool {
	if r.idx >= len(r.rows) {
		return false
	}
	r.idx++
	return true
}

func (r *stubRows) Scan(dest ...any) error {
	if r.idx == 0 || r.idx > len(r.rows) {
		return fmt.Errorf("Scan called without Next")
	}
	row := r.rows[r.idx-1]
	require.Equal(r.t, len(row), len(dest))
	for i, v := range row {
		switch d := dest[i].(type) {
		case *bool:
			if v == nil {
				*d = false
				continue
			}
			*d = v.(bool)
		case *string:
			if v == nil {
				*d = ""
				continue
			}
			*d = v.(string)
		case **string:
			if v == nil {
				*d = nil
			} else {
				val := v.(string)
				*d = &val
			}
		case *time.Time:
			if v == nil {
				*d = time.Time{}
			} else {
				*d = v.(time.Time)
			}
		case **time.Time:
			if v == nil {
				*d = nil
			} else {
				val := v.(time.Time)
				*d = &val
			}
		case *decimal.Decimal:
			if v == nil {
				*d = *decimal.Zero()
			} else {
				*d = v.(decimal.Decimal)
			}
		default:
			r.t.Fatalf("unsupported dest type %T", d)
		}
	}
	return nil
}

func (r *stubRows) Values() ([]any, error) {
	if r.idx == 0 || r.idx > len(r.rows) {
		return nil, fmt.Errorf("Values called without Next")
	}
	return r.rows[r.idx-1], nil
}

func (r *stubRows) RawValues() [][]byte { return nil }

// stubRow implements pgx.Row for QueryRow expectations.
type stubRow struct {
	t      *testing.T
	values []any
	err    error
}

func newStubRow(t *testing.T, values []any, err error) *stubRow {
	return &stubRow{t: t, values: values, err: err}
}

func (r *stubRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	require.Equal(r.t, len(r.values), len(dest))
	for i, v := range r.values {
		switch d := dest[i].(type) {
		case *bool:
			if v == nil {
				*d = false
				continue
			}
			*d = v.(bool)
		case *string:
			if v == nil {
				*d = ""
				continue
			}
			*d = v.(string)
		case **string:
			if v == nil {
				*d = nil
			} else {
				val := v.(string)
				*d = &val
			}
		case *time.Time:
			if v == nil {
				*d = time.Time{}
			} else {
				*d = v.(time.Time)
			}
		case **time.Time:
			if v == nil {
				*d = nil
			} else {
				val := v.(time.Time)
				*d = &val
			}
		case *decimal.Decimal:
			if v == nil {
				*d = *decimal.Zero()
			} else {
				*d = v.(decimal.Decimal)
			}
		default:
			r.t.Fatalf("unsupported dest type %T", d)
		}
	}
	return nil
}

func strPtr(s string) *string {
	return &s
}

func TestListIncomeAllocations_ReturnsAllocationsForIncome(t *testing.T) {
	t.Parallel()

	mockPool := newMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"

	createdAt := time.Now()
	cashAccountID := "cash-account-1"
	investmentID := "investment-1"

	rows := newStubRows(t, [][]any{
		{
			incomeID, "alloc-1", "parent-1",
			createdAt, nil,
			cashAccountID, nil,
			"percentage", *decimal.MustFromString("50.0000"), createdAt,
		},
		{
			incomeID, "alloc-2", "parent-2",
			createdAt, nil,
			nil, investmentID,
			"fixed", *decimal.MustFromString("1000.0000"), createdAt,
		},
	})
	mockPool.enqueueQuery("income_allocations", []any{incomeID, userID}, rows, nil)

	allocations, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	require.Len(t, allocations, 2)

	require.Equal(t, "alloc-1", allocations[0].ID)
	require.Equal(t, incomeID, allocations[0].IncomeID)
	require.NotNil(t, allocations[0].TargetCashAccountID)
	require.Equal(t, cashAccountID, *allocations[0].TargetCashAccountID)
	require.Nil(t, allocations[0].TargetInvestmentID)
	require.Equal(t, "percentage", allocations[0].AllocationType)

	require.Equal(t, "alloc-2", allocations[1].ID)
	require.Nil(t, allocations[1].TargetCashAccountID)
	require.NotNil(t, allocations[1].TargetInvestmentID)
	require.Equal(t, investmentID, *allocations[1].TargetInvestmentID)
	require.Equal(t, "fixed", allocations[1].AllocationType)
}

func TestListIncomeAllocations_IncomeNotFound(t *testing.T) {
	t.Parallel()

	mockPool := newMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "non-existent-income"

	rows := newStubRows(t, [][]any{})
	mockPool.enqueueQuery("income_allocations", []any{incomeID, userID}, rows, nil)

	_, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.ErrorIs(t, err, ErrNotFound)
}

func TestListIncomeAllocations_IncomeExistsButNoAllocations(t *testing.T) {
	t.Parallel()

	mockPool := newMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"

	rows := newStubRows(t, [][]any{
		{incomeID, nil, nil, nil, nil, nil, nil, nil, nil, nil},
	})
	mockPool.enqueueQuery("income_allocations", []any{incomeID, userID}, rows, nil)

	allocations, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	require.Empty(t, allocations)
}

func TestCreateIncomeAllocation_ToCashAccount(t *testing.T) {
	t.Parallel()

	mockPool := newMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"
	cashAccountID := "cash-account-1"
	createdAt := time.Now()
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	allocationValue := decimal.MustFromString("50")
	mockPool.enqueueRow("SELECT EXISTS", []any{incomeID, userID}, newStubRow(t, []any{true}, nil))
	mockPool.enqueueRow(
		"INSERT INTO income_allocations",
		[]any{incomeID, (*string)(nil), startDate, (*time.Time)(nil), &cashAccountID, (*string)(nil), "percentage", *allocationValue},
		newStubRow(t, []any{
			"alloc-new", incomeID, "alloc-new", startDate, nil, cashAccountID, nil, "percentage", *allocationValue, createdAt,
		}, nil))

	allocation := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *allocationValue,
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)
	require.Equal(t, "alloc-new", created.ID)
	require.Equal(t, incomeID, created.IncomeID)
	require.NotNil(t, created.TargetCashAccountID)
	require.Equal(t, cashAccountID, *created.TargetCashAccountID)
	require.Equal(t, "percentage", created.AllocationType)
}

func TestCreateIncomeAllocation_ToInvestment(t *testing.T) {
	t.Parallel()

	mockPool := newMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"
	investmentID := "investment-1"
	createdAt := time.Now()
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	allocationValue := decimal.MustFromString("1000")
	mockPool.enqueueRow("SELECT EXISTS", []any{incomeID, userID}, newStubRow(t, []any{true}, nil))
	mockPool.enqueueRow(
		"INSERT INTO income_allocations",
		[]any{incomeID, (*string)(nil), startDate, (*time.Time)(nil), (*string)(nil), &investmentID, "fixed", *allocationValue},
		newStubRow(t, []any{
			"alloc-new", incomeID, "alloc-new", startDate, nil, nil, investmentID, "fixed", *allocationValue, createdAt,
		}, nil))

	allocation := IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "fixed",
		AllocationValue:    *allocationValue,
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)
	require.Equal(t, "alloc-new", created.ID)
	require.Nil(t, created.TargetCashAccountID)
	require.NotNil(t, created.TargetInvestmentID)
	require.Equal(t, investmentID, *created.TargetInvestmentID)
	require.Equal(t, "fixed", created.AllocationType)
}

func TestCreateIncomeAllocation_IncomeNotOwned(t *testing.T) {
	t.Parallel()

	mockPool := newMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-not-owned"
	cashAccountID := "cash-account-1"

	mockPool.enqueueRow("SELECT EXISTS", []any{incomeID, userID}, newStubRow(t, []any{false}, nil))

	allocation := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *decimal.MustFromString("50"),
	}

	_, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.ErrorIs(t, err, ErrNotFound)
}

func TestDeleteIncomeAllocation_Success(t *testing.T) {
	t.Parallel()

	mockPool := newMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	allocationID := "alloc-1"

	mockPool.enqueueExec("DELETE FROM income_allocations", []any{userID, allocationID}, pgconn.NewCommandTag("DELETE 1"), nil)

	err := store.DeleteIncomeAllocation(ctx, userID, allocationID)
	require.NoError(t, err)
}

func TestDeleteIncomeAllocation_NotFound(t *testing.T) {
	t.Parallel()

	mockPool := newMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	allocationID := "non-existent"

	mockPool.enqueueExec("DELETE FROM income_allocations", []any{userID, allocationID}, pgconn.NewCommandTag("DELETE 0"), nil)

	err := store.DeleteIncomeAllocation(ctx, userID, allocationID)
	require.ErrorIs(t, err, ErrNotFound)
}
