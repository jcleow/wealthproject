package testutil

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

// MockPool is a lightweight pgxpool substitute for repository tests.
// It implements the PgxPool interface and allows enqueuing expected calls.
type MockPool struct {
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

// NewMockPool creates a new MockPool for testing.
func NewMockPool(t *testing.T) *MockPool {
	return &MockPool{t: t}
}

// EnqueueQuery adds an expected Query call with the given response.
func (m *MockPool) EnqueueQuery(sqlContains string, args []any, rows pgx.Rows, err error) {
	m.queryCalls = append(m.queryCalls, queryCall{sqlContains: sqlContains, args: args, rows: rows, err: err})
}

// EnqueueRow adds an expected QueryRow call with the given response.
func (m *MockPool) EnqueueRow(sqlContains string, args []any, row pgx.Row) {
	m.rowCalls = append(m.rowCalls, rowCall{sqlContains: sqlContains, args: args, row: row})
}

// EnqueueExec adds an expected Exec call with the given response.
func (m *MockPool) EnqueueExec(sqlContains string, args []any, tag pgconn.CommandTag, err error) {
	m.execCalls = append(m.execCalls, execCall{sqlContains: sqlContains, args: args, tag: tag, err: err})
}

func (m *MockPool) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
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

func (m *MockPool) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
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

func (m *MockPool) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
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

func (m *MockPool) Begin(ctx context.Context) (pgx.Tx, error) {
	return &MockTx{pool: m}, nil
}

// MockTx satisfies pgx.Tx for Begin callers; methods delegate to the parent pool
// so that enqueued expectations are consumed in the same order regardless of
// whether operations happen inside or outside a transaction.
type MockTx struct {
	pool *MockPool
}

func (m *MockTx) Commit(context.Context) error   { return nil }
func (m *MockTx) Rollback(context.Context) error { return nil }
func (m *MockTx) Begin(context.Context) (pgx.Tx, error) {
	return m, nil
}
func (m *MockTx) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	return m.pool.Exec(ctx, sql, args...)
}
func (m *MockTx) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	return m.pool.Query(ctx, sql, args...)
}
func (m *MockTx) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	return m.pool.QueryRow(ctx, sql, args...)
}
func (m *MockTx) CopyFrom(context.Context, pgx.Identifier, []string, pgx.CopyFromSource) (int64, error) {
	return 0, nil
}
func (m *MockTx) SendBatch(context.Context, *pgx.Batch) pgx.BatchResults {
	var br pgx.BatchResults
	return br
}
func (m *MockTx) LargeObjects() pgx.LargeObjects { return pgx.LargeObjects{} }
func (m *MockTx) Prepare(context.Context, string, string) (*pgconn.StatementDescription, error) {
	return nil, nil
}
func (m *MockTx) Conn() *pgx.Conn { return nil }

// StubRows implements pgx.Rows for deterministic test data.
type StubRows struct {
	t    *testing.T
	rows [][]any
	idx  int
	err  error
}

// NewStubRows creates a new StubRows with the given row data.
func NewStubRows(t *testing.T, rows [][]any) *StubRows {
	return &StubRows{t: t, rows: rows}
}

func (r *StubRows) Close()                                       {}
func (r *StubRows) Err() error                                   { return r.err }
func (r *StubRows) CommandTag() pgconn.CommandTag                { return pgconn.CommandTag{} }
func (r *StubRows) FieldDescriptions() []pgconn.FieldDescription { return nil }
func (r *StubRows) Conn() *pgx.Conn                              { return nil }

func (r *StubRows) Next() bool {
	if r.idx >= len(r.rows) {
		return false
	}
	r.idx++
	return true
}

func (r *StubRows) Scan(dest ...any) error {
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

func (r *StubRows) Values() ([]any, error) {
	if r.idx == 0 || r.idx > len(r.rows) {
		return nil, fmt.Errorf("Values called without Next")
	}
	return r.rows[r.idx-1], nil
}

func (r *StubRows) RawValues() [][]byte { return nil }

// StubRow implements pgx.Row for QueryRow expectations.
type StubRow struct {
	t      *testing.T
	values []any
	err    error
}

// NewStubRow creates a new StubRow with the given values.
func NewStubRow(t *testing.T, values []any, err error) *StubRow {
	return &StubRow{t: t, values: values, err: err}
}

func (r *StubRow) Scan(dest ...any) error {
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
		case *int:
			if v == nil {
				*d = 0
				continue
			}
			*d = v.(int)
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

// StrPtr is a helper to create a string pointer.
func StrPtr(s string) *string {
	return &s
}
