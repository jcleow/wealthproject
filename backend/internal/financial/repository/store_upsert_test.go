package repository

import (
	"context"
	"database/sql/driver"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
)

func TestCreateFinancialRowsUpsertByParentAndYear(t *testing.T) {
	t.Parallel()

	now := time.Now()
	cases := []struct {
		name    string
		pattern string
		columns []string
		values  []driver.Value
		args    int
		call    func(context.Context, *Store) error
	}{
		{
			name:    "asset",
			pattern: `(?s)INSERT INTO finance_assets .*ON CONFLICT \(parent_id, start_year\) DO UPDATE`,
			columns: []string{"id", "parent_id", "name", "category", "current_value", "annual_growth_rate", "frequency", "start_year", "end_year", "notes", "updated_at"},
			values:  []driver.Value{"row-asset", "asset-parent", "Cash", "asset_cash", 2000.0, 0.0, "annual", 0, nil, "", now},
			args:    10,
			call: func(ctx context.Context, s *Store) error {
				_, err := s.CreateAsset(ctx, "test-user", Asset{
					ParentID:         "asset-parent",
					Name:             "Cash",
					Category:         "asset_cash",
					CurrentValue:     2000,
					AnnualGrowthRate: 0,
					Frequency:        "annual",
					StartYear:        0,
				})
				return err
			},
		},
		{
			name:    "liability",
			pattern: `(?s)INSERT INTO finance_liabilities .*ON CONFLICT \(parent_id, start_year\) DO UPDATE`,
			columns: []string{"id", "parent_id", "name", "category", "current_balance", "interest_rate_apr", "minimum_payment", "frequency", "start_year", "end_year", "notes", "updated_at"},
			values:  []driver.Value{"row-liability", "liability-parent", "Card", "debt", 1500.0, 19.99, 50.0, "monthly", 0, nil, "", now},
			args:    11,
			call: func(ctx context.Context, s *Store) error {
				_, err := s.CreateLiability(ctx, "test-user", Liability{
					ParentID:        "liability-parent",
					Name:            "Card",
					Category:        "debt",
					CurrentBalance:  1500,
					InterestRateAPR: 19.99,
					MinimumPayment:  50,
					Frequency:       "monthly",
					StartYear:       0,
				})
				return err
			},
		},
		{
			name:    "income",
			pattern: `(?s)INSERT INTO finance_incomes .*ON CONFLICT \(parent_id, start_year\) DO UPDATE`,
			columns: []string{"id", "parent_id", "source", "amount", "frequency", "start_year", "end_year", "start_date", "category", "growth_rate", "notes", "updated_at"},
			values:  []driver.Value{"row-income", "income-parent", "Salary", 8000.0, "monthly", 0, nil, now, "employment", 3.0, "", now},
			args:    11,
			call: func(ctx context.Context, s *Store) error {
				_, err := s.CreateIncome(ctx, "test-user", Income{
					ParentID:  "income-parent",
					Source:    "Salary",
					Amount:    8000,
					Frequency: "monthly",
					StartYear: 0,
					StartDate: now,
					Category:  "employment",
				})
				return err
			},
		},
		{
			name:    "expense",
			pattern: `(?s)INSERT INTO finance_expenses .*ON CONFLICT \(parent_id, start_year\) DO UPDATE`,
			columns: []string{"id", "parent_id", "payee", "amount", "frequency", "start_year", "end_year", "category", "growth_rate", "notes", "updated_at"},
			values:  []driver.Value{"row-expense", "expense-parent", "Rent", 2500.0, "monthly", 0, nil, "housing", 2.0, "", now},
			args:    10,
			call: func(ctx context.Context, s *Store) error {
				_, err := s.CreateExpense(ctx, "test-user", Expense{
					ParentID:  "expense-parent",
					Payee:     "Rent",
					Amount:    2500,
					Frequency: "monthly",
					StartYear: 0,
					Category:  "housing",
				})
				return err
			},
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			store := &Store{db: db}

			rows := sqlmock.NewRows(tc.columns).AddRow(tc.values...)
			args := make([]driver.Value, tc.args)
			for i := range args {
				args[i] = sqlmock.AnyArg()
			}

			mock.ExpectQuery(tc.pattern).
				WithArgs(args...).
				WillReturnRows(rows)

			err = tc.call(context.Background(), store)
			require.NoError(t, err)
			require.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
