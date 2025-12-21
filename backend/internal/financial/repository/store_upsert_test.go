package repository

import (
	"context"
	"database/sql/driver"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
)

func TestCreateFinancialRowsUpsertByParentAndStartDate(t *testing.T) {
	t.Parallel()

	now := time.Now()
	cases := []struct {
		name  string
		setup func(sqlmock.Sqlmock)

		pattern string
		columns []string
		values  []driver.Value
		args    int
		call    func(context.Context, *Store) error
	}{
		{
			name:    "asset",
			pattern: `(?s)INSERT INTO finance_assets .*ON CONFLICT ON CONSTRAINT finance_assets_parent_start_date_key DO UPDATE`,
			columns: []string{"id", "parent_id", "name", "category", "current_value", "growth_rate", "start_date", "end_date", "notes", "updated_at"},
			values:  []driver.Value{"row-asset", "asset-parent", "Cash", "asset_cash", 2000.0, 0.0, now, nil, "", now},
			args:    9,
			call: func(ctx context.Context, s *Store) error {
				_, err := s.CreateAsset(ctx, "test-user", Asset{
					ParentID:         "asset-parent",
					Name:             "Cash",
					Category:         "asset_cash",
					CurrentValue:     2000,
					AnnualGrowthRate: 0,
					StartDate:        now,
				})
				return err
			},
		},
		{
			name:    "liability",
			pattern: `(?s)INSERT INTO finance_liabilities .*ON CONFLICT ON CONSTRAINT finance_liabilities_parent_start_date_key DO UPDATE`,
			columns: []string{"id", "parent_id", "name", "category", "current_balance", "interest_rate_apr", "minimum_payment", "start_date", "end_date", "notes", "repayment_strategy", "updated_at"},
			values:  []driver.Value{"row-liability", "liability-parent", "Card", "debt", 1500.0, 19.99, 50.0, now, nil, "", "standard_amortization", now},
			args:    11, // user_id, parent_id, name, category, current_balance, interest_rate_apr, minimum_payment, start_date, end_date, notes, repayment_strategy
			call: func(ctx context.Context, s *Store) error {
				_, err := s.CreateLiability(ctx, "test-user", Liability{
					ParentID:        "liability-parent",
					Name:            "Card",
					Category:        "debt",
					CurrentBalance:  1500,
					InterestRateAPR: 19.99,
					MinimumPayment:  50,
					StartDate:       now,
				})
				return err
			},
		},
		{
			name:    "income",
			pattern: `(?s)INSERT INTO finance_incomes .*ON CONFLICT ON CONSTRAINT finance_incomes_parent_start_date_key DO UPDATE`,
			columns: []string{"id", "parent_id", "source", "amount", "frequency", "start_date", "end_date", "category", "growth_rate", "growth_strategy", "notes", "cpf_wage_type", "updated_at", "source_type", "source_id"},
			values:  []driver.Value{"row-income", "income-parent", "Salary", 8000.0, "monthly", now, nil, "employment", 3.0, "annual_step", "", "", now, nil, nil},
			args:    14, // user_id, parent_id, source, amount, frequency, start_date, end_date, category, growth_rate, growth_strategy, notes, cpf_wage_type, source_type, source_id
			call: func(ctx context.Context, s *Store) error {
				_, err := s.CreateIncome(ctx, "test-user", Income{
					ParentID:  "income-parent",
					Name:      "Salary",
					Amount:    8000,
					Frequency: "monthly",
					StartDate: now,
					Category:  "employment",
				})
				return err
			},
		},
		{
			name:    "expense",
			pattern: `(?s)INSERT INTO finance_expenses .*ON CONFLICT ON CONSTRAINT finance_expenses_parent_start_date_key DO UPDATE`,
			columns: []string{"id", "parent_id", "payee", "amount", "frequency", "start_date", "end_date", "category", "growth_rate", "growth_strategy", "notes", "updated_at", "source_liability_id"},
			values:  []driver.Value{"row-expense", "expense-parent", "Rent", 2500.0, "monthly", now, nil, "housing", 2.0, "annual_step", "", now, nil},
			args:    12, // user_id, parent_id, payee, amount, frequency, start_date, end_date, category, growth_rate, growth_strategy, notes, source_liability_id
			call: func(ctx context.Context, s *Store) error {
				_, err := s.CreateExpense(ctx, "test-user", Expense{
					ParentID:  "expense-parent",
					Name:      "Rent",
					Amount:    2500,
					Frequency: "monthly",
					StartDate: now,
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

			if tc.setup != nil {
				tc.setup(mock)
			}

			err = tc.call(context.Background(), store)
			require.NoError(t, err)
			require.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
