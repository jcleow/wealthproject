package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/scenario"

	"github.com/jackc/pgx/v5"
)

// Type aliases for scenario types - allows repository to use scenario types
// while maintaining backward compatibility with existing code using repo.ScenarioEvent etc.
type (
	ScenarioEvent   = scenario.Event
	ScenarioImpact  = scenario.Impact
	ScenarioFilters = scenario.Filters
	ExcludedTargets = scenario.ExcludedTargets
)

// ErrScenarioNotFound is an alias for scenario.ErrNotFound
var ErrScenarioNotFound = scenario.ErrNotFound

// CreateScenarioEvent inserts a scenario event and its impacts using typed FK columns.
func (s *Store) CreateScenarioEventV2(ctx context.Context, ev ScenarioEvent) (ScenarioEvent, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ScenarioEvent{}, err
	}
	defer tx.Rollback(ctx)

	tagsJSON, _ := json.Marshal(ev.Tags)

	row := tx.QueryRow(ctx, `
		INSERT INTO scenario_events (user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, true))
		RETURNING id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at`,
		ev.UserID, ev.Name, ev.Description, ev.OccursOn, ev.DisplayIcon, ev.DisplayColor, tagsJSON, ev.ScenarioID, ev.IsIncluded)

	var created ScenarioEvent
	var tagsBytes []byte
	if err := row.Scan(&created.ID, &created.UserID, &created.Name, &created.Description, &created.OccursOn, &created.DisplayIcon, &created.DisplayColor, &tagsBytes, &created.ScenarioID, &created.IsIncluded, &created.CreatedAt, &created.UpdatedAt); err != nil {
		return ScenarioEvent{}, err
	}
	created.Tags = decodeStringArray(tagsBytes)

	// For 'start' impacts, update the linked financial item's amount and frequency
	for _, imp := range ev.Impacts {
		if imp.ImpactKind == scenario.ImpactKindStart {
			if err := s.updateStartImpactTarget(ctx, tx, &imp); err != nil {
				return ScenarioEvent{}, fmt.Errorf("failed to update start impact target: %w", err)
			}
		}
	}

	if len(ev.Impacts) > 0 {
		if err := s.insertImpactsV2(ctx, tx, ev.UserID, created.ID, ev.Impacts); err != nil {
			return ScenarioEvent{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return ScenarioEvent{}, err
	}

	if len(ev.Impacts) > 0 {
		created.Impacts, _ = s.ListScenarioImpactsV2(ctx, created.UserID, created.ID)
	}
	return created, nil
}

// GetScenarioEventV2 fetches a scenario by ID for a user with typed FK impacts.
func (s *Store) GetScenarioEventV2(ctx context.Context, userID, eventID string) (ScenarioEvent, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at
		FROM scenario_events
		WHERE id = $1 AND user_id = $2`, eventID, userID)
	var ev ScenarioEvent
	var tagsJSON []byte
	if err := row.Scan(&ev.ID, &ev.UserID, &ev.Name, &ev.Description, &ev.OccursOn, &ev.DisplayIcon, &ev.DisplayColor, &tagsJSON, &ev.ScenarioID, &ev.IsIncluded, &ev.CreatedAt, &ev.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ScenarioEvent{}, ErrScenarioNotFound
		}
		return ScenarioEvent{}, err
	}
	ev.Tags = decodeStringArray(tagsJSON)
	ev.Impacts, _ = s.ListScenarioImpactsV2(ctx, userID, ev.ID)
	return ev, nil
}

// ListScenarioEventsV2 returns paginated events for a user with typed FK impacts.
// Uses a single JOIN query to fetch events and impacts together (eliminates N+1).
func (s *Store) ListScenarioEventsV2(ctx context.Context, userID string, filters ScenarioFilters) ([]ScenarioEvent, int, error) {
	limit := filters.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := filters.Offset
	if offset < 0 {
		offset = 0
	}

	where := []string{"user_id = $1"}
	args := []any{userID}

	if filters.IncludedOnly != nil {
		where = append(where, fmt.Sprintf("is_included = $%d", len(args)+1))
		args = append(args, *filters.IncludedOnly)
	}
	if filters.Year != nil {
		where = append(where, fmt.Sprintf("EXTRACT(YEAR FROM occurs_on) = $%d", len(args)+1))
		args = append(args, *filters.Year)
	}
	if len(filters.Tags) > 0 {
		where = append(where, fmt.Sprintf("tags ?| $%d", len(args)+1))
		args = append(args, filters.Tags)
	}
	if strings.TrimSpace(filters.Search) != "" {
		where = append(where, fmt.Sprintf("to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'')) @@ plainto_tsquery('simple', $%d)", len(args)+1))
		args = append(args, strings.TrimSpace(filters.Search))
	}

	whereClause := strings.Join(where, " AND ")

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM scenario_events WHERE %s`, whereClause)
	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// NEW ARCHITECTURE: First get paginated events, then fetch impacts separately
	// This avoids the complex JOIN with the now-removed scenario_event_impacts table
	query := fmt.Sprintf(`
		SELECT id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at
		FROM scenario_events
		WHERE %s
		ORDER BY occurs_on ASC, created_at DESC
		LIMIT $%d OFFSET $%d`,
		whereClause, len(args)+1, len(args)+2)

	rows, err := s.pool.Query(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []ScenarioEvent
	for rows.Next() {
		var ev ScenarioEvent
		var tagsJSON []byte
		if err := rows.Scan(
			&ev.ID, &ev.UserID, &ev.Name, &ev.Description, &ev.OccursOn, &ev.DisplayIcon, &ev.DisplayColor, &tagsJSON, &ev.ScenarioID, &ev.IsIncluded, &ev.CreatedAt, &ev.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		ev.Tags = decodeStringArray(tagsJSON)
		ev.Impacts = []ScenarioImpact{} // Will be populated below
		events = append(events, ev)
	}

	// Fetch impacts for each event from finance tables
	for i := range events {
		impacts, err := s.ListScenarioImpactsV2(ctx, userID, events[i].ID)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to fetch impacts for event %s: %w", events[i].ID, err)
		}
		events[i].Impacts = impacts
	}

	return events, total, nil
}

// UpdateScenarioEventV2 replaces metadata and impacts using typed FK columns.
// For 'start' impacts, also updates the linked financial item's amount and frequency.
func (s *Store) UpdateScenarioEventV2(ctx context.Context, ev ScenarioEvent) (ScenarioEvent, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ScenarioEvent{}, err
	}
	defer tx.Rollback(ctx)

	tagsJSON, _ := json.Marshal(ev.Tags)

	row := tx.QueryRow(ctx, `
		UPDATE scenario_events
		SET name=$2, description=$3, occurs_on=$4, display_icon=$5, display_color=$6, tags=$7, scenario_id=$8, is_included=$9, updated_at=NOW()
		WHERE id=$1 AND user_id=$10
		RETURNING id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at`,
		ev.ID, ev.Name, ev.Description, ev.OccursOn, ev.DisplayIcon, ev.DisplayColor, tagsJSON, ev.ScenarioID, ev.IsIncluded, ev.UserID)
	var updated ScenarioEvent
	var tagsBytes []byte
	if err := row.Scan(&updated.ID, &updated.UserID, &updated.Name, &updated.Description, &updated.OccursOn, &updated.DisplayIcon, &updated.DisplayColor, &tagsBytes, &updated.ScenarioID, &updated.IsIncluded, &updated.CreatedAt, &updated.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ScenarioEvent{}, ErrScenarioNotFound
		}
		return ScenarioEvent{}, err
	}
	updated.Tags = decodeStringArray(tagsBytes)

	// For 'start' impacts, update the linked financial item's amount and frequency
	for _, imp := range ev.Impacts {
		if imp.ImpactKind == scenario.ImpactKindStart {
			if err := s.updateStartImpactTarget(ctx, tx, &imp); err != nil {
				return ScenarioEvent{}, fmt.Errorf("failed to update start impact target: %w", err)
			}
		}
	}

	// Delete existing scenario impacts from all finance tables
	if _, err := tx.Exec(ctx, `DELETE FROM finance_incomes WHERE scenario_event_id = $1`, ev.ID); err != nil {
		return ScenarioEvent{}, fmt.Errorf("failed to delete income impacts: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM finance_expenses WHERE scenario_event_id = $1`, ev.ID); err != nil {
		return ScenarioEvent{}, fmt.Errorf("failed to delete expense impacts: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM finance_assets WHERE scenario_event_id = $1`, ev.ID); err != nil {
		return ScenarioEvent{}, fmt.Errorf("failed to delete asset impacts: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM finance_liabilities WHERE scenario_event_id = $1`, ev.ID); err != nil {
		return ScenarioEvent{}, fmt.Errorf("failed to delete liability impacts: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM finance_investments WHERE scenario_event_id = $1`, ev.ID); err != nil {
		return ScenarioEvent{}, fmt.Errorf("failed to delete investment impacts: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM finance_cash_accounts WHERE scenario_event_id = $1`, ev.ID); err != nil {
		return ScenarioEvent{}, fmt.Errorf("failed to delete cash account impacts: %w", err)
	}

	if len(ev.Impacts) > 0 {
		if err := s.insertImpactsV2(ctx, tx, ev.UserID, ev.ID, ev.Impacts); err != nil {
			return ScenarioEvent{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return ScenarioEvent{}, err
	}
	updated.Impacts, _ = s.ListScenarioImpactsV2(ctx, updated.UserID, updated.ID)
	return updated, nil
}

// updateStartImpactTarget updates the linked financial item for a 'start' impact.
// This syncs the amount, frequency, category, growth_rate, and growth_strategy
// from the impact to the actual financial record.
func (s *Store) updateStartImpactTarget(ctx context.Context, tx pgx.Tx, imp *ScenarioImpact) error {
	// Determine frequency string for income/expense tables
	freq := string(imp.Cadence)
	if freq == "" {
		freq = "monthly"
	}

	// Get category (use empty string if not set)
	category := imp.Category

	// Get growth strategy - map frontend values to DB values
	// Frontend: none, annual_step, compound → DB: fixed, annual_step, compound_monthly
	growthStrategy := imp.GrowthStrategy
	switch growthStrategy {
	case "none", "":
		growthStrategy = "fixed"
	case "compound":
		growthStrategy = "compound_monthly"
	// annual_step stays as is
	}

	// Debug log
	fmt.Printf("[updateStartImpactTarget] Amount=%d Cadence=%q freq=%q category=%q growthRate=%v growthStrategy=%q\n",
		imp.Amount, imp.Cadence, freq, category, imp.GrowthRate, growthStrategy)

	if imp.TargetAssetID != nil {
		_, err := tx.Exec(ctx, `
			UPDATE finance_assets SET current_value = $1, category = COALESCE(NULLIF($2, ''), category), growth_rate = COALESCE($3, growth_rate), updated_at = NOW() WHERE id = $4`,
			imp.Amount, category, imp.GrowthRate, *imp.TargetAssetID)
		return err
	}
	if imp.TargetLiabilityID != nil {
		_, err := tx.Exec(ctx, `
			UPDATE finance_liabilities SET
				current_balance = $1,
				category = COALESCE(NULLIF($2, ''), category),
				interest_rate_apr = COALESCE($3, interest_rate_apr),
				minimum_payment = COALESCE($4, minimum_payment),
				updated_at = NOW()
			WHERE id = $5`,
			imp.Amount, category, imp.InterestRate, imp.MinimumPayment, *imp.TargetLiabilityID)
		return err
	}
	if imp.TargetIncomeID != nil {
		_, err := tx.Exec(ctx, `
			UPDATE finance_incomes SET amount = $1, frequency = $2, category = COALESCE(NULLIF($3, ''), category), growth_rate = COALESCE($4, growth_rate), growth_strategy = COALESCE(NULLIF($5, ''), growth_strategy), updated_at = NOW() WHERE id = $6`,
			imp.Amount, freq, category, imp.GrowthRate, growthStrategy, *imp.TargetIncomeID)
		return err
	}
	if imp.TargetExpenseID != nil {
		_, err := tx.Exec(ctx, `
			UPDATE finance_expenses SET amount = $1, frequency = $2, category = COALESCE(NULLIF($3, ''), category), growth_rate = COALESCE($4, growth_rate), growth_strategy = COALESCE(NULLIF($5, ''), growth_strategy), updated_at = NOW() WHERE id = $6`,
			imp.Amount, freq, category, imp.GrowthRate, growthStrategy, *imp.TargetExpenseID)
		return err
	}
	if imp.TargetCashAccountID != nil {
		// Cash accounts use account_type instead of category
		_, err := tx.Exec(ctx, `
			UPDATE finance_cash_accounts SET balance = $1, account_type = COALESCE(NULLIF($2, ''), account_type), updated_at = NOW() WHERE id = $3`,
			imp.Amount, category, *imp.TargetCashAccountID)
		return err
	}
	if imp.TargetInvestmentID != nil {
		// Investments use growth_rate (not annual_growth_rate)
		_, err := tx.Exec(ctx, `
			UPDATE finance_investments SET current_value = $1, category = COALESCE(NULLIF($2, ''), category), growth_rate = COALESCE($3, growth_rate), updated_at = NOW() WHERE id = $4`,
			imp.Amount, category, imp.GrowthRate, *imp.TargetInvestmentID)
		return err
	}
	return nil
}

// DeleteScenarioEventV2 removes an event for a user.
func (s *Store) DeleteScenarioEventV2(ctx context.Context, userID, eventID string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM scenario_events WHERE id=$1 AND user_id=$2`, eventID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrScenarioNotFound
	}
	return nil
}

// ToggleScenarioIncludedV2 updates inclusion flag.
func (s *Store) ToggleScenarioIncludedV2(ctx context.Context, userID, eventID string, included bool) error {
	tag, err := s.pool.Exec(ctx, `
		UPDATE scenario_events
		SET is_included=$3, updated_at=NOW()
		WHERE id=$1 AND user_id=$2`, eventID, userID, included)
	if err != nil {
		// Invalid UUID format should be treated as not found
		if strings.Contains(err.Error(), "invalid input syntax for type uuid") {
			return ErrScenarioNotFound
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrScenarioNotFound
	}
	return nil
}

// ListScenarioImpactsV2 lists impacts for an event by querying finance tables for rows
// with the given scenario_event_id.
// NEW ARCHITECTURE: Impacts are now stored directly in finance_* tables with scenario_event_id FK.
func (s *Store) ListScenarioImpactsV2(ctx context.Context, userID, eventID string) ([]ScenarioImpact, error) {
	var impacts []ScenarioImpact

	// Query each finance table for rows linked to this scenario event
	// Income impacts
	incomeRows, err := s.pool.Query(ctx, `
		SELECT id, parent_id, name, amount, frequency, category, start_date, end_date,
		       growth_rate, growth_strategy, impact_kind, impact_frequency, updated_at
		FROM finance_incomes
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query income impacts: %w", err)
	}
	defer incomeRows.Close()
	for incomeRows.Next() {
		var id, parentID, name, frequency, category string
		var amount decimal.Decimal
		var startDate time.Time
		var endDate *time.Time
		var growthRate decimal.Decimal
		var growthStrategy, impactKind, impactFrequency *string
		var updatedAt time.Time
		if err := incomeRows.Scan(&id, &parentID, &name, &amount, &frequency, &category,
			&startDate, &endDate, &growthRate, &growthStrategy, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		growthRateFloat := growthRate.ToFloat64()
		imp := ScenarioImpact{
			ID:             id,
			EventID:        eventID,
			TargetIncomeID: &parentID,
			Name:           name,
			Amount:         &amount,
			Frequency:      frequency,
			Category:       category,
			StartDate:      startDate,
			EndDate:        endDate,
			GrowthRate:     &growthRateFloat,
			Currency:       "SGD",
			CreatedAt:      updatedAt,
		}
		if impactKind != nil {
			imp.ImpactKind = *impactKind
		}
		if impactFrequency != nil {
			imp.Cadence = common.Frequency(*impactFrequency)
		}
		if growthStrategy != nil {
			imp.GrowthStrategy = *growthStrategy
		}
		impacts = append(impacts, imp)
	}

	// Expense impacts
	expenseRows, err := s.pool.Query(ctx, `
		SELECT id, parent_id, name, amount, frequency, category, start_date, end_date,
		       growth_rate, growth_strategy, impact_kind, impact_frequency, updated_at
		FROM finance_expenses
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query expense impacts: %w", err)
	}
	defer expenseRows.Close()
	for expenseRows.Next() {
		var id, parentID, name, frequency, category string
		var amount decimal.Decimal
		var startDate time.Time
		var endDate *time.Time
		var growthRate decimal.Decimal
		var growthStrategy, impactKind, impactFrequency *string
		var updatedAt time.Time
		if err := expenseRows.Scan(&id, &parentID, &name, &amount, &frequency, &category,
			&startDate, &endDate, &growthRate, &growthStrategy, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		growthRateFloat := growthRate.ToFloat64()
		imp := ScenarioImpact{
			ID:              id,
			EventID:         eventID,
			TargetExpenseID: &parentID,
			Name:            name,
			Amount:          &amount,
			Frequency:       frequency,
			Category:        category,
			StartDate:       startDate,
			EndDate:         endDate,
			GrowthRate:      &growthRateFloat,
			Currency:        "SGD",
			CreatedAt:       updatedAt,
		}
		if impactKind != nil {
			imp.ImpactKind = *impactKind
		}
		if impactFrequency != nil {
			imp.Cadence = common.Frequency(*impactFrequency)
		}
		if growthStrategy != nil {
			imp.GrowthStrategy = *growthStrategy
		}
		impacts = append(impacts, imp)
	}

	// Asset impacts
	assetRows, err := s.pool.Query(ctx, `
		SELECT id, parent_id, name, current_value, category, start_date, end_date,
		       growth_rate, growth_strategy, impact_kind, impact_frequency, updated_at
		FROM finance_assets
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query asset impacts: %w", err)
	}
	defer assetRows.Close()
	for assetRows.Next() {
		var id, parentID, name, category string
		var currentValue decimal.Decimal
		var startDate time.Time
		var endDate *time.Time
		var growthRate decimal.Decimal
		var growthStrategy, impactKind, impactFrequency *string
		var updatedAt time.Time
		if err := assetRows.Scan(&id, &parentID, &name, &currentValue, &category,
			&startDate, &endDate, &growthRate, &growthStrategy, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		growthRateFloat := growthRate.ToFloat64()
		imp := ScenarioImpact{
			ID:            id,
			EventID:       eventID,
			TargetAssetID: &parentID,
			Name:          name,
			Amount:        &currentValue,
			Category:      category,
			StartDate:     startDate,
			EndDate:       endDate,
			GrowthRate:    &growthRateFloat,
			Currency:      "SGD",
			CreatedAt:     updatedAt,
		}
		if impactKind != nil {
			imp.ImpactKind = *impactKind
		}
		if impactFrequency != nil {
			imp.Cadence = common.Frequency(*impactFrequency)
		}
		if growthStrategy != nil {
			imp.GrowthStrategy = *growthStrategy
		}
		impacts = append(impacts, imp)
	}

	// Liability impacts
	liabilityRows, err := s.pool.Query(ctx, `
		SELECT id, parent_id, name, current_balance, category, start_date, end_date,
		       interest_rate_apr, growth_strategy, impact_kind, impact_frequency, updated_at
		FROM finance_liabilities
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query liability impacts: %w", err)
	}
	defer liabilityRows.Close()
	for liabilityRows.Next() {
		var id, parentID, name, category string
		var currentBalance decimal.Decimal
		var startDate time.Time
		var endDate *time.Time
		var interestRateAPR decimal.Decimal
		var growthStrategy, impactKind, impactFrequency *string
		var updatedAt time.Time
		if err := liabilityRows.Scan(&id, &parentID, &name, &currentBalance, &category,
			&startDate, &endDate, &interestRateAPR, &growthStrategy, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		interestRate := interestRateAPR.ToFloat64()
		imp := ScenarioImpact{
			ID:                id,
			EventID:           eventID,
			TargetLiabilityID: &parentID,
			Name:              name,
			Amount:            &currentBalance,
			Category:          category,
			StartDate:         startDate,
			EndDate:           endDate,
			InterestRate:      &interestRate,
			Currency:          "SGD",
			CreatedAt:         updatedAt,
		}
		if impactKind != nil {
			imp.ImpactKind = *impactKind
		}
		if impactFrequency != nil {
			imp.Cadence = common.Frequency(*impactFrequency)
		}
		if growthStrategy != nil {
			imp.GrowthStrategy = *growthStrategy
		}
		impacts = append(impacts, imp)
	}

	// Investment impacts
	investmentRows, err := s.pool.Query(ctx, `
		SELECT id, parent_id, name, current_value, category, start_date, end_date,
		       growth_rate, growth_strategy, impact_kind, impact_frequency, updated_at
		FROM finance_investments
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query investment impacts: %w", err)
	}
	defer investmentRows.Close()
	for investmentRows.Next() {
		var id, parentID, name, category string
		var currentValue decimal.Decimal
		var startDate time.Time
		var endDate *time.Time
		var growthRate decimal.Decimal
		var growthStrategy, impactKind, impactFrequency *string
		var updatedAt time.Time
		if err := investmentRows.Scan(&id, &parentID, &name, &currentValue, &category,
			&startDate, &endDate, &growthRate, &growthStrategy, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		growthRateFloat := growthRate.ToFloat64()
		imp := ScenarioImpact{
			ID:                 id,
			EventID:            eventID,
			TargetInvestmentID: &parentID,
			Name:               name,
			Amount:             &currentValue,
			Category:           category,
			StartDate:          startDate,
			EndDate:            endDate,
			GrowthRate:         &growthRateFloat,
			Currency:           "SGD",
			CreatedAt:          updatedAt,
		}
		if impactKind != nil {
			imp.ImpactKind = *impactKind
		}
		if impactFrequency != nil {
			imp.Cadence = common.Frequency(*impactFrequency)
		}
		if growthStrategy != nil {
			imp.GrowthStrategy = *growthStrategy
		}
		impacts = append(impacts, imp)
	}

	// Cash account impacts
	cashRows, err := s.pool.Query(ctx, `
		SELECT id, COALESCE(parent_id, id), name, balance, COALESCE(category, 'savings'), start_date, end_date,
		       interest_rate, growth_strategy, impact_kind, impact_frequency, updated_at
		FROM finance_cash_accounts
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query cash account impacts: %w", err)
	}
	defer cashRows.Close()
	for cashRows.Next() {
		var id, parentID, name, category string
		var balance decimal.Decimal
		var startDate time.Time
		var endDate *time.Time
		var interestRate decimal.Decimal
		var growthStrategy, impactKind, impactFrequency *string
		var updatedAt time.Time
		if err := cashRows.Scan(&id, &parentID, &name, &balance, &category,
			&startDate, &endDate, &interestRate, &growthStrategy, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		interestRateFloat := interestRate.ToFloat64()
		imp := ScenarioImpact{
			ID:                  id,
			EventID:             eventID,
			TargetCashAccountID: &parentID,
			Name:                name,
			Amount:              &balance,
			Category:            category,
			StartDate:           startDate,
			EndDate:             endDate,
			GrowthRate:          &interestRateFloat,
			Currency:            "SGD",
			CreatedAt:           updatedAt,
		}
		if impactKind != nil {
			imp.ImpactKind = *impactKind
		}
		if impactFrequency != nil {
			imp.Cadence = common.Frequency(*impactFrequency)
		}
		if growthStrategy != nil {
			imp.GrowthStrategy = *growthStrategy
		}
		impacts = append(impacts, imp)
	}

	if impacts == nil {
		impacts = []ScenarioImpact{}
	}
	return impacts, nil
}

// insertImpactsV2 inserts impacts by creating new rows in the appropriate finance table.
// NEW ARCHITECTURE: Instead of inserting into scenario_event_impacts, we create new rows
// in finance_* tables with scenario_event_id, impact_kind, and impact_frequency set.
func (s *Store) insertImpactsV2(ctx context.Context, tx pgx.Tx, userID string, eventID string, impacts []ScenarioImpact) error {
	// Get event's occurs_on date for impact start date
	var occursOn time.Time
	err := tx.QueryRow(ctx, `SELECT occurs_on FROM scenario_events WHERE id = $1`, eventID).Scan(&occursOn)
	if err != nil {
		return fmt.Errorf("failed to get event occurs_on: %w", err)
	}

	for i := range impacts {
		imp := &impacts[i]

		targetID := imp.TargetID()
		targetType := imp.TargetType()

		// All impacts must have a valid target (pre-created by frontend)
		if targetID == nil || strings.TrimSpace(*targetID) == "" || !scenario.IsValidTargetType(targetType) {
			return scenario.ErrInvalidTargetCount
		}

		// Amount is already a decimal
		impactFrequency := string(imp.Cadence)
		if impactFrequency == "" {
			impactFrequency = "monthly"
		}

		// Insert into the appropriate finance table based on target type
		switch targetType {
		case "income":
			if _, err := tx.Exec(ctx, `
				INSERT INTO finance_incomes (
					user_id, parent_id, name, amount, frequency, category, start_date,
					growth_rate, growth_strategy, scenario_event_id, impact_kind, impact_frequency
				)
				SELECT user_id, id, name, $3, frequency, category, $4,
				       growth_rate, growth_strategy, $5, $6, $7
				FROM finance_incomes WHERE id = $2`,
				userID, *imp.TargetIncomeID, imp.Amount, occursOn,
				eventID, imp.ImpactKind, impactFrequency,
			); err != nil {
				return fmt.Errorf("failed to insert income impact: %w", err)
			}

		case "expense":
			if _, err := tx.Exec(ctx, `
				INSERT INTO finance_expenses (
					user_id, parent_id, name, amount, frequency, category, start_date,
					growth_rate, growth_strategy, scenario_event_id, impact_kind, impact_frequency
				)
				SELECT user_id, id, name, $3, frequency, category, $4,
				       growth_rate, growth_strategy, $5, $6, $7
				FROM finance_expenses WHERE id = $2`,
				userID, *imp.TargetExpenseID, imp.Amount, occursOn,
				eventID, imp.ImpactKind, impactFrequency,
			); err != nil {
				return fmt.Errorf("failed to insert expense impact: %w", err)
			}

		case "asset":
			if _, err := tx.Exec(ctx, `
				INSERT INTO finance_assets (
					user_id, parent_id, name, current_value, category, start_date,
					growth_rate, growth_strategy, scenario_event_id, impact_kind, impact_frequency
				)
				SELECT user_id, id, name, $3, category, $4,
				       growth_rate, growth_strategy, $5, $6, $7
				FROM finance_assets WHERE id = $2`,
				userID, *imp.TargetAssetID, imp.Amount, occursOn,
				eventID, imp.ImpactKind, impactFrequency,
			); err != nil {
				return fmt.Errorf("failed to insert asset impact: %w", err)
			}

		case "liability":
			if _, err := tx.Exec(ctx, `
				INSERT INTO finance_liabilities (
					user_id, parent_id, name, current_balance, category, start_date,
					interest_rate_apr, minimum_payment, growth_strategy,
					scenario_event_id, impact_kind, impact_frequency
				)
				SELECT user_id, id, name, $3, category, $4,
				       interest_rate_apr, minimum_payment, growth_strategy,
				       $5, $6, $7
				FROM finance_liabilities WHERE id = $2`,
				userID, *imp.TargetLiabilityID, imp.Amount, occursOn,
				eventID, imp.ImpactKind, impactFrequency,
			); err != nil {
				return fmt.Errorf("failed to insert liability impact: %w", err)
			}

		case "investment":
			if _, err := tx.Exec(ctx, `
				INSERT INTO finance_investments (
					user_id, parent_id, name, current_value, category, start_date,
					growth_rate, growth_strategy, scenario_event_id, impact_kind, impact_frequency
				)
				SELECT user_id, id, name, $3, category, $4,
				       growth_rate, growth_strategy, $5, $6, $7
				FROM finance_investments WHERE id = $2`,
				userID, *imp.TargetInvestmentID, imp.Amount, occursOn,
				eventID, imp.ImpactKind, impactFrequency,
			); err != nil {
				return fmt.Errorf("failed to insert investment impact: %w", err)
			}

		case "cash":
			if _, err := tx.Exec(ctx, `
				INSERT INTO finance_cash_accounts (
					user_id, parent_id, name, balance, category, start_date,
					interest_rate, growth_strategy, is_accumulator,
					scenario_event_id, impact_kind, impact_frequency
				)
				SELECT user_id, id, name, $3, COALESCE(category, 'savings'), $4,
				       interest_rate, growth_strategy, false,
				       $5, $6, $7
				FROM finance_cash_accounts WHERE id = $2`,
				userID, *imp.TargetCashAccountID, imp.Amount, occursOn,
				eventID, imp.ImpactKind, impactFrequency,
			); err != nil {
				return fmt.Errorf("failed to insert cash account impact: %w", err)
			}
		}
	}
	return nil
}

// GetExcludedScenarioTargetIDs returns IDs of financial items linked to excluded scenarios.
// NEW ARCHITECTURE: Query finance tables for items with scenario_event_id linked to excluded events.
func (s *Store) GetExcludedScenarioTargetIDs(ctx context.Context, userID string) (ExcludedTargets, error) {
	result := ExcludedTargets{
		AssetIDs:       make(map[string]struct{}),
		LiabilityIDs:   make(map[string]struct{}),
		IncomeIDs:      make(map[string]struct{}),
		ExpenseIDs:     make(map[string]struct{}),
		CashAccountIDs: make(map[string]struct{}),
		InvestmentIDs:  make(map[string]struct{}),
	}

	// Query each finance table for items linked to excluded scenario events
	// Income impacts from excluded events
	incomeRows, err := s.pool.Query(ctx, `
		SELECT fi.id FROM finance_incomes fi
		JOIN scenario_events se ON fi.scenario_event_id = se.id
		WHERE fi.user_id = $1 AND se.is_included = false`, userID)
	if err != nil {
		return ExcludedTargets{}, err
	}
	defer incomeRows.Close()
	for incomeRows.Next() {
		var id string
		if err := incomeRows.Scan(&id); err != nil {
			return ExcludedTargets{}, err
		}
		result.IncomeIDs[id] = struct{}{}
	}

	// Expense impacts from excluded events
	expenseRows, err := s.pool.Query(ctx, `
		SELECT fe.id FROM finance_expenses fe
		JOIN scenario_events se ON fe.scenario_event_id = se.id
		WHERE fe.user_id = $1 AND se.is_included = false`, userID)
	if err != nil {
		return ExcludedTargets{}, err
	}
	defer expenseRows.Close()
	for expenseRows.Next() {
		var id string
		if err := expenseRows.Scan(&id); err != nil {
			return ExcludedTargets{}, err
		}
		result.ExpenseIDs[id] = struct{}{}
	}

	// Asset impacts from excluded events
	assetRows, err := s.pool.Query(ctx, `
		SELECT fa.id FROM finance_assets fa
		JOIN scenario_events se ON fa.scenario_event_id = se.id
		WHERE fa.user_id = $1 AND se.is_included = false`, userID)
	if err != nil {
		return ExcludedTargets{}, err
	}
	defer assetRows.Close()
	for assetRows.Next() {
		var id string
		if err := assetRows.Scan(&id); err != nil {
			return ExcludedTargets{}, err
		}
		result.AssetIDs[id] = struct{}{}
	}

	// Liability impacts from excluded events
	liabilityRows, err := s.pool.Query(ctx, `
		SELECT fl.id FROM finance_liabilities fl
		JOIN scenario_events se ON fl.scenario_event_id = se.id
		WHERE fl.user_id = $1 AND se.is_included = false`, userID)
	if err != nil {
		return ExcludedTargets{}, err
	}
	defer liabilityRows.Close()
	for liabilityRows.Next() {
		var id string
		if err := liabilityRows.Scan(&id); err != nil {
			return ExcludedTargets{}, err
		}
		result.LiabilityIDs[id] = struct{}{}
	}

	// Investment impacts from excluded events
	investmentRows, err := s.pool.Query(ctx, `
		SELECT finv.id FROM finance_investments finv
		JOIN scenario_events se ON finv.scenario_event_id = se.id
		WHERE finv.user_id = $1 AND se.is_included = false`, userID)
	if err != nil {
		return ExcludedTargets{}, err
	}
	defer investmentRows.Close()
	for investmentRows.Next() {
		var id string
		if err := investmentRows.Scan(&id); err != nil {
			return ExcludedTargets{}, err
		}
		result.InvestmentIDs[id] = struct{}{}
	}

	// Cash account impacts from excluded events
	cashRows, err := s.pool.Query(ctx, `
		SELECT fca.id FROM finance_cash_accounts fca
		JOIN scenario_events se ON fca.scenario_event_id = se.id
		WHERE fca.user_id = $1 AND se.is_included = false`, userID)
	if err != nil {
		return ExcludedTargets{}, err
	}
	defer cashRows.Close()
	for cashRows.Next() {
		var id string
		if err := cashRows.Scan(&id); err != nil {
			return ExcludedTargets{}, err
		}
		result.CashAccountIDs[id] = struct{}{}
	}

	return result, nil
}

// ListIncludedScenarioEvents returns all included (is_included=true) scenario events
// with their impacts for the given user. Used by timeline service for impact application.
func (s *Store) ListIncludedScenarioEvents(ctx context.Context, userID string) ([]ScenarioEvent, error) {
	included := true
	events, _, err := s.ListScenarioEventsV2(ctx, userID, ScenarioFilters{
		IncludedOnly: &included,
		Limit:        1000, // High limit to get all included scenarios
	})
	return events, err
}

func decodeStringArray(b []byte) []string {
	if len(b) == 0 {
		return []string{}
	}
	var arr []string
	_ = json.Unmarshal(b, &arr)
	if arr == nil {
		arr = []string{}
	}
	return arr
}

