package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// insurancePolicyColumns is the SELECT column list for insurance policy queries.
const insurancePolicyColumns = `
	ip.id, ip.user_id, ip.person_id, COALESCE(p.name, '') as person_name,
	ip.name, ip.category, ip.subcategory, ip.government_scheme,
	ip.coverage_amount, ip.death_benefit, ip.critical_illness_benefit,
	ip.tpd_benefit, ip.daily_hospital_cash, ip.payout_amount, ip.payout_frequency,
	ip.premium_amount, ip.premium_frequency, ip.start_date, ip.end_date,
	ip.renewal_date, ip.insurer_name, ip.policy_number, ip.linked_expense_id,
	ip.is_active, ip.notes, ip.created_at, ip.updated_at`

// scanInsurancePolicy scans a row into an InsurancePolicy struct.
func scanInsurancePolicy(row pgx.Row) (*InsurancePolicy, error) {
	var policy InsurancePolicy
	err := row.Scan(
		&policy.ID, &policy.UserID, &policy.PersonID, &policy.PersonName,
		&policy.Name, &policy.Category, &policy.Subcategory, &policy.GovernmentScheme,
		&policy.CoverageAmount, &policy.DeathBenefit, &policy.CriticalIllnessBenefit,
		&policy.TpdBenefit, &policy.DailyHospitalCash, &policy.PayoutAmount, &policy.PayoutFrequency,
		&policy.PremiumAmount, &policy.PremiumFrequency, &policy.StartDate, &policy.EndDate,
		&policy.RenewalDate, &policy.InsurerName, &policy.PolicyNumber, &policy.LinkedExpenseID,
		&policy.IsActive, &policy.Notes, &policy.CreatedAt, &policy.UpdatedAt,
	)
	return &policy, err
}

