package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// insurancePolicySortColumns maps camelCase API field names to safe SQL expressions.
// This acts as an allowlist to prevent SQL injection — only fields present here are accepted.
var insurancePolicySortColumns = map[string]string{
	"category":       "ip.category",
	"coverageAmount": "ip.coverage_amount",
	"subcategory":    "ip.subcategory",
	"annualPremium":  "CASE ip.premium_frequency WHEN 'monthly' THEN ip.premium_amount * 12 WHEN 'quarterly' THEN ip.premium_amount * 4 ELSE ip.premium_amount END",
	"renewalDate":    "COALESCE(ip.renewal_date, ip.end_date, ip.start_date)",
	"isActive":       "ip.is_active",
	"createdAt":      "ip.created_at",
	"startDate":      "ip.start_date",
	"endDate":        "COALESCE(ip.end_date, '9999-12-31')",
}

// buildInsurancePolicyOrderBy validates sort params against the allowlist
// and returns a safe ORDER BY clause. Defaults to ip.created_at ASC.
func buildInsurancePolicyOrderBy(sort SortParams) string {
	defaultOrder := "ip.created_at ASC"
	if sort.Field == nil {
		return defaultOrder
	}

	column, ok := insurancePolicySortColumns[*sort.Field]
	if !ok {
		return defaultOrder
	}

	direction := "ASC"
	if sort.Direction != nil && strings.ToUpper(*sort.Direction) == "DESC" {
		direction = "DESC"
	}

	return column + " " + direction
}

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

// InsurancePolicyFilter holds optional filter criteria for listing insurance policies.
type InsurancePolicyFilter struct {
	PersonIDs     []string   // Filter by beneficiary person IDs
	Categories    []string   // Filter by coverage categories (multi-select)
	StartDateFrom *time.Time // Filter policies with start_date >= this
	StartDateTo   *time.Time // Filter policies with start_date <= this
}

// ListInsurancePolicies retrieves insurance policies for a user with optional filters, sorting, and total count.
func (s *Store) ListInsurancePolicies(
	ctx context.Context,
	userID string,
	filter InsurancePolicyFilter,
	pagination PaginationParams,
	sort SortParams,
) (PaginatedResult[InsurancePolicy], error) {
	// ── Build shared WHERE clause ──
	whereClause := `ip.user_id = $1`
	args := []any{userID}
	argIdx := 2

	if len(filter.PersonIDs) > 0 {
		whereClause += fmt.Sprintf(` AND ip.person_id = ANY($%d)`, argIdx)
		args = append(args, filter.PersonIDs)
		argIdx++
	}

	if len(filter.Categories) > 0 {
		whereClause += fmt.Sprintf(` AND ip.category = ANY($%d)`, argIdx)
		args = append(args, filter.Categories)
		argIdx++
	}

	if filter.StartDateFrom != nil {
		whereClause += fmt.Sprintf(` AND ip.start_date >= $%d`, argIdx)
		args = append(args, *filter.StartDateFrom)
		argIdx++
	}

	if filter.StartDateTo != nil {
		whereClause += fmt.Sprintf(` AND ip.start_date <= $%d`, argIdx)
		args = append(args, *filter.StartDateTo)
		argIdx++
	}

	// ── Total count query (same WHERE, no LIMIT/OFFSET) ──
	countQuery := `SELECT COUNT(*) FROM insurance_policies ip WHERE ` + whereClause
	logQuery(countQuery, args)

	var totalCount int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&totalCount); err != nil {
		return PaginatedResult[InsurancePolicy]{}, fmt.Errorf("failed to count insurance policies: %w", err)
	}

	// ── Data query ──
	query := `SELECT ` + insurancePolicyColumns + `
	FROM insurance_policies ip
	LEFT JOIN persons p ON ip.person_id = p.id
	WHERE ` + whereClause

	query += ` ORDER BY ` + buildInsurancePolicyOrderBy(sort)

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
		Total:  &totalCount,
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
