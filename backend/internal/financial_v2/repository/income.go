package repository

import (
	"context"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
)

// GetIncome retrieves a single income by ID.
func (s *Store) GetIncome(ctx context.Context, userID, id string) (*Income, error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		COALESCE(earner, '') as earner,
		person_id,
		category,
		amount,
		frequency,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
		COALESCE(growth_rate, 0) as growth_rate,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at,
		COALESCE(income_type, 'other') as income_type,
		COALESCE(cpf_wage_type, '') as cpf_wage_type
	FROM finance_incomes
	WHERE user_id = $1 AND id = $2`

	logQuery(query, []any{userID, id})

	var i Income
	err := s.pool.QueryRow(ctx, query, userID, id).Scan(
		&i.ID, &i.ParentID, &i.Name, &i.Earner, &i.PersonID, &i.Category, &i.Amount,
		&i.Frequency, &i.StartDate, &i.EndDate, &i.Notes,
		&i.GrowthRate, &i.GrowthStrategy, &i.UpdatedAt,
		&i.IncomeType, &i.CPFWageType,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get income: %w", err)
	}

	return &i, nil
}

// UpdateIncome updates an existing income record.
func (s *Store) UpdateIncome(ctx context.Context, userID string, inc Income) (*Income, error) {
	query := `
	UPDATE finance_incomes
	SET name = $3,
	    earner = COALESCE(NULLIF($4, ''), earner),
	    person_id = $5,
	    category = $6,
	    amount = $7,
	    frequency = COALESCE(NULLIF($8, ''), frequency),
	    start_date = COALESCE($9, start_date),
	    end_date = $10,
	    notes = NULLIF($11, ''),
	    growth_rate = COALESCE($12, growth_rate),
	    growth_strategy = COALESCE(NULLIF($13, ''), growth_strategy),
	    updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, COALESCE(parent_id, id), name, COALESCE(earner, ''), person_id, category, amount, frequency, start_date, end_date, COALESCE(notes, ''), COALESCE(growth_rate, 0), COALESCE(growth_strategy, ''), updated_at, COALESCE(income_type, 'other'), COALESCE(cpf_wage_type, '')`

	var startDate *time.Time
	if !inc.StartDate.IsZero() {
		startDate = &inc.StartDate
	}

	var growthRate *decimal.Decimal
	zero := decimal.Zero()
	if inc.GrowthRate.Cmp(zero) != 0 {
		growthRate = &inc.GrowthRate
	}

	args := []any{
		userID, inc.ID, inc.Name, inc.Earner, inc.PersonID, inc.Category, inc.Amount,
		inc.Frequency, startDate, inc.EndDate, inc.Notes,
		growthRate, inc.GrowthStrategy,
	}

	logQuery(query, args)

	var updated Income
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&updated.ID, &updated.ParentID, &updated.Name, &updated.Earner, &updated.PersonID, &updated.Category, &updated.Amount,
		&updated.Frequency, &updated.StartDate, &updated.EndDate, &updated.Notes,
		&updated.GrowthRate, &updated.GrowthStrategy, &updated.UpdatedAt,
		&updated.IncomeType, &updated.CPFWageType,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update income: %w", err)
	}

	return &updated, nil
}

// DeleteIncome deletes an income and all its descendant versions.
func (s *Store) DeleteIncome(ctx context.Context, userID, id string) error {
	// Delete the row AND all descendant rows recursively (any override chains)
	query := `
	WITH RECURSIVE descendants AS (
		SELECT id FROM finance_incomes WHERE user_id = $1 AND id = $2
		UNION ALL
		SELECT i.id FROM finance_incomes i
		INNER JOIN descendants d ON i.parent_id = d.id
		WHERE i.user_id = $1
	)
	DELETE FROM finance_incomes WHERE id IN (SELECT id FROM descendants)`

	logQuery(query, []any{userID, id})

	tag, err := s.pool.Exec(ctx, query, userID, id)
	if err != nil {
		return fmt.Errorf("failed to delete income: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// StopIncome sets the end_date on an income (soft delete).
// Children are NOT affected.
func (s *Store) StopIncome(ctx context.Context, userID, id string, endDate time.Time) (*Income, error) {
	query := `
	UPDATE finance_incomes
	SET end_date = $3, updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, COALESCE(parent_id, id), name, COALESCE(earner, ''), person_id, category, amount, frequency, start_date, end_date, COALESCE(notes, ''), COALESCE(growth_rate, 0), COALESCE(growth_strategy, ''), updated_at, COALESCE(income_type, 'other'), COALESCE(cpf_wage_type, '')`

	logQuery(query, []any{userID, id, endDate})

	var updated Income
	err := s.pool.QueryRow(ctx, query, userID, id, endDate).Scan(
		&updated.ID, &updated.ParentID, &updated.Name, &updated.Earner, &updated.PersonID, &updated.Category, &updated.Amount,
		&updated.Frequency, &updated.StartDate, &updated.EndDate, &updated.Notes,
		&updated.GrowthRate, &updated.GrowthStrategy, &updated.UpdatedAt,
		&updated.IncomeType, &updated.CPFWageType,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to stop income: %w", err)
	}

	return &updated, nil
}

// CreateIncome creates a new income record.
// Uses upsert to handle conflicts on (parent_id, start_date).
func (s *Store) CreateIncome(ctx context.Context, userID string, inc Income) (Income, error) {
	startDate := inc.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}

	// Default growth strategy if not provided
	growthStrategy := inc.GrowthStrategy
	if growthStrategy == "" {
		growthStrategy = "annual_step"
	}

	query := `
		INSERT INTO finance_incomes (user_id, parent_id, name, earner, person_id, category, amount, frequency, start_date, end_date, growth_rate, growth_strategy, notes, income_type, cpf_wage_type)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, $7, $8, $9, $10, $11, $12, NULLIF($13, ''), COALESCE(NULLIF($14, ''), 'other'), NULLIF($15, ''))
		ON CONFLICT ON CONSTRAINT finance_incomes_parent_start_date_key DO UPDATE
		SET name=EXCLUDED.name,
		    earner=EXCLUDED.earner,
		    person_id=EXCLUDED.person_id,
		    category=EXCLUDED.category,
		    amount=EXCLUDED.amount,
		    frequency=EXCLUDED.frequency,
		    end_date=EXCLUDED.end_date,
		    growth_rate=EXCLUDED.growth_rate,
		    growth_strategy=EXCLUDED.growth_strategy,
		    notes=EXCLUDED.notes,
		    income_type=EXCLUDED.income_type,
		    cpf_wage_type=EXCLUDED.cpf_wage_type,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), name, COALESCE(earner, ''), person_id, category, amount, frequency, start_date, end_date, COALESCE(growth_rate, 0), COALESCE(growth_strategy, ''), COALESCE(notes, ''), updated_at, COALESCE(income_type, 'other'), COALESCE(cpf_wage_type, '')`

	args := []any{
		userID, nullIfEmpty(inc.ParentID), inc.Name, inc.Earner, inc.PersonID, inc.Category, inc.Amount,
		inc.Frequency, startDate, inc.EndDate, inc.GrowthRate, growthStrategy,
		inc.Notes, inc.IncomeType, inc.CPFWageType,
	}

	logQuery(query, args)
	row := s.pool.QueryRow(ctx, query, args...)

	var created Income
	if err := row.Scan(
		&created.ID, &created.ParentID, &created.Name, &created.Earner, &created.PersonID, &created.Category, &created.Amount,
		&created.Frequency, &created.StartDate, &created.EndDate, &created.GrowthRate,
		&created.GrowthStrategy, &created.Notes, &created.UpdatedAt,
		&created.IncomeType, &created.CPFWageType,
	); err != nil {
		return Income{}, fmt.Errorf("failed to create income: %w", err)
	}

	return created, nil
}

// FindIncomeByParentAndStartDate finds an income version with the given parentID and startDate.
// Used for upsert logic in versioned updates.
func (s *Store) FindIncomeByParentAndStartDate(
	ctx context.Context,
	userID, parentID string,
	startDate time.Time,
) (*Income, error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		COALESCE(earner, '') as earner,
		person_id,
		category,
		amount,
		frequency,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
		COALESCE(growth_rate, 0) as growth_rate,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at,
		COALESCE(income_type, 'other') as income_type,
		COALESCE(cpf_wage_type, '') as cpf_wage_type
	FROM finance_incomes
	WHERE user_id = $1 AND parent_id = $2 AND DATE(start_date) = DATE($3)`

	logQuery(query, []any{userID, parentID, startDate})

	var i Income
	err := s.pool.QueryRow(ctx, query, userID, parentID, startDate).Scan(
		&i.ID, &i.ParentID, &i.Name, &i.Earner, &i.PersonID, &i.Category, &i.Amount,
		&i.Frequency, &i.StartDate, &i.EndDate, &i.Notes,
		&i.GrowthRate, &i.GrowthStrategy, &i.UpdatedAt,
		&i.IncomeType, &i.CPFWageType,
	)
	if err == pgx.ErrNoRows {
		return nil, nil // Not found, but not an error
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find income by parent and start date: %w", err)
	}

	return &i, nil
}
