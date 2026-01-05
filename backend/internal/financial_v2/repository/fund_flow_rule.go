package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
)

// FundFlowRule represents a rule for internal money movements between balances.
// Rule types:
//   - payment: account → liability/property (Phase 1)
//   - allocation: income → account (Phase 2)
//   - transfer: account → account OR property_sale → account (Phase 3)
type FundFlowRule struct {
	ID       string `json:"id"`
	UserID   string `json:"userId"`
	Name     string `json:"name"`
	RuleType string `json:"ruleType"` // 'payment', 'allocation', 'transfer'

	// Source (exactly one should be set based on rule type)
	SourceIncomeID      *string `json:"sourceIncomeId,omitempty"`
	SourceCpfAccountID  *string `json:"sourceCpfAccountId,omitempty"`
	SourceCashAccountID *string `json:"sourceCashAccountId,omitempty"`
	SourceInvestmentID  *string `json:"sourceInvestmentId,omitempty"`
	// SourcePropertyID: For transfer rules from property sales (CPF refund, net proceeds)
	// When set, this transfer rule is auto-generated from a property sale
	SourcePropertyID *string `json:"sourcePropertyId,omitempty"`

	// Target (exactly one should be set based on rule type)
	TargetCpfAccountID  *string `json:"targetCpfAccountId,omitempty"`
	TargetCashAccountID *string `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string `json:"targetInvestmentId,omitempty"`
	TargetLiabilityID   *string `json:"targetLiabilityId,omitempty"`
	TargetPropertyID    *string `json:"targetPropertyId,omitempty"`

	// Amount specification
	AmountType  string           `json:"amountType"`            // 'fixed', 'percentage', 'remainder', 'target_required', 'max_available'
	AmountValue *decimal.Decimal `json:"amountValue,omitempty"` // Required for fixed/percentage, optional for others

	// Priority for multiple rules on same target (lower = higher priority)
	Priority int `json:"priority"`

	// Timing
	StartDate time.Time  `json:"startDate"`
	EndDate   *time.Time `json:"endDate,omitempty"`

	// Metadata
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Validation errors for fund flow rules
var (
	ErrPaymentCannotHaveIncomeSource      = errors.New("payment rules cannot have income source")
	ErrPaymentCannotUseInvestmentSource   = errors.New("payment rules cannot use investment as source - liquidate to cash first")
	ErrPaymentRequiresOneSource           = errors.New("payment rules require exactly one source (cpf or cash)")
	ErrPaymentRequiresLiabilityOrProperty = errors.New("payment rules require liability or property target")
	ErrAllocationRequiresIncomeSource     = errors.New("allocation rules require income source")
	ErrAllocationRequiresOneAccountTarget = errors.New("allocation rules require exactly one account target")
	ErrTransferRequiresOneAccountSource   = errors.New("transfer rules require exactly one account source OR property source")
	ErrTransferRequiresOneAccountTarget   = errors.New("transfer rules require exactly one account target")
	ErrTransferCannotMixSources           = errors.New("transfer rules cannot have both account and property sources")
	ErrInvalidRuleType                    = errors.New("invalid rule type")
	ErrAmountValueRequired                = errors.New("amount_value is required for fixed and percentage types")
	ErrPercentageOutOfRange               = errors.New("percentage must be between 0 and 100")
	ErrUnauthorizedEntityReference        = errors.New("referenced entity does not exist or does not belong to user")
)

// ValidateFundFlowRule validates a fund flow rule based on its type.
func ValidateFundFlowRule(r FundFlowRule) error {
	switch r.RuleType {
	case "payment":
		if r.SourceIncomeID != nil {
			return ErrPaymentCannotHaveIncomeSource
		}
		if r.SourceInvestmentID != nil {
			return ErrPaymentCannotUseInvestmentSource
		}
		if countPaymentSources(r) != 1 {
			return ErrPaymentRequiresOneSource
		}
		if r.TargetLiabilityID == nil && r.TargetPropertyID == nil {
			return ErrPaymentRequiresLiabilityOrProperty
		}

	case "allocation":
		if r.SourceIncomeID == nil {
			return ErrAllocationRequiresIncomeSource
		}
		if countAccountTargets(r) != 1 {
			return ErrAllocationRequiresOneAccountTarget
		}

	case "transfer":
		// Transfer can have either:
		// 1. One account source (regular transfer) - account → account
		// 2. One property source (sale proceeds) - property_sale → account
		accountSources := countTransferSources(r)
		hasPropertySource := r.SourcePropertyID != nil

		// Can't have both account and property sources
		if accountSources > 0 && hasPropertySource {
			return ErrTransferCannotMixSources
		}

		// Must have exactly one source type
		if accountSources != 1 && !hasPropertySource {
			return ErrTransferRequiresOneAccountSource
		}

		if countAccountTargets(r) != 1 {
			return ErrTransferRequiresOneAccountTarget
		}

	default:
		return ErrInvalidRuleType
	}

	// Validate amount_value based on amount_type
	switch r.AmountType {
	case "fixed", "percentage":
		if r.AmountValue == nil {
			return ErrAmountValueRequired
		}
		if r.AmountType == "percentage" {
			zero := decimal.Zero()
			hundred := decimal.MustFromString("100")
			if r.AmountValue.Cmp(zero) < 0 || r.AmountValue.Cmp(hundred) > 0 {
				return ErrPercentageOutOfRange
			}
		}
	}

	return nil
}

func countPaymentSources(r FundFlowRule) int {
	count := 0
	if r.SourceCpfAccountID != nil {
		count++
	}
	if r.SourceCashAccountID != nil {
		count++
	}
	// Note: investments cannot be payment sources - must liquidate to cash first
	return count
}

func countTransferSources(r FundFlowRule) int {
	count := 0
	if r.SourceCpfAccountID != nil {
		count++
	}
	if r.SourceCashAccountID != nil {
		count++
	}
	if r.SourceInvestmentID != nil {
		count++
	}
	return count
}

func countAccountTargets(r FundFlowRule) int {
	count := 0
	if r.TargetCpfAccountID != nil {
		count++
	}
	if r.TargetCashAccountID != nil {
		count++
	}
	if r.TargetInvestmentID != nil {
		count++
	}
	return count
}

// validateEntityOwnership verifies that all referenced entities in a rule belong to the specified user.
// This prevents IDOR attacks where a user could reference another user's accounts/assets.
// Uses a single UNION ALL query to validate all references in one database round-trip.
func (s *Store) validateEntityOwnership(ctx context.Context, userID string, rule FundFlowRule) error {
	// Build dynamic query parts for each non-nil entity reference
	var expectedCount int
	var queryParts []string
	var args []any
	argIdx := 1

	// Helper to add a standard ownership check (table must have id and user_id columns)
	addCheck := func(table string, entityID *string) {
		if entityID == nil {
			return
		}
		expectedCount++
		queryParts = append(queryParts,
			fmt.Sprintf(`SELECT 1 FROM %s WHERE id = $%d AND user_id = $%d`, table, argIdx, argIdx+1))
		args = append(args, *entityID, userID)
		argIdx += 2
	}

	// Helper for property_sg (requires JOIN through property_scenarios for ownership)
	addPropertyCheck := func(entityID *string) {
		if entityID == nil {
			return
		}
		expectedCount++
		queryParts = append(queryParts,
			fmt.Sprintf(`SELECT 1 FROM property_sg sg JOIN property_scenarios ps ON ps.property_sg_id = sg.id WHERE sg.id = $%d AND ps.user_id = $%d`, argIdx, argIdx+1))
		args = append(args, *entityID, userID)
		argIdx += 2
	}

	// Source entities
	addCheck("finance_incomes", rule.SourceIncomeID)
	addCheck("cpf_accounts", rule.SourceCpfAccountID)
	addCheck("finance_cash_accounts", rule.SourceCashAccountID)
	addCheck("finance_investments", rule.SourceInvestmentID)
	addPropertyCheck(rule.SourcePropertyID)

	// Target entities
	addCheck("cpf_accounts", rule.TargetCpfAccountID)
	addCheck("finance_cash_accounts", rule.TargetCashAccountID)
	addCheck("finance_investments", rule.TargetInvestmentID)
	addCheck("finance_liabilities", rule.TargetLiabilityID)
	addPropertyCheck(rule.TargetPropertyID)

	// No references to validate - rule has no entity links
	if expectedCount == 0 {
		return nil
	}

	// Single query: count matching rows from UNION ALL of all ownership checks
	query := fmt.Sprintf(`SELECT COUNT(*) FROM (%s) AS ownership_checks`, strings.Join(queryParts, " UNION ALL "))

	var actualCount int
	if err := s.pool.QueryRow(ctx, query, args...).Scan(&actualCount); err != nil {
		return fmt.Errorf("failed to validate entity ownership: %w", err)
	}

	// If counts don't match, at least one entity doesn't exist or doesn't belong to user
	if actualCount != expectedCount {
		return ErrUnauthorizedEntityReference
	}

	return nil
}

// CreateFundFlowRule creates a new fund flow rule.
func (s *Store) CreateFundFlowRule(ctx context.Context, userID string, rule FundFlowRule) (*FundFlowRule, error) {
	// Validate rule structure
	rule.UserID = userID
	if err := ValidateFundFlowRule(rule); err != nil {
		return nil, err
	}

	// Validate ownership of all referenced entities (prevents IDOR)
	if err := s.validateEntityOwnership(ctx, userID, rule); err != nil {
		return nil, err
	}

	// Default start date
	startDate := rule.StartDate
	if startDate.IsZero() {
		startDate = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	}

	query := `
		INSERT INTO fund_flow_rules (
			user_id, name, rule_type,
			source_income_id, source_cpf_account_id, source_cash_account_id, source_investment_id, source_property_id,
			target_cpf_account_id, target_cash_account_id, target_investment_id, target_liability_id, target_property_id,
			amount_type, amount_value, priority,
			start_date, end_date
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		RETURNING id, user_id, name, rule_type,
			source_income_id, source_cpf_account_id, source_cash_account_id, source_investment_id, source_property_id,
			target_cpf_account_id, target_cash_account_id, target_investment_id, target_liability_id, target_property_id,
			amount_type, amount_value, priority,
			start_date, end_date, created_at, updated_at`

	logQuery(query, []any{userID, rule.Name, rule.RuleType})

	var created FundFlowRule
	err := s.pool.QueryRow(ctx, query,
		userID, rule.Name, rule.RuleType,
		rule.SourceIncomeID, rule.SourceCpfAccountID, rule.SourceCashAccountID, rule.SourceInvestmentID, rule.SourcePropertyID,
		rule.TargetCpfAccountID, rule.TargetCashAccountID, rule.TargetInvestmentID, rule.TargetLiabilityID, rule.TargetPropertyID,
		rule.AmountType, rule.AmountValue, rule.Priority,
		startDate, rule.EndDate,
	).Scan(
		&created.ID, &created.UserID, &created.Name, &created.RuleType,
		&created.SourceIncomeID, &created.SourceCpfAccountID, &created.SourceCashAccountID, &created.SourceInvestmentID, &created.SourcePropertyID,
		&created.TargetCpfAccountID, &created.TargetCashAccountID, &created.TargetInvestmentID, &created.TargetLiabilityID, &created.TargetPropertyID,
		&created.AmountType, &created.AmountValue, &created.Priority,
		&created.StartDate, &created.EndDate, &created.CreatedAt, &created.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create fund flow rule: %w", err)
	}

	return &created, nil
}

// GetFundFlowRule retrieves a fund flow rule by ID.
func (s *Store) GetFundFlowRule(ctx context.Context, userID, ruleID string) (*FundFlowRule, error) {
	query := `
		SELECT id, user_id, name, rule_type,
			source_income_id, source_cpf_account_id, source_cash_account_id, source_investment_id, source_property_id,
			target_cpf_account_id, target_cash_account_id, target_investment_id, target_liability_id, target_property_id,
			amount_type, amount_value, priority,
			start_date, end_date, created_at, updated_at
		FROM fund_flow_rules
		WHERE id = $1 AND user_id = $2`

	var rule FundFlowRule
	err := s.pool.QueryRow(ctx, query, ruleID, userID).Scan(
		&rule.ID, &rule.UserID, &rule.Name, &rule.RuleType,
		&rule.SourceIncomeID, &rule.SourceCpfAccountID, &rule.SourceCashAccountID, &rule.SourceInvestmentID, &rule.SourcePropertyID,
		&rule.TargetCpfAccountID, &rule.TargetCashAccountID, &rule.TargetInvestmentID, &rule.TargetLiabilityID, &rule.TargetPropertyID,
		&rule.AmountType, &rule.AmountValue, &rule.Priority,
		&rule.StartDate, &rule.EndDate, &rule.CreatedAt, &rule.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get fund flow rule: %w", err)
	}

	return &rule, nil
}

// ListFundFlowRulesQuery is the query filter for listing fund flow rules.
type ListFundFlowRulesQuery struct {
	UserID            string
	RuleType          *string    // Filter by rule type ('payment', 'allocation', 'transfer')
	TargetPropertyID  *string    // Filter by target property
	TargetLiabilityID *string    // Filter by target liability
	SourcePropertyID  *string    // Filter by source property (for property sale transfers)
	ActiveAt          *time.Time // Filter rules active at this date
}

// ListFundFlowRules returns all fund flow rules for a user, optionally filtered.
func (s *Store) ListFundFlowRules(ctx context.Context, q ListFundFlowRulesQuery) ([]FundFlowRule, error) {
	query := `
		SELECT id, user_id, name, rule_type,
			source_income_id, source_cpf_account_id, source_cash_account_id, source_investment_id, source_property_id,
			target_cpf_account_id, target_cash_account_id, target_investment_id, target_liability_id, target_property_id,
			amount_type, amount_value, priority,
			start_date, end_date, created_at, updated_at
		FROM fund_flow_rules
		WHERE user_id = $1`

	args := []any{q.UserID}
	argIdx := 2

	if q.RuleType != nil {
		query += fmt.Sprintf(" AND rule_type = $%d", argIdx)
		args = append(args, *q.RuleType)
		argIdx++
	}

	if q.TargetPropertyID != nil {
		query += fmt.Sprintf(" AND target_property_id = $%d", argIdx)
		args = append(args, *q.TargetPropertyID)
		argIdx++
	}

	if q.TargetLiabilityID != nil {
		query += fmt.Sprintf(" AND target_liability_id = $%d", argIdx)
		args = append(args, *q.TargetLiabilityID)
		argIdx++
	}

	if q.SourcePropertyID != nil {
		query += fmt.Sprintf(" AND source_property_id = $%d", argIdx)
		args = append(args, *q.SourcePropertyID)
		argIdx++
	}

	if q.ActiveAt != nil {
		query += fmt.Sprintf(" AND start_date <= $%d AND (end_date IS NULL OR end_date >= $%d)", argIdx, argIdx)
		args = append(args, *q.ActiveAt)
		argIdx++
	}

	query += " ORDER BY priority ASC, created_at ASC"

	logQuery(query, args)
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list fund flow rules: %w", err)
	}
	defer rows.Close()

	rules := []FundFlowRule{}
	for rows.Next() {
		var rule FundFlowRule
		err := rows.Scan(
			&rule.ID, &rule.UserID, &rule.Name, &rule.RuleType,
			&rule.SourceIncomeID, &rule.SourceCpfAccountID, &rule.SourceCashAccountID, &rule.SourceInvestmentID, &rule.SourcePropertyID,
			&rule.TargetCpfAccountID, &rule.TargetCashAccountID, &rule.TargetInvestmentID, &rule.TargetLiabilityID, &rule.TargetPropertyID,
			&rule.AmountType, &rule.AmountValue, &rule.Priority,
			&rule.StartDate, &rule.EndDate, &rule.CreatedAt, &rule.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan fund flow rule: %w", err)
		}
		rules = append(rules, rule)
	}

	return rules, nil
}

// UpdateFundFlowRule updates an existing fund flow rule.
func (s *Store) UpdateFundFlowRule(ctx context.Context, userID string, rule FundFlowRule) (*FundFlowRule, error) {
	// Validate rule structure
	rule.UserID = userID
	if err := ValidateFundFlowRule(rule); err != nil {
		return nil, err
	}

	// Validate ownership of all referenced entities (prevents IDOR)
	if err := s.validateEntityOwnership(ctx, userID, rule); err != nil {
		return nil, err
	}

	query := `
		UPDATE fund_flow_rules
		SET name = $3, rule_type = $4,
			source_income_id = $5, source_cpf_account_id = $6, source_cash_account_id = $7, source_investment_id = $8, source_property_id = $9,
			target_cpf_account_id = $10, target_cash_account_id = $11, target_investment_id = $12, target_liability_id = $13, target_property_id = $14,
			amount_type = $15, amount_value = $16, priority = $17,
			start_date = $18, end_date = $19, updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, name, rule_type,
			source_income_id, source_cpf_account_id, source_cash_account_id, source_investment_id, source_property_id,
			target_cpf_account_id, target_cash_account_id, target_investment_id, target_liability_id, target_property_id,
			amount_type, amount_value, priority,
			start_date, end_date, created_at, updated_at`

	logQuery(query, []any{rule.ID, userID, rule.Name, rule.RuleType})

	var updated FundFlowRule
	err := s.pool.QueryRow(ctx, query,
		rule.ID, userID,
		rule.Name, rule.RuleType,
		rule.SourceIncomeID, rule.SourceCpfAccountID, rule.SourceCashAccountID, rule.SourceInvestmentID, rule.SourcePropertyID,
		rule.TargetCpfAccountID, rule.TargetCashAccountID, rule.TargetInvestmentID, rule.TargetLiabilityID, rule.TargetPropertyID,
		rule.AmountType, rule.AmountValue, rule.Priority,
		rule.StartDate, rule.EndDate,
	).Scan(
		&updated.ID, &updated.UserID, &updated.Name, &updated.RuleType,
		&updated.SourceIncomeID, &updated.SourceCpfAccountID, &updated.SourceCashAccountID, &updated.SourceInvestmentID, &updated.SourcePropertyID,
		&updated.TargetCpfAccountID, &updated.TargetCashAccountID, &updated.TargetInvestmentID, &updated.TargetLiabilityID, &updated.TargetPropertyID,
		&updated.AmountType, &updated.AmountValue, &updated.Priority,
		&updated.StartDate, &updated.EndDate, &updated.CreatedAt, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update fund flow rule: %w", err)
	}

	return &updated, nil
}

// DeleteFundFlowRule deletes a fund flow rule by ID.
func (s *Store) DeleteFundFlowRule(ctx context.Context, userID, ruleID string) error {
	query := `DELETE FROM fund_flow_rules WHERE id = $1 AND user_id = $2`

	logQuery(query, []any{ruleID, userID})
	tag, err := s.pool.Exec(ctx, query, ruleID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete fund flow rule: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// SetFundFlowRuleEndDate sets the end_date for a rule (stops it at a future point).
// Used when "deleting" at a future time - preserves the original record with an end_date.
func (s *Store) SetFundFlowRuleEndDate(ctx context.Context, userID, ruleID string, endDate time.Time) (*FundFlowRule, error) {
	query := `
		UPDATE fund_flow_rules
		SET end_date = $3, updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, name, rule_type,
			source_income_id, source_cpf_account_id, source_cash_account_id, source_investment_id, source_property_id,
			target_cpf_account_id, target_cash_account_id, target_investment_id, target_liability_id, target_property_id,
			amount_type, amount_value, priority,
			start_date, end_date, created_at, updated_at`

	var updated FundFlowRule
	err := s.pool.QueryRow(ctx, query, ruleID, userID, endDate).Scan(
		&updated.ID, &updated.UserID, &updated.Name, &updated.RuleType,
		&updated.SourceIncomeID, &updated.SourceCpfAccountID, &updated.SourceCashAccountID, &updated.SourceInvestmentID, &updated.SourcePropertyID,
		&updated.TargetCpfAccountID, &updated.TargetCashAccountID, &updated.TargetInvestmentID, &updated.TargetLiabilityID, &updated.TargetPropertyID,
		&updated.AmountType, &updated.AmountValue, &updated.Priority,
		&updated.StartDate, &updated.EndDate, &updated.CreatedAt, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to set fund flow rule end date: %w", err)
	}

	return &updated, nil
}

// GetPaymentRulesForProperty returns all active payment rules targeting a specific property.
// Rules are returned in priority order (lower priority number = higher priority).
func (s *Store) GetPaymentRulesForProperty(ctx context.Context, userID, propertyID string, activeAt time.Time) ([]FundFlowRule, error) {
	ruleType := "payment"
	return s.ListFundFlowRules(ctx, ListFundFlowRulesQuery{
		UserID:           userID,
		RuleType:         &ruleType,
		TargetPropertyID: &propertyID,
		ActiveAt:         &activeAt,
	})
}

// GetPaymentRulesForLiability returns all active payment rules targeting a specific liability.
// Rules are returned in priority order (lower priority number = higher priority).
func (s *Store) GetPaymentRulesForLiability(ctx context.Context, userID, liabilityID string, activeAt time.Time) ([]FundFlowRule, error) {
	ruleType := "payment"
	return s.ListFundFlowRules(ctx, ListFundFlowRulesQuery{
		UserID:            userID,
		RuleType:          &ruleType,
		TargetLiabilityID: &liabilityID,
		ActiveAt:          &activeAt,
	})
}

// DeleteAllFundFlowRules deletes all fund flow rules for a user (bulk delete).
func (s *Store) DeleteAllFundFlowRules(ctx context.Context, userID string) (int64, error) {
	query := `DELETE FROM fund_flow_rules WHERE user_id = $1`
	logQuery(query, []any{userID})
	tag, err := s.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all fund flow rules: %w", err)
	}
	return tag.RowsAffected(), nil
}

// DeleteBySourcePropertyID deletes all fund flow rules that originate from a specific property.
// Used when updating/deleting property sale proceeds - old rules are deleted before creating new ones.
func (s *Store) DeleteBySourcePropertyID(ctx context.Context, userID, sourcePropertyID string) (int64, error) {
	query := `DELETE FROM fund_flow_rules WHERE user_id = $1 AND source_property_id = $2`
	logQuery(query, []any{userID, sourcePropertyID})
	tag, err := s.pool.Exec(ctx, query, userID, sourcePropertyID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete fund flow rules by source property: %w", err)
	}
	return tag.RowsAffected(), nil
}

// GetTransferRulesFromProperty returns all transfer rules originating from a specific property sale.
func (s *Store) GetTransferRulesFromProperty(ctx context.Context, userID, sourcePropertyID string) ([]FundFlowRule, error) {
	ruleType := "transfer"
	return s.ListFundFlowRules(ctx, ListFundFlowRulesQuery{
		UserID:           userID,
		RuleType:         &ruleType,
		SourcePropertyID: &sourcePropertyID,
	})
}

// CreateBatchFundFlowRules creates multiple fund flow rules in a single transaction.
// Used for auto-generating property sale transfer rules (CPF refunds + net proceeds).
func (s *Store) CreateBatchFundFlowRules(ctx context.Context, userID string, rules []FundFlowRule) ([]FundFlowRule, error) {
	if len(rules) == 0 {
		return []FundFlowRule{}, nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	createdRules := make([]FundFlowRule, 0, len(rules))

	for _, rule := range rules {
		// Validate rule structure
		rule.UserID = userID
		if err := ValidateFundFlowRule(rule); err != nil {
			return nil, fmt.Errorf("rule validation failed: %w", err)
		}

		// Validate ownership of all referenced entities
		if err := s.validateEntityOwnership(ctx, userID, rule); err != nil {
			return nil, fmt.Errorf("entity ownership validation failed: %w", err)
		}

		// Default start date
		startDate := rule.StartDate
		if startDate.IsZero() {
			startDate = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
		}

		query := `
			INSERT INTO fund_flow_rules (
				user_id, name, rule_type,
				source_income_id, source_cpf_account_id, source_cash_account_id, source_investment_id, source_property_id,
				target_cpf_account_id, target_cash_account_id, target_investment_id, target_liability_id, target_property_id,
				amount_type, amount_value, priority,
				start_date, end_date
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
			RETURNING id, user_id, name, rule_type,
				source_income_id, source_cpf_account_id, source_cash_account_id, source_investment_id, source_property_id,
				target_cpf_account_id, target_cash_account_id, target_investment_id, target_liability_id, target_property_id,
				amount_type, amount_value, priority,
				start_date, end_date, created_at, updated_at`

		var created FundFlowRule
		err := tx.QueryRow(ctx, query,
			userID, rule.Name, rule.RuleType,
			rule.SourceIncomeID, rule.SourceCpfAccountID, rule.SourceCashAccountID, rule.SourceInvestmentID, rule.SourcePropertyID,
			rule.TargetCpfAccountID, rule.TargetCashAccountID, rule.TargetInvestmentID, rule.TargetLiabilityID, rule.TargetPropertyID,
			rule.AmountType, rule.AmountValue, rule.Priority,
			startDate, rule.EndDate,
		).Scan(
			&created.ID, &created.UserID, &created.Name, &created.RuleType,
			&created.SourceIncomeID, &created.SourceCpfAccountID, &created.SourceCashAccountID, &created.SourceInvestmentID, &created.SourcePropertyID,
			&created.TargetCpfAccountID, &created.TargetCashAccountID, &created.TargetInvestmentID, &created.TargetLiabilityID, &created.TargetPropertyID,
			&created.AmountType, &created.AmountValue, &created.Priority,
			&created.StartDate, &created.EndDate, &created.CreatedAt, &created.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create fund flow rule: %w", err)
		}
		createdRules = append(createdRules, created)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return createdRules, nil
}