// ListInsurancePolicies retrieves all insurance policies for a user with optional person filter.
func (s *Store) ListInsurancePolicies(
	ctx context.Context,
	userID string,
	personID *string,
	pagination PaginationParams,
) (PaginatedResult[InsurancePolicy], error) {
	query := `SELECT ` + insurancePolicyColumns + `
	FROM insurance_policies ip
	LEFT JOIN persons p ON ip.person_id = p.id
	WHERE ip.user_id = $1`

	args := []any{userID}
	argIdx := 2

	if personID != nil {
		query += fmt.Sprintf(` AND ip.person_id = $%d`, argIdx)
		args = append(args, *personID)
		argIdx++
	}

	query += ` ORDER BY ip.created_at ASC`

	paginationSubQuery, _ := addPaginationQuery(pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if pagination.Limit != nil {
			args = append(args, *pagination.Limit)
		}
		if pagination.Offset != nil {
			args = append(args, *pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return PaginatedResult[InsurancePolicy]{}, fmt.Errorf("failed to list insurance policies: %w", err)
	}
	defer rows.Close()

	policies := []InsurancePolicy{}
	for rows.Next() {
		var policy InsurancePolicy
		if err := rows.Scan(
			&policy.ID, &policy.UserID, &policy.PersonID, &policy.PersonName,
			&policy.Name, &policy.Category, &policy.Subcategory, &policy.GovernmentScheme,
			&policy.CoverageAmount, &policy.DeathBenefit, &policy.CriticalIllnessBenefit,
			&policy.TpdBenefit, &policy.DailyHospitalCash, &policy.PayoutAmount, &policy.PayoutFrequency,
			&policy.PremiumAmount, &policy.PremiumFrequency, &policy.StartDate, &policy.EndDate,
			&policy.RenewalDate, &policy.InsurerName, &policy.PolicyNumber, &policy.LinkedExpenseID,
			&policy.IsActive, &policy.Notes, &policy.CreatedAt, &policy.UpdatedAt,
		); err != nil {
			return PaginatedResult[InsurancePolicy]{}, fmt.Errorf("failed to scan insurance policy: %w", err)
		}
		policies = append(policies, policy)
	}

	if err := rows.Err(); err != nil {
		return PaginatedResult[InsurancePolicy]{}, fmt.Errorf("rows iteration error: %w", err)
	}

	return PaginatedResult[InsurancePolicy]{
		Data:   policies,
		Count:  len(policies),
		Limit:  pagination.Limit,
		Offset: pagination.Offset,
	}, nil
}

// GetInsurancePolicy retrieves a single insurance policy by ID.
func (s *Store) GetInsurancePolicy(ctx context.Context, userID, id string) (*InsurancePolicy, error) {
	query := `SELECT ` + insurancePolicyColumns + `
	FROM insurance_policies ip
	LEFT JOIN persons p ON ip.person_id = p.id
	WHERE ip.user_id = $1 AND ip.id = $2`

	logQuery(query, []any{userID, id})

	policy, err := scanInsurancePolicy(s.pool.QueryRow(ctx, query, userID, id))
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get insurance policy: %w", err)
	}

	return policy, nil
}

// CreateInsurancePolicy creates a new insurance policy.
func (s *Store) CreateInsurancePolicy(ctx context.Context, userID string, policy InsurancePolicy) (*InsurancePolicy, error) {
	query := `
	INSERT INTO insurance_policies (
		user_id, person_id, name, category, subcategory, government_scheme,
		coverage_amount, death_benefit, critical_illness_benefit,
		tpd_benefit, daily_hospital_cash, payout_amount, payout_frequency,
		premium_amount, premium_frequency, start_date, end_date,
		renewal_date, insurer_name, policy_number, linked_expense_id,
		is_active, notes
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
	RETURNING ` + `id, user_id, person_id, '',
		name, category, subcategory, government_scheme,
		coverage_amount, death_benefit, critical_illness_benefit,
		tpd_benefit, daily_hospital_cash, payout_amount, payout_frequency,
		premium_amount, premium_frequency, start_date, end_date,
		renewal_date, insurer_name, policy_number, linked_expense_id,
		is_active, notes, created_at, updated_at`

	args := []any{
		userID, policy.PersonID, policy.Name, policy.Category, policy.Subcategory,
		policy.GovernmentScheme, policy.CoverageAmount, policy.DeathBenefit,
		policy.CriticalIllnessBenefit, policy.TpdBenefit, policy.DailyHospitalCash,
		policy.PayoutAmount, policy.PayoutFrequency, policy.PremiumAmount,
		policy.PremiumFrequency, policy.StartDate, policy.EndDate, policy.RenewalDate,
		policy.InsurerName, policy.PolicyNumber, policy.LinkedExpenseID,
		policy.IsActive, policy.Notes,
	}

	logQuery(query, args)

	created, err := scanInsurancePolicy(s.pool.QueryRow(ctx, query, args...))
	if err != nil {
		return nil, fmt.Errorf("failed to create insurance policy: %w", err)
	}

	return created, nil
}

// UpdateInsurancePolicy updates an existing insurance policy (full replacement).
func (s *Store) UpdateInsurancePolicy(ctx context.Context, userID, id string, policy InsurancePolicy) (*InsurancePolicy, error) {
	query := `
	UPDATE insurance_policies SET
		person_id = $3, name = $4, category = $5, subcategory = $6,
		government_scheme = $7, coverage_amount = $8, death_benefit = $9,
		critical_illness_benefit = $10, tpd_benefit = $11, daily_hospital_cash = $12,
		payout_amount = $13, payout_frequency = $14, premium_amount = $15,
		premium_frequency = $16, start_date = $17, end_date = $18,
		renewal_date = $19, insurer_name = $20, policy_number = $21,
		linked_expense_id = $22, is_active = $23, notes = $24, updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING ` + `id, user_id, person_id, '',
		name, category, subcategory, government_scheme,
		coverage_amount, death_benefit, critical_illness_benefit,
		tpd_benefit, daily_hospital_cash, payout_amount, payout_frequency,
		premium_amount, premium_frequency, start_date, end_date,
		renewal_date, insurer_name, policy_number, linked_expense_id,
		is_active, notes, created_at, updated_at`

	args := []any{
		userID, id, policy.PersonID, policy.Name, policy.Category, policy.Subcategory,
		policy.GovernmentScheme, policy.CoverageAmount, policy.DeathBenefit,
		policy.CriticalIllnessBenefit, policy.TpdBenefit, policy.DailyHospitalCash,
		policy.PayoutAmount, policy.PayoutFrequency, policy.PremiumAmount,
		policy.PremiumFrequency, policy.StartDate, policy.EndDate, policy.RenewalDate,
		policy.InsurerName, policy.PolicyNumber, policy.LinkedExpenseID,
		policy.IsActive, policy.Notes,
	}

	logQuery(query, args)

	updated, err := scanInsurancePolicy(s.pool.QueryRow(ctx, query, args...))
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update insurance policy: %w", err)
	}

	return updated, nil
}

// DeleteInsurancePolicy deletes a single insurance policy.
func (s *Store) DeleteInsurancePolicy(ctx context.Context, userID, id string) error {
	query := `DELETE FROM insurance_policies WHERE user_id = $1 AND id = $2`
	logQuery(query, []any{userID, id})

	result, err := s.pool.Exec(ctx, query, userID, id)
	if err != nil {
		return fmt.Errorf("failed to delete insurance policy: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// DeleteAllInsurancePolicies deletes all insurance policies for a user (bulk delete).
func (s *Store) DeleteAllInsurancePolicies(ctx context.Context, userID string) (int64, error) {
	query := `DELETE FROM insurance_policies WHERE user_id = $1`
	logQuery(query, []any{userID})

	tag, err := s.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all insurance policies: %w", err)
	}
	return tag.RowsAffected(), nil
}
